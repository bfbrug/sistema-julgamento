import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = { id: 'user-1', email: 'test@test.com', passwordHash: 'hash', role: 'GESTOR' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: vi.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: mockUser }),
            refresh: vi.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
            logout: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login', async () => {
    const result = await controller.login({ email: 't', password: 'p' }, { ip: '1', headers: {} } as any);
    expect(result.accessToken).toBe('a');
  });

  it('should refresh', async () => {
    const result = await controller.refresh({ refreshToken: 'r' }, { ip: '1', headers: {} } as any);
    expect(result.accessToken).toBe('a2');
  });

  it('should logout', async () => {
    await controller.logout(mockUser as any, { refreshToken: 'r' });
    expect(service.logout).toHaveBeenCalledWith('user-1', 'r');
  });

  it('should get me without passwordHash', () => {
    const result = controller.me(mockUser as any);
    expect((result as any).passwordHash).toBeUndefined();
    expect(result.email).toBe('test@test.com');
  });
});
