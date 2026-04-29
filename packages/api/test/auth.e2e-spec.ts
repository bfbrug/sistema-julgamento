import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './setup';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
    
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.create({
      data: {
        id: 'e2e-user-1',
        email: 'e2e@example.com',
        name: 'E2E User',
        passwordHash,
        role: 'GESTOR',
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  let accessToken: string;
  let refreshToken: string;
  let oldRefreshToken: string;

  it('/api/auth/login (POST) - success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e@example.com', password: 'password123' })
      .expect(200);

    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toHaveProperty('email', 'e2e@example.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    oldRefreshToken = refreshToken;
  });

  it('/api/auth/login (POST) - invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e@example.com', password: 'wrong' })
      .expect(401);
  });

  it('/api/auth/login (POST) - rate limit', async () => {
    // Throttle is 5 requests per 60s. We already did 2.
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'a@a.com', password: '123' }).expect(401);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'a@a.com', password: '123' }).expect(401);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'a@a.com', password: '123' }).expect(401);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'a@a.com', password: '123' }).expect(429);
  });

  it('/api/auth/me (GET) - success', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveProperty('email', 'e2e@example.com');
  });

  it('/api/auth/me (GET) - unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('/api/auth/refresh (POST) - success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('/api/auth/refresh (POST) - revoked token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('/api/auth/logout (POST) - success', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(204);
  });
});
