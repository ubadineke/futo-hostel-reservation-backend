import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsIdentifier } from '../validators/identifier.validator';

export class LoginDto {
  @ApiProperty({
    example: '20211274242',
    description: '11-digit registration number or email address',
  })
  @IsString()
  @IsIdentifier()
  identifier!: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  password!: string;
}
