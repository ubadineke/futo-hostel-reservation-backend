import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import { ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { computeRoomInstances } from '../common/utils/room-instances.util';
import { hostelStatus, roomStatus } from '../common/utils/status.util';
import { HostelQueryDto } from './dto/hostel-query.dto';
import { HostelDetailDto, HostelDto } from './dto/hostel.dto';
import { RoomDto } from './dto/room.dto';

const hostelInclude = {
  rooms: {
    include: {
      beds: {
        include: {
          reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
        },
      },
    },
  },
} satisfies Prisma.HostelInclude;

type HostelWithRooms = Prisma.HostelGetPayload<{ include: typeof hostelInclude }>;

@Injectable()
export class HostelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: HostelQueryDto): Promise<HostelDto[]> {
    const where: Prisma.HostelWhereInput = {};
    if (query.gender) where.gender = query.gender;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { funder: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const hostels = await this.prisma.hostel.findMany({ where, include: hostelInclude, orderBy: { id: 'asc' } });
    const mapped = hostels.map(toSummaryDto);

    const wantAvailableOnly = query.available === 'true';
    const statusFilter = query.status;
    return mapped.filter((h) => {
      if (wantAvailableOnly && h.status === 'full') return false;
      if (statusFilter && h.status !== statusFilter) return false;
      return true;
    });
  }

  async findOne(id: string): Promise<HostelDetailDto> {
    const hostel = await this.prisma.hostel.findUnique({ where: { id }, include: hostelInclude });
    if (!hostel) throw new ResourceNotFoundException('Hostel');
    return toDetailDto(hostel);
  }
}

function roomsWithComputed(hostel: HostelWithRooms): RoomDto[] {
  return hostel.rooms.map((room) => {
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
  });
}

function toSummaryDto(hostel: HostelWithRooms): HostelDto {
  const rooms = roomsWithComputed(hostel);
  const bedsTotal = rooms.reduce((sum, r) => sum + r.bedsTotal, 0);
  const bedsAvailable = rooms.reduce((sum, r) => sum + r.bedsAvailable, 0);

  return {
    id: hostel.id,
    name: hostel.name,
    code: hostel.code,
    funder: hostel.funder,
    gender: hostel.gender,
    price: hostel.price,
    roomSize: hostel.roomSize,
    bedsAvailable,
    bedsTotal,
    status: hostelStatus(bedsAvailable),
    lat: hostel.lat,
    lng: hostel.lng,
    coverA: Number(hostel.coverA),
    coverB: Number(hostel.coverB),
  };
}

function toDetailDto(hostel: HostelWithRooms): HostelDetailDto {
  return { ...toSummaryDto(hostel), blurb: hostel.blurb, rooms: roomsWithComputed(hostel) };
}
