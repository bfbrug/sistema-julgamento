# Importação em Massa de Participantes via CSV/Excel

**Data:** 2026-05-07  
**Status:** Aprovado

## Visão Geral

Permite ao administrador importar vários participantes de um evento a partir de um arquivo CSV ou XLSX. O fluxo ocorre em um modal na página de participantes existente: upload → preview (com duplicatas marcadas) → confirmação. A deduplicação usa normalização de nome (trim + lowercase).

---

## Arquitetura

- **Parse do arquivo:** no frontend (browser), usando `papaparse` (CSV) e `xlsx` (Excel)
- **Transporte:** array de nomes em JSON via `POST /events/:eventId/participants/bulk`
- **Deduplicação real:** no backend, com normalização `trim().toLowerCase()`
- **Deduplicação visual (preview):** no frontend, contra a lista já carregada em `useParticipants`

---

## Backend

### Endpoint

```
POST /events/:eventId/participants/bulk
Authorization: Bearer <token> (role: ADMIN)
```

### Request Body

```json
{ "names": ["Ana Silva", "Bruno Costa"] }
```

### DTO — `BulkCreateParticipantsDto`

| Campo | Validação |
|-------|-----------|
| `names` | `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(500)` |
| cada item | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)` |

### Lógica do Service (`bulkCreate`)

1. Busca evento — lança `NotFoundException` se não encontrado ou não pertence ao manager
2. Chama `assertEventMutable` (rejeita `FINISHED` / `IN_PROGRESS`)
3. Busca participantes existentes do evento
4. Normaliza nomes existentes: `name.trim().toLowerCase()`
5. Para cada nome do payload (em ordem de chegada):
   - Normaliza: `trim().toLowerCase()`
   - Se já existe → marca como `skipped`
   - Se não existe → adiciona à lista de criação
6. Atribui `presentationOrder` sequencial: `maxExistingOrder + 1, +2, ...`
7. Cria todos os novos em uma única `prisma.$transaction`
8. Registra audit log `PARTICIPANT_BULK_IMPORTED` com `{ eventId, created: N, skipped: N }`
9. Retorna `{ created: N, skipped: N, participants: ParticipantResponseDto[] }`

### Response

```json
{
  "created": 8,
  "skipped": 2,
  "participants": [ /* ParticipantResponseDto[] apenas os novos */ ]
}
```

### Arquivos novos/modificados

| Arquivo | Ação |
|---------|------|
| `packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts` | Novo |
| `packages/api/src/modules/participants/participants.service.ts` | Adicionar `bulkCreate` |
| `packages/api/src/modules/participants/participants.controller.ts` | Adicionar rota `POST bulk` |
| `packages/api/src/modules/participants/__tests__/participants.service.spec.ts` | Novos casos |
| `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts` | Novos casos |

---

## Frontend

### Dependências novas

```
papaparse @types/papaparse xlsx
```

### Hook — `useImportParticipants(eventId)`

Localização: `packages/web/src/hooks/useParticipants.ts`

- `useMutation` que chama `POST /events/:eventId/participants/bulk`
- `onSuccess`: invalida query `['participants', eventId]`

### Componente — `ImportParticipantsModal`

Localização: `packages/web/src/components/admin/participants/ImportParticipantsModal.tsx`

**Etapa 1 — Upload:**
- Drop zone + clique para selecionar
- Aceita `.csv` e `.xlsx`
- Parse: `papaparse` para CSV, `xlsx` para Excel
- Extrai primeira coluna de cada linha não vazia
- Erros de parse exibidos inline

**Etapa 2 — Preview:**
- Lista com todos os nomes extraídos do arquivo
- Nomes duplicados (vs participantes existentes, normalizado) marcados visualmente como "já existe"
- Contagem: "X serão criados, Y serão ignorados"
- Botão "Voltar" retorna à etapa 1
- Botão "Confirmar importação" aciona o hook

**Pós-confirmação:**
- Spinner durante requisição
- Sucesso: fecha modal, toast `"X participantes importados, Y ignorados"`
- Erro: exibe mensagem inline, modal permanece aberto

### Integração na página de participantes

Arquivo: `packages/web/src/app/(admin)/events/[id]/participants/page.tsx`

- Botão "Importar" adicionado ao lado do botão "Embaralhar"
- Botão desabilitado quando `isFinished`
- Renderiza `<ImportParticipantsModal>` controlado por estado `showImportModal`

### Arquivos novos/modificados

| Arquivo | Ação |
|---------|------|
| `packages/web/src/components/admin/participants/ImportParticipantsModal.tsx` | Novo |
| `packages/web/src/hooks/useParticipants.ts` | Adicionar `useImportParticipants` |
| `packages/web/src/app/(admin)/events/[id]/participants/page.tsx` | Adicionar botão + modal |
| `packages/web/src/lib/api.ts` | Adicionar chamada `importParticipants` |

---

## Testes

### Backend

**`participants.service.spec.ts`** — novos casos:
- Todos os nomes são novos → cria todos com order sequencial correto
- Todos os nomes são duplicatas → retorna `created: 0, skipped: N`
- Mix → cria apenas os não-duplicados
- Nome duplicado com casing diferente → considerado duplicata
- Evento `FINISHED` → lança `AppException`
- Evento `IN_PROGRESS` → lança `AppException`
- `names` array vazio → erro de validação (DTO)

**`participants.controller.spec.ts`** — novos casos:
- Rota `POST /events/:id/participants/bulk` existe e retorna 201
- DTO inválido → retorna 400

### Frontend

**`useImportParticipants`:**
- Mock da API retorna sucesso → invalida cache correto
- Mock da API retorna erro → propaga erro

**`ImportParticipantsModal`:**
- Render etapa 1 (drop zone visível)
- Parse de fixture CSV de 3 linhas → etapa 2 com 3 nomes
- Parse de fixture XLSX → etapa 2 com nomes corretos
- Nome duplicado marcado visualmente
- Clique em "Confirmar" chama hook com array correto

---

## Restrições e Regras de Negócio

- Importação bloqueada para eventos `FINISHED` e `IN_PROGRESS` (mesma regra do `create` individual)
- Máximo de 500 nomes por importação
- Primeira coluna do arquivo = nome; demais colunas ignoradas
- Linhas vazias ignoradas
- Deduplicação: `trim().toLowerCase()` — não distingue maiúsculas nem espaços extras
- `presentationOrder` dos novos sempre após o maior order existente, na ordem do arquivo
