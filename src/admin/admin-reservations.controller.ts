import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { AdminReservationsService } from './admin-reservations.service';
import { AdminReservationDto } from './dto/admin-reservation.dto';
import { AllocateReservationDto } from './dto/allocate-reservation.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Reservations')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly adminReservationsService: AdminReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'All reservations across all students' })
  @ApiQuery({ name: 'status', enum: ReservationStatus, required: false })
  @ApiResponse({ status: 200, type: [AdminReservationDto] })
  findAll(@Query('status') status?: ReservationStatus): Promise<AdminReservationDto[]> {
    return this.adminReservationsService.findAll(status);
  }

  @Post(':id/allocate')
  @ApiOperation({ summary: 'Manually allocate or reassign a reservation to a room/bed' })
  @ApiResponse({ status: 200, type: AdminReservationDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'BED_TAKEN' })
  allocate(@Param('id') id: string, @Body() dto: AllocateReservationDto): Promise<AdminReservationDto> {
    return this.adminReservationsService.allocate(id, dto);
  }
}
