import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

// Monta um ExecutionContext falso com o request.user informado.
function mockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('permite acesso quando o usuário é ADMIN', () => {
    const ctx = mockContext({ sub: '1', role: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloqueia quando o usuário é PROFISSIONAL', () => {
    const ctx = mockContext({ sub: '2', role: 'PROFISSIONAL' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('bloqueia quando não há usuário na requisição', () => {
    const ctx = mockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('bloqueia quando o role está ausente', () => {
    const ctx = mockContext({ sub: '3' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
