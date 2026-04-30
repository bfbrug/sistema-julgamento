import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { DatabaseModule } from '../../config/database.module'
import Redis from 'ioredis'
import { env } from '../../config/env'
import { REDIS_HEALTH_CLIENT } from './health.constants'

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    {
      provide: REDIS_HEALTH_CLIENT,
      useFactory: () =>
        new Redis(env.REDIS_URL, {
          lazyConnect: true,
          connectTimeout: 3000,
          maxRetriesPerRequest: 1,
        }),
    },
  ],
})
export class HealthModule {}
