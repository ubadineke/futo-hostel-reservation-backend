import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RoomQueryDto {
  @ApiPropertyOptional({ example: 'TETFUND' })
  @IsOptional()
  @IsString()
  hostelId?: string;
}
