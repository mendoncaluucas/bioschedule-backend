import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Autoriza apenas usuários com role ADMIN.
 * Deve ser usado SEMPRE após o AuthGuard, que popula request.user com o
 * payload do JWT (incluindo o campo role). Ex.: @UseGuards(AuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request['user'];

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }

    return true;
  }
}
