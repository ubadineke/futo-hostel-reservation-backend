import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminRoomsService } from './admin-rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { RoomDto } from '../hostels/dto/room.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Rooms')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly adminRoomsService: AdminRoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List physical rooms, optionally scoped to a hostel' })
  @ApiResponse({ status: 200, type: [RoomDto] })
  findAll(@Query() query: RoomQueryDto): Promise<RoomDto[]> {
    return this.adminRoomsService.findAll(query.hostelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One room with occupancy' })
  @ApiResponse({ status: 200, type: RoomDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string): Promise<RoomDto> {
    return this.adminRoomsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Add a room to a hostel (inherits the hostel's fixed capacity)" })
  @ApiResponse({ status: 201, type: RoomDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Hostel not found' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRoomDto): Promise<RoomDto> {
    return this.adminRoomsService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room (fails if it has active reservations)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.adminRoomsService.remove(id);
  }
}
