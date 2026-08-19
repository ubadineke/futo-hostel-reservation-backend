import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostelsService } from '../hostels/hostels.service';
import { HostelDetailDto, HostelDto } from '../hostels/dto/hostel.dto';
import { ACTIVE_RESERVATION_STATUSES } from '../common/constants';
import { DomainException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { CreateHostelDto, UpdateHostelDto } from './dto/create-hostel.dto';

@Injectable()
export class AdminHostelsService {
  constructor(private readonly prisma: PrismaService, private readonly hostelsService: HostelsService) {}

  findAll(): Promise<HostelDto[]> {
    return this.hostelsService.findAll({});
  }

  findOne(id: string): Promise<HostelDetailDto> {
    return this.hostelsService.findOne(id);
  }

  async create(dto: CreateHostelDto): Promise<HostelDetailDto> {
    const existing = await this.prisma.hostel.findUnique({ where: { id: dto.id }, select: { id: true } });
    if (existing) {
      throw new DomainException(
        'HOSTEL_ID_TAKEN',
        `A hostel with id "${dto.id}" already exists.`,
        HttpStatus.CONFLICT,
      );
    }

    const { coverA, coverB, ...rest } = dto;
    await this.prisma.hostel.create({ data: { ...rest, coverA: BigInt(coverA), coverB: BigInt(coverB) } });
    return this.hostelsService.findOne(dto.id);
  }

  async update(id: string, dto: UpdateHostelDto): Promise<HostelDetailDto> {
    await this.ensureExists(id);

    if (dto.capacity !== undefined) {
      const roomCount = await this.prisma.room.count({ where: { hostelId: id } });
      if (roomCount > 0) {
        throw new DomainException(
          'CAPACITY_LOCKED',
          'capacity is fixed once a hostel has rooms — remove all rooms first if it genuinely needs to change.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const { coverA, coverB, ...rest } = dto;
    await this.prisma.hostel.update({
      where: { id },
      data: {
        ...rest,
        ...(coverA !== undefined ? { coverA: BigInt(coverA) } : {}),
        ...(coverB !== undefined ? { coverB: BigInt(coverB) } : {}),
      },
    });
    return this.hostelsService.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    const activeCount = await this.prisma.reservation.count({
      where: { hostelId: id, status: { in: ACTIVE_RESERVATION_STATUSES } },
    });
    if (activeCount > 0) {
      throw new DomainException(
        'HOSTEL_HAS_RESERVATIONS',
        'Cannot delete a hostel with active reservations.',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.hostel.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const hostel = await this.prisma.hostel.findUnique({ where: { id }, select: { id: true } });
    if (!hostel) throw new ResourceNotFoundException('Hostel');
  }
}
