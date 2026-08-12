import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminRoomsService } from './admin-rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-room.dto';
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
  @ApiOperation({ summary: 'List room types, optionally scoped to a hostel' })
  @ApiResponse({ status: 200, type: [RoomDto] })
  findAll(@Query() query: RoomQueryDto): Promise<RoomDto[]> {
    return this.adminRoomsService.findAll(query.hostelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One room type with occupancy' })
  @ApiResponse({ status: 200, type: RoomDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string): Promise<RoomDto> {
    return this.adminRoomsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a room type within a hostel' })
  @ApiResponse({ status: 201, type: RoomDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Hostel not found' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRoomDto): Promise<RoomDto> {
    return this.adminRoomsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a room type (renaming, capacity, or bed count)' })
  @ApiResponse({ status: 200, type: RoomDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'Shrinking bedsTotal would remove occupied beds' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto): Promise<RoomDto> {
    return this.adminRoomsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room type (fails if it has active reservations)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.adminRoomsService.remove(id);
  }
}
