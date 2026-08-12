import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationDto } from '../../reservations/dto/reservation.dto';

export class AdminReservationDto extends ReservationDto {
  @ApiPropertyOptional({ example: 'Dominion Nwakanma', nullable: true })
  studentName!: string | null;

  @ApiPropertyOptional({ example: '20211274242', nullable: true })
  studentRegNo!: string | null;

  @ApiPropertyOptional({ example: '400 Level', nullable: true, description: 'Used to flag FCFS priority (100-level / final-year)' })
  studentLevel!: string | null;
}
