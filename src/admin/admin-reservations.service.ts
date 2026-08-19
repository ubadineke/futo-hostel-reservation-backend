import { Injectable } from '@nestjs/common';
import { Reservation, ReservationStatus, Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import { BedTakenException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { toReservationDto } from '../reservations/reservations.service';
import { AdminReservationDto } from './dto/admin-reservation.dto';
import { AllocateReservationDto } from './dto/allocate-reservation.dto';

type ReservationWithStudent = Reservation & { student: Pick<Student, 'name' | 'regNo' | 'level'> };

@Injectable()
export class AdminReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: ReservationStatus): Promise<AdminReservationDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: { student: { select: { name: true, regNo: true, level: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reservations.map(toAdminReservationDto);
  }

  async allocate(id: string, dto: AllocateReservationDto): Promise<AdminReservationDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new ResourceNotFoundException('Reservation');

      // Lock the target room so this reassignment can't race a student's own
      // POST /reservations (or another allocate call) for the same room.
      await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;

      const room = await tx.room.findUnique({ where: { id: dto.roomId } });
      if (!room) throw new ResourceNotFoundException('Room');

      const bed = await tx.bed.findUnique({ where: { roomId_number: { roomId: dto.roomId, number: dto.bed } } });
      if (!bed) throw new ResourceNotFoundException('Bed');

      const conflicting = await tx.reservation.findFirst({
        where: { bedId: bed.id, status: { in: ACTIVE_RESERVATION_STATUSES }, NOT: { id } },
      });
      if (conflicting) throw new BedTakenException(`Bed ${dto.bed} in Room ${room.index} is already taken.`);

      return tx.reservation.update({
        where: { id },
        data: {
          hostelId: room.hostelId,
          roomId: room.id,
          roomIndex: room.index,
          bedId: bed.id,
          bedNumber: bed.number,
        },
        include: { student: { select: { name: true, regNo: true, level: true } } },
      });
    });

    return toAdminReservationDto(updated);
  }
}

function toAdminReservationDto(reservation: ReservationWithStudent): AdminReservationDto {
  return {
    ...toReservationDto(reservation),
    studentName: reservation.student.name,
    studentRegNo: reservation.student.regNo,
    studentLevel: reservation.student.level,
  };
}
