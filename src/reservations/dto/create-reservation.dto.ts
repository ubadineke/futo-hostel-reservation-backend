import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'TETFUND' })
  @IsString()
  hostelId!: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsString()
  roomId!: string;

  @ApiProperty({ example: 3, description: 'Preferred bed number — a preference, not a guarantee' })
  @IsInt()
  @Min(1)
  bed!: number;
}
