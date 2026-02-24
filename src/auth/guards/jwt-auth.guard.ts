import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Guard JWT que protege rutas por defecto.
 * Rutas públicas se marcan con el decorador @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Token de acceso requerido');
    }
    return user;
  }
}
