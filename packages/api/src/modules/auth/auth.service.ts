import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../config/prisma.service';
import { AuditService } from '../audit/audit.service';
import { env } from '../../config/env';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtPayload } from './types/jwt-payload.type';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
    });
    return user;
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true, deletedAt: null },
    });

    if (!user) {
      await this.auditService.record({ action: 'LOGIN_FAILED', entityType: 'User', entityId: 'unknown', actorId: undefined, payload: { email }, ipAddress, userAgent });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.record({ action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, actorId: user.id, payload: { email }, ipAddress, userAgent });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { accessToken, refreshToken } = await this.prisma.$transaction(async (tx) => {
      const tokens = await this.generateTokens(user, ipAddress, userAgent, tx);
      await this.auditService.record({ action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id, actorId: user.id, payload: { email: user.email }, ipAddress, userAgent }, tx);
      return tokens;
    });

    return { accessToken, refreshToken, user };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'name' in e && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expirado' });
      }
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token inválido' });
    }


    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token não encontrado' });
    }

    if (storedToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token revogado' });
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expirado' });
    }

    const user = await this.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Usuário inativo' });
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({ action: 'LOGOUT', entityType: 'User', entityId: userId, actorId: userId, payload: {} }, tx);
    });
  }

  private async generateTokens(user: User, ipAddress?: string, userAgent?: string, tx?: Prisma.TransactionClient) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as number,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number,
    });


    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const client = tx ?? this.prisma;
    await client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }
}
