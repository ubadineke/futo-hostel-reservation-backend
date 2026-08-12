import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@futo.edu.ng' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
