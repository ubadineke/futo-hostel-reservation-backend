import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { IsBooleanString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class HostelQueryDto {
  @ApiPropertyOptional({ description: 'Matches hostel name OR funder' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: ['available', 'limited', 'full'] })
  @IsOptional()
  @IsIn(['available', 'limited', 'full'])
  status?: 'available' | 'limited' | 'full';

  @ApiPropertyOptional({ description: 'true = only hostels with status != full' })
  @IsOptional()
  @IsBooleanString()
  available?: string;
}
