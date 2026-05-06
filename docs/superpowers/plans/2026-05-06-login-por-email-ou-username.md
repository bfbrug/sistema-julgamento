# Login por Email ou Username — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login via email ou username, adicionando campo `username` único e obrigatório ao modelo `User`.

**Architecture:** Campo `identifier` único no form de login substitui `email`. API tenta busca por email primeiro, depois por username (dois queries indexados). Admin define `username` na criação do usuário.

**Tech Stack:** NestJS + Prisma (API), Zod + React Hook Form + Next.js (Web), `@judging/shared` (tipos/schemas compartilhados), Vitest (testes)

---

## File Map

| Arquivo | Ação |
|---------|------|
| `packages/api/prisma/schema.prisma` | Adiciona `username String @unique` + índice |
| `packages/api/prisma/migrations/<timestamp>_add_username_to_users/migration.sql` | Gerado por `prisma migrate dev` |
| `packages/api/src/modules/auth/dto/login.dto.ts` | Troca `email` por `identifier` |
| `packages/api/src/modules/auth/auth.service.ts` | Busca dupla por email/username |
| `packages/api/src/modules/auth/auth.controller.ts` | Passa `dto.identifier` ao service |
| `packages/api/src/modules/auth/__tests__/auth.service.spec.ts` | Novos cenários de login por username |
| `packages/api/src/modules/auth/__tests__/auth.controller.spec.ts` | Atualiza mock do DTO |
| `packages/api/src/modules/users/dto/create-user.dto.ts` | Adiciona `username` |
| `packages/api/src/modules/users/users.repository.ts` | Adiciona `findByUsername` |
| `packages/api/src/modules/users/users.service.ts` | Verifica unicidade de username; passa ao `repository.create` |
| `packages/shared/src/api-contracts/auth.ts` | Troca `email` por `identifier` em `LoginRequest` |
| `packages/shared/src/api-contracts/users.ts` | Adiciona `username` em `CreateUserRequest` |
| `packages/shared/src/schemas/user.schema.ts` | Atualiza `loginSchema` e `createUserSchema` |
| `packages/web/src/app/auth/login/page.tsx` | Campo `identifier` |
| `packages/web/src/app/(admin)/users/new/page.tsx` | Campo `username` |

---

## Task 1: Prisma — adiciona `username` ao model `User`

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

- [ ] **Step 1: Adiciona campo `username` ao model `User`**

Em `packages/api/prisma/schema.prisma`, localiza o model `User` e adiciona o campo após `name`:

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  name         String
  role         UserRole
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  refreshTokens           RefreshToken[]
  managedEvents           JudgingEvent[]        @relation("EventManager")
  judgeProfiles           Judge[]
  participantStateChanges ParticipantStateLog[]
  auditLogs               AuditLog[]

  @@index([email])
  @@index([username])
  @@map("users")
}
```

- [ ] **Step 2: Cria a migration**

```bash
cd packages/api
npx prisma migrate dev --name add_username_to_users
```

Quando o CLI perguntar sobre dados existentes (campo obrigatório sem default), **escolha a opção que permite fornecer um valor default SQL**. Na tela interativa, use:

```sql
-- Default temporário: prefixo do email antes do @
UPDATE "users" SET username = split_part(email, '@', 1) || '_' || LEFT(id, 4);
```

> Se o CLI não permitir SQL interativo, edite manualmente o arquivo `.sql` gerado na pasta `migrations/` antes de aplicar, adicionando o UPDATE acima antes do `ALTER TABLE ... ALTER COLUMN username SET NOT NULL`.

- [ ] **Step 3: Verifica que migration foi aplicada**

```bash
npx prisma studio
# Abre browser — confirma que coluna "username" existe na tabela users
```

Ou via psql:
```bash
npx prisma db pull --print | grep username
# Deve retornar: username String @unique
```

- [ ] **Step 4: Regenera o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(db): adiciona campo username único ao model User"
```

---

## Task 2: API — atualiza `login.dto.ts` e `auth.service.ts`

**Files:**
- Modify: `packages/api/src/modules/auth/dto/login.dto.ts`
- Modify: `packages/api/src/modules/auth/auth.service.ts`
- Modify: `packages/api/src/modules/auth/auth.controller.ts`
- Test: `packages/api/src/modules/auth/__tests__/auth.service.spec.ts`
- Test: `packages/api/src/modules/auth/__tests__/auth.controller.spec.ts`

- [ ] **Step 1: Escreve testes que falham — `auth.service.spec.ts`**

Abre `packages/api/src/modules/auth/__tests__/auth.service.spec.ts`.

Adiciona `username: 'test_user'` ao `mockUser`:

```ts
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'test_user',
  passwordHash: 'hashed-password',
  name: 'Test User',
  role: UserRole.GESTOR,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};
```

Substitui os testes existentes do `describe('login', ...)` pelos seguintes:

```ts
describe('login', () => {
  it('should login by email and return tokens', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce(mockUser as any) // busca por email retorna
      .mockResolvedValueOnce(null);           // busca por username não chamada

    (bcrypt.compare as Mock).mockResolvedValue(true);

    const result = await service.login('test@example.com', 'password');

    expect(result).toHaveProperty('accessToken', 'token');
    expect(result).toHaveProperty('refreshToken', 'token');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS', actorId: 'user-1', payload: { identifier: 'test@example.com' } }),
      expect.anything(),
    );
  });

  it('should login by username when email lookup fails', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce(null)             // busca por email não encontra
      .mockResolvedValueOnce(mockUser as any); // busca por username encontra

    (bcrypt.compare as Mock).mockResolvedValue(true);

    const result = await service.login('test_user', 'password');

    expect(result).toHaveProperty('accessToken', 'token');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS', payload: { identifier: 'test_user' } }),
      expect.anything(),
    );
  });

  it('should throw UnauthorizedException if neither email nor username found', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    await expect(service.login('nobody', 'password')).rejects.toThrow(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED', entityId: 'unknown', payload: { identifier: 'nobody' } }),
    );
  });

  it('should throw UnauthorizedException if password incorrect', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    (bcrypt.compare as Mock).mockResolvedValue(false);

    await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED', actorId: 'user-1', payload: { identifier: 'test@example.com' } }),
    );
  });
});
```

- [ ] **Step 2: Roda os testes para confirmar que falham**

```bash
cd packages/api
npx vitest run src/modules/auth/__tests__/auth.service.spec.ts
```

Esperado: FAIL — `service.login` ainda usa `email`, audit payload ainda é `{ email: ... }`.

- [ ] **Step 3: Atualiza `login.dto.ts`**

Substitui o conteúdo completo de `packages/api/src/modules/auth/dto/login.dto.ts`:

```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Campo obrigatório' })
  identifier!: string;

  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password!: string;
}
```

- [ ] **Step 4: Atualiza `auth.service.ts` — método `login`**

No arquivo `packages/api/src/modules/auth/auth.service.ts`, substitui o método `login` completo:

```ts
async login(identifier: string, password: string, ipAddress?: string, userAgent?: string) {
  const user =
    (await this.prisma.user.findUnique({
      where: { email: identifier, isActive: true, deletedAt: null },
    })) ??
    (await this.prisma.user.findUnique({
      where: { username: identifier, isActive: true, deletedAt: null },
    }));

  if (!user) {
    await this.auditService.record({
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: 'unknown',
      actorId: undefined,
      payload: { identifier },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedException('Credenciais inválidas');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await this.auditService.record({
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      payload: { identifier },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedException('Credenciais inválidas');
  }

  const { accessToken, refreshToken } = await this.prisma.$transaction(async (tx) => {
    const tokens = await this.generateTokens(user, ipAddress, userAgent, tx);
    await this.auditService.record(
      {
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        payload: { identifier },
        ipAddress,
        userAgent,
      },
      tx,
    );
    return tokens;
  });

  return { accessToken, refreshToken, user };
}
```

- [ ] **Step 5: Atualiza `auth.controller.ts` — passa `identifier`**

No arquivo `packages/api/src/modules/auth/auth.controller.ts`, atualiza o método `login`:

```ts
@Public()
@Throttle({ auth: { limit: 5, ttl: 60000 } })
@Post('login')
@HttpCode(HttpStatus.OK)
login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];
  return this.authService.login(dto.identifier, dto.password, ipAddress, userAgent);
}
```

- [ ] **Step 6: Atualiza `auth.controller.spec.ts`**

No arquivo `packages/api/src/modules/auth/__tests__/auth.controller.spec.ts`, atualiza o teste de login:

```ts
it('should login', async () => {
  const result = await controller.login(
    { identifier: 'test_user', password: 'p' },
    { ip: '1', headers: {} } as any,
  );
  expect(result.accessToken).toBe('a');
});
```

- [ ] **Step 7: Roda os testes para confirmar que passam**

```bash
cd packages/api
npx vitest run src/modules/auth/__tests__/auth.service.spec.ts src/modules/auth/__tests__/auth.controller.spec.ts
```

Esperado: PASS em todos os testes de login.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add packages/api/src/modules/auth/
git commit -m "feat(auth): login por email ou username via campo identifier"
```

---

## Task 3: API — adiciona `username` à criação de usuário

**Files:**
- Modify: `packages/api/src/modules/users/dto/create-user.dto.ts`
- Modify: `packages/api/src/modules/users/users.repository.ts`
- Modify: `packages/api/src/modules/users/users.service.ts`

- [ ] **Step 1: Atualiza `create-user.dto.ts`**

Substitui o conteúdo completo de `packages/api/src/modules/users/dto/create-user.dto.ts`:

```ts
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { UserRole } from '@judging/shared'

export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(3, { message: 'Username deve ter no mínimo 3 caracteres' })
  @MaxLength(50, { message: 'Username muito longo' })
  @Matches(/^[a-z0-9_]+$/, { message: 'Username: apenas letras minúsculas, números e _' })
  username!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string

  @IsEnum(UserRole)
  role!: UserRole
}
```

- [ ] **Step 2: Adiciona `findByUsername` ao `users.repository.ts`**

No arquivo `packages/api/src/modules/users/users.repository.ts`, adiciona o método após `findByEmail`:

```ts
async findByUsername(username: string, options?: { includeDeleted?: boolean }): Promise<User | null> {
  const where: Prisma.UserWhereInput = { username }
  if (options?.includeDeleted) {
    where.deletedAt = undefined
  }
  return this.prisma.user.findFirst({ where })
}
```

- [ ] **Step 3: Atualiza `users.service.ts` — método `create`**

No arquivo `packages/api/src/modules/users/users.service.ts`, substitui o método `create`:

```ts
async create(dto: CreateUserDto, actorId: string): Promise<User> {
  const existingEmail = await this.repository.findByEmail(dto.email, { includeDeleted: true })
  if (existingEmail) {
    throw new ConflictException('Email já em uso')
  }

  const existingUsername = await this.repository.findByUsername(dto.username, { includeDeleted: true })
  if (existingUsername) {
    throw new ConflictException('Nome de usuário já em uso')
  }

  const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS)

  return this.prisma.$transaction(async (tx) => {
    const user = await this.repository.create({
      email: dto.email,
      username: dto.username,
      name: dto.name,
      role: dto.role,
      passwordHash,
    }, tx)

    await this.auditService.record({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      actorId,
      payload: { email: user.email, username: user.username, role: user.role },
    }, tx)

    return user
  })
}
```

- [ ] **Step 4: Roda os testes de users**

```bash
cd packages/api
npx vitest run src/modules/users/
```

Esperado: PASS. Se algum teste falhar por `username` ausente no mock, adiciona `username: 'test_user'` ao `mockUser` do spec correspondente.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/api/src/modules/users/
git commit -m "feat(users): adiciona username obrigatório na criação de usuário"
```

---

## Task 4: Shared — atualiza contratos e schemas

**Files:**
- Modify: `packages/shared/src/api-contracts/auth.ts`
- Modify: `packages/shared/src/api-contracts/users.ts`
- Modify: `packages/shared/src/schemas/user.schema.ts`

- [ ] **Step 1: Atualiza `auth.ts` — troca `LoginRequest.email` por `identifier`**

Substitui o conteúdo completo de `packages/shared/src/api-contracts/auth.ts`:

```ts
import type { UserRole } from '../enums'

export interface LoginRequest {
  identifier: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    isActive: boolean
  }
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}
```

- [ ] **Step 2: Atualiza `users.ts` — adiciona `username` em `CreateUserRequest`**

Em `packages/shared/src/api-contracts/users.ts`, substitui `CreateUserRequest`:

```ts
export interface CreateUserRequest {
  email: string
  username: string
  name: string
  password: string
  role: UserRole
}
```

- [ ] **Step 3: Atualiza `loginSchema` e `createUserSchema` em `user.schema.ts`**

Em `packages/shared/src/schemas/user.schema.ts`, substitui `loginSchema` e `createUserSchema`:

```ts
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Campo obrigatório').superRefine((val, ctx) => {
    if (val.includes('@') && !z.string().email().safeParse(val).success) {
      ctx.addIssue({ code: 'custom', message: 'Email inválido' })
    }
  }),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Username muito longo')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  name: z.string().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  password: z.string().min(8, 'Senha precisa de no mínimo 8 caracteres').max(72, 'Senha muito longa'),
  role: userRoleSchema,
})
```

- [ ] **Step 4: Verifica que o pacote shared builda sem erros**

```bash
cd packages/shared
pnpm build
```

Esperado: build sem erros TypeScript.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/shared/src/
git commit -m "feat(shared): atualiza LoginRequest e CreateUserRequest com identifier/username"
```

---

## Task 5: Web — atualiza tela de login

**Files:**
- Modify: `packages/web/src/app/auth/login/page.tsx`

- [ ] **Step 1: Atualiza o form de login**

Substitui o conteúdo completo de `packages/web/src/app/auth/login/page.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { loginSchema, type LoginDto, type LoginResponse } from '@judging/shared'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginDto) => {
    setIsLoading(true)
    try {
      const response = await apiClient<LoginResponse, LoginDto>({
        method: 'POST',
        path: '/auth/login',
        body: data,
      })

      setSession(response)
      toast.success(`Bem-vindo, ${response.user.name}!`)

      const next = searchParams.get('next')
      if (next) {
        router.push(next)
      } else if (response.user.role === 'JURADO') {
        router.push('/judge')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Credenciais inválidas.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card
        className="w-full max-w-sm"
        header={<h1 className="text-xl font-semibold text-secondary-900">Entrar</h1>}
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="identifier"
              label="Email ou nome de usuário"
              type="text"
              autoComplete="username"
              {...register('identifier')}
              error={errors.identifier?.message}
              placeholder="seu@email.com ou joao_silva"
            />
            <Input
              id="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={!isValid || isLoading}
              loading={isLoading}
            >
              Entrar
            </Button>
          </form>
        }
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verifica tipos no web**

```bash
cd packages/web
pnpm typecheck 2>/dev/null || npx tsc --noEmit
```

Esperado: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/web/src/app/auth/login/page.tsx
git commit -m "feat(web): campo identifier no form de login"
```

---

## Task 6: Web — atualiza tela de criação de usuário (admin)

**Files:**
- Modify: `packages/web/src/app/(admin)/users/new/page.tsx`

- [ ] **Step 1: Atualiza o form de novo usuário**

Em `packages/web/src/app/(admin)/users/new/page.tsx`, adiciona o campo `username` ao schema local e ao form.

Localiza o `const schema = z.object({...})` e adiciona `username` após `name`:

```ts
const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
  role: z.nativeEnum(UserRole),
})
```

Adiciona o campo `Input` de username no form, após o campo `name` e antes do campo `email`:

```tsx
<Input
  id="username"
  label="Nome de usuário"
  {...register('username')}
  error={errors.username?.message}
  placeholder="joao_silva"
/>
```

- [ ] **Step 2: Verifica tipos**

```bash
cd packages/web
pnpm typecheck 2>/dev/null || npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/web/src/app/(admin)/users/new/page.tsx
git commit -m "feat(web): campo username no form de criação de usuário"
```

---

## Task 7: Roda suite completa de testes

- [ ] **Step 1: Testes da API**

```bash
cd packages/api
npx vitest run
```

Esperado: todos os testes passam. Se testes de users falharem por `username` ausente em mocks, adiciona `username: 'test_user'` ao objeto `mockUser` no spec correspondente.

- [ ] **Step 2: Build do shared**

```bash
cd ../shared
pnpm build
```

Esperado: sem erros.

- [ ] **Step 3: Typecheck do web**

```bash
cd ../web
pnpm typecheck 2>/dev/null || npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit final se necessário**

Se houve correções em testes:

```bash
cd ../..
git add packages/api/src/modules/users/
git commit -m "test(users): atualiza mocks com campo username"
```
