import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, try to authenticate but don't fail if no token
      // This allows optional authentication (populate user if token exists)
      try {
        await super.canActivate(context);
      } catch {
        // Ignore auth errors on public routes - user just won't be populated
      }
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
