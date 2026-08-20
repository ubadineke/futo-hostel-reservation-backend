import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fields a student may maintain after registering. Login identity and password
 * have separate flows and are intentionally not accepted here. */
export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ example: 'Dominion Nwakanma' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: 'Software Engineering' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dept?: string;

  @ApiPropertyOptional({ example: '400 Level' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  level?: string;
}
