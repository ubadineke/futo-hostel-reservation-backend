import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { RoomDto } from './room.dto';

export class HostelDto {
  @ApiProperty({ example: 'A' })
  id!: string;

  @ApiProperty({ example: 'Hostel A' })
  name!: string;

  @ApiProperty({ example: 'A' })
  code!: string;

  @ApiProperty({ example: 'School' })
  funder!: string;

  @ApiProperty({ enum: Gender, example: 'male' })
  gender!: Gender;

  @ApiProperty({ example: 42000, description: 'Naira per session, integer' })
  price!: number;

  @ApiProperty({ example: 8, description: 'Beds per room — the same for every room in this hostel' })
  capacity!: number;

  @ApiProperty({ example: '8 per room', description: 'Display string derived from capacity' })
  roomSize!: string;

  @ApiProperty({ example: 12 })
  bedsAvailable!: number;

  @ApiProperty({ example: 88 })
  bedsTotal!: number;

  @ApiProperty({ example: 'available', enum: ['available', 'limited', 'full'] })
  status!: 'available' | 'limited' | 'full';

  @ApiProperty({ example: 5.3869 })
  lat!: number;

  @ApiProperty({ example: 7.0341 })
  lng!: number;

  @ApiProperty({ example: 4280171146, description: '32-bit ARGB cover gradient start' })
  coverA!: number;

  @ApiProperty({ example: 4280640491, description: '32-bit ARGB cover gradient end' })
  coverB!: number;
}

export class HostelDetailDto extends HostelDto {
  @ApiProperty({ example: 'A male school block close to the lecture halls. …' })
  blurb!: string;

  @ApiProperty({ type: [RoomDto] })
  rooms!: RoomDto[];
}
