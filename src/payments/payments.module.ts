import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RemitaService } from './remita.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RemitaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
