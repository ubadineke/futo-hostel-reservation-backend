import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HostelsModule } from './hostels/hostels.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HostelsModule,
    ReservationsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
