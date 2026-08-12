import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin, Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvalidCredentialsException, IdentifierTakenException } from '../common/exceptions/domain.exception';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AuthResponseDto, StudentDto } from './dto/student.dto';
import { AdminAuthResponseDto, AdminDto } from './dto/admin.dto';
import { isRegNo, isSchoolEmail } from './validators/identifier.validator';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let regNo: string | null = null;
    let email: string | null = null;
    let name: string | null = null;

    if (isRegNo(identifier)) {
      regNo = identifier;
    } else {
      email = identifier.toLowerCase();
      // Email format is surname.firstname.regno@futo.edu.ng (see demo data in
      // BACKEND-README.md §8), which lets us derive both regNo and a display
      // name for free — regNo alone can't derive either.
      const [localPart] = email.split('@');
      const [surname, firstname, extractedRegNo] = localPart.split('.');
      regNo = extractedRegNo;
      name = `${capitalize(firstname)} ${capitalize(surname)}`;
    }

    const existing = await this.prisma.student.findFirst({
      where: { OR: [regNo ? { regNo } : undefined, email ? { email } : undefined].filter(Boolean) as any },
    });
    if (existing) throw new IdentifierTakenException();

    const student = await this.prisma.student.create({
      data: { regNo, email, name, passwordHash },
    });

    return { token: this.signToken(student.id, 'student'), student: toStudentDto(student) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim();
    const student = isSchoolEmail(identifier)
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
