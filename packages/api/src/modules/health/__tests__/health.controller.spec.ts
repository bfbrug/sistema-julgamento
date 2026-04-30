import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import supertest from 'supertest'
import { createTestApp } from '../../../../test/setup'
import { PrismaService } from '../../../config/prisma.service'

describe('HealthController (integração)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health → 200 com payload correto quando banco está acessível', async () => {
    const res = await supertest(app.getHttpServer()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.database).toBe('ok')
    expect(res.body.data.timestamp).toBeDefined()
  })

  it('GET /health → 503 quando banco está inacessível', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection refused'))

    const res = await supertest(app.getHttpServer()).get('/health')
    expect(res.status).toBe(503)
  })

  it('GET /health → não retorna 401 sem token de autenticação', async () => {
    const res = await supertest(app.getHttpServer()).get('/health')
    expect(res.status).not.toBe(401)
  })

  it('GET /api/health → 404 (rota está fora do prefixo /api)', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/health')
    expect(res.status).toBe(404)
  })
})
