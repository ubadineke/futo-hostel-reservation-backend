import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Capacity isn't specified here — it's inherited from the hostel (every room
// in a hostel is the same size). Creating a room always adds exactly one
// physical room with `hostel.capacity` beds.
export class CreateRoomDto {
  @ApiProperty({ example: 'TETFUND' })
  @IsString()
  @IsNotEmpty()
  hostelId!: string;
}
