# Project Standards & Architecture Guide

> Documento de referência obrigatório para qualquer desenvolvedor ou agente de IA que trabalhe neste projeto.
> Toda nova funcionalidade deve seguir estas regras sem exceção.

---

## Sumário

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Regras da API (backend)](#3-regras-da-api-backend)
4. [Regras do Frontend](#4-regras-do-frontend)
5. [Pacote Shared](#5-pacote-shared)
6. [Banco de dados](#6-banco-de-dados)
7. [E-mail](#7-e-mail)
8. [Tratamento de erros](#8-tratamento-de-erros)
9. [Health check](#9-health-check)
10. [WebSockets e tempo real](#10-websockets-e-tempo-real)
11. [Geração de PDF](#11-geração-de-pdf)
12. [Upload e armazenamento de arquivos](#12-upload-e-armazenamento-de-arquivos)
13. [Auditoria de domínio](#13-auditoria-de-domínio)
14. [Filas e processamento assíncrono](#14-filas-e-processamento-assíncrono)
15. [Testes — regras absolutas](#15-testes--regras-absolutas)
16. [CI/CD e qualidade de código](#16-cicd-e-qualidade-de-código)
17. [Convenções de nomenclatura](#17-convenções-de-nomenclatura)
18. [Mensagens de commit](#18-mensagens-de-commit)
19. [Fluxo de trabalho com Git e GitHub](#19-fluxo-de-trabalho-com-git-e-github)
20. [Segurança](#20-segurança)
21. [O que SEMPRE fazer](#21-o-que-sempre-fazer)
22. [O que JAMAIS fazer](#22-o-que-jamais-fazer)
23. [Checklist de entrega de funcionalidade](#23-checklist-de-entrega-de-funcionalidade)

---

## 1. Visão geral da arquitetura

O projeto é um **monorepo** com três pacotes independentes que se comunicam via tipos e schemas compartilhados.

```
my-project/
├── packages/
│   ├── api/        → API REST (NestJS + Fastify + Prisma)
│   ├── web/        → Frontend (Next.js App Router)
│   └── shared/     → Tipos TypeScript + schemas Zod compartilhados
├── e2e/            → Testes end-to-end (Playwright)
├── .github/
│   └── workflows/  → CI/CD (GitHub Actions)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

**Stack obrigatória:**

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Linguagem | TypeScript (strict mode) |
| Framework API | NestJS 11+ |
| Adapter HTTP | Fastify (via `@nestjs/platform-fastify`) |
| Validação de entrada | `class-validator` + `class-transformer` (DTOs) |
| Schemas compartilhados | Zod (pacote `shared` — reutilizado no frontend) |
| ORM | Prisma |
| Frontend | Next.js 14+ (App Router) |
| Banco de dados | PostgreSQL |
| Tempo real | WebSocket Gateway (`@nestjs/websockets` + Socket.IO) |
| Geração de PDF | Puppeteer (Chromium headless) com templates HTML |
| Storage de arquivos | Filesystem local (dev) / S3-compatible (prod, via `@aws-sdk/client-s3`) |
| Filas e jobs | BullMQ + Redis (via `@nestjs/bullmq`) |
| Testes unitários/integração | Vitest + `@nestjs/testing` + Supertest |
| Testes E2E | Playwright |
| Logger | pino (via `nestjs-pino`) |
| Gerenciador de pacotes | pnpm + workspaces |
| Pipeline de build | Turborepo |
| E-mail | Nodemailer ou Resend |

---

## 2. Estrutura de pastas

### 2.1 API — estrutura completa

```
packages/api/
├── prisma/
│   ├── schema.prisma              ← fonte de verdade do banco
│   ├── migrations/                ← gerado pelo prisma migrate (nunca editar manualmente)
│   └── seeds/
│       ├── dev.seed.ts            ← dados para desenvolvimento local
│       └── test.seed.ts           ← dados mínimos para testes
├── src/
│   ├── main.ts                    ← bootstrap: NestFactory + FastifyAdapter + pipes/filters globais
│   ├── app.module.ts              ← módulo raiz: importa todos os módulos de domínio
│   │
│   ├── config/
│   │   ├── env.ts                 ← valida variáveis de ambiente com zod (falha rápido se inválido)
│   │   ├── database.module.ts     ← PrismaModule global exporta PrismaService
│   │   └── prisma.service.ts      ← PrismaClient como @Injectable() singleton
│   │
│   ├── common/                    ← cross-cutting concerns do NestJS
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   ← @Catch() global — formata todos os erros
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts    ← envelopa respostas em { data, meta }
│   │   │   └── logging.interceptor.ts     ← loga req/res com tempo de resposta
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts         ← ValidationPipe global com class-validator
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  ← @CurrentUser() extrai req.user no controller
│   │   │   └── roles.decorator.ts         ← @Roles(...roles) para controle de acesso
│   │   └── exceptions/
│   │       └── app.exception.ts           ← AppException estende HttpException do NestJS
│   │
│   ├── modules/                   ← um diretório por domínio de negócio
│   │   ├── auth/
│   │   │   ├── auth.module.ts             ← declara controller, service, guards, importa JwtModule
│   │   │   ├── auth.controller.ts         ← @Post login/logout/refresh — sem lógica de negócio
│   │   │   ├── auth.service.ts            ← compareHash, signToken, invalidateToken
│   │   │   ├── auth.guard.ts              ← @Injectable Guard — verifica JWT, injeta req.user
│   │   │   ├── roles.guard.ts             ← @Injectable Guard — verifica @Roles() no handler
│   │   │   ├── jwt.strategy.ts            ← Passport strategy — valida e decodifica JWT
│   │   │   ├── dto/
│   │   │   │   └── login.dto.ts           ← class-validator: @IsEmail, @MinLength
│   │   │   └── __tests__/
│   │   │       ├── auth.service.spec.ts   ← unitário: login, senha errada, token expirado
│   │   │       └── auth.controller.spec.ts← integração: POST /auth/login 200/401/422
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts        ← @Get @Post @Patch @Delete + @UseGuards
│   │   │   ├── users.service.ts           ← regras de negócio: create, update, findById
│   │   │   ├── users.repository.ts        ← queries Prisma isoladas do service
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts     ← class-validator + class-transformer
│   │   │   │   └── update-user.dto.ts     ← PartialType(CreateUserDto)
│   │   │   └── __tests__/
│   │   │       ├── users.service.spec.ts
│   │   │       └── users.controller.spec.ts
│   │   │
│   │   ├── products/              ← mesmo padrão de users
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── products.repository.ts
│   │   │   ├── dto/
│   │   │   └── __tests__/
│   │   │
│   │   ├── orders/
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts          ← lógica de negócio: estoque, cálculo, status
│   │   │   ├── orders.repository.ts
│   │   │   ├── dto/
│   │   │   └── __tests__/
│   │   │       ├── orders.service.spec.ts ← unitário: cálculo total, estoque insuficiente
│   │   │       └── orders.controller.spec.ts
│   │   │
│   │   └── health/
│   │       ├── health.module.ts
│   │       ├── health.controller.ts       ← GET /health — verifica app + banco
│   │       └── __tests__/
│   │           └── health.controller.spec.ts
│   │
│   ├── services/                  ← serviços globais (não pertencem a um único módulo)
│   │   ├── email.service.ts       ← sendWelcomeEmail, sendPasswordReset, sendOrderConfirmation
│   │   ├── storage.service.ts
│   │   └── __tests__/
│   │       └── email.service.spec.ts      ← unitário: mock transporter, verifica chamadas
│   │
│   ├── templates/                 ← templates HTML de e-mail
│   │   ├── welcome.html
│   │   └── reset-password.html
│   │
│   └── utils/
│       ├── pagination.ts
│       ├── hash.ts
│       └── __tests__/
│           ├── pagination.spec.ts
│           └── hash.spec.ts
│
├── test/
│   ├── helpers.ts                 ← createTestUser, authToken, cleanDb
│   └── setup.ts                   ← cria NestJS TestingModule com FastifyAdapter
├── .env                           ← desenvolvimento local (nunca comitar)
├── .env.test                      ← banco isolado para testes (nunca comitar)
├── vitest.config.ts
└── tsconfig.json
```

### 2.2 Frontend — estrutura completa

```
packages/web/
└── src/
    ├── app/
    │   ├── (public)/              ← rotas sem autenticação
    │   │   ├── layout.tsx         ← header e footer do site público
    │   │   ├── page.tsx           ← home
    │   │   ├── about/page.tsx
    │   │   └── contact/page.tsx
    │   ├── (admin)/               ← rotas protegidas
    │   │   ├── layout.tsx         ← verifica sessão; redireciona para /auth/login se ausente
    │   │   ├── dashboard/page.tsx
    │   │   ├── users/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── products/
    │   │   └── settings/page.tsx
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   └── forgot-password/page.tsx
    │   ├── api/
    │   │   └── auth/[...nextauth]/route.ts
    │   └── layout.tsx             ← root layout: providers, fontes, metadata
    ├── components/
    │   ├── ui/                    ← componentes base: Button, Input, Modal, Table, Badge
    │   ├── admin/                 ← DataTable, Sidebar, StatCard, FormSection
    │   └── public/                ← Hero, FeatureCard, ContactForm, Footer
    ├── lib/
    │   ├── api.ts                 ← fetch wrapper tipado (usa tipos do shared)
    │   └── auth.ts                ← next-auth config: providers, callbacks, session
    ├── hooks/                     ← SWR ou React Query por entidade
    └── store/                     ← zustand: estado global de UI (sidebar aberta, toast)
```

### 2.3 Shared — estrutura completa

```
packages/shared/
└── src/
    ├── types/
    │   ├── user.types.ts          ← User, CreateUserDTO, UpdateUserDTO
    │   ├── product.types.ts
    │   ├── order.types.ts
    │   └── api.types.ts           ← ApiResponse<T>, PaginatedResponse<T>, ApiError
    ├── schemas/                   ← schemas Zod — reutilizados na API e no frontend
    │   ├── user.schema.ts
    │   ├── product.schema.ts
    │   └── __tests__/
    │       └── user.schema.spec.ts
    └── utils/
        ├── format.ts              ← formatCurrency, formatDate, slugify
        ├── pagination.ts
        └── __tests__/
            └── format.spec.ts
```

---

## 3. Regras da API (backend)

### 3.1 Responsabilidade de cada arquivo NestJS

| Arquivo | Responsabilidade | O que NÃO deve ter |
|---|---|---|
| `*.module.ts` | Declarar e conectar providers, importar dependências | Lógica de qualquer tipo |
| `*.controller.ts` | Receber requisição, chamar service, retornar resposta | Lógica de negócio, queries ao banco |
| `*.service.ts` | Lógica de negócio, orquestração | Queries diretas ao banco, detalhes HTTP |
| `*.repository.ts` | Queries Prisma isoladas | Lógica de negócio |
| `*.guard.ts` | Verificar autenticação ou autorização | Lógica de negócio |
| `*.filter.ts` | Capturar e formatar erros | Lógica de negócio |
| `*.interceptor.ts` | Transformar request/response transversalmente | Lógica de domínio |
| `*.pipe.ts` | Validar e transformar dados de entrada | Lógica de negócio |
| `dto/*.dto.ts` | Definir e validar shape dos dados de entrada | Lógica de negócio |

### 3.2 Bootstrap obrigatório — main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),  // pino assume o logging
  )

  app.useLogger(app.get(Logger))

  app.setGlobalPrefix('api')               // todas as rotas em /api/*

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,                        // remove campos não declarados no DTO
    forbidNonWhitelisted: true,             // erro se campos extras forem enviados
    transform: true,                        // converte tipos automaticamente
    transformOptions: { enableImplicitConversion: true },
  }))

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0')
}

bootstrap()
```

### 3.3 Formato de resposta padronizado

O `ResponseInterceptor` garante automaticamente o envelope em toda resposta. Não é necessário formatar manualmente nos controllers.

```typescript
// Sucesso simples
{ data: T }

// Sucesso com mensagem
{ data: T, message: string }

// Paginado
{ data: T[], meta: { page, limit, total, totalPages } }

// Erro (gerado pelo HttpExceptionFilter)
{ error: string, code?: string, details?: ValidationError[] }
```

### 3.4 Códigos HTTP obrigatórios

| Situação | Código | Decorator NestJS |
|---|---|---|
| Criação bem-sucedida | 201 | `@HttpCode(HttpStatus.CREATED)` |
| Leitura/atualização bem-sucedida | 200 | padrão |
| Exclusão bem-sucedida | 204 | `@HttpCode(HttpStatus.NO_CONTENT)` |
| Dados inválidos (DTO / ValidationPipe) | 422 | automático via filter |
| Não autenticado | 401 | lançado pelo `AuthGuard` |
| Sem permissão | 403 | lançado pelo `RolesGuard` |
| Recurso não encontrado | 404 | `throw new NotFoundException()` |
| Conflito (ex: email duplicado) | 409 | `throw new ConflictException()` |
| Erro interno | 500 | automático via filter |

### 3.5 DTOs e validação

- Todo endpoint que recebe body usa um DTO com decorators do `class-validator`
- DTOs de criação ficam em `dto/create-*.dto.ts`; de atualização usam `PartialType(CreateDto)`
- Os schemas Zod do pacote `shared` continuam sendo a fonte de tipos para o **frontend** — DTOs e Zod coexistem sem conflito
- Nunca validar manualmente dentro de um service o que já pode ser validado no DTO

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsString()
  name: string

  @IsEmail()
  email: string

  @MinLength(8)
  password: string
}

// dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 3.6 Autenticação e autorização

- Rotas públicas recebem o decorator `@Public()` — o `AuthGuard` é global por padrão
- Rotas autenticadas não precisam de decorator adicional — o guard já está aplicado globalmente
- Rotas de admin recebem `@Roles('admin')` — o `RolesGuard` verifica automaticamente
- O decorator `@CurrentUser()` extrai `req.user` injetado pelo `AuthGuard` — nunca buscar o usuário novamente no controller

```typescript
// Exemplo de controller completo
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll()
  }

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id)
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }
}
```

---

## 4. Regras do Frontend

### 4.1 Separação público vs admin

- O route group `(public)` nunca deve ter verificação de sessão — é acessível por qualquer pessoa
- O route group `(admin)` tem um `layout.tsx` que verifica a sessão via `next-auth` e redireciona para `/auth/login` se ausente
- Nunca misturar páginas públicas e autenticadas no mesmo route group

### 4.2 Comunicação com a API

- Todo acesso à API passa pelo `lib/api.ts` — nunca usar `fetch` direto nas páginas/componentes
- Os tipos de request e response vêm sempre do pacote `shared`
- Erros de rede são tratados no `lib/api.ts` e relançados de forma tipada

### 4.3 Estado e dados

- Dados do servidor: SWR ou React Query (um por entidade, nos `hooks/`)
- Estado de UI (sidebar aberta, toast, modal): Zustand no `store/`
- Nunca usar estado global para dados que vêm da API

---

## 5. Pacote Shared

- É a **única fonte de verdade** para tipos e schemas que existem em mais de um pacote
- A API e o frontend importam daqui — nunca duplicam tipos
- Não tem dependências de NestJS, Prisma, Next.js ou qualquer framework — apenas TypeScript e Zod
- Os schemas Zod aqui são usados pelo **frontend** para validação de formulários e tipagem de respostas
- Na API, a validação de entrada é feita pelos DTOs com `class-validator` — Zod e DTOs coexistem
- Qualquer mudança aqui afeta os dois pacotes; execute `pnpm test` em todos antes de commitar

---

## 6. Banco de dados

### 6.1 Prisma

- O `schema.prisma` é a fonte de verdade — nunca alterar o banco manualmente em nenhum ambiente
- Toda mudança de schema gera uma migration via `prisma migrate dev`
- As migrations são commitadas no git
- Seeds são separados: `dev.seed.ts` para desenvolvimento, `test.seed.ts` para testes

### 6.2 Boas práticas de schema

- Toda tabela tem `id` como UUID (`@default(uuid())`)
- Toda tabela tem `createdAt` e `updatedAt` (`@updatedAt`)
- Soft delete: usar campo `deletedAt DateTime?` em vez de `DELETE` físico onde fizer sentido
- Relacionamentos sempre com `onDelete` explícito

### 6.3 Queries

- Nunca expor o objeto Prisma inteiro em respostas da API — sempre selecionar campos explicitamente (`select: {}`)
- Queries complexas ou reutilizadas ficam no `*.repository.ts`, não espalhadas nos services
- O `PrismaService` é injetado via construtor do NestJS — nunca instanciado manualmente

---

## 7. E-mail

- Nenhum controller ou service de domínio chama o mailer diretamente
- Todo envio de e-mail passa pelo `EmailService` injetável via NestJS DI
- O `EmailService` expõe métodos semânticos: `sendWelcomeEmail(user)`, `sendPasswordReset(token)`, `sendOrderConfirmation(order)`
- Templates ficam em `src/templates/` como HTML com placeholders `{{variavel}}`
- Em testes, o `EmailService` é sempre mockado via `{ provide: EmailService, useValue: mockEmailService }` — nunca envia e-mail real

---

## 8. Tratamento de erros

### 8.1 AppException — padrão obrigatório

No NestJS, os erros de domínio usam `AppException`, que estende `HttpException`. Isso garante integração nativa com o sistema de filtros do framework.

```typescript
// src/common/exceptions/app.exception.ts
import { HttpException } from '@nestjs/common'

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    public readonly code?: string,    // identificador em UPPER_SNAKE_CASE
  ) {
    super({ message, code }, statusCode)
  }
}
```

**Exemplos de uso nos services:**

```typescript
import { NotFoundException, ConflictException } from '@nestjs/common'
import { AppException } from '../../common/exceptions/app.exception'

// Preferir as exceções nativas do NestJS quando o código HTTP é óbvio
throw new NotFoundException('Usuário não encontrado')
throw new ConflictException('E-mail já cadastrado')

// Usar AppException quando precisar de code semântico para o frontend
throw new AppException('Saldo insuficiente', 422, 'INSUFFICIENT_BALANCE')
throw new AppException('Pedido já cancelado', 422, 'ORDER_ALREADY_CANCELLED')
```

### 8.2 HttpExceptionFilter global

O filtro é registrado no `main.ts` e captura **todos** os erros, formatando a resposta de forma padronizada.

```typescript
// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger() private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp()
    const reply  = ctx.getResponse<FastifyReply>()
    const req    = ctx.getRequest<FastifyRequest>()

    if (exception instanceof HttpException) {
      const status   = exception.getStatus()
      const response = exception.getResponse() as Record<string, unknown>

      return reply.status(status).send({
        error:   response['message'] ?? exception.message,
        code:    response['code'],
        details: response['details'],
      })
    }

    // Erro inesperado — nunca expõe detalhes ao cliente
    this.logger.error({ err: exception, path: req.url }, 'Unhandled exception')

    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'Erro interno do servidor',
    })
  }
}
```

### 8.3 Logger estruturado (nestjs-pino)

O projeto usa `nestjs-pino` como logger. Nunca usar `console.log`, `console.error` ou `console.warn`.

```typescript
// app.module.ts — registro do LoggerModule
import { LoggerModule } from 'nestjs-pino'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      },
    }),
  ],
})
export class AppModule {}
```

**Uso nos services:**

```typescript
import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'

@Injectable()
export class UsersService {
  constructor(
    @InjectPinoLogger(UsersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateUserDto) {
    // ...
    this.logger.info({ userId: user.id }, 'Usuário criado com sucesso')
    return user
  }
}
```

**Níveis obrigatórios por contexto:**

| Nível | Quando usar |
|---|---|
| `logger.error` | Erros inesperados, exceções não tratadas |
| `logger.warn` | Situações anômalas mas recuperáveis |
| `logger.info` | Eventos de negócio relevantes (criação, login, envio de email) |
| `logger.debug` | Detalhes de diagnóstico — desativado em produção |

### 8.4 Regras do tratamento de erros

- Preferir as exceções nativas do NestJS (`NotFoundException`, `ConflictException`, etc.) para os casos mais comuns
- Usar `AppException` quando precisar de `code` semântico em `UPPER_SNAKE_CASE` para o frontend
- Erros inesperados sempre resultam em `500` sem detalhes internos na resposta
- Stack traces nunca chegam ao cliente — ficam apenas nos logs do servidor
- Jamais usar `try/catch` apenas para silenciar erros — sempre logar ou relançar

---

## 9. Health check

Todo serviço em produção deve expor um endpoint de health check. Sem ele, load balancers, orquestradores (Railway, ECS, k8s) e ferramentas de monitoramento não conseguem saber se o app está vivo.

### 9.1 Implementação obrigatória

```typescript
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { Public } from '../../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @Public()                       // nunca exige autenticação
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'ok',
      }
    } catch (err) {
      this.logger.error({ err }, 'Health check falhou')

      // Retorna 503 sem lançar exceção — o filter não deve interceptar isso
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      })
    }
  }
}
```

### 9.2 Regras do health check

- Rota sempre pública — decorada com `@Public()`, sem `AuthGuard`
- Responde `200` apenas quando app **e** banco estão operacionais
- Responde `503` quando qualquer dependência crítica está indisponível
- Nunca expõe informações sensíveis (variáveis de ambiente, stack traces)
- Criado junto com a estrutura inicial do projeto — não é uma funcionalidade opcional
- Registrado no `AppModule` sem o prefixo `/api` para ser acessível em `GET /health`

### 9.3 Testes obrigatórios

```typescript
// src/modules/health/__tests__/health.controller.spec.ts
it('GET /health → 200 quando banco está acessível', async () => {
  const res = await request(app.getHttpServer()).get('/health')
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('ok')
  expect(res.body.database).toBe('ok')
})

it('GET /health → não exige autenticação', async () => {
  const res = await request(app.getHttpServer()).get('/health')
  expect(res.status).not.toBe(401)
})
```

---

## 10. WebSockets e tempo real

Para qualquer fluxo onde múltiplos clientes precisam ser notificados simultaneamente de mudanças no estado do servidor (sem polling), o projeto usa **WebSocket Gateways** do NestJS com Socket.IO.

### 10.1 Quando usar WebSocket vs REST

| Situação | Solução |
|---|---|
| Cliente solicita uma ação ou consulta sob demanda | REST |
| Servidor precisa notificar clientes de uma mudança de estado | WebSocket |
| Operação que produz resultado imediato | REST |
| Sincronização de estado entre múltiplos clientes | WebSocket |
| Listas, formulários, CRUDs comuns | REST |

**Regra:** WebSocket nunca substitui REST. Eles coexistem. O REST é a fonte de verdade da operação; o WebSocket é apenas o canal de **notificação**.

### 10.2 Estrutura obrigatória de um Gateway

```
src/modules/<dominio>/
├── <dominio>.gateway.ts        ← @WebSocketGateway() — emite e recebe eventos
├── <dominio>.module.ts         ← declara o gateway como provider
└── __tests__/
    └── <dominio>.gateway.spec.ts
```

### 10.3 Padrão de Gateway

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { UseGuards } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/ws-jwt.guard'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'

@WebSocketGateway({
  namespace: '/scoring',          // sempre namespace explícito
  cors: { origin: process.env.CORS_ORIGIN },
})
@UseGuards(WsJwtGuard)            // autenticação obrigatória
export class ScoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server

  constructor(
    @InjectPinoLogger(ScoringGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  handleConnection(client: Socket) {
    const userId = (client as any).user?.id
    this.logger.info({ userId, socketId: client.id }, 'Cliente conectado')
  }

  handleDisconnect(client: Socket) {
    this.logger.info({ socketId: client.id }, 'Cliente desconectado')
  }

  // Servidor emite — cliente apenas recebe
  emitParticipantActivated(eventId: string, payload: ActivatedPayload) {
    this.server.to(`event:${eventId}`).emit('participant_activated', payload)
  }
}
```

### 10.4 Convenções de eventos

- Nome do evento em **snake_case**: `participant_activated`, `score_confirmed`, `event_state_changed`
- Eventos **sempre no passado** — descrevem fato consumado, não comando
- Payload **sempre é um objeto** — nunca string ou número solto
- Toda emissão usa **rooms** baseadas em entidade: `event:<id>`, `judge:<id>`
- Cliente entra na room ao conectar (no `handleConnection`), nunca explicitamente pelo cliente

### 10.5 Autenticação no handshake

O `WsJwtGuard` valida o JWT enviado no handshake (em `auth.token` do Socket.IO). Conexões sem token válido são rejeitadas no momento da conexão — nunca em mensagens individuais.

### 10.6 O que NÃO fazer

- ❌ Lógica de negócio dentro do gateway — gateway só emite/recebe; quem decide é o service
- ❌ Emitir o mesmo evento para todos os sockets indiscriminadamente — sempre usar rooms
- ❌ Confiar em payload vindo do cliente para tomar decisões de estado — sempre revalidar via service
- ❌ Manter estado em memória do processo (ex.: `Map<userId, Socket>`) — não escala horizontalmente; usar adapter Redis se houver múltiplas instâncias

### 10.7 Testes obrigatórios

- Conexão sem token → recusada
- Conexão com token válido → entra na room esperada
- Emissão de evento pelo service → cliente na room recebe
- Cliente fora da room → não recebe

---

## 11. Geração de PDF

Geração de PDFs (relatórios, certificados, comprovantes) usa **Puppeteer** com templates HTML. O HTML é renderizado por Chromium headless, garantindo fidelidade visual com CSS moderno.

### 11.1 Estrutura

```
packages/api/src/
├── services/
│   ├── pdf.service.ts              ← serviço genérico: html → PDF buffer
│   └── __tests__/pdf.service.spec.ts
└── modules/
    ├── reports/
    │   ├── reports.service.ts      ← orquestra: busca dados, monta HTML, chama PdfService
    │   └── templates/
    │       └── classification.html ← template Handlebars/EJS
    └── certificates/
        ├── certificates.service.ts
        └── templates/
            └── certificate.html
```

### 11.2 Padrão do PdfService

```typescript
@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  async onModuleDestroy() {
    await this.browser?.close()
  }

  async render(html: string, options: PdfOptions): Promise<Buffer> {
    const page = await this.browser.newPage()
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' })
      return await page.pdf({
        format: options.format ?? 'A4',
        landscape: options.landscape ?? false,
        printBackground: true,        // crítico para backgrounds de imagem
        margin: options.margin,
      })
    } finally {
      await page.close()
    }
  }
}
```

### 11.3 Regras de geração de PDF

- O `PdfService` é um **singleton** — uma única instância de Browser para toda a aplicação
- Cada PDF abre uma `Page` e a fecha no `finally` — vazamento de páginas é a causa #1 de OOM
- Templates HTML ficam em `templates/` dentro do módulo que os usa
- Imagens locais nos templates devem ser embutidas como data URI ou servidas via path absoluto controlado
- `printBackground: true` é **obrigatório** quando o template tem cor de fundo ou imagem de fundo
- Para PDFs em **lote** (>10 páginas), a geração roda em **fila BullMQ** (ver seção 14), nunca dentro da request HTTP
- Tamanho máximo de um PDF gerado: 50 MB. Acima disso, o job falha com erro explícito.

### 11.4 Templates

- Usar engine simples (Handlebars ou EJS) — nunca string concatenation
- Variáveis nunca interpoladas sem escape: `{{nome}}` (Handlebars) ou `<%- nome %>` (EJS) com auto-escape ligado
- Imagens carregadas pelo template **sempre** com path resolvido pelo serviço (nunca path vindo do cliente)

### 11.5 Testes obrigatórios

- Renderiza HTML simples e retorna Buffer não vazio
- Falha controladamente se o HTML é inválido
- Page é fechada mesmo quando `pdf()` lança exceção
- Em testes unitários, o Puppeteer é **mockado** — não sobe Chromium real

---

## 12. Upload e armazenamento de arquivos

Uploads de imagens e arquivos binários (foto de participante, background de certificado, imagem de assinatura) são tratados por um `StorageService` único, com implementações distintas por ambiente.

### 12.1 Estratégia por ambiente

| Ambiente | Backend | Path |
|---|---|---|
| Desenvolvimento | Filesystem local | `packages/api/uploads/` |
| Teste | Filesystem temporário | `os.tmpdir()/judging-test/` |
| Produção | S3-compatible (S3, R2, MinIO) | bucket configurável via env |

A interface `StorageService` é a mesma — só muda a implementação injetada. O resto do código nunca sabe onde o arquivo foi parar.

### 12.2 Validação obrigatória de uploads

- **Tipo MIME validado por magic bytes** (biblioteca `file-type`) — nunca confiar na extensão do arquivo
- **Tamanho máximo por tipo de upload** (definido no DTO/service):
  - Background de certificado: 5 MB
  - Imagem de assinatura: 1 MB
  - Foto de participante: 2 MB
- **Tipos aceitos por contexto** (allowlist explícita): `image/jpeg`, `image/png` em todos os casos. Nada além disso é aceito.
- **Dimensões mínimas** validadas para imagens onde isso importa (ex.: background de certificado precisa de pelo menos 2480×3508 px para impressão A4 a 300 DPI).
- Nome do arquivo armazenado é sempre um **UUID** + extensão derivada do MIME — nunca o nome original do upload.

### 12.3 Padrão de referência no banco

Tabelas que referenciam arquivos guardam apenas o **path interno** (chave no storage), nunca a URL pública:

```prisma
model EventCertificateConfig {
  id                String   @id @default(uuid())
  backgroundPath    String   // ex: "certificates/backgrounds/<uuid>.png"
  signature1Path    String?
  signature2Path    String?
  signature3Path    String?
}
```

A URL pública é gerada **sob demanda** pelo `StorageService.getPublicUrl(path)` — em produção, normalmente uma URL pré-assinada com expiração curta.

### 12.4 Regras

- Nenhum controller acessa filesystem ou S3 diretamente — sempre via `StorageService`
- Arquivos são deletados do storage **apenas** quando a entidade que os referencia é hard-deleted; soft-delete preserva o arquivo
- Logs de auditoria registram upload e remoção (ver seção 13)
- Em testes, o `StorageService` usa filesystem temporário com cleanup no `afterEach`

### 12.5 O que NÃO fazer

- ❌ Servir arquivos como `Buffer` em respostas JSON
- ❌ Aceitar caminhos vindos do cliente como path interno (path traversal)
- ❌ Usar o nome original do arquivo enviado como path no storage
- ❌ Validar tipo de arquivo apenas pela extensão

---

## 13. Auditoria de domínio

Auditoria de domínio é **diferente** de log de aplicação. Logs do `pino` registram o que a aplicação fez (técnico, descartável). Auditoria registra **o que aconteceu no negócio** (factual, imutável, jamais deletável). Sistemas com requisitos de contestação ou compliance precisam de ambos.

### 13.1 Modelo obrigatório

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  actorId     String?  // userId; null para ações do sistema
  actorType   String   // "USER" | "SYSTEM"
  action      String   // ex: "SCORE_REGISTERED", "PARTICIPANT_ACTIVATED"
  entityType  String   // ex: "Score", "Participant"
  entityId    String   // id da entidade afetada
  payload     Json     // snapshot dos dados relevantes ao evento
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
}
```

### 13.2 Service obrigatório

```typescript
@Injectable()
export class AuditService {
  // Apenas dois métodos públicos — não há update nem delete
  async record(input: RecordAuditInput): Promise<void> { /* ... */ }
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> { /* ... */ }
}
```

A ausência de `update` e `delete` é **proposital** — nem o próprio sistema pode alterar registros de auditoria. Se houver erro factual, registra-se um novo evento corrigindo, nunca alterando o anterior.

### 13.3 O que DEVE ser auditado obrigatoriamente

- Toda criação, atualização e exclusão de entidades de domínio críticas (notas, configurações de evento, jurados, participantes)
- Mudanças de estado do julgamento (ativação de participante, finalização de avaliação, encerramento do evento)
- Geração de relatórios e certificados (quem gerou, quando, quais parâmetros)
- Login bem-sucedido, login falhado e logout
- Uploads e remoções de arquivos

### 13.4 O que NÃO precisa ser auditado

- Listagens e leituras (`GET /events`)
- Health checks
- Eventos de socket (já refletem mudanças que foram auditadas no service)

### 13.5 Regras

- Toda chamada ao `AuditService.record()` ocorre **dentro da mesma transação Prisma** que a operação de domínio. Se a auditoria falhar, a operação inteira é revertida.
- O `payload` armazena o **snapshot** suficiente para reconstruir o que aconteceu, **não** o objeto inteiro do banco. Ex.: ao auditar `SCORE_REGISTERED`, o payload contém `{ judgeId, participantId, categoryId, score }`, não o objeto User completo.
- Dados sensíveis (senhas, tokens) **nunca** entram no payload.
- Logs de auditoria **nunca expiram** — não há rotina de limpeza. Eles podem ser arquivados em storage frio depois de N anos, mas isso é decisão operacional, não automática.

### 13.6 Testes obrigatórios

- Operação de domínio bem-sucedida produz registro de auditoria
- Falha na operação de domínio reverte também o registro de auditoria (transação)
- `AuditService` não expõe método para alterar ou apagar registros (verificação por reflexão ou type-check)

---

## 14. Filas e processamento assíncrono

Operações de longa duração (geração de PDF em lote, processamento de uploads grandes, envio de e-mail em massa) **nunca** rodam dentro da request HTTP — vão para uma fila e o cliente recebe o status posteriormente.

### 14.1 Stack

- **BullMQ** (`@nestjs/bullmq`) sobre **Redis**
- Cada domínio com jobs tem seu próprio `*.processor.ts` registrado no módulo

### 14.2 Estrutura

```
src/modules/<dominio>/
├── <dominio>.module.ts            ← BullModule.registerQueue({ name: 'certificates' })
├── <dominio>.service.ts           ← service.enqueueGeneration() adiciona job
├── <dominio>.processor.ts         ← @Processor('certificates') executa o job
└── __tests__/
    ├── <dominio>.service.spec.ts
    └── <dominio>.processor.spec.ts
```

### 14.3 Padrão do Processor

```typescript
@Processor('certificates')
export class CertificatesProcessor extends WorkerHost {
  constructor(
    private readonly certificatesService: CertificatesService,
    @InjectPinoLogger(CertificatesProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super()
  }

  async process(job: Job<GenerateCertificatesJob>): Promise<{ pdfPath: string }> {
    this.logger.info({ jobId: job.id }, 'Iniciando geração de certificados')

    await job.updateProgress(0)
    const pdfPath = await this.certificatesService.generateBatch(
      job.data.eventId,
      (progress) => job.updateProgress(progress),
    )
    await job.updateProgress(100)

    return { pdfPath }
  }
}
```

### 14.4 Regras

- Toda operação cuja duração esperada **excede 5 segundos** vai para fila — nunca para request HTTP
- Jobs são **idempotentes** — executar duas vezes o mesmo job produz o mesmo resultado, sem duplicar efeitos colaterais
- Jobs reportam progresso via `job.updateProgress()`; o cliente acompanha via WebSocket ou polling em endpoint dedicado
- Jobs falhos são **automaticamente retentados** com backoff exponencial (configurado no `BullModule.registerQueue`); após N tentativas, vão para a *dead letter queue* e geram alerta
- Toda enfileiração registra `AUDIT_LOG` (ver seção 13) com o jobId
- Em testes, jobs rodam **inline** (sem Redis real) via configuração de teste — nunca dependem de infraestrutura externa

### 14.5 O que NÃO fazer

- ❌ Aguardar (`await`) o término de um job dentro do controller — o controller retorna imediatamente o jobId
- ❌ Manter estado entre jobs — cada job é autossuficiente
- ❌ Acessar request, response, JWT do usuário dentro de um processor — esses contextos não existem em workers; passar o que precisar via `job.data`
- ❌ Usar Bull (versão antiga, sem o "MQ") — descontinuado; só BullMQ

---

## 15. Testes — regras absolutas

> Uma funcionalidade só está **concluída** quando seus testes passam e a cobertura atinge os thresholds. Não existe "implementar agora, testar depois".

### 15.1 Pirâmide de testes

| Tipo | Ferramenta | O que cobre | Meta de cobertura |
|---|---|---|---|
| Unitário | Vitest + `@nestjs/testing` | Services, utils, schemas, guards | ≥ 90% |
| Integração | Vitest + Supertest + `@nestjs/testing` | Endpoints HTTP + banco de teste | ≥ 80% |
| E2E | Playwright | Fluxos críticos no browser | Fluxos principais |

### 15.2 Thresholds obrigatórios (vitest.config.ts)

```typescript
coverage: {
  thresholds: {
    statements: 80,
    branches:   75,
    functions:  80,
    lines:      80,
  }
}
```

O build falha automaticamente se qualquer threshold não for atingido.

### 15.3 Localização dos testes

- Testes unitários e de integração ficam em `__tests__/` **dentro do próprio módulo**
- Arquivos de teste usam a extensão `.spec.ts` (convenção NestJS)
- Testes E2E ficam na pasta `e2e/` na raiz do projeto
- Helpers compartilhados ficam em `packages/api/test/helpers.ts`

### 15.4 Setup do TestingModule

O `test/setup.ts` cria o módulo NestJS com `FastifyAdapter` uma vez e reutiliza em todos os testes de integração.

```typescript
// test/setup.ts
import { Test, TestingModule } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '../src/app.module'
import { ValidationPipe } from '@nestjs/common'

let app: NestFastifyApplication

export async function createTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  )

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  return app
}

export function getApp() {
  return app
}
```

### 15.5 Regras de testes unitários

- Mockar dependências via `{ provide: SomeService, useValue: mockSomeService }`
- Um `describe` por service/guard/pipe
- Cada `it` testa **um único comportamento**
- Nome do teste descreve o cenário em português: `'deve lançar ConflictException se email já existe'`
- Testar sempre o caminho feliz **e** os casos de erro

```typescript
// Exemplo: users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<UsersRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { findByEmail: vi.fn(), create: vi.fn() } },
      ],
    }).compile()

    service    = module.get(UsersService)
    repository = module.get(UsersRepository)
  })

  it('deve lançar ConflictException se email já existe', async () => {
    repository.findByEmail.mockResolvedValueOnce({ id: '1', email: 'a@b.com' })

    await expect(
      service.create({ email: 'a@b.com', name: 'Ana', password: '12345678' })
    ).rejects.toThrow(ConflictException)
  })
})
```

### 15.6 Regras de testes de integração

- Usar banco PostgreSQL real, separado, apontado pelo `.env.test`
- `cleanDb()` antes de cada teste (`beforeEach`) — nunca depender de ordem de execução
- Usar os helpers de `test/helpers.ts` para criar dados e gerar tokens
- Testar os status HTTP, o formato da resposta e os efeitos colaterais no banco

### 15.7 O que cada módulo deve testar

Para cada módulo criado, são obrigatórios no mínimo:

**Service (unitário):**
- Caminho feliz (retorna o esperado)
- Validação de regra de negócio (ex: email duplicado, saldo insuficiente)
- Comportamento quando dependência retorna nulo/erro

**Controller (integração):**
- `2xx` com dados válidos
- `422` com dados inválidos (body malformado, campos faltando — testado pelo ValidationPipe)
- `401` em rotas protegidas sem token
- `403` em rotas de admin com token de usuário comum
- `404` quando recurso não existe
- `409` quando há conflito de dados únicos

### 15.8 Banco de teste isolado (.env.test)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/myproject_test"
JWT_SECRET="test-secret-never-use-in-production"
```

---

## 16. CI/CD e qualidade de código

### 16.1 Pipeline obrigatório (GitHub Actions)

Todo Pull Request para `main` ou `develop` deve passar por:

1. `pnpm lint` — ESLint sem erros
2. `pnpm type-check` — TypeScript sem erros
3. `pnpm test:ci` — Testes + cobertura (falha se thresholds não baterem)
4. Build de produção (`pnpm build`)

O merge fica bloqueado enquanto qualquer etapa falhar.

### 16.2 Ambiente de CI

- O CI sobe um PostgreSQL efêmero via `services` do GitHub Actions
- Aplica as migrations com `prisma migrate deploy` antes de rodar os testes
- Nunca usa o banco de produção ou staging para testes

### 16.3 Branches

| Branch | Propósito |
|---|---|
| `main` | Produção — merge apenas via PR com CI verde |
| `develop` | Staging — integração contínua |
| `feature/*` | Novas funcionalidades |
| `fix/*` | Correções de bugs |
| `chore/*` | Manutenção, dependências, docs |

---

## 17. Convenções de nomenclatura

### 17.1 Arquivos

| Tipo | Convenção | Exemplo |
|---|---|---|
| Módulo NestJS | `kebab-case.module.ts` | `users.module.ts` |
| Controller NestJS | `kebab-case.controller.ts` | `users.controller.ts` |
| Service | `kebab-case.service.ts` | `users.service.ts` |
| Repository | `kebab-case.repository.ts` | `users.repository.ts` |
| Guard | `kebab-case.guard.ts` | `auth.guard.ts` |
| Filter | `kebab-case.filter.ts` | `http-exception.filter.ts` |
| Interceptor | `kebab-case.interceptor.ts` | `response.interceptor.ts` |
| DTO | `acao-entidade.dto.ts` | `create-user.dto.ts` |
| Decorator | `kebab-case.decorator.ts` | `current-user.decorator.ts` |
| Componentes React | `PascalCase.tsx` | `UserCard.tsx` |
| Testes | mesmo nome + `.spec.ts` | `users.service.spec.ts` |
| Testes E2E | nome do fluxo + `.spec.ts` | `login.spec.ts` |

### 17.2 Código

| Elemento | Convenção | Exemplo |
|---|---|---|
| Variáveis e funções | `camelCase` | `findUserById` |
| Classes, DTOs e tipos | `PascalCase` | `UsersService`, `CreateUserDto` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| Tabelas Prisma | `PascalCase` singular | `User`, `Product`, `OrderItem` |
| Colunas Prisma | `camelCase` | `createdAt`, `firstName` |
| Rotas HTTP | `kebab-case` plural | `/api/user-profiles`, `/api/order-items` |
| Variáveis de ambiente | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |

### 17.3 Testes

- `describe` → nome da classe: `'UsersService'`, `'UsersController'`
- `it` → frase completa em português descrevendo o comportamento esperado
- Não usar `test()` — usar sempre `it()` para manter consistência

---

## 18. Mensagens de commit

O projeto adota **Conventional Commits**. Toda mensagem de commit deve seguir o formato abaixo sem exceção — isso permite changelog automático, rastreabilidade por tipo de mudança e leitura clara do histórico.

### 18.1 Formato

```
<tipo>(<escopo>): <descrição curta em português>

[corpo opcional — mais detalhes sobre o que e por quê]

[rodapé opcional — breaking changes, closes #issue]
```

### 18.2 Tipos obrigatórios

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário ou ao sistema |
| `fix` | Correção de bug |
| `test` | Adição ou correção de testes sem alterar código de produção |
| `refactor` | Refatoração sem mudança de comportamento e sem novo teste |
| `chore` | Atualização de dependências, configuração, scripts, CI |
| `docs` | Alteração apenas em documentação (README, este arquivo, comentários) |
| `perf` | Melhoria de performance sem mudança de comportamento |
| `style` | Formatação, espaços, ponto e vírgula — sem mudança de lógica |

### 18.3 Exemplos corretos

```bash
feat(users): adiciona endpoint de listagem com paginação
fix(auth): corrige vazamento de token no log de erro
test(orders): adiciona casos de erro para estoque insuficiente
chore: atualiza prisma para 5.12.0
docs: adiciona seção de health check no PROJECT_STANDARDS
refactor(email): extrai lógica de template para helper separado
feat(auth)!: troca autenticação de sessão para JWT
```

### 18.4 Breaking changes

Adicionar `!` após o tipo/escopo e descrever no rodapé:

```
feat(api)!: remove campo `username` do payload de criação de usuário

BREAKING CHANGE: o campo `username` foi removido. Use `name` no lugar.
Closes #42
```

### 18.5 Regras

- Descrição sempre em **português**, no **imperativo presente** ("adiciona", "corrige", "remove") — não "adicionado", "corrigido", "removido"
- Descrição com no máximo 72 caracteres
- Escopo é opcional mas recomendado para identificar o módulo afetado: `(users)`, `(auth)`, `(orders)`
- Jamais commitar com mensagem genérica: `fix`, `ajustes`, `wip`, `teste`, `atualizações`
- Um commit deve representar uma mudança coesa — se precisar de "e" na mensagem, provavelmente são dois commits

---

## 19. Fluxo de trabalho com Git e GitHub

Toda implementação segue um fluxo padronizado. Isso garante histórico legível, reversões seguras e onboarding simples se a equipe crescer no futuro.

### 19.1 Estrutura de branches

| Branch | Propósito | Quem mergeia |
|---|---|---|
| `main` | Produção. Sempre estável | Apenas via PR vindo de `develop` (releases) |
| `develop` | Integração contínua. Pode estar momentaneamente instável | Via PR de feature/fix/chore com CI verde |
| `feature/p<NN>-<slug>` | Implementação de um prompt | Quem abriu o PR após CI verde |
| `fix/<slug>` | Correção de bug pós-merge | Quem abriu o PR após CI verde |
| `chore/<slug>` | Manutenção, dependências, docs sem código | Quem abriu o PR após CI verde |

#### Criando uma feature branch

Antes de qualquer trabalho:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/p01-bootstrap-api
```

Convenção do nome: `feature/p<NN>-<slug>`, onde:
- `<NN>` é o número do prompt zero-padded: `p00`, `p07`, `p19`
- `<slug>` é o título em kebab-case curto

Exemplos válidos:
- `feature/p00-setup-monorepo`
- `feature/p11-scoring-gateway`
- `feature/p18-modulo-certificates`

### 19.2 Granularidade de commits

Um único commit gigante "implementa P01" é ruim. 100 commits microscópicos também. A regra é: **cada commit deve representar uma mudança coesa, isoladamente revisável**.

Para um prompt típico, espera-se entre **3 e 10 commits**, agrupados logicamente. Exemplo do P01:

```
1. chore(api): adiciona dependências do NestJS, Fastify, Prisma e Pino
2. feat(api): configura bootstrap com FastifyAdapter e prefixo /api
3. feat(api): implementa AppException e HttpExceptionFilter
4. feat(api): implementa ResponseInterceptor com envelope { data }
5. feat(api): adiciona configuração Pino e LoggerModule
6. feat(api): implementa health check com verificação de banco
7. test(api): adiciona testes unitários e integração da fundação
8. docs(progress): conclui P01 — Bootstrap da API
```

#### Regras

- Cada commit deve passar localmente em `pnpm lint` e `pnpm type-check`
- O **último** commit antes do push final deve passar também em `pnpm test:ci` e `pnpm build`
- Mensagens em **Conventional Commits** (seção 18)
- Nunca commitar arquivos `.env`, `node_modules/`, `dist/`, `coverage/`, ou outputs de build

### 19.3 Pull Requests

#### Quando abrir o PR

- **Após** todos os critérios de aceitação (Definition of Done) do prompt estarem marcados
- **Após** atualizar o `PROJECT_PROGRESS.md`
- **Após** rodar todas as validações localmente: `pnpm lint && pnpm type-check && pnpm test:ci && pnpm build`

#### Template do PR

O arquivo `.github/pull_request_template.md` é criado no P00 e usado por todos os PRs subsequentes:

```markdown
## Prompt
P<NN> — <título>

## Resumo
<1-3 linhas descrevendo o que foi entregue>

## Critérios de aceitação
- [x] Item 1 do DoD do prompt
- [x] Item 2 do DoD do prompt
- ...

## Validações executadas
- [x] `pnpm lint` — sem warnings
- [x] `pnpm type-check` — sem erros
- [x] `pnpm test:ci` — passou com cobertura X% statements, Y% branches, Z% functions, W% lines
- [x] `pnpm build` — sucesso

## PROJECT_PROGRESS.md
- [x] P<NN> marcado como concluído
- [x] Cobertura final preenchida
- [x] Decisões técnicas registradas (se houver)

## Decisões técnicas (se aplicável)
<lista de decisões não cobertas pelo prompt, registradas para revisão>

## Observações
<qualquer coisa relevante>
```

#### Título do PR

Formato: `P<NN>: <título do prompt>`

Exemplos:
- `P00: Setup do monorepo`
- `P01: Bootstrap da API`
- `P11: Scoring gateway com WebSocket`

#### Branch alvo

- PRs de feature/fix/chore vão para `develop`
- Apenas releases vão para `main`, vindo de `develop`

### 19.4 Política de aprovação

Este projeto opera no modelo **CI verde + checklist atendido = pronto para mergear**. Não há exigência de aprovação humana adicional.

Em projetos solo, aprovação seria autoaprovação — teatro sem ganho real. O portão de qualidade aqui é a combinação de:

- CI verde (`lint`, `type-check`, `test:ci` com cobertura, `build`)
- Critérios de aceitação do prompt marcados no template do PR
- `PROJECT_PROGRESS.md` atualizado

Se a equipe crescer e revisão por par fizer sentido, esta política é a primeira coisa a ser revisada.

### 19.5 CI

- Todo PR precisa do CI verde antes de mergear (configurado em P00)
- CI roda: `pnpm lint`, `pnpm type-check`, `pnpm test:ci`, `pnpm build`
- Cobertura abaixo dos thresholds bloqueia merge automaticamente

#### Branch protection do GitHub

Configurar nas settings do repositório, em `Branches → Add rule` para `develop` e `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ❌ Require approvals (desativado conforme política da seção 19.4)
- ✅ Do not allow bypassing the above settings (mesmo administradores não bypassam)

### 19.6 Merge

#### Estratégia: squash merge em `develop`

PRs de feature em `develop` são mergeados via **squash merge**. Isso mantém o histórico de `develop` limpo, com 1 commit por prompt.

A mensagem do squash deve seguir o formato:

```
feat(<scope>): <descrição> (#<numero-do-PR>)

P<NN> — <título do prompt>

- bullet 1 do que foi entregue
- bullet 2
- bullet 3
```

Quando `develop` é mergeada em `main` (releases), usar **merge commit** padrão para preservar o histórico de prompts.

#### Após o merge

```bash
git checkout develop
git pull origin develop
git branch -d feature/p01-bootstrap-api          # branch local
git push origin --delete feature/p01-bootstrap-api  # branch remota
```

Ou usar o botão "Delete branch" no GitHub após o merge — ambos resultados equivalentes.

### 19.7 Tags e releases

Após cada **fase** completa (todos os prompts da fase mergeados em `develop` e em seguida em `main`), criar uma tag em `main`:

| Marco | Tag |
|---|---|
| Fim da Fase 0 (P02 mergeado) | `v0.0.0` |
| Fim da Fase 1 (P04 mergeado) | `v0.1.0` |
| Fim da Fase 2 (P06 mergeado) | `v0.2.0` |
| Fim da Fase 3 (P10 mergeado) | `v0.3.0` |
| Fim da Fase 4 (P13 mergeado) | `v0.4.0` |
| Fim da Fase 5 (P16 mergeado) | `v0.5.0` |
| Fim da Fase 6 (P19 mergeado) | `v1.0.0` |

Como criar a tag:

```bash
git checkout main
git pull origin main
git tag -a v0.0.0 -m "Fim da Fase 0 — Fundação"
git push origin v0.0.0
```

No GitHub, criar um Release a partir da tag com changelog dos prompts da fase.

### 19.8 Resolução de conflitos

Se sua branch ficar desatualizada em relação a `develop`:

```bash
git checkout feature/p01-bootstrap-api
git fetch origin
git rebase origin/develop
# resolve conflitos manualmente em cada arquivo
git add <arquivos resolvidos>
git rebase --continue
git push --force-with-lease origin feature/p01-bootstrap-api
```

**Nunca** usar `git push --force` sem `--with-lease` — pode sobrescrever trabalho remoto.

### 19.9 O que NÃO fazer

- ❌ Commit direto em `main` ou `develop` (bloqueado por branch protection)
- ❌ Force push sem `--with-lease`
- ❌ Mergear PR com CI vermelho
- ❌ Mergear PR sem critérios de aceitação atendidos
- ❌ Esquecer de atualizar o `PROJECT_PROGRESS.md` no commit final
- ❌ Misturar mudanças de prompts diferentes na mesma branch
- ❌ Manter branches mergeadas (deletar logo após o merge)
- ❌ Editar histórico de branches já mergeadas (`main`, `develop`)
- ❌ Pular o processo de PR mesmo "para mudanças pequenas" — toda mudança passa por PR

---

## 20. Segurança

- Senhas sempre hasheadas com `bcrypt` (custo mínimo 10) — nunca armazenar em texto puro
- JWTs com expiração curta (access token: 15min, refresh token: 7 dias)
- Variáveis sensíveis apenas em `.env` — nunca hardcoded no código
- O `.env` e o `.env.test` nunca são commitados — apenas o `.env.example`
- Inputs sempre validados pelo `ValidationPipe` com DTOs — `whitelist: true` remove campos não declarados
- Respostas de erro nunca expõem stack traces em produção
- Rate limiting aplicado em todas as rotas de autenticação (`@nestjs/throttler`)
- CORS configurado explicitamente no `main.ts` — nunca `origin: '*'` em produção

---

## 21. O que SEMPRE fazer

- **Escrever o teste antes da implementação (TDD)** — o teste define o contrato da funcionalidade
- **Criar o `*.module.ts`** ao adicionar qualquer domínio — é ele que conecta tudo no NestJS
- **Validar variáveis de ambiente na inicialização** — o app deve falhar rápido e com mensagem clara se uma variável obrigatória estiver ausente
- **Usar o pacote `shared`** para qualquer tipo ou schema que seja usado em mais de um pacote
- **Criar um módulo completo** ao adicionar uma entidade: module + controller + service + repository + dto/ + `__tests__/`
- **Manter o `cleanDb()` no `beforeEach`** de todo teste de integração
- **Selecionar campos explicitamente** nas queries Prisma — nunca retornar o objeto completo da tabela para o cliente
- **Usar exceções nativas do NestJS** (`NotFoundException`, `ConflictException`, etc.) para os casos comuns, e `AppException` quando precisar de `code` semântico
- **Usar `logger.*`** do `nestjs-pino` no lugar de `console.log` — injetado via `@InjectPinoLogger()`
- **Documentar o `.env.example`** sempre que adicionar uma nova variável de ambiente
- **Rodar `pnpm test:ci` localmente** antes de abrir um Pull Request
- **Usar transações Prisma** quando uma operação de negócio envolve múltiplas escritas no banco
- **Versionar as migrations** — todo schema change gera uma migration commitada
- **Seguir o padrão Conventional Commits** em toda mensagem de commit
- **Verificar o `GET /health`** ao subir o projeto em um novo ambiente — é o primeiro sinal de que tudo está funcionando

---

## 22. O que JAMAIS fazer

- **Jamais implementar uma funcionalidade sem testes** — não existe "vou adicionar o teste depois"
- **Jamais dar merge com CI vermelho** — thresholds de cobertura que não batem bloqueiam o merge por design
- **Jamais colocar lógica de negócio no controller** — controller só recebe, delega ao service e retorna
- **Jamais fazer query ao banco dentro de um controller ou service** — isso é responsabilidade do repository
- **Jamais instanciar services ou repositories manualmente** — sempre usar injeção de dependência do NestJS
- **Jamais criar um módulo sem registrá-lo no `AppModule`** — o NestJS não descobre módulos automaticamente
- **Jamais chamar o `EmailService` diretamente fora dele mesmo** — todo envio passa pelos métodos semânticos
- **Jamais hardcodar strings sensíveis** (senhas, chaves, secrets) no código-fonte
- **Jamais commitar arquivos `.env`** — apenas o `.env.example` vai no git
- **Jamais editar arquivos de migration manualmente** — apenas via `prisma migrate dev`
- **Jamais alterar o banco de produção diretamente** — toda mudança de schema passa por migration
- **Jamais duplicar tipos** entre `api/` e `web/` — o `shared` existe para isso
- **Jamais usar `any` em TypeScript** — usar `unknown` e fazer narrowing explícito
- **Jamais usar `console.log`, `console.error` ou `console.warn`** — usar sempre `logger.*` do `nestjs-pino`
- **Jamais silenciar erros com `try/catch` vazio** — sempre logar ou relançar
- **Jamais expor stack traces de erro para o cliente** em ambiente de produção
- **Jamais fazer `SELECT *` implícito** nas queries Prisma quando o resultado vai para a API
- **Jamais usar `origin: '*'` no CORS** em ambiente de produção
- **Jamais armazenar senha em texto puro** — sempre bcrypt com custo ≥ 10
- **Jamais criar um schema Zod duplicado** — verificar se já existe no `shared` antes de criar um novo
- **Jamais commitar com mensagem genérica** (`fix`, `ajustes`, `wip`) — seguir Conventional Commits obrigatoriamente
- **Jamais colocar autenticação no endpoint `/health`** — ele deve ser público para funcionar com load balancers
- **Jamais usar o adapter Express** — o projeto usa exclusivamente `FastifyAdapter`

---

## 23. Checklist de entrega de funcionalidade

Antes de abrir um Pull Request, confirmar cada item:

### Implementação
- [ ] Módulo criado com estrutura completa: `*.module.ts` + controller + service + repository + `dto/` + `__tests__/`
- [ ] Módulo registrado no `AppModule` (ou no módulo pai correspondente)
- [ ] DTOs com `class-validator` em todos os endpoints que recebem dados
- [ ] `@UseGuards(AuthGuard)` e `@Roles()` aplicados corretamente nas rotas
- [ ] Rotas públicas decoradas com `@Public()`
- [ ] Resposta no formato padronizado via `ResponseInterceptor` (automático)
- [ ] Códigos HTTP corretos com `@HttpCode()` onde necessário
- [ ] Nenhuma lógica de negócio no controller
- [ ] Nenhuma query ao banco fora do repository
- [ ] Erros lançados com exceções nativas do NestJS ou `AppException`
- [ ] Variáveis de ambiente novas documentadas no `.env.example`

### Testes
- [ ] Testes unitários do service cobrindo caminho feliz e casos de erro
- [ ] Testes de integração do controller: 2xx, 422, 401, 403, 404
- [ ] `vitest run --coverage` passando com thresholds verdes
- [ ] Nenhum teste dependendo de ordem de execução (`cleanDb` no `beforeEach`)
- [ ] `EmailService` mockado nos testes (sem envio real)

### Qualidade
- [ ] `pnpm lint` sem erros
- [ ] `pnpm type-check` sem erros (`strict: true`)
- [ ] Nenhum `console.log` / `console.error` esquecido — apenas `logger.*`
- [ ] Nenhum `any` introduzido
- [ ] Nenhum arquivo `.env` commitado
- [ ] Todas as mensagens de commit seguem Conventional Commits
- [ ] `GET /health` respondendo `200` no ambiente de desenvolvimento

### Banco de dados
- [ ] Migration gerada se houve mudança de schema
- [ ] Migration commitada junto com o PR
- [ ] Seeds atualizados se necessário

### Documentação
- [ ] `.env.example` atualizado com novas variáveis
- [ ] README atualizado se o setup local mudou

---

*Este documento é vivo. Atualize-o sempre que a equipe decidir mudar uma convenção ou adicionar uma nova regra. A última atualização deve constar no histórico de commits.*
