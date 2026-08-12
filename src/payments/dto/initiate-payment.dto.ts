import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'res_01HZ...' })
  @IsString()
  reservationId!: string;
}
