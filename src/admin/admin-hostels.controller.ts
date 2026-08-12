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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminHostelsService } from './admin-hostels.service';
import { CreateHostelDto, UpdateHostelDto } from './dto/create-hostel.dto';
import { HostelDetailDto, HostelDto } from '../hostels/dto/hostel.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Hostels')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/hostels')
export class AdminHostelsController {
  constructor(private readonly adminHostelsService: AdminHostelsService) {}

  @Get()
  @ApiOperation({ summary: 'List all hostels (admin view)' })
  @ApiResponse({ status: 200, type: [HostelDto] })
  findAll(): Promise<HostelDto[]> {
    return this.adminHostelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One hostel with rooms' })
  @ApiResponse({ status: 200, type: HostelDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string): Promise<HostelDetailDto> {
    return this.adminHostelsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a hostel' })
  @ApiResponse({ status: 201, type: HostelDetailDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'id already exists' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHostelDto): Promise<HostelDetailDto> {
    return this.adminHostelsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hostel' })
  @ApiResponse({ status: 200, type: HostelDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateHostelDto): Promise<HostelDetailDto> {
    return this.adminHostelsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hostel (fails if it has active reservations)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.adminHostelsService.remove(id);
  }
}
