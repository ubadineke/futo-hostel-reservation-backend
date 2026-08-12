import { HttpStatus, Injectable } from '@nestjs/common';
import { PaymentStatus, Reservation, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import {
  AlreadyHasActiveReservationException,
  BedTakenException,
  DomainException,
  ForbiddenAccessException,
  ResourceNotFoundException,
} from '../common/exceptions/domain.exception';
import { generateReference, generateRrr } from '../common/utils/reference.util';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateReservationResponseDto, ReservationDto } from './dto/reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(studentId: string, dto: CreateReservationDto): Promise<CreateReservationResponseDto> {
    const reservation = await this.prisma.$transaction(async (tx) => {
      // Lock the room row so two concurrent reservations for it serialize
      // instead of both reading the same "free beds" snapshot.
      await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;

      const room = await tx.room.findUnique({ where: { id: dto.roomId } });
      if (!room || room.hostelId !== dto.hostelId) throw new ResourceNotFoundException('Room');

      const activeReservation = await tx.reservation.findFirst({
        where: { studentId, status: { in: ACTIVE_RESERVATION_STATUSES } },
      });
      if (activeReservation) throw new AlreadyHasActiveReservationException();

      const beds = await tx.bed.findMany({
        where: { roomId: dto.roomId },
        include: {
          reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
        },
        orderBy: { number: 'asc' },
      });
      const freeBeds = beds.filter((bed) => bed.reservations.length === 0);
      if (freeBeds.length === 0) {
        throw new BedTakenException(`${room.name} has no free beds left.`);
      }

      // The client's bed number is a preference (BACKEND-README.md §6) — assign
      // it if still free, otherwise the lowest-numbered free bed (FCFS).
      const assigned = freeBeds.find((bed) => bed.number === dto.bed) ?? freeBeds[0];

      const hostel = await tx.hostel.findUniqueOrThrow({ where: { id: dto.hostelId } });

      const created = await tx.reservation.create({
        data: {
          reference: generateReference(),
          rrr: generateRrr(),
          studentId,
          hostelId: dto.hostelId,
          roomId: dto.roomId,
          roomName: room.name,
          bedId: assigned.id,
          bedNumber: assigned.number,
          fee: hostel.price,
          status: ReservationStatus.pending,
        },
      });

      await tx.payment.create({
        data: {
          rrr: created.rrr,
          reservationId: created.id,
          amount: created.fee,
          status: PaymentStatus.pending,
        },
      });

      return created;
    });

    return {
      reservation: toReservationDto(reservation),
      payment: { rrr: reservation.rrr, amount: reservation.fee, status: 'pending' },
    };
  }

  async findAllForStudent(studentId: string): Promise<ReservationDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return reservations.map(toReservationDto);
  }

  async findOneForStudent(studentId: string, id: string): Promise<ReservationDto> {
    const reservation = await this.findOwned(studentId, id);
    return toReservationDto(reservation);
  }

  async cancel(studentId: string, id: string): Promise<ReservationDto> {
    const reservation = await this.findOwned(studentId, id);
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new DomainException('NOT_ACTIVE', 'This reservation is not active.', HttpStatus.CONFLICT);
    }
    const cancelled = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.cancelled },
    });
    return toReservationDto(cancelled);
  }

  private async findOwned(studentId: string, id: string): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new ResourceNotFoundException('Reservation');
    if (reservation.studentId !== studentId) throw new ForbiddenAccessException();
    return reservation;
  }
}

// exported so PaymentsModule / AdminModule can format reservations the same way
export function toReservationDto(reservation: Reservation): ReservationDto {
  return {
    id: reservation.id,
    reference: reservation.reference,
    rrr: reservation.rrr,
    studentId: reservation.studentId,
    hostelId: reservation.hostelId,
    roomId: reservation.roomId,
    roomName: reservation.roomName,
    bed: reservation.bedNumber,
    fee: reservation.fee,
    status: reservation.status,
    createdAt: reservation.createdAt.toISOString(),
  };
}
