import { ApiProperty } from '@nestjs/swagger';

export class RoomInstanceDto {
  @ApiProperty({ example: 1, description: '1-based — a synthetic label ("Room 1"), not a real FUTO room number' })
  index!: number;

  @ApiProperty({ example: 4 })
  bedsTotal!: number;

  @ApiProperty({ example: [1, 3], description: 'LOCAL bed numbers (1..bedsTotal) taken within this room' })
  occupiedBeds!: number[];
}

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

  @ApiProperty({
    type: [RoomInstanceDto],
    description:
      'Room type broken into its real physical rooms (bedsTotal/capacity of them), each with its own occupancy',
  })
  instances!: RoomInstanceDto[];
}
