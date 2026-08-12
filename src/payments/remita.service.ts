import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stands in for a real Remita merchant integration (FR8 asks only for a
 * "sandbox/mock gateway, Remita-style RRR reference"). The webhook it
 * verifies is signed with a shared secret rather than Remita's real scheme —
 * swap `verifyWebhookSignature` for the real algorithm when a live merchant
 * account is available.
 */
@Injectable()
export class RemitaService {
  constructor(private readonly config: ConfigService) {}

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    const secret = this.config.getOrThrow<string>('REMITA_WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  }
}
