import { describe, it, expect, vi } from 'vitest'
import { HealthController } from '../health.controller'
import { ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../../../config/prisma.service'
import { PinoLogger } from 'nestjs-pino'
import Redis from 'ioredis'

function makePrisma(healthy = true) {
  return {
    $queryRaw: vi.fn().mockImplementation(() =>
      healthy ? Promise.resolve([{ '?column?': 1 }]) : Promise.reject(new Error('DB down')),
    ),
  } as unknown as PrismaService
}

function makeRedis(healthy = true) {
  return {
    ping: vi.fn().mockImplementation(() =>
      healthy ? Promise.resolve('PONG') : Promise.reject(new Error('Redis down')),
    ),
    status: healthy ? 'ready' : 'end',
  } as unknown as Redis
}

function makeLogger() {
  return { error: vi.fn(), info: vi.fn() } as unknown as PinoLogger
}

describe('HealthController', () => {
  it('retorna ok quando DB e Redis estão saudáveis', async () => {
    const controller = new HealthController(makePrisma(), makeRedis(), makeLogger())
    const result = await controller.check()

    expect(result.status).toBe('ok')
    expect(result.database).toBe('ok')
    expect(result.redis).toBe('ok')
  })

  it('lança ServiceUnavailableException quando Redis está down', async () => {
    const controller = new HealthController(makePrisma(), makeRedis(false), makeLogger())

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException)
  })

  it('lança ServiceUnavailableException quando DB está down', async () => {
    const controller = new HealthController(makePrisma(false), makeRedis(), makeLogger())

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException)
  })
})
