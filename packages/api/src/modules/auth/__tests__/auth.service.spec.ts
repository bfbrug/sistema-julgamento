import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { vi, Mock } from 'vitest';

vi.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let audit: AuditService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'Test User',
    role: UserRole.GESTOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: vi.fn() },
            refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: vi.fn().mockReturnValue('token'), verify: vi.fn() },
        },
        {
          provide: AuditService,
          useValue: { record: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('login', () => {
    it('should login and return tokens', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password');

      expect(result).toHaveProperty('accessToken', 'token');
      expect(result).toHaveProperty('refreshToken', 'token');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_SUCCESS' }));
    });

    it('should throw UnauthorizedException if user not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.login('test@example.com', 'password')).rejects.toThrow(UnauthorizedException);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_FAILED' }));
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_FAILED' }));
    });
  });

  describe('validateUser', () => {
    it('should return user if active and not deleted', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      const user = await service.validateUser('user-1');
      expect(user).toBeDefined();
    });

    it('should return null if user not found or inactive', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const user = await service.validateUser('user-1');
      expect(user).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh tokens if token is valid', async () => {
      vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1' } as any);
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({ id: 'token-1', revokedAt: null, expiresAt: new Date(Date.now() + 10000) } as any);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.refresh('some-token');

      expect(result).toHaveProperty('accessToken', 'token');
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });

    it('should throw if token revoked and revoke all', async () => {
      vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1' } as any);
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({ id: 'token-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 10000) } as any);

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { revokedAt: expect.any(Date) } }));
    });

    it('should throw if token expired', async () => {
      vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1' } as any);
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({ id: 'token-1', revokedAt: null, expiresAt: new Date(Date.now() - 10000) } as any);

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token signature invalid', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('Invalid signature'); });

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke token and log audit', async () => {
      await service.logout('user-1', 'some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGOUT', userId: 'user-1' }));
    });
  });
});
