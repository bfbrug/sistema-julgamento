# Design: Login por Email ou Username

**Data:** 2026-05-06
**Branch alvo:** main

## Contexto

Hoje o login aceita apenas email. O sistema deve passar a aceitar email **ou** username. O admin define o username na criação do usuário.

---

## Decisões de design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Campo no form | Único (`identifier`) | UX mais simples |
| Detecção de tipo | Dois queries indexados | Mais robusto que detecção por `@` |
| Validação frontend | Dinâmica por formato | Se contém `@`, valida como email |
| `username` obrigatório? | Sim | Todos os usuários precisam ter |
| Quem define `username`? | Admin na criação | Sem fluxo de primeiro acesso |

---

## Camadas afetadas

### 1. Banco de dados — Prisma migration

Adicionar campo `username` ao model `User`:

```prisma
model User {
  // ... campos existentes ...
  username     String   @unique
  // ...
  @@index([username])
}
```

**Migration:** campo obrigatório — necessita valor default para usuários existentes. Estratégia: prefixo do email (parte antes do `@`), com sufixo `_N` incremental em caso de colisão.

### 2. API — Backend (NestJS)

**`packages/api/src/modules/auth/dto/login.dto.ts`**
- Remove `@IsEmail() email: string`
- Adiciona `@IsString() @IsNotEmpty() identifier: string`

**`packages/api/src/modules/auth/auth.service.ts`**
- Assinatura: `login(identifier: string, password: string, ...)`
- Lógica de busca:
  ```ts
  const user =
    (await prisma.user.findUnique({ where: { email: identifier, isActive: true, deletedAt: null } })) ??
    (await prisma.user.findUnique({ where: { username: identifier, isActive: true, deletedAt: null } }));
  ```
- Audit log: registra `{ identifier }` em vez de `{ email }`

**`packages/api/src/modules/users/dto/create-user.dto.ts`**
- Adiciona `@IsString() @MinLength(3) @MaxLength(50) @Matches(/^[a-z0-9_]+$/) username: string`
- Constraint: apenas letras minúsculas, números e underscore

**`packages/api/src/modules/users/users.service.ts`** (ou controller)
- Passa `username` ao `prisma.user.create`

### 3. Shared (`@judging/shared`)

**`packages/shared/src/schemas/user.schema.ts`**

`loginSchema` atualizado:
```ts
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Campo obrigatório').superRefine((val, ctx) => {
    if (val.includes('@') && !z.string().email().safeParse(val).success) {
      ctx.addIssue({ code: 'custom', message: 'Email inválido' })
    }
  }),
  password: z.string().min(1, 'Senha é obrigatória'),
})
```

`createUserSchema` atualizado:
```ts
export const createUserSchema = z.object({
  // ... campos existentes ...
  username: z.string().min(3, 'Mínimo 3 caracteres').max(50).regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
})
```

Tipo `LoginDto` exportado atualizado para refletir `identifier`.

### 4. Frontend — Web (Next.js)

**`packages/web/src/app/auth/login/page.tsx`**
- Campo `email` → `identifier`
- `type="text"`, `autoComplete="username"`
- Label: `"Email ou nome de usuário"`
- Placeholder: `"seu@email.com ou joao_silva"`

**`packages/web/src/app/(admin)/users/new/page.tsx`**
- Adiciona campo `username` obrigatório no form (após `name`)
- Label: `"Nome de usuário"`
- Placeholder: `"joao_silva"`
- Validação inline: apenas letras minúsculas, números e underscore

---

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `packages/api/prisma/schema.prisma` | Adiciona campo `username` |
| `packages/api/prisma/migrations/...` | Nova migration |
| `packages/api/src/modules/auth/dto/login.dto.ts` | Troca campo |
| `packages/api/src/modules/auth/auth.service.ts` | Lógica de busca dupla |
| `packages/api/src/modules/users/dto/create-user.dto.ts` | Adiciona `username` |
| `packages/api/src/modules/users/users.service.ts` | Passa `username` ao criar |
| `packages/shared/src/schemas/user.schema.ts` | Atualiza `loginSchema` e `createUserSchema` |
| `packages/web/src/app/auth/login/page.tsx` | Campo `identifier` |
| `packages/web/src/app/(admin)/users/new/page.tsx` | Campo `username` |

---

## Testes a atualizar/criar

- `auth.service.spec.ts` — cenários: login por email, login por username, credenciais inválidas
- `useUsers.spec.tsx` — campo `username` no form de criação
- Testes E2E de login (se existirem)

---

## Fora do escopo

- Edição de username por usuário (perfil)
- Recuperação de senha por username
- Validação de unicidade de username no frontend (apenas backend)
