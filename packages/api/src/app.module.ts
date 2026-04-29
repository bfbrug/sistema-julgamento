import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './config/database.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { HealthModule } from './modules/health/health.module'
import { env } from './config/env'
import { AuthModule } from './modules/auth/auth.module'
import { AuditModule } from './modules/audit/audit.module'
import { UsersModule } from './modules/users/users.module'
import { EventsModule } from './modules/events/events.module'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from './modules/auth/guards/roles.guard'
import { CategoriesModule } from './modules/categories/categories.module'
import { JudgesModule } from './modules/judges/judges.module'
import { ParticipantsModule } from './modules/participants/participants.module'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        redact: ['req.headers.authorization', 'req.body.password', 'password'],
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AuditModule,
    EventsModule,
    CategoriesModule,
    JudgesModule,
    ParticipantsModule,
    UsersModule,
    EventsModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: env.THROTTLE_AUTH_TTL * 1000, limit: env.THROTTLE_AUTH_LIMIT },
    ]),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
