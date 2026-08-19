import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';

export class ReservationDto {
  @ApiProperty({ example: 'res_a1b2c3d4' })
  id!: string;

  @ApiProperty({ example: 'RST-9C12A4' })
  reference!: string;

  @ApiProperty({ example: '350078221904' })
  rrr!: string;

  @ApiProperty({ example: 'stu_01H...' })
  studentId!: string;

  @ApiProperty({ example: 'TETFUND' })
  hostelId!: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  roomId!: string;

  @ApiProperty({ example: '4-bed room (en-suite)' })
  roomName!: string;

  @ApiProperty({ example: 3 })
  bed!: number;

  @ApiProperty({ example: 90000 })
  fee!: number;

  @ApiProperty({ enum: ReservationStatus, example: 'pending' })
  status!: ReservationStatus;

  @ApiProperty({ example: '2026-06-26T09:12:00Z' })
  createdAt!: string;
}

export class ReservationPaymentDto {
  @ApiProperty({ example: '350078221904' })
  rrr!: string;

  @ApiProperty({ example: 90000 })
  amount!: number;

  @ApiProperty({ example: 'pending' })
  status!: 'pending' | 'paid' | 'failed';

  @ApiProperty({
    example: 'https://checkout.paystack.com/abcd1234',
    description: "Open this to pay — Paystack's hosted checkout page (test/sandbox mode)",
  })
  authorizationUrl!: string;
}

export class CreateReservationResponseDto {
  @ApiProperty({ type: ReservationDto })
  reservation!: ReservationDto;

  @ApiProperty({ type: ReservationPaymentDto })
  payment!: ReservationPaymentDto;
}
