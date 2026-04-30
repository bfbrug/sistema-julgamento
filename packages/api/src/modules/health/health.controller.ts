import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { PrismaService } from '../../config/prisma.service'
import { Public } from '../../common/decorators/public.decorator'
import { SkipThrottle } from '@nestjs/throttler'
import Redis from 'ioredis'
import { REDIS_HEALTH_CLIENT } from './health.constants'

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REDIS_HEALTH_CLIENT) private readonly redis: Redis,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @Public()
  async check(): Promise<{ status: string; timestamp: string; database: string; redis: string }> {
    let databaseStatus = 'ok'
    let redisStatus = 'ok'
    let hasError = false

    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch (err) {
      this.logger.error({ err }, 'Health check — database falhou')
      databaseStatus = 'unreachable'
      hasError = true
    }

    try {
      await this.redis.ping()
    } catch (err) {
      this.logger.error({ err }, 'Health check — redis falhou')
      redisStatus = 'unreachable'
      hasError = true
    }

    if (hasError) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: databaseStatus,
        redis: redisStatus,
      })
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'ok',
      redis: 'ok',
    }
  }
}
