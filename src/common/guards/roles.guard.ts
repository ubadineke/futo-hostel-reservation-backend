import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser, Role } from '../types/auth-user.interface';

/** Runs after JwtAuthGuard; rejects a valid token whose role doesn't match `@Roles(...)`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource.');
    }
    return true;
  }
}
