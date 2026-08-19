import { ApiProperty } from '@nestjs/swagger';

export class RoomDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'A' })
  hostelId!: string;

  @ApiProperty({ example: 1, description: '1-based display label ("Room 1")' })
  index!: number;

  @ApiProperty({ example: 5 })
  bedsAvailable!: number;

  @ApiProperty({ example: 8 })
  bedsTotal!: number;

  @ApiProperty({ example: 'available', enum: ['available', 'limited', 'full'] })
  status!: 'available' | 'limited' | 'full';

  @ApiProperty({ example: [1, 3], description: 'Bed numbers (1..bedsTotal) currently held or paid for' })
  occupiedBeds!: number[];
}
