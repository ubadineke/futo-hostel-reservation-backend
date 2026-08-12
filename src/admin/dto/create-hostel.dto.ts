import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { IsEnum, IsInt, IsLatitude, IsLongitude, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateHostelDto {
  @ApiProperty({ example: 'A', description: 'Short human ID, e.g. "A", "TETFUND"' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'Hostel A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'A', description: 'Short badge shown in the app' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'School' })
  @IsString()
  @IsNotEmpty()
  funder!: string;

  @ApiProperty({ enum: Gender, example: 'male' })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ example: 42000, description: 'Naira per session, integer' })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ example: '8–10 per room' })
  @IsString()
  @IsNotEmpty()
  roomSize!: string;

  @ApiProperty({ example: 'A male school block close to the lecture halls.' })
  @IsString()
  @IsNotEmpty()
  blurb!: string;

  @ApiProperty({ example: 5.3869 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 7.0341 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 4280171146, description: '32-bit ARGB cover gradient start' })
  @IsInt()
  @Min(0)
  coverA!: number;

  @ApiProperty({ example: 4280640491, description: '32-bit ARGB cover gradient end' })
  @IsInt()
  @Min(0)
  coverB!: number;
}

// id is immutable after creation
export class UpdateHostelDto extends PartialType(OmitType(CreateHostelDto, ['id'] as const)) {}
