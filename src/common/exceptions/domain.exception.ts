import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base for every deliberately-thrown business error. Carries a stable `code`
 * so responses match the `{ error: { code, message } }` envelope from
 * BACKEND-README.md §9 instead of Nest's default `{ statusCode, message }`.
 */
export class DomainException extends HttpException {
  constructor(code: string, message: string, status: HttpStatus) {
    super({ code, message }, status);
  }
}

export class AlreadyHasActiveReservationException extends DomainException {
  constructor(message = 'You already have an active reservation.') {
    super('ALREADY_HAS_ACTIVE', message, HttpStatus.CONFLICT);
  }
}

export class BedTakenException extends DomainException {
  constructor(message = 'That bed is no longer available.') {
    super('BED_TAKEN', message, HttpStatus.CONFLICT);
  }
}

export class HostelFullException extends DomainException {
  constructor(message = 'This hostel has no beds available.') {
    super('HOSTEL_FULL', message, HttpStatus.CONFLICT);
  }
}

export class ResourceNotFoundException extends DomainException {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found.`, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenAccessException extends DomainException {
  constructor(message = 'You cannot access this resource.') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor(message = 'Invalid credentials.') {
    super('INVALID_CREDENTIALS', message, HttpStatus.UNAUTHORIZED);
  }
}

export class IdentifierTakenException extends DomainException {
  constructor(message = 'An account with this identifier already exists.') {
    super('IDENTIFIER_TAKEN', message, HttpStatus.CONFLICT);
  }
}

export class InvalidSignatureException extends DomainException {
  constructor(message = 'Invalid webhook signature.') {
    super('INVALID_SIGNATURE', message, HttpStatus.UNAUTHORIZED);
  }
}
