import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow if public', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const mockContext = { getHandler: vi.fn(), getClass: vi.fn() } as unknown as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw TOKEN_EXPIRED if info name is TokenExpiredError', () => {
    expect(() => guard.handleRequest(null, false, { name: 'TokenExpiredError' } as any)).toThrow(
      new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expirado' })
    );
  });

  it('should throw INVALID_TOKEN if no user', () => {
    expect(() => guard.handleRequest(undefined, false, undefined)).toThrow(
      new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token inválido' })
    );
  });

  it('should throw error if error passed', () => {
    expect(() => guard.handleRequest(new Error('Test'), false, undefined)).toThrow(Error);
  });

  it('should return user if valid', () => {
    expect(guard.handleRequest(undefined, { id: '1' }, undefined)).toEqual({ id: '1' });
  });
});
