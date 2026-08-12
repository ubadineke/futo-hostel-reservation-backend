import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class AllocateReservationDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsString()
  roomId!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  bed!: number;
}
