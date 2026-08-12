import { ReservationStatus } from '@prisma/client';

/** A reservation holds/allocates a bed while it's in any of these states. */
export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.pending,
  ReservationStatus.reserved,
  ReservationStatus.paid,
];
