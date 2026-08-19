import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import { DomainException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { roomStatus } from '../common/utils/status.util';
import { RoomDto } from '../hostels/dto/room.dto';
import { CreateRoomDto } from './dto/create-room.dto';

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
      orderBy: { index: 'asc' },
    });
    return rooms.map(toRoomDto);
  }

  async findOne(id: string): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({ where: { id }, include: roomInclude });
    if (!room) throw new ResourceNotFoundException('Room');
    return toRoomDto(room);
  }

  async create(dto: CreateRoomDto): Promise<RoomDto> {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new ResourceNotFoundException('Hostel');

    const room = await this.prisma.$transaction(async (tx) => {
      const lastIndex = await tx.room.aggregate({
        where: { hostelId: dto.hostelId },
        _max: { index: true },
      });
      const nextIndex = (lastIndex._max.index ?? 0) + 1;

      const created = await tx.room.create({ data: { hostelId: dto.hostelId, index: nextIndex } });
      await tx.bed.createMany({
        data: Array.from({ length: hostel.capacity }, (_, i) => ({ roomId: created.id, number: i + 1 })),
      });
      return created;
    });

    return this.findOne(room.id);
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
  const occupiedBeds = room.beds
    .filter((bed) => bed.reservations.length > 0)
    .map((bed) => bed.number)
    .sort((a, b) => a - b);
  const bedsAvailable = bedsTotal - occupiedBeds.length;

  return {
    id: room.id,
    hostelId: room.hostelId,
    index: room.index,
    bedsAvailable,
    bedsTotal,
    status: roomStatus(bedsAvailable),
    occupiedBeds,
  };
}
