import { Module } from '@nestjs/common';
import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';

@Module({
  controllers: [PaymentsController, PaymentCallbackController],
  providers: [PaymentsService, PaystackService],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
