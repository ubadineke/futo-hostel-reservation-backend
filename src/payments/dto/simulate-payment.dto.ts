import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class SimulatePaymentDto {
  @ApiPropertyOptional({ enum: ['success', 'failed'], default: 'success' })
  @IsOptional()
  @IsIn(['success', 'failed'])
  outcome?: 'success' | 'failed';
}
