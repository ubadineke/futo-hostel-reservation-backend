import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Simplified mock contract (FR8: "sandbox/mock gateway, Remita-style RRR
 * reference" — there is no real Remita merchant integration here). Swap for
 * the real Remita callback schema once a live merchant account is wired up.
 */
export class RemitaWebhookDto {
  @ApiProperty({ example: '350078221904' })
  @IsString()
  rrr!: string;

  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  @IsIn(['success', 'failed'])
  status!: 'success' | 'failed';

  @ApiProperty({ required: false, example: 'TXN-8842991' })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
