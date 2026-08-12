import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, Role } from '../../common/types/auth-user.interface';

export interface JwtPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const exists =
      payload.role === 'student'
        ? await this.prisma.student.findUnique({ where: { id: payload.sub }, select: { id: true } })
        : await this.prisma.admin.findUnique({ where: { id: payload.sub }, select: { id: true } });

    if (!exists) throw new UnauthorizedException('Session is no longer valid.');
    return { id: payload.sub, role: payload.role };
  }
}
