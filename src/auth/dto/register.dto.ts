import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { REG_NO_RE } from '../validators/identifier.validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

export class RegisterDto {
  @ApiProperty({ example: 'Dominion Nwakanma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '20211274242', description: '11-digit FUTO registration number' })
  @IsString()
  @Matches(REG_NO_RE, { message: 'regNo must be an 11-digit registration number' })
  regNo!: string;

  @ApiProperty({ example: 'student@example.com' })
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Software Engineering' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dept!: string;

  @ApiProperty({ example: '400 Level' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  level!: string;

  @ApiProperty({
    example: 'Password123',
    description: 'At least 8 characters, with a letter and a number',
  })
  @IsString()
  @IsStrongPassword()
  password!: string;
}
