# P01 — Bootstrap da API (NestJS + Fastify + Observabilidade) — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa por tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Subir a API NestJS com Fastify, Pino, Prisma e health check operacionais, com toda infraestrutura global (filtros, interceptors, pipes, validação de env) pronta para os módulos de domínio futuros.

**Arquitetura:** Servidor HTTP usando `NestFastifyApplication` com `FastifyAdapter`. Variáveis de ambiente validadas via Zod no boot (fail-fast). `PrismaService` como `@Global()` provider. `HttpExceptionFilter` e `ResponseInterceptor` registrados via `app.get()` para permitir injeção de dependências (ex.: PinoLogger no filtro).

**Tech Stack:** NestJS 11, `@nestjs/platform-fastify`, Prisma 6, `nestjs-pino`, `pino-pretty`, Zod, Vitest 3, Supertest, `class-validator`, `class-transformer`.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `packages/api/package.json` | Modificar | Adicionar todas as dependências; atualizar scripts |
| `packages/api/tsconfig.json` | Modificar | Adicionar `experimentalDecorators`, `emitDecoratorMetadata`, corrigir `moduleResolution` |
| `packages/api/vitest.config.ts` | Criar | Config Vitest com coverage thresholds |
| `packages/api/prisma/schema.prisma` | Criar | datasource + generator (sem models) |
| `packages/api/.env.example` | Criar | Documentação de variáveis obrigatórias |
| `packages/api/src/config/env.ts` | Criar | Validação Zod de env; única fonte de `process.env` |
| `packages/api/src/config/prisma.service.ts` | Criar | `PrismaClient` como `@Injectable` com lifecycle hooks |
| `packages/api/src/config/database.module.ts` | Criar | `@Global()` module exportando `PrismaService` |
| `packages/api/src/common/exceptions/app.exception.ts` | Criar | `HttpException` estendida com campo `code` |
| `packages/api/src/common/filters/http-exception.filter.ts` | Criar | Filtro global capturando todos os erros |
| `packages/api/src/common/interceptors/response.interceptor.ts` | Criar | Envelope `{ data }` em toda resposta de sucesso |
| `packages/api/src/common/decorators/public.decorator.ts` | Criar | `@Public()` — marca rota como pública |
| `packages/api/src/common/decorators/current-user.decorator.ts` | Criar | `@CurrentUser()` — stub extrai `req.user` |
| `packages/api/src/common/decorators/roles.decorator.ts` | Criar | `@Roles()` — stub marca roles necessárias |
| `packages/api/src/modules/health/health.module.ts` | Criar | Módulo do health check |
| `packages/api/src/modules/health/health.controller.ts` | Criar | `GET /health` com verificação de banco |
| `packages/api/src/app.module.ts` | Criar | Módulo raiz importando `DatabaseModule`, `LoggerModule`, `HealthModule` |
| `packages/api/src/main.ts` | Criar | Bootstrap com `FastifyAdapter`, pipes, filtros, interceptors globais |
| `packages/api/test/setup.ts` | Criar | `createTestApp()` para testes de integração |
| `packages/api/test/helpers.ts` | Criar | `cleanDb()` stub para testes futuros |
| `packages/api/src/config/__tests__/env.spec.ts` | Criar | Testes unitários da validação de env |
| `packages/api/src/common/exceptions/__tests__/app.exception.spec.ts` | Criar | Testes unitários do `AppException` |
| `packages/api/src/common/interceptors/__tests__/response.interceptor.spec.ts` | Criar | Testes unitários do `ResponseInterceptor` |
| `packages/api/src/common/filters/__tests__/http-exception.filter.spec.ts` | Criar | Testes E2E do `HttpExceptionFilter` via app completa |
| `packages/api/src/modules/health/__tests__/health.controller.spec.ts` | Criar | Testes de integração do health check |
| `PROJECT_PROGRESS.md` | Modificar | Marcar P01 como concluído |

---

## Tarefa 1: Configurar `package.json` e `tsconfig.json`

**Arquivos:**
- Modificar: `packages/api/package.json`
- Modificar: `packages/api/tsconfig.json`

- [ ] **Passo 1.1: Substituir `packages/api/package.json` com dependências completas**

```json
{
  "name": "@judging/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node -r tsconfig-paths/register src/main.ts",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src/ --ext .ts",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@nestjs/common": "11.1.0",
    "@nestjs/core": "11.1.0",
    "@nestjs/platform-fastify": "11.1.0",
    "@prisma/client": "6.7.0",
    "class-transformer": "0.5.1",
    "class-validator": "0.14.1",
    "fastify": "5.3.2",
    "nestjs-pino": "4.4.0",
    "pino": "9.6.0",
    "pino-http": "10.4.0",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2",
    "zod": "3.24.3"
  },
  "devDependencies": {
    "@nestjs/testing": "11.1.0",
    "@types/node": "22.15.3",
    "@types/supertest": "6.0.2",
    "@typescript-eslint/eslint-plugin": "8.32.0",
    "@typescript-eslint/parser": "8.32.0",
    "@vitest/coverage-v8": "3.1.3",
    "eslint": "9.26.0",
    "pino-pretty": "13.0.0",
    "prisma": "6.7.0",
    "supertest": "7.1.0",
    "ts-node": "10.9.2",
    "tsconfig-paths": "4.2.0",
    "typescript": "5.8.3",
    "vitest": "3.1.3"
  }
}
```

- [ ] **Passo 1.2: Substituir `packages/api/tsconfig.json` com opções obrigatórias do NestJS**

O `tsconfig.base.json` usa `moduleResolution: "bundler"` que é incompatível com `tsc` direto (usado pelo NestJS). A API precisa sobrescrever para `node16` e adicionar decorators.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "CommonJS",
    "moduleResolution": "node16",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Passo 1.3: Instalar dependências**

```bash
cd packages/api && pnpm install
```

Esperado: sem erros, `node_modules` criado.

- [ ] **Passo 1.4: Gerar cliente Prisma (schema mínimo primeiro)**

Criar `packages/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Criar diretório vazio de migrations:
```bash
mkdir -p packages/api/prisma/migrations
```

Gerar o client:
```bash
cd packages/api && pnpm prisma:generate
```

Esperado: `Generated Prisma Client` sem erros.

- [ ] **Passo 1.5: Commit**

```bash
git checkout -b feature/p01-bootstrap-api
git add packages/api/package.json packages/api/tsconfig.json packages/api/prisma/
git commit -m "chore(api): adiciona dependências do NestJS, Fastify, Prisma e Pino"
```

---

## Tarefa 2: Configurar Vitest e `.env.example`

**Arquivos:**
- Criar: `packages/api/vitest.config.ts`
- Criar: `packages/api/.env.example`

- [ ] **Passo 2.1: Criar `packages/api/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts',
        'prisma/**',
        'vitest.config.ts',
        'src/main.ts',
        'dist/**',
        'test/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

- [ ] **Passo 2.2: Criar `packages/api/.env.example`**

```env
# Ambiente: development | production | test
NODE_ENV=development

# Porta do servidor HTTP
PORT=3000

# Nível de log: trace | debug | info | warn | error | fatal
LOG_LEVEL=info

# URL de conexão com o PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/judging_dev"

# Origem permitida para CORS (nunca usar * em produção)
CORS_ORIGIN=http://localhost:3001
```

- [ ] **Passo 2.3: Verificar que `.env` está no `.gitignore`**

```bash
grep -n "\.env" .gitignore
```

Esperado: linha com `.env` presente. Se ausente, adicionar ao `.gitignore` raiz:
```
.env
packages/**/.env
```

- [ ] **Passo 2.4: Commit**

```bash
git add packages/api/vitest.config.ts packages/api/.env.example
git commit -m "chore(api): configura Vitest e documenta variáveis de ambiente"
```

---

## Tarefa 3: Validação de env com Zod

**Arquivos:**
- Criar: `packages/api/src/config/env.ts`
- Criar: `packages/api/src/config/__tests__/env.spec.ts`

- [ ] **Passo 3.1: Escrever teste falhando primeiro**

Criar `packages/api/src/config/__tests__/env.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('falha quando DATABASE_URL está ausente', async () => {
    delete process.env['DATABASE_URL']
    await expect(() => import('../env')).rejects.toThrow()
  })

  it('falha quando PORT não é numérica', async () => {
    process.env['PORT'] = 'abc'
    process.env['DATABASE_URL'] = 'postgresql://localhost/test'
    await expect(() => import('../env')).rejects.toThrow()
  })

  it('retorna objeto tipado com env válida', async () => {
    process.env['NODE_ENV'] = 'development'
    process.env['PORT'] = '3000'
    process.env['DATABASE_URL'] = 'postgresql://localhost/test'
    process.env['CORS_ORIGIN'] = 'http://localhost:3001'
    process.env['LOG_LEVEL'] = 'info'

    const { env } = await import('../env')

    expect(env.PORT).toBe(3000)
    expect(env.NODE_ENV).toBe('development')
    expect(env.DATABASE_URL).toBe('postgresql://localhost/test')
  })
})
```

- [ ] **Passo 3.2: Rodar para confirmar falha**

```bash
cd packages/api && pnpm test src/config/__tests__/env.spec.ts
```

Esperado: FAIL — `Cannot find module '../env'`

- [ ] **Passo 3.3: Implementar `packages/api/src/config/env.ts`**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN deve ser uma URL válida').default('http://localhost:3001'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  const message = Object.entries(errors)
    .map(([field, msgs]) => `  ${field}: ${(msgs ?? []).join(', ')}`)
    .join('\n')
  throw new Error(`Variáveis de ambiente inválidas:\n${message}`)
}

export const env = parsed.data
export type Env = typeof env
```

- [ ] **Passo 3.4: Rodar testes e confirmar verde**

```bash
cd packages/api && pnpm test src/config/__tests__/env.spec.ts
```

Esperado: PASS (3 testes)

- [ ] **Passo 3.5: Commit**

```bash
git add packages/api/src/config/env.ts packages/api/src/config/__tests__/env.spec.ts
git commit -m "feat(api): valida variáveis de ambiente com Zod no boot"
```

---

## Tarefa 4: `AppException`

**Arquivos:**
- Criar: `packages/api/src/common/exceptions/app.exception.ts`
- Criar: `packages/api/src/common/exceptions/__tests__/app.exception.spec.ts`

- [ ] **Passo 4.1: Escrever teste falhando**

Criar `packages/api/src/common/exceptions/__tests__/app.exception.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { AppException } from '../app.exception'

describe('AppException', () => {
  it('preserva message, statusCode e code', () => {
    const ex = new AppException('Saldo insuficiente', 422, 'INSUFFICIENT_BALANCE')
    expect(ex.message).toBe('Saldo insuficiente')
    expect(ex.getStatus()).toBe(422)
    expect(ex.code).toBe('INSUFFICIENT_BALANCE')
  })

  it('getResponse retorna { message, code }', () => {
    const ex = new AppException('Erro de teste', 400, 'TEST_CODE')
    const response = ex.getResponse() as Record<string, unknown>
    expect(response['message']).toBe('Erro de teste')
    expect(response['code']).toBe('TEST_CODE')
  })

  it('funciona sem code (code é opcional)', () => {
    const ex = new AppException('Não encontrado', 404)
    expect(ex.code).toBeUndefined()
    const response = ex.getResponse() as Record<string, unknown>
    expect(response['code']).toBeUndefined()
  })
})
```

- [ ] **Passo 4.2: Rodar para confirmar falha**

```bash
cd packages/api && pnpm test src/common/exceptions/__tests__/app.exception.spec.ts
```

Esperado: FAIL — `Cannot find module '../app.exception'`

- [ ] **Passo 4.3: Implementar `packages/api/src/common/exceptions/app.exception.ts`**

```typescript
import { HttpException } from '@nestjs/common'

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    public readonly code?: string,
  ) {
    super({ message, ...(code !== undefined && { code }) }, statusCode)
  }
}
```

- [ ] **Passo 4.4: Rodar testes e confirmar verde**

```bash
cd packages/api && pnpm test src/common/exceptions/__tests__/app.exception.spec.ts
```

Esperado: PASS (3 testes)

- [ ] **Passo 4.5: Commit**

```bash
git add packages/api/src/common/exceptions/
git commit -m "feat(api): implementa AppException com campo code opcional"
```

---

## Tarefa 5: `ResponseInterceptor`

**Arquivos:**
- Criar: `packages/api/src/common/interceptors/response.interceptor.ts`
- Criar: `packages/api/src/common/interceptors/__tests__/response.interceptor.spec.ts`

- [ ] **Passo 5.1: Escrever testes falhando**

Criar `packages/api/src/common/interceptors/__tests__/response.interceptor.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ResponseInterceptor } from '../response.interceptor'
import { ExecutionContext, CallHandler } from '@nestjs/common'
import { of } from 'rxjs'
import { lastValueFrom } from 'rxjs'

function makeContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext
}

function makeHandler(body: unknown): CallHandler {
  return { handle: () => of(body) }
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor()

  it('envelopa body simples em { data }', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler({ id: 1 }))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: { id: 1 } })
  })

  it('preserva { data, meta } quando body já tem esse formato', async () => {
    const body = { data: [1, 2], meta: { page: 1, total: 2, limit: 10, totalPages: 1 } }
    const obs = interceptor.intercept(makeContext(200), makeHandler(body))
    const result = await lastValueFrom(obs)
    expect(result).toEqual(body)
  })

  it('não envelopa quando status é 204', async () => {
    const obs = interceptor.intercept(makeContext(204), makeHandler(null))
    const result = await lastValueFrom(obs)
    expect(result).toBeNull()
  })

  it('retorna { data: null } quando body é null', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler(null))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: null })
  })

  it('retorna { data: null } quando body é undefined', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler(undefined))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: null })
  })
})
```

- [ ] **Passo 5.2: Rodar para confirmar falha**

```bash
cd packages/api && pnpm test src/common/interceptors/__tests__/response.interceptor.spec.ts
```

Esperado: FAIL — `Cannot find module '../response.interceptor'`

- [ ] **Passo 5.3: Implementar `packages/api/src/common/interceptors/response.interceptor.ts`**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

type PaginatedBody = { data: unknown; meta: unknown }

function isPaginated(body: unknown): body is PaginatedBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    'meta' in body
  )
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{ statusCode: number }>()

    return next.handle().pipe(
      map((body: unknown) => {
        if (response.statusCode === 204) return body
        if (isPaginated(body)) return body
        return { data: body ?? null }
      }),
    )
  }
}
```

- [ ] **Passo 5.4: Rodar testes e confirmar verde**

```bash
cd packages/api && pnpm test src/common/interceptors/__tests__/response.interceptor.spec.ts
```

Esperado: PASS (5 testes)

- [ ] **Passo 5.5: Commit**

```bash
git add packages/api/src/common/interceptors/
git commit -m "feat(api): implementa ResponseInterceptor com envelope { data }"
```

---

## Tarefa 6: `HttpExceptionFilter`

**Arquivos:**
- Criar: `packages/api/src/common/filters/http-exception.filter.ts`

> Nota: os testes do filtro são feitos via app E2E completa na Tarefa 11, pois o filtro depende do contexto Fastify.

- [ ] **Passo 6.1: Criar `packages/api/src/common/filters/http-exception.filter.ts`**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { env } from '../../config/env'

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const req = ctx.getRequest<FastifyRequest>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse() as Record<string, unknown>

      const message = Array.isArray(response['message'])
        ? response['message']
        : (response['message'] ?? exception.message)

      void reply.status(status).send({
        error: message,
        ...(response['code'] !== undefined && { code: response['code'] }),
        ...(response['details'] !== undefined && { details: response['details'] }),
      })
      return
    }

    this.logger.error({ err: exception, path: req.url }, 'Exceção não tratada')

    const message =
      env.NODE_ENV === 'development' && exception instanceof Error
        ? exception.message
        : 'Erro interno do servidor'

    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: message })
  }
}
```

- [ ] **Passo 6.2: Commit parcial (filtro sem testes E2E ainda)**

```bash
git add packages/api/src/common/filters/http-exception.filter.ts
git commit -m "feat(api): implementa HttpExceptionFilter global"
```

---

## Tarefa 7: Decorators stubs

**Arquivos:**
- Criar: `packages/api/src/common/decorators/public.decorator.ts`
- Criar: `packages/api/src/common/decorators/current-user.decorator.ts`
- Criar: `packages/api/src/common/decorators/roles.decorator.ts`

- [ ] **Passo 7.1: Criar `packages/api/src/common/decorators/public.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

- [ ] **Passo 7.2: Criar `packages/api/src/common/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>()
    return request.user
  },
)
```

- [ ] **Passo 7.3: Criar `packages/api/src/common/decorators/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
```

- [ ] **Passo 7.4: Commit**

```bash
git add packages/api/src/common/decorators/
git commit -m "feat(api): adiciona decorators stubs Public, CurrentUser e Roles"
```

---

## Tarefa 8: `PrismaService` e `DatabaseModule`

**Arquivos:**
- Criar: `packages/api/src/config/prisma.service.ts`
- Criar: `packages/api/src/config/database.module.ts`

- [ ] **Passo 8.1: Criar `packages/api/src/config/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
```

- [ ] **Passo 8.2: Criar `packages/api/src/config/database.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- [ ] **Passo 8.3: Commit**

```bash
git add packages/api/src/config/prisma.service.ts packages/api/src/config/database.module.ts
git commit -m "feat(api): implementa PrismaService e DatabaseModule global"
```

---

## Tarefa 9: `HealthModule` e `HealthController`

**Arquivos:**
- Criar: `packages/api/src/modules/health/health.module.ts`
- Criar: `packages/api/src/modules/health/health.controller.ts`

- [ ] **Passo 9.1: Criar `packages/api/src/modules/health/health.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Passo 9.2: Criar `packages/api/src/modules/health/health.controller.ts`**

```typescript
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { PrismaService } from '../../config/prisma.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @Public()
  async check(): Promise<{ status: string; timestamp: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'ok',
      }
    } catch (err) {
      this.logger.error({ err }, 'Health check falhou')
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      })
    }
  }
}
```

- [ ] **Passo 9.3: Commit**

```bash
git add packages/api/src/modules/health/
git commit -m "feat(api): implementa health check com verificação de banco"
```

---

## Tarefa 10: `AppModule` e `main.ts`

**Arquivos:**
- Criar: `packages/api/src/app.module.ts`
- Criar: `packages/api/src/main.ts`

- [ ] **Passo 10.1: Criar `packages/api/src/app.module.ts`**

```typescript
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
```

- [ ] **Passo 10.2: Criar `packages/api/src/main.ts`**

```typescript
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
```

- [ ] **Passo 10.3: Verificar type-check passa**

```bash
cd packages/api && pnpm type-check
```

Esperado: sem erros de TypeScript.

- [ ] **Passo 10.4: Commit**

```bash
git add packages/api/src/app.module.ts packages/api/src/main.ts
git commit -m "feat(api): configura bootstrap com FastifyAdapter, Pino e prefixo /api"
```

---

## Tarefa 11: Testes de integração — health check e filtro

**Arquivos:**
- Criar: `packages/api/test/setup.ts`
- Criar: `packages/api/test/helpers.ts`
- Criar: `packages/api/src/modules/health/__tests__/health.controller.spec.ts`
- Criar: `packages/api/src/common/filters/__tests__/http-exception.filter.spec.ts`

- [ ] **Passo 11.1: Criar `packages/api/test/helpers.ts`**

```typescript
import { PrismaService } from '../src/config/prisma.service'

export async function cleanDb(prisma: PrismaService): Promise<void> {
  // Será implementado nos prompts futuros quando os models existirem
  void prisma
}
```

- [ ] **Passo 11.2: Criar `packages/api/test/setup.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { Logger } from 'nestjs-pino'

let app: NestFastifyApplication

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
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

  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  return app
}

export function getApp(): NestFastifyApplication {
  return app
}
```

- [ ] **Passo 11.3: Criar testes do health controller**

Criar `packages/api/src/modules/health/__tests__/health.controller.spec.ts`:

```typescript
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
```

- [ ] **Passo 11.4: Criar testes do HttpExceptionFilter via app E2E**

Criar `packages/api/src/common/filters/__tests__/http-exception.filter.spec.ts`:

```typescript
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

// Controller auxiliar apenas para testes
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
```

- [ ] **Passo 11.5: Configurar `.env.test` para testes de integração**

Criar `packages/api/.env.test`:
```env
NODE_ENV=test
PORT=3001
LOG_LEVEL=error
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/judging_test"
CORS_ORIGIN=http://localhost:3001
```

> **Nota:** `.env.test` também deve estar no `.gitignore`. Verificar.

Atualizar `packages/api/vitest.config.ts` para carregar `.env.test`:

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    env: loadEnv(mode, process.cwd(), ''),
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts',
        'prisma/**',
        'vitest.config.ts',
        'src/main.ts',
        'dist/**',
        'test/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}))
```

> **Nota:** Para testes de integração que precisam do banco, o Docker Compose deve estar rodando (`docker compose up -d`). Os testes unitários (env, AppException, ResponseInterceptor) não precisam de banco.

- [ ] **Passo 11.6: Rodar todos os testes (unitários apenas, sem banco necessário)**

```bash
cd packages/api && pnpm test:ci --reporter=verbose 2>&1 | head -60
```

Esperado: testes unitários passam. Testes de integração podem falhar se banco não estiver disponível — isso é esperado em ambiente sem Docker.

- [ ] **Passo 11.7: Commit dos testes**

```bash
git add packages/api/test/ packages/api/src/modules/health/__tests__/ packages/api/src/common/filters/__tests__/ packages/api/.env.test packages/api/vitest.config.ts
git commit -m "test(api): adiciona testes unitários e integração da fundação"
```

---

## Tarefa 12: Verificação final e atualização do `PROJECT_PROGRESS.md`

- [ ] **Passo 12.1: Verificar lint**

```bash
cd packages/api && pnpm lint
```

Esperado: sem warnings nem erros. Se o ESLint reclamar de `@typescript-eslint/eslint-plugin` não configurado para NestJS, adicionar ao `eslint.config.mjs` raiz a regra `@typescript-eslint/no-unsafe-call: off` para decorators — ver nota abaixo.

> **Nota sobre ESLint e decorators:** O `eslint.config.mjs` raiz pode precisar de ajustes para arquivos `.ts` com decorators. Se `pnpm lint` falhar com erros relacionados a decorators ou `any` em tipos gerados pelo Prisma, adicionar override para `packages/api/src/**`:

```javascript
// Adicionar ao eslint.config.mjs existente na raiz:
{
  files: ['packages/api/src/**/*.ts'],
  rules: {
    '@typescript-eslint/no-unsafe-call': 'off',       // necessário para decorators NestJS
    '@typescript-eslint/no-unsafe-member-access': 'off', // necessário para decorators
  },
}
```

- [ ] **Passo 12.2: Verificar type-check**

```bash
cd packages/api && pnpm type-check
```

Esperado: sem erros.

- [ ] **Passo 12.3: Subir Docker e testar manualmente**

```bash
docker compose up -d
```

Aguardar 5 segundos para postgres subir, depois:

```bash
cp packages/api/.env.example packages/api/.env
# Editar .env se necessário (DATABASE_URL deve bater com docker-compose)
cd packages/api && pnpm dev
```

Em outro terminal:
```bash
curl http://localhost:3000/health
```

Esperado: `{"data":{"status":"ok","timestamp":"...","database":"ok"}}`

```bash
curl http://localhost:3000/api/health
```

Esperado: `404`

- [ ] **Passo 12.4: Rodar testes de integração com banco disponível**

```bash
cd packages/api && pnpm test:ci
```

Esperado: todos os testes passam com cobertura ≥ 80%.

- [ ] **Passo 12.5: Atualizar `PROJECT_PROGRESS.md`**

Editar `PROJECT_PROGRESS.md` na raiz:

1. Marcar P01 como `[x]`
2. Preencher `Concluído em: 2026-04-27`
3. Preencher `Branch mergeada: feature/p01-bootstrap-api`
4. Preencher `Cobertura final:` com valores reais do output do `pnpm test:ci`
5. Atualizar `Prompts concluídos: 2 de 20`
6. Atualizar `Próximo prompt: P02 — Bootstrap do Web`
7. Adicionar entrada no **Histórico de execução**

- [ ] **Passo 12.6: Commit final**

```bash
git add PROJECT_PROGRESS.md
git commit -m "docs(progress): conclui P01 — Bootstrap da API"
```

- [ ] **Passo 12.7: Abrir Pull Request**

```bash
gh pr create \
  --title "P01: Bootstrap da API" \
  --base develop \
  --body "$(cat .github/pull_request_template.md)"
```

Preencher o template com:
- **Tipo:** feat
- **Prompt:** P01 — Bootstrap da API
- **Resumo:** Implementa fundação da API NestJS com FastifyAdapter, PrismaService, Pino logger, HttpExceptionFilter, ResponseInterceptor, ValidationPipe global e health check em `/health`.
- **Checklist:** marcar todos os itens da seção 7 do prompt P01

---

## Notas Técnicas

### Por que `moduleResolution: "node16"` e não `"bundler"` na API?

O `tsconfig.base.json` usa `"bundler"` que é ideal para Next.js/Vite mas incompatível com `tsc` direto. O NestJS compila via `tsc` puro, portanto a API sobrescreve para `"node16"` (compatível com Node 20 e CommonJS).

### Por que `HttpExceptionFilter` e `ResponseInterceptor` são providers no `AppModule`?

O `HttpExceptionFilter` injeta `PinoLogger` via `@InjectPinoLogger`. Para que o container de DI do NestJS resolva essa injeção quando `app.get(HttpExceptionFilter)` é chamado no `main.ts`, ambos precisam ser registrados como providers. Alternativa (`new HttpExceptionFilter(logger)`) quebraria o padrão de injeção.

### Testes de integração e banco de dados

Os testes de integração (`health.controller.spec.ts`, `http-exception.filter.spec.ts`) conectam ao banco real. Em CI, o banco deve estar disponível (via GitHub Actions `services.postgres`). Localmente, rodar `docker compose up -d` antes de `pnpm test:ci`.
