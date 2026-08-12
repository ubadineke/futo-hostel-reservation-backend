import { ApiProperty } from '@nestjs/swagger';

export class RoomDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'A' })
  hostelId!: string;

  @ApiProperty({ example: '8-bed room' })
  name!: string;

  @ApiProperty({ example: 8 })
  capacity!: number;

  @ApiProperty({ example: 9 })
  bedsAvailable!: number;

  @ApiProperty({ example: 48 })
  bedsTotal!: number;

  @ApiProperty({ example: 'available', enum: ['available', 'limited', 'full'] })
  status!: 'available' | 'limited' | 'full';

  @ApiProperty({ example: [1, 2, 5], description: 'Bed numbers currently held or paid for' })
  occupiedBeds!: number[];
}
