import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  app.useLogger(app.get(Logger))

  app.setGlobalPrefix('api', { exclude: ['health'] })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: 422,
    }),
  )

  app.useGlobalFilters(app.get(HttpExceptionFilter))
  app.useGlobalInterceptors(app.get(ResponseInterceptor))

  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })

  await app.listen(env.PORT, '0.0.0.0')
}

bootstrap()
