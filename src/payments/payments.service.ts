import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenAccessException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentDto, PaymentStatusDto } from './dto/payment.dto';
import { RemitaWebhookDto } from './dto/remita-webhook.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(studentId: string, dto: InitiatePaymentDto): Promise<PaymentDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: { payment: true },
    });
    if (!reservation) throw new ResourceNotFoundException('Reservation');
    if (reservation.studentId !== studentId) throw new ForbiddenAccessException();

    // POST /reservations already opens a Payment row; this is kept idempotent
    // since BACKEND-README.md §3.4 allows folding initiate into that step.
    if (reservation.payment) return toPaymentDto(reservation.payment);

    const payment = await this.prisma.payment.create({
      data: {
        rrr: reservation.rrr,
        reservationId: reservation.id,
        amount: reservation.fee,
        status: PaymentStatus.pending,
      },
    });
    return toPaymentDto(payment);
  }

  async getStatus(studentId: string, rrr: string): Promise<PaymentStatusDto> {
    const payment = await this.prisma.payment.findUnique({ where: { rrr }, include: { reservation: true } });
    if (!payment) throw new ResourceNotFoundException('Payment');
    if (payment.reservation.studentId !== studentId) throw new ForbiddenAccessException();
    return { status: payment.status };
  }

  async handleWebhook(dto: RemitaWebhookDto): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { rrr: dto.rrr } });
    if (!payment) throw new ResourceNotFoundException('Payment');
    await this.applyOutcome(payment.id, payment.reservationId, dto.status);
  }

  /**
   * Stands in for the Remita checkout page itself (FR8 is a "sandbox/mock
   * gateway" — there's no real page to redirect to). The webhook can't be
   * called by the app directly since that would mean shipping the HMAC
   * secret inside the client; this is the student-authenticated equivalent
   * of "the student finished paying on Remita's UI", replacing the app's
   * `Future.delayed(1600ms)` fake (BACKEND-README.md §7).
   */
  async simulate(studentId: string, rrr: string, outcome: 'success' | 'failed'): Promise<PaymentStatusDto> {
    const payment = await this.prisma.payment.findUnique({ where: { rrr }, include: { reservation: true } });
    if (!payment) throw new ResourceNotFoundException('Payment');
    if (payment.reservation.studentId !== studentId) throw new ForbiddenAccessException();

    await this.applyOutcome(payment.id, payment.reservationId, outcome);
    return { status: outcome === 'success' ? PaymentStatus.paid : PaymentStatus.failed };
  }

  private async applyOutcome(
    paymentId: string,
    reservationId: string,
    outcome: 'success' | 'failed',
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (outcome === 'success') {
        await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.paid } });
        // Bed was already held at reserve time; "confirm allocation" (FR8/FR9)
        // is this flip to paid.
        await tx.reservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.paid } });
      } else {
        await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.failed } });
        // Failed payment frees the bed, same as a cancellation (BACKEND-README.md §4.2).
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.cancelled },
        });
      }
    });
  }
}

function toPaymentDto(payment: Payment): PaymentDto {
  return {
    rrr: payment.rrr,
    reservationId: payment.reservationId,
    amount: payment.amount,
    status: payment.status,
  };
}
