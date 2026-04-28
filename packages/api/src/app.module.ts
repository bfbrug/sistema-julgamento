import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './config/database.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { HealthModule } from './modules/health/health.module'
import { env } from './config/env'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter, ResponseInterceptor],
})
export class AppModule {}
