import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class PaymentDto {
  @ApiProperty({ example: '350078221904' })
  rrr!: string;

  @ApiProperty({ example: 'res_01HZ...' })
  reservationId!: string;

  @ApiProperty({ example: 90000 })
  amount!: number;

  @ApiProperty({ enum: PaymentStatus, example: 'pending' })
  status!: PaymentStatus;
}

export class PaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, example: 'pending' })
  status!: PaymentStatus;
}
