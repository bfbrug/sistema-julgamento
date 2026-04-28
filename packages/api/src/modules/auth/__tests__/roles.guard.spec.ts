import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow if no roles required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const mockContext = { getHandler: vi.fn(), getClass: vi.fn() } as unknown as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow if user has role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GESTOR']);
    const mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'GESTOR' } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GESTOR']);
    const mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'JURADO' } }),
      }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
