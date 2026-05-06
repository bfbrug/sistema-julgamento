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
import { env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  app.useLogger(app.get(Logger))

  const isProduction = env.NODE_ENV === 'production'

  // ── Helmet — headers de segurança HTTP ────────────────────────────────────
  await app.register(helmet, {
    // Em produção, aplica CSP restritivo. Em dev, desabilitado para facilitar debugging.
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    // Impede clickjacking
    frameguard: { action: 'deny' },
    // Remove header X-Powered-By
    hidePoweredBy: true,
    // Ativa HSTS em produção (força HTTPS por 1 ano)
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    // Previne MIME-type sniffing
    noSniff: true,
    // Previne XSS em browsers legados
    xssFilter: true,
  })

  // ── Upload multipart ───────────────────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: env.PARTICIPANT_PHOTO_MAX_BYTES * 2,
    },
  })

  // ── Arquivos estáticos (uploads) ───────────────────────────────────────────
  const uploadsRoot = path.resolve(env.STORAGE_LOCAL_ROOT)
  await app.register(staticPlugin, {
    root: uploadsRoot,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.setGlobalPrefix('api', { exclude: ['health'] })

  // ── Validação global (whitelist + transform) ───────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: 422,
    }),
  )

  // ── CORS — aceita múltiplas origens separadas por vírgula ─────────────────
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim())
  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ferramentas como curl, Postman)
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`), false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })

  await app.listen(env.PORT, '0.0.0.0')
}

bootstrap()
