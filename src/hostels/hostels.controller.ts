import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HostelsService } from './hostels.service';
import { HostelQueryDto } from './dto/hostel-query.dto';
import { HostelDetailDto, HostelDto } from './dto/hostel.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Hostels')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('hostels')
export class HostelsController {
  constructor(private readonly hostelsService: HostelsService) {}

  @Get()
  @ApiOperation({ summary: 'List all hostels, with optional search/filter' })
  @ApiResponse({ status: 200, type: [HostelDto] })
  findAll(@Query() query: HostelQueryDto): Promise<HostelDto[]> {
    return this.hostelsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One hostel with its room types, occupancy, and blurb' })
  @ApiResponse({ status: 200, type: HostelDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id') id: string): Promise<HostelDetailDto> {
    return this.hostelsService.findOne(id);
  }
}
