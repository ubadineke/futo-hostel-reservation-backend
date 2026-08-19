import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import { DomainException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { computeRoomInstances } from '../common/utils/room-instances.util';
import { roomStatus } from '../common/utils/status.util';
import { RoomDto } from '../hostels/dto/room.dto';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-room.dto';

const roomInclude = {
  beds: {
    include: {
      reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
    },
  },
} satisfies Prisma.RoomInclude;

type RoomWithBeds = Prisma.RoomGetPayload<{ include: typeof roomInclude }>;

@Injectable()
export class AdminRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(hostelId?: string): Promise<RoomDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: hostelId ? { hostelId } : undefined,
      include: roomInclude,
      orderBy: { name: 'asc' },
    });
    return rooms.map(toRoomDto);
  }

  async findOne(id: string): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({ where: { id }, include: roomInclude });
    if (!room) throw new ResourceNotFoundException('Room');
    return toRoomDto(room);
  }

  async create(dto: CreateRoomDto): Promise<RoomDto> {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId }, select: { id: true } });
    if (!hostel) throw new ResourceNotFoundException('Hostel');

    const room = await this.prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: { hostelId: dto.hostelId, name: dto.name, capacity: dto.capacity },
      });
      await tx.bed.createMany({
        data: Array.from({ length: dto.bedsTotal }, (_, i) => ({ roomId: created.id, number: i + 1 })),
      });
      return created;
    });

    return this.findOne(room.id);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({ where: { id }, include: roomInclude });
    if (!room) throw new ResourceNotFoundException('Room');

    await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined || dto.capacity !== undefined) {
        await tx.room.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          },
        });
      }

      if (dto.bedsTotal !== undefined) {
        const currentTotal = room.beds.length;
        if (dto.bedsTotal > currentTotal) {
          const additions = Array.from({ length: dto.bedsTotal - currentTotal }, (_, i) => ({
            roomId: id,
            number: currentTotal + i + 1,
          }));
          await tx.bed.createMany({ data: additions });
        } else if (dto.bedsTotal < currentTotal) {
          const toRemoveCount = currentTotal - dto.bedsTotal;
          // Free the highest-numbered beds first, and only if none are occupied.
          const candidates = [...room.beds].sort((a, b) => b.number - a.number).slice(0, toRemoveCount);
          const stillOccupied = candidates.filter((bed) => bed.reservations.length > 0);
          if (stillOccupied.length > 0) {
            throw new DomainException(
              'BEDS_OCCUPIED',
              `Cannot shrink this room — ${stillOccupied.length} of the beds being removed are occupied.`,
              HttpStatus.CONFLICT,
            );
          }
          await tx.bed.deleteMany({ where: { id: { in: candidates.map((bed) => bed.id) } } });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id }, select: { id: true } });
    if (!room) throw new ResourceNotFoundException('Room');

    const activeCount = await this.prisma.reservation.count({
      where: { roomId: id, status: { in: ACTIVE_RESERVATION_STATUSES } },
    });
    if (activeCount > 0) {
      throw new DomainException(
        'ROOM_HAS_RESERVATIONS',
        'Cannot delete a room with active reservations.',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.room.delete({ where: { id } }); // cascades its beds
  }
}

function toRoomDto(room: RoomWithBeds): RoomDto {
  const bedsTotal = room.beds.length;
  const instances = computeRoomInstances(room.beds, room.capacity);
  const occupiedCount = instances.reduce((sum, inst) => sum + inst.occupiedBeds.length, 0);
  const bedsAvailable = bedsTotal - occupiedCount;

  return {
    id: room.id,
    hostelId: room.hostelId,
    name: room.name,
    capacity: room.capacity,
    bedsAvailable,
    bedsTotal,
    status: roomStatus(bedsAvailable),
    instances,
  };
}
