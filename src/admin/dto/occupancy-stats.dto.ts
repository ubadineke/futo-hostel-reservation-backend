import { ApiProperty } from '@nestjs/swagger';

class HostelOccupancyDto {
  @ApiProperty({ example: 'A' })
  id!: string;

  @ApiProperty({ example: 'Hostel A' })
  name!: string;

  @ApiProperty({ example: 76 })
  occupied!: number;

  @ApiProperty({ example: 88 })
  total!: number;
}

export class OccupancyStatsDto {
  @ApiProperty({ example: 480 })
  totalBeds!: number;

  @ApiProperty({ example: 397 })
  occupied!: number;

  @ApiProperty({ example: 83 })
  available!: number;

  @ApiProperty({ example: 83, description: 'Rounded percentage' })
  occupancyPct!: number;

  @ApiProperty({ example: 24885000, description: 'Sum of fees over paid reservations, naira' })
  revenue!: number;

  @ApiProperty({ type: [HostelOccupancyDto] })
  perHostel!: HostelOccupancyDto[];
}
