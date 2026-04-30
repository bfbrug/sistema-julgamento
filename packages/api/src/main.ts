import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import helmet from '@fastify/helmet'
import * as path from 'path'
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

  // Helmet — headers de segurança HTTP
  await app.register(helmet, {
    contentSecurityPolicy: false, // desabilitado para não conflitar com API REST pura
  })

  // Registra @fastify/multipart para upload de arquivos
  await app.register(multipart, {
    limits: {
      fileSize: env.PARTICIPANT_PHOTO_MAX_BYTES * 2, // margem para validação no service
    },
  })

  // Serve arquivos estáticos da pasta uploads
  const uploadsRoot = path.resolve(env.STORAGE_LOCAL_ROOT)
  await app.register(staticPlugin, {
    root: uploadsRoot,
    prefix: '/uploads/',
    decorateReply: false,
  })

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
