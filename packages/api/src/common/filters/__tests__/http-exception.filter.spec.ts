import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Controller, Get, NotFoundException } from '@nestjs/common'
import supertest from 'supertest'
import { Test } from '@nestjs/testing'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../../app.module'
import { HttpExceptionFilter } from '../http-exception.filter'
import { ResponseInterceptor } from '../../interceptors/response.interceptor'
import { Logger } from 'nestjs-pino'
import { AppException } from '../../exceptions/app.exception'

@Controller('test-errors')
class TestErrorController {
  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Recurso não encontrado')
  }

  @Get('app-exception')
  appException(): never {
    throw new AppException('Saldo insuficiente', 422, 'INSUFFICIENT_BALANCE')
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('Erro interno inesperado')
  }
}

describe('HttpExceptionFilter (E2E)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestErrorController],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )

    app.useLogger(app.get(Logger))
    app.setGlobalPrefix('api', { exclude: ['health'] })
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, errorHttpStatusCode: 422 }),
    )
    app.useGlobalFilters(app.get(HttpExceptionFilter))
    app.useGlobalInterceptors(app.get(ResponseInterceptor))

    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('NotFoundException → 404 com body { error }', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/test-errors/not-found')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
  })

  it('AppException com code → 422 com { error, code }', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/test-errors/app-exception')
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Saldo insuficiente')
    expect(res.body.code).toBe('INSUFFICIENT_BALANCE')
  })

  it('Erro inesperado → 500 com mensagem genérica (NODE_ENV=test não expõe stack)', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/test-errors/unexpected')
    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
    expect(res.body.error).not.toContain('stack')
  })
})
