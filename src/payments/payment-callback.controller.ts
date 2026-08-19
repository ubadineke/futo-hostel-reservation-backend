import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';

/**
 * Public landing page Paystack redirects to after checkout (see
 * PaystackService.callbackUrl). Not meant to be seen in practice — the
 * mobile app's WebView intercepts navigation to this URL and closes itself
 * before the request actually completes. This exists as a robustness
 * backstop in case that interception ever has a timing gap.
 */
@ApiExcludeController()
@Controller('payments/callback')
export class PaymentCallbackController {
  @Get()
  page(@Res() res: Response): void {
    res
      .type('html')
      .send(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment complete</title>
        <style>body{font:16px system-ui,sans-serif;text-align:center;padding:64px 24px;color:#1e293b}</style>
        </head><body><h1>You're all set</h1><p>You can close this window and return to the Roost app.</p></body></html>`,
      );
  }
}
