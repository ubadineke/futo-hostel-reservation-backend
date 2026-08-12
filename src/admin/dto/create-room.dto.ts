import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'TETFUND' })
  @IsString()
  @IsNotEmpty()
  hostelId!: string;

  @ApiProperty({ example: '4-bed room (en-suite)' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 4, description: 'Beds per physical room of this type' })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty({ example: 80, description: 'Total beds of this type across the hostel' })
  @IsInt()
  @Min(1)
  bedsTotal!: number;
}

// hostelId is immutable after creation — reassigning a room to another
// hostel would orphan its existing reservations' denormalised hostelId.
export class UpdateRoomDto extends PartialType(OmitType(CreateRoomDto, ['hostelId'] as const)) {}
