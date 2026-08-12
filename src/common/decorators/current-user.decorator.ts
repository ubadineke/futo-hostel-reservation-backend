import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth-user.interface';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
