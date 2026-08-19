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
import { fromGlobalBedNumber } from '../common/utils/room-instances.util';
import { resolveEmailForPaystack } from '../common/utils/student.util';
import { PaystackService } from '../payments/paystack.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateReservationResponseDto, ReservationDto } from './dto/reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService, private readonly paystack: PaystackService) {}

  async create(studentId: string, dto: CreateReservationDto): Promise<CreateReservationResponseDto> {
    const [student, hostel, room] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
      this.prisma.hostel.findUnique({ where: { id: dto.hostelId } }),
      this.prisma.room.findUnique({ where: { id: dto.roomId } }),
    ]);
    if (!hostel) throw new ResourceNotFoundException('Hostel');
    if (!room || room.hostelId !== dto.hostelId) throw new ResourceNotFoundException('Room');

    // Best-effort pre-check to avoid wasting a Paystack call on a request
    // that's obviously doomed; re-checked authoritatively inside the lock below.
    const preExistingActive = await this.prisma.reservation.findFirst({
      where: { studentId, status: { in: ACTIVE_RESERVATION_STATUSES } },
    });
    if (preExistingActive) throw new AlreadyHasActiveReservationException();

    // Talk to Paystack *before* opening a DB transaction — an external HTTP
    // round-trip has no business holding a row lock / DB connection open. If
    // this fails, nothing has been written yet. If the DB step below fails
    // instead, the Paystack transaction is simply abandoned — harmless in
    // sandbox mode.
    const rrr = generateRrr();
    const init = await this.paystack.initializeTransaction({
      email: resolveEmailForPaystack(student),
      amountNaira: hostel.price,
      reference: rrr,
    });

    const reservation = await this.prisma.$transaction(async (tx) => {
      // Lock the room row so two concurrent reservations for it serialize
      // instead of both reading the same "free beds" snapshot.
      await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;

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

      // The client's bed number is a preference (BACKEND-README.md §6). If
      // taken, prefer another free bed in the *same* physical room (the
      // student picked that room specifically) before falling back to a
      // different room entirely (lowest-numbered free bed overall, FCFS).
      const { instanceIndex } = fromGlobalBedNumber(dto.bed, room.capacity);
      const sameRoomStart = (instanceIndex - 1) * room.capacity + 1;
      const sameRoomEnd = sameRoomStart + room.capacity - 1;
      const assigned =
        freeBeds.find((bed) => bed.number === dto.bed) ??
        freeBeds.find((bed) => bed.number >= sameRoomStart && bed.number <= sameRoomEnd) ??
        freeBeds[0];

      const created = await tx.reservation.create({
        data: {
          reference: generateReference(),
          rrr,
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
          authorizationUrl: init.authorizationUrl,
        },
      });

      return created;
    });

    return {
      reservation: toReservationDto(reservation),
      payment: {
        rrr: reservation.rrr,
        amount: reservation.fee,
        status: 'pending',
        authorizationUrl: init.authorizationUrl,
      },
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
