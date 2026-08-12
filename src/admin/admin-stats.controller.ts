import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminStatsService } from './admin-stats.service';
import { OccupancyStatsDto } from './dto/occupancy-stats.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Stats')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('occupancy')
  @ApiOperation({ summary: 'Dashboard totals: beds, occupancy, revenue, per-hostel breakdown' })
  @ApiResponse({ status: 200, type: OccupancyStatsDto })
  getOccupancy(): Promise<OccupancyStatsDto> {
    return this.adminStatsService.getOccupancy();
  }
}
