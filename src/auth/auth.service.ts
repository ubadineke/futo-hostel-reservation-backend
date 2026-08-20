import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin, Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvalidCredentialsException,
  IdentifierTakenException,
} from '../common/exceptions/domain.exception';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { AuthResponseDto, StudentDto } from './dto/student.dto';
import { AdminAuthResponseDto, AdminDto } from './dto/admin.dto';
import { isEmailIdentifier } from './validators/identifier.validator';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const regNo = dto.regNo.trim();
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const existing = await this.prisma.student.findFirst({
      where: { OR: [{ regNo }, { email }] },
    });
    if (existing) throw new IdentifierTakenException();

    const student = await this.prisma.student.create({
      data: {
        regNo,
        email,
        name: dto.name.trim(),
        dept: dto.dept.trim(),
        level: dto.level.trim(),
        passwordHash,
      },
    });

    return { token: this.signToken(student.id, 'student'), student: toStudentDto(student) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim();
    const student = isEmailIdentifier(identifier)
      ? await this.prisma.student.findUnique({ where: { email: identifier.toLowerCase() } })
      : await this.prisma.student.findUnique({ where: { regNo: identifier } });

    if (!student || !(await bcrypt.compare(dto.password, student.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    return { token: this.signToken(student.id, 'student'), student: toStudentDto(student) };
  }

  async me(studentId: string): Promise<StudentDto> {
    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    return toStudentDto(student);
  }

  async updateProfile(studentId: string, dto: UpdateStudentProfileDto): Promise<StudentDto> {
    const data = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.dept !== undefined ? { dept: dto.dept.trim() } : {}),
      ...(dto.level !== undefined ? { level: dto.level.trim() } : {}),
    };

    if (Object.keys(data).length === 0) return this.me(studentId);

    try {
      const student = await this.prisma.student.update({ where: { id: studentId }, data });
      return toStudentDto(student);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new IdentifierTakenException(
          'That email address already belongs to another account.',
        );
      }
      throw error;
    }
  }

  async adminLogin(dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new InvalidCredentialsException();
    }
    return { token: this.signToken(admin.id, 'admin'), admin: toAdminDto(admin) };
  }

  private signToken(sub: string, role: 'student' | 'admin'): string {
    return this.jwt.sign({ sub, role });
  }
}

function toStudentDto(student: Student): StudentDto {
  return {
    id: student.id,
    name: student.name,
    regNo: student.regNo,
    email: student.email,
    dept: student.dept,
    level: student.level,
  };
}

function toAdminDto(admin: Admin): AdminDto {
  return { id: admin.id, name: admin.name, email: admin.email };
}
