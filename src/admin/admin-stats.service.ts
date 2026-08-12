import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HostelsService } from '../hostels/hostels.service';
import { OccupancyStatsDto } from './dto/occupancy-stats.dto';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService, private readonly hostelsService: HostelsService) {}

  async getOccupancy(): Promise<OccupancyStatsDto> {
    const hostels = await this.hostelsService.findAll({});
    const perHostel = hostels.map((h) => ({
      id: h.id,
      name: h.name,
      occupied: h.bedsTotal - h.bedsAvailable,
      total: h.bedsTotal,
    }));

    const totalBeds = perHostel.reduce((sum, h) => sum + h.total, 0);
    const occupied = perHostel.reduce((sum, h) => sum + h.occupied, 0);
    const occupancyPct = totalBeds === 0 ? 0 : Math.round((occupied / totalBeds) * 100);

    const revenueAgg = await this.prisma.reservation.aggregate({
      where: { status: ReservationStatus.paid },
      _sum: { fee: true },
    });

    return {
      totalBeds,
      occupied,
      available: totalBeds - occupied,
      occupancyPct,
      revenue: revenueAgg._sum.fee ?? 0,
      perHostel,
    };
  }
}
