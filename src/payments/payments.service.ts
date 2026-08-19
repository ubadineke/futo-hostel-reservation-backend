import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenAccessException, ResourceNotFoundException } from '../common/exceptions/domain.exception';
import { resolveEmailForPaystack } from '../common/utils/student.util';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentDto, PaymentStatusDto } from './dto/payment.dto';
import { PaystackService } from './paystack.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly paystack: PaystackService) {}

  async initiate(studentId: string, dto: InitiatePaymentDto): Promise<PaymentDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: { payment: true, student: true },
    });
    if (!reservation) throw new ResourceNotFoundException('Reservation');
    if (reservation.studentId !== studentId) throw new ForbiddenAccessException();

    // POST /reservations already opens a Payment row (with its Paystack
    // authorization already initialized); this stays idempotent since
    // BACKEND-README.md §3.4 allows folding initiate into that step.
    if (reservation.payment) return toPaymentDto(reservation.payment);

    const init = await this.paystack.initializeTransaction({
      email: resolveEmailForPaystack(reservation.student),
      amountNaira: reservation.fee,
      reference: reservation.rrr,
    });

    const payment = await this.prisma.payment.create({
      data: {
        rrr: reservation.rrr,
        reservationId: reservation.id,
        amount: reservation.fee,
        status: PaymentStatus.pending,
        authorizationUrl: init.authorizationUrl,
      },
    });
    return toPaymentDto(payment);
  }

  /**
   * Poll-based confirmation (no webhook): the app calls this after sending the
   * student to `authorizationUrl`. A `pending` payment is checked live against
   * Paystack's verify endpoint; anything already resolved is returned straight
   * from the DB without hitting Paystack again.
   */
  async getStatus(studentId: string, rrr: string): Promise<PaymentStatusDto> {
    const payment = await this.prisma.payment.findUnique({ where: { rrr }, include: { reservation: true } });
    if (!payment) throw new ResourceNotFoundException('Payment');
    if (payment.reservation.studentId !== studentId) throw new ForbiddenAccessException();

    if (payment.status !== PaymentStatus.pending) return { status: payment.status };

    const verified = await this.paystack.verifyTransaction(rrr);

    if (verified.status === 'success') {
      // Amount is attacker/tamper-proofed on Paystack's side, not ours — a
      // mismatch here means something is wrong; don't trust it as paid.
      if (verified.amountKobo !== Math.round(payment.amount * 100)) {
        return { status: PaymentStatus.pending };
      }
      await this.applyOutcome(payment.id, payment.reservationId, 'success');
      return { status: PaymentStatus.paid };
    }

    // NOT "abandoned" — Paystack reports a transaction as abandoned almost
    // immediately after initialize, before the student has even opened the
    // checkout page (confirmed by testing). Treating that as a hard failure
    // would cancel the reservation and free the bed out from under someone
    // mid-payment. Only an explicit "failed" (e.g. a declined card) is a real
    // failure; anything else just stays pending — consistent with there
    // being no hold-expiry job (see README).
    if (verified.status === 'failed') {
      await this.applyOutcome(payment.id, payment.reservationId, 'failed');
      return { status: PaymentStatus.failed };
    }

    return { status: PaymentStatus.pending };
  }

  /**
   * Offline/no-internet fallback that bypasses Paystack entirely — useful for
   * demoing without depending on Paystack's sandbox being reachable.
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
    authorizationUrl: payment.authorizationUrl,
  };
}
