import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiPropertyOptional({ example: 'Dominion Nwakanma', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: '20211274242', nullable: true })
  regNo!: string | null;

  @ApiPropertyOptional({ example: 'nwakanma.dominion.20211274242@futo.edu.ng', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: 'Software Engineering', nullable: true })
  dept!: string | null;

  @ApiPropertyOptional({ example: '400 Level', nullable: true })
  level!: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Bearer JWT' })
  token!: string;

  @ApiProperty({ type: StudentDto })
  student!: StudentDto;
}
