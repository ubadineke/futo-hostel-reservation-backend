import { ApiProperty } from '@nestjs/swagger';

class ErrorBodyDto {
  @ApiProperty({ example: 'BED_TAKEN' })
  code!: string;

  @ApiProperty({ example: 'Bed 3 in 4-bed room (en-suite) is no longer available.' })
  message!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}
