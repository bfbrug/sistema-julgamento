# Distinção de Gênero por Categoria e Liberação Controlada de Resultados

**Data:** 2026-05-07
**Status:** Aprovado para planejamento

## 1. Contexto e Motivação

O sistema atual trata todos participantes como um único grupo dentro de cada categoria. Eventos reais frequentemente exigem rankings separados por gênero — por exemplo, uma categoria que premia 1º a 4º lugar masculino e 1º a 4º lugar feminino, com mesmas notas, ou categorias exclusivas de um gênero.

Adicionalmente, ao encerrar um evento o resultado precisa ser controlado pelo gestor: o locutor anuncia cada posição no palco e o gestor libera a exibição na tela live conforme o anúncio. Hoje o resultado se torna visível imediatamente quando o evento muda para `FINISHED`.

Esta spec descreve duas funcionalidades inter-relacionadas:

1. **Distinção de gênero**: gênero é atributo obrigatório do participante; cada categoria define seu modo (`MIXED`, `MALE_ONLY`, `FEMALE_ONLY`, `UNISEX_SPLIT`).
2. **Liberação controlada**: após `FINISHED`, gestor libera resultados posição-por-posição (4º → 1º), por categoria e por gênero quando aplicável; cada liberação é auditável e reversível.

## 2. Escopo

### Inclui
- Schema: enum `Gender` em `Participant`, enum `CategoryGenderMode` em `Category`, nova tabela `ResultRelease`.
- API REST + WebSocket público para liberação de resultados.
- Atualização de cálculo de ranking respeitando `genderMode`.
- Atualização de import CSV/XLSX para coluna `genero`.
- UI: cadastro de evento (modo de gênero por categoria), cadastro/import de participante (gênero), tela admin live (painel de liberação), tela live pública (revelação progressiva).
- Atualização de relatórios e certificados para refletir distinção.
- Auditoria de todas operações novas.

### Não inclui
- Migração de dados de produção (banco ainda não em produção).
- Outros gêneros além de `MALE`/`FEMALE` (decisão consciente; futuras extensões podem alterar enum).
- Liberação automática (sempre manual).

## 3. Decisões-Chave

| Decisão | Escolha | Razão |
|---|---|---|
| Onde aplicar distinção | Por categoria, configurável pelo gestor | Atende caso real: alguns eventos têm categorias exclusivas, outros têm "unissex com split" |
| Modo `UNISEX_SPLIT` | Mesmas notas, split apenas no ranking final | Jurados não precisam pontuar duas vezes; algoritmo só particiona ao calcular topN |
| Gênero do participante | Obrigatório (NOT NULL) | Banco sem dados reais permite migração direta |
| Granularidade da liberação | Posição-por-posição (4º → 1º) | Permite suspense máximo no palco; locutor anuncia uma posição, gestor libera |
| Persistência da liberação | Tabela dedicada `ResultRelease` | Auditável, reversível por linha, query simples, multi-cliente seguro |
| Reversão fora de ordem | Permitida | Reverter 3º com 2º liberado mantém 2º — gestor lida com correções pontuais |

## 4. Arquitetura

### 4.1 Schema (Prisma)

```prisma
enum Gender {
  MALE
  FEMALE
}

enum CategoryGenderMode {
  MIXED         // ranking único, sem distinção
  MALE_ONLY     // só participantes M elegíveis
  FEMALE_ONLY   // só participantes F elegíveis
  UNISEX_SPLIT  // todos pontuam, dois rankings separados
}

model Participant {
  // campos atuais...
  gender Gender   // NOT NULL
  // novo index:
  // @@index([eventId, gender])
}

model Category {
  // campos atuais...
  genderMode CategoryGenderMode @default(MIXED)
}

model ResultRelease {
  id            String   @id @default(uuid())
  eventId       String
  categoryId    String
  gender        Gender?  // null quando categoria é MIXED
  position      Int      // 1..topN
  releasedAt    DateTime @default(now())
  releasedById  String

  event      JudgingEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  category   Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  releasedBy User         @relation(fields: [releasedById], references: [id])

  @@unique([categoryId, gender, position])
  @@index([eventId])
  @@map("result_releases")
}
```

Migration única: adiciona enums, colunas e tabela. Sem backfill (banco vazio em prod).

### 4.2 API (NestJS)

#### Participantes
- `CreateParticipantDto`, `UpdateParticipantDto`, `BulkCreateParticipantsDto.items[]` ganham `gender: Gender` validado por `@IsEnum(Gender)`.
- Parser de import (CSV/XLSX) detecta header `genero` ou `gender` (case-insensitive). Aceita valores: `M`, `F`, `Masculino`, `Feminino`, `Male`, `Female`. Valor inválido ou ausente → linha rejeitada com mensagem `linha N: gênero inválido "X"`.
- Listagem retorna `gender` em todos endpoints.

#### Categorias
- `CreateCategoryDto`, `UpdateCategoryDto` ganham `genderMode: CategoryGenderMode` (default `MIXED`).
- Sem validação cruzada com participantes — categoria `MALE_ONLY` permitida mesmo sem participantes M (resulta em ranking vazio).

#### Cálculo de ranking
Função `computeRanking(eventId, categoryId)` retorna:

```ts
type RankingResult =
  | { mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY'; entries: RankEntry[] }
  | { mode: 'UNISEX_SPLIT'; male: RankEntry[]; female: RankEntry[] };
```

Lógica:
- `MIXED`: ranking sobre todos os participantes do evento.
- `MALE_ONLY` / `FEMALE_ONLY`: filtra `participant.gender` antes de rankear.
- `UNISEX_SPLIT`: calcula sobre todos, depois particiona por gênero. `topN` aplicado dentro de cada bucket.

#### Endpoints de liberação
Sob `/events/:id/results/releases` (autenticado, gestor dono):
- `GET` → lista todas releases do evento.
- `POST` body `{ categoryId, gender: 'MALE'|'FEMALE'|null, position }` → cria release.
  - Validações: status do evento `FINISHED`; `position` em `1..topN`; coerência de `gender` com `genderMode` (`MIXED` exige `gender=null`; `MALE_ONLY` exige `MALE`; etc); a posição deve existir no ranking calculado (ex: não permite liberar 4º se ranking só tem 3 entradas).
- `DELETE /:releaseId` → remove release.
- Cada POST/DELETE grava em `AuditLog` e emite evento WebSocket.

#### Endpoint público
- `GET /public/events/:id/results` (sem auth) retorna `{ status, categories: [{categoryId, name, genderMode, released: {...}}] }` contendo apenas posições liberadas.
- `public-live.gateway` emite `result:released` e `result:unreleased` no namespace do evento ao POST/DELETE de release.

### 4.3 Web (Next.js)

#### Cadastro/edição de evento (`events/new`, `events/[id]/edit`)
- Cada linha de categoria ganha select `Modo de gênero`: **Mista**, **Só masculino**, **Só feminino**, **Unissex (rankings separados)**.
- Default: Mista. Tooltip explica modo Unissex.

#### Participantes
- Form individual: campo `Gênero` obrigatório (radio M/F).
- Listagem: coluna `Gênero` (badge M / F) e filtro por gênero.
- Modal de import: preview detecta coluna `genero`/`gender`, valida por linha, exibe valores aceitos no help, template baixável atualizado.

#### Tela admin live (`events/[id]/live`)
- Status `IN_PROGRESS` mantém comportamento atual.
- Status `FINISHED`: header com badge "Evento encerrado" e novo painel **Liberação de resultados**:
  - Um card por categoria, header mostra `genderMode`.
  - `MIXED`/exclusivas: coluna única com slots `4º, 3º, 2º, 1º`.
  - `UNISEX_SPLIT`: duas colunas (Masculino, Feminino), cada uma com seus 4 slots.
  - Slots não liberados: nome oculto, botão "Liberar Nº lugar". Ordem forçada decrescente: só habilita botão se posição anterior já liberada.
  - Slots liberados: nome + nota + botão "Reverter".

#### Hook `useLiveResults(eventId)`
- `GET /events/:id/results/releases`.
- Mutations: `releaseNext({categoryId, gender, position})`, `revert({releaseId})`.
- WS: subscribe a `result:released` e `result:unreleased`, invalida query.

#### Tela live pública (`(live)/live/[eventId]`)
- Status `FINISHED` sem releases: tela "Aguardando divulgação dos resultados".
- Conforme releases chegam via WS: anima entrada do nome+posição (efeito reveal). Layout por categoria; duas colunas lado a lado quando `UNISEX_SPLIT`.
- Read-only, sem botões.

#### Relatórios e certificados
- Relatórios `TOP_N` e `DETAILED_BY_JUDGE` consomem `computeRanking` — exibem rankings separados quando categoria é `UNISEX_SPLIT` ou exclusiva.
- Certificado inclui contexto de gênero na descrição da posição quando aplicável (ex: "1º lugar Masculino — Categoria Geral").

## 5. Fluxos

### 5.1 Liberação posição-por-posição
1. Evento muda para `FINISHED`.
2. Tela live pública mostra "Aguardando divulgação".
3. Locutor anuncia "4º lugar masculino: João Silva".
4. Gestor clica "Liberar 4º Masculino" no card da categoria.
5. API: `POST /events/:id/results/releases { categoryId, gender: 'MALE', position: 4 }`.
6. WS emite `result:released` para `(live)/live/[eventId]`.
7. Tela pública revela 4º lugar M com animação. 3º permanece oculto.
8. Repete para 3º, 2º, 1º. Depois mesmo fluxo para Feminino.

### 5.2 Reversão
1. Gestor clica "Reverter" no slot já liberado.
2. API: `DELETE /events/:id/results/releases/:releaseId`.
3. WS emite `result:unreleased`.
4. Tela pública oculta a posição (anima saída).

## 6. Erros e Validações

- API: `BadRequestException` para entradas inválidas, `ConflictException` para release duplicada (constraint única já protege), mensagens em PT-BR.
- Web: toast de erro em falha de release/revert. Sem otimismo (UX de palco — espera confirmação do servidor).

## 7. Auditoria

Novas actions em `AuditLog`:
- `RESULT_RELEASED` (entityType=`Category`, entityId=`categoryId`, payload=`{gender, position, participantId}`).
- `RESULT_UNRELEASED` (mesma estrutura).
- `CATEGORY_GENDER_MODE_CHANGED` (ao editar categoria existente).
- `PARTICIPANT_GENDER_CHANGED` (ao editar participante existente).

## 8. Permissões

- Release/revert: gestor dono do evento (`event.managerId === user.id`).
- `GET /public/events/:id/results`: sem auth; sempre retorna estrutura, frontend decide UI "aguardando".

## 9. Testes

### API
- `participants.service.spec`: bulkCreate aceita gender, rejeita inválido.
- `categories.service.spec`: `genderMode` persiste, default `MIXED`.
- `results.service.spec`: cobertura dos 4 modos; topN por bucket em `UNISEX_SPLIT`.
- `result-release.service.spec`: POST exige `FINISHED`; rejeita gender incoerente com modo; rejeita posição fora de range; DELETE emite WS; audit log gravado.
- `public-events.controller.spec`: `GET /public/events/:id/results` só expõe posições com release.
- E2E: liberar 4º M → live recebe via WS → reverter → live recebe unrelease.

### Web
- `live/page.spec`: `FINISHED` sem releases mostra todos slots ocultos; botão "Liberar 3º" desabilitado se 4º não liberado; `UNISEX_SPLIT` renderiza 2 colunas.
- `(live)/live/[eventId]` snapshot: estado "aguardando divulgação".
- Import modal: preview com gênero; erro em linha sem gênero.

## 10. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Gestor libera posição errada no palco | Botão "Reverter" disponível em cada slot; ação rápida |
| WS desconecta na live pública durante revelação | Hook reconecta + refetch ao montar; estado vem do servidor (`GET /public/events/:id/results`) |
| Confusão entre "Encerrar evento" e "Liberar resultados" | Tooltip explícito; painel de liberação só aparece após `FINISHED` |
| Categoria configurada como `MALE_ONLY` mas sem participantes M | Ranking vazio é estado válido; UI mostra "Sem participantes elegíveis" |

## 11. Plano de Execução

Implementação será detalhada em plano separado via skill `writing-plans` após aprovação desta spec. Etapas previstas:

1. Schema + migration.
2. Backend: DTOs, validações, cálculo de ranking, endpoints de release, gateway público.
3. Frontend: forms (evento, participante, import), hook `useLiveResults`.
4. Tela admin live: painel de liberação.
5. Tela live pública: revelação progressiva com animação.
6. Relatórios e certificados.
7. Testes e auditoria.
