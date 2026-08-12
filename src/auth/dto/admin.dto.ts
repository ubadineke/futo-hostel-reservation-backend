import { ApiProperty } from '@nestjs/swagger';

export class AdminDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Hostel Officer' })
  name!: string;

  @ApiProperty({ example: 'admin@futo.edu.ng' })
  email!: string;
}

export class AdminAuthResponseDto {
  @ApiProperty({ description: 'Bearer JWT' })
  token!: string;

  @ApiProperty({ type: AdminDto })
  admin!: AdminDto;
}
