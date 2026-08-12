import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateReservationResponseDto, ReservationDto } from './dto/reservation.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.interface';

@ApiTags('Reservations')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Reserve a bed — holds it pending payment' })
  @ApiResponse({ status: 201, type: CreateReservationResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Hostel or room not found' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ALREADY_HAS_ACTIVE or BED_TAKEN' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
    return this.reservationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "This student's reservations, newest first" })
  @ApiResponse({ status: 200, type: [ReservationDto] })
  findAll(@CurrentUser() user: AuthUser): Promise<ReservationDto[]> {
    return this.reservationsService.findAllForStudent(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One reservation, including allocation + receipt fields' })
  @ApiResponse({ status: 200, type: ReservationDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ReservationDto> {
    return this.reservationsService.findOneForStudent(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active reservation and free the bed' })
  @ApiResponse({ status: 200, type: ReservationDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'Reservation is not active' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ReservationDto> {
    return this.reservationsService.cancel(user.id, id);
  }
}
