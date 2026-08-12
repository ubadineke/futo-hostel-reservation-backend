import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsIdentifier } from '../validators/identifier.validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

export class RegisterDto {
  @ApiProperty({
    example: '20211274242',
    description: '11-digit reg number, or a school email (firstname.lastname.regno@futo.edu.ng)',
  })
  @IsString()
  @IsIdentifier()
  identifier!: string;

  @ApiProperty({ example: 'Password123', description: 'At least 8 characters, with a letter and a number' })
  @IsString()
  @IsStrongPassword()
  password!: string;
}
