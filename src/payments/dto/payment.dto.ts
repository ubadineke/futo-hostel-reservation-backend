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

  @ApiProperty({
    example: 'https://checkout.paystack.com/abcd1234',
    nullable: true,
    description: "Paystack's hosted checkout page (test/sandbox mode) — open this to pay",
  })
  authorizationUrl!: string | null;
}

export class PaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, example: 'pending' })
  status!: PaymentStatus;
}
