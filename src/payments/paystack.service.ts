import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/exceptions/domain.exception';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export type PaystackTransactionStatus = 'success' | 'failed' | 'abandoned' | 'pending' | string;

export interface PaystackVerifyResult {
  status: PaystackTransactionStatus;
  amountKobo: number;
  gatewayResponse: string;
}

/**
 * Paystack integration — TEST/SANDBOX MODE ONLY (this project never charges
 * real money; PAYSTACK_SECRET_KEY is expected to be an `sk_test_...` key).
 *
 * No webhook: the app polls GET /payments/:rrr/status, which calls
 * verifyTransaction() live. This is Paystack's own documented poll-based
 * confirmation flow — webhooks are their recommended reliability backstop,
 * not a requirement (docs.paystack.com/docs/payments/verify-payments).
 */
@Injectable()
export class PaystackService {
  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string {
    return this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
  }

  async initializeTransaction(params: {
    email: string;
    amountNaira: number;
    reference: string;
  }): Promise<PaystackInitResult> {
    const body = await this.call('POST', '/transaction/initialize', {
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // Paystack wants kobo
      reference: params.reference,
      // Without this, Paystack has nowhere reliable to redirect to after
      // checkout — the mobile app's WebView intercepts navigation to this
      // URL (before it actually loads) as the "checkout finished" signal.
      callback_url: this.callbackUrl,
    });
    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference,
    };
  }

  /** GET /payments/callback — see PaymentsController. */
  get callbackUrl(): string {
    const base = (this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/api/v1/payments/callback`;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    const body = await this.call('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
    return {
      status: body.data.status,
      amountKobo: body.data.amount,
      gatewayResponse: body.data.gateway_response,
    };
  }

  private async call(method: 'GET' | 'POST', path: string, payload?: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
    } catch {
      throw new DomainException(
        'PAYSTACK_UNREACHABLE',
        'Could not reach Paystack. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const text = await res.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        /* non-JSON body */
      }
    }

    if (!res.ok || !body?.status) {
      throw new DomainException(
        'PAYSTACK_ERROR',
        body?.message ?? `Paystack request failed (HTTP ${res.status}).`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return body;
  }
}
