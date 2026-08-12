import { Module } from '@nestjs/common';
import { HostelsModule } from '../hostels/hostels.module';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminReservationsController } from './admin-reservations.controller';
import { AdminReservationsService } from './admin-reservations.service';
import { AdminHostelsController } from './admin-hostels.controller';
import { AdminHostelsService } from './admin-hostels.service';
import { AdminRoomsController } from './admin-rooms.controller';
import { AdminRoomsService } from './admin-rooms.service';

@Module({
  imports: [HostelsModule],
  controllers: [AdminStatsController, AdminReservationsController, AdminHostelsController, AdminRoomsController],
  providers: [AdminStatsService, AdminReservationsService, AdminHostelsService, AdminRoomsService],
})
export class AdminModule {}
