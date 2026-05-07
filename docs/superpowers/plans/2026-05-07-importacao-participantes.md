# Importação em Massa de Participantes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir importação de vários participantes via CSV/XLSX em um modal com preview, deduplicando por nome normalizado.

**Architecture:** Parse do arquivo no frontend (papaparse/xlsx), preview com duplicatas marcadas, envio de array de nomes via `POST /events/:eventId/participants/bulk`. Backend deduplica, cria em transação única e registra audit log.

**Tech Stack:** NestJS (backend), Next.js + React Query + papaparse + xlsx (frontend), Vitest (testes)

---

## Mapa de Arquivos

| Arquivo | Ação |
|---------|------|
| `packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts` | Criar |
| `packages/api/src/modules/participants/participants.service.ts` | Modificar — adicionar `bulkCreate` |
| `packages/api/src/modules/participants/participants.controller.ts` | Modificar — adicionar rota `POST bulk` |
| `packages/api/src/modules/participants/__tests__/participants.service.spec.ts` | Modificar — novos casos |
| `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts` | Modificar — novos casos |
| `packages/web/src/hooks/useParticipants.ts` | Modificar — adicionar `useImportParticipants` |
| `packages/web/src/components/admin/participants/ImportParticipantsModal.tsx` | Criar |
| `packages/web/src/app/(admin)/events/[id]/participants/page.tsx` | Modificar — botão + modal |

---

## Task 1: DTO de importação em massa (backend)

**Files:**
- Create: `packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts`

- [ ] **Step 1: Criar o DTO**

```typescript
// packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts
import { IsArray, IsString, IsNotEmpty, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator'

export class BulkCreateParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(255, { each: true })
  names!: string[]
}

export interface BulkCreateResult {
  created: number
  skipped: number
  participants: import('./participant-response.dto').ParticipantResponseDto[]
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/modules/participants/dto/bulk-create-participants.dto.ts
git commit -m "feat(api): add BulkCreateParticipantsDto"
```

---

## Task 2: Service — método `bulkCreate` com testes (TDD)

**Files:**
- Modify: `packages/api/src/modules/participants/__tests__/participants.service.spec.ts`
- Modify: `packages/api/src/modules/participants/participants.service.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final do arquivo `participants.service.spec.ts`, dentro do `describe('ParticipantsService', ...)`:

```typescript
describe('bulkCreate', () => {
  it('cria todos os nomes quando nenhum existe', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent())
    repository.findByEventId.mockResolvedValue([])
    repository.maxPresentationOrder.mockResolvedValue(0)

    const part1 = makeParticipant({ id: 'p1', name: 'Ana Silva', presentationOrder: 1 })
    const part2 = makeParticipant({ id: 'p2', name: 'Bruno Costa', presentationOrder: 2 })

    const prismaClient = { participant: { createMany: vi.fn() } }
    // sobrescrever $transaction para capturar o callback
    const prisma = { $transaction: vi.fn(async (cb: any) => cb(prismaClient)) }
    // recriar o módulo com prisma customizado
    const module = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: ParticipantsRepository, useValue: repository },
        { provide: EventsRepository, useValue: eventsRepository },
        { provide: AuditService, useValue: auditService },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    const svc = module.get<ParticipantsService>(ParticipantsService)

    repository.findByEventId
      .mockResolvedValueOnce([]) // busca inicial
      .mockResolvedValueOnce([part1, part2]) // busca pós-criação

    storageService.getPublicUrl.mockResolvedValue(null)

    const result = await svc.bulkCreate('event-1', { names: ['Ana Silva', 'Bruno Costa'] }, 'manager-1')

    expect(result.created).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.participants).toHaveLength(2)
  })

  it('pula todos quando todos já existem (normalização trim+lowercase)', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent())
    const existing = [
      makeParticipant({ id: 'p1', name: 'Ana Silva', presentationOrder: 1 }),
    ]
    repository.findByEventId.mockResolvedValue(existing)
    repository.maxPresentationOrder.mockResolvedValue(1)
    storageService.getPublicUrl.mockResolvedValue(null)

    const result = await service.bulkCreate('event-1', { names: ['  ANA SILVA  '] }, 'manager-1')

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.participants).toHaveLength(0)
  })

  it('mix: cria novos e pula existentes', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent())
    const existing = [makeParticipant({ id: 'p1', name: 'Ana Silva', presentationOrder: 1 })]

    repository.findByEventId
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce([
        ...existing,
        makeParticipant({ id: 'p2', name: 'Bruno Costa', presentationOrder: 2 }),
      ])
    repository.maxPresentationOrder.mockResolvedValue(1)
    storageService.getPublicUrl.mockResolvedValue(null)

    const result = await service.bulkCreate(
      'event-1',
      { names: ['Ana Silva', 'Bruno Costa'] },
      'manager-1',
    )

    expect(result.created).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('rejeita evento FINISHED', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.FINISHED }))

    await expect(
      service.bulkCreate('event-1', { names: ['João'] }, 'manager-1'),
    ).rejects.toThrow()
  })

  it('rejeita evento IN_PROGRESS', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.IN_PROGRESS }))

    await expect(
      service.bulkCreate('event-1', { names: ['João'] }, 'manager-1'),
    ).rejects.toThrow()
  })

  it('presentationOrder sequencial após o maior existente', async () => {
    eventsRepository.findById.mockResolvedValue(makeEvent())
    repository.findByEventId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeParticipant({ id: 'p1', name: 'Ana', presentationOrder: 6 }),
        makeParticipant({ id: 'p2', name: 'Bruno', presentationOrder: 7 }),
      ])
    repository.maxPresentationOrder.mockResolvedValue(5)
    storageService.getPublicUrl.mockResolvedValue(null)

    const result = await service.bulkCreate(
      'event-1',
      { names: ['Ana', 'Bruno'] },
      'manager-1',
    )

    expect(result.participants[0].presentationOrder).toBe(6)
    expect(result.participants[1].presentationOrder).toBe(7)
  })
})
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
cd packages/api && pnpm vitest run src/modules/participants/__tests__/participants.service.spec.ts 2>&1 | tail -20
```

Esperado: falha com `TypeError: svc.bulkCreate is not a function`

- [ ] **Step 3: Implementar `bulkCreate` no service**

Adicionar ao final da classe `ParticipantsService` em `participants.service.ts`:

```typescript
async bulkCreate(
  eventId: string,
  dto: BulkCreateParticipantsDto,
  managerId: string,
): Promise<BulkCreateResult> {
  const event = await this.getEventOrThrow(eventId, managerId)
  this.assertEventMutable(event.status)

  const existing = await this.repository.findByEventId(eventId)
  const existingNormalized = new Set(existing.map((p) => p.name.trim().toLowerCase()))

  const toCreate: string[] = []
  const skippedNames: string[] = []

  for (const name of dto.names) {
    const normalized = name.trim().toLowerCase()
    if (existingNormalized.has(normalized)) {
      skippedNames.push(name)
    } else {
      toCreate.push(name.trim())
      existingNormalized.add(normalized) // evita duplicatas dentro do próprio payload
    }
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: skippedNames.length, participants: [] }
  }

  const maxOrder = await this.repository.maxPresentationOrder(eventId)

  await this.prisma.$transaction(async (tx) => {
    const records = toCreate.map((name, i) => ({
      id: require('crypto').randomUUID(),
      eventId,
      name,
      presentationOrder: maxOrder + 1 + i,
      isAbsent: false,
      currentState: 'WAITING' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    await (tx as any).participant.createMany({ data: records })

    await this.auditService.record(
      {
        action: 'PARTICIPANT_BULK_IMPORTED',
        entityType: 'Participant',
        entityId: eventId,
        actorId: managerId,
        payload: { eventId, created: toCreate.length, skipped: skippedNames.length },
      },
      tx,
    )
  })

  const allAfter = await this.repository.findByEventId(eventId)
  const createdNormalized = new Set(toCreate.map((n) => n.trim().toLowerCase()))
  const newParticipants = allAfter.filter((p) => createdNormalized.has(p.name.trim().toLowerCase()))

  const participantDtos = await Promise.all(
    newParticipants.map((p) => toParticipantResponse(p, this.storageService)),
  )

  return {
    created: toCreate.length,
    skipped: skippedNames.length,
    participants: participantDtos,
  }
}
```

Também adicionar imports no topo do service (junto aos imports existentes):

```typescript
import { BulkCreateParticipantsDto, BulkCreateResult } from './dto/bulk-create-participants.dto'
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
cd packages/api && pnpm vitest run src/modules/participants/__tests__/participants.service.spec.ts 2>&1 | tail -20
```

Esperado: todos passam

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/modules/participants/participants.service.ts \
        packages/api/src/modules/participants/__tests__/participants.service.spec.ts
git commit -m "feat(api): add bulkCreate to ParticipantsService"
```

---

## Task 3: Controller — rota `POST bulk` com testes (TDD)

**Files:**
- Modify: `packages/api/src/modules/participants/__tests__/participants.controller.spec.ts`
- Modify: `packages/api/src/modules/participants/participants.controller.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final do arquivo `participants.controller.spec.ts`, dentro do `describe` principal:

```typescript
describe('POST /events/:eventId/participants/bulk', () => {
  it('retorna 201 com resultado de importação', async () => {
    const bulkResult = {
      created: 2,
      skipped: 0,
      participants: [],
    }
    participantsService.bulkCreate = vi.fn().mockResolvedValue(bulkResult)

    const response = await app.inject({
      method: 'POST',
      url: '/events/event-1/participants/bulk',
      headers: { authorization: 'Bearer valid-token' },
      payload: { names: ['Ana', 'Bruno'] },
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.data.created).toBe(2)
    expect(body.data.skipped).toBe(0)
  })

  it('retorna 400 quando names está vazio', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/events/event-1/participants/bulk',
      headers: { authorization: 'Bearer valid-token' },
      payload: { names: [] },
    })

    expect(response.statusCode).toBe(400)
  })

  it('retorna 400 quando names não é array', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/events/event-1/participants/bulk',
      headers: { authorization: 'Bearer valid-token' },
      payload: { names: 'não é array' },
    })

    expect(response.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
cd packages/api && pnpm vitest run src/modules/participants/__tests__/participants.controller.spec.ts 2>&1 | tail -20
```

Esperado: falha com 404 (rota não existe)

- [ ] **Step 3: Adicionar rota no controller**

Em `participants.controller.ts`, adicionar o import do DTO e o método:

```typescript
// Adicionar ao imports no topo:
import { BulkCreateParticipantsDto, BulkCreateResult } from './dto/bulk-create-participants.dto'
```

Adicionar método dentro da classe `ParticipantsController`, **antes** do método `create` existente (para evitar conflito de rota com `:id`):

```typescript
@Post('bulk')
@HttpCode(HttpStatus.CREATED)
async bulkCreate(
  @Param('eventId') eventId: string,
  @Body() dto: BulkCreateParticipantsDto,
  @CurrentUser() user: JwtPayload,
): Promise<BulkCreateResult> {
  return this.participantsService.bulkCreate(eventId, dto, user.sub)
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
cd packages/api && pnpm vitest run src/modules/participants/__tests__/participants.controller.spec.ts 2>&1 | tail -20
```

Esperado: todos passam

- [ ] **Step 5: Rodar todos os testes do módulo**

```bash
cd packages/api && pnpm vitest run src/modules/participants/ 2>&1 | tail -30
```

Esperado: todos passam

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/modules/participants/participants.controller.ts \
        packages/api/src/modules/participants/__tests__/participants.controller.spec.ts
git commit -m "feat(api): add POST /participants/bulk route"
```

---

## Task 4: Instalar dependências no pacote web

**Files:**
- Modify: `packages/web/package.json` (via pnpm)

- [ ] **Step 1: Instalar papaparse e xlsx**

```bash
cd packages/web && pnpm add papaparse xlsx && pnpm add -D @types/papaparse
```

- [ ] **Step 2: Verificar instalação**

```bash
cd packages/web && node -e "require('papaparse'); require('xlsx'); console.log('OK')"
```

Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add papaparse and xlsx dependencies"
```

---

## Task 5: Hook `useImportParticipants` com testes (TDD)

**Files:**
- Modify: `packages/web/src/hooks/useParticipants.ts`
- Criar (se não existir): `packages/web/src/hooks/__tests__/useParticipants.spec.ts`

> Se o arquivo de teste não existir, crie-o do zero. Se existir, adicione os casos ao final.

- [ ] **Step 1: Verificar se existe arquivo de teste**

```bash
ls packages/web/src/hooks/__tests__/ 2>/dev/null || echo "não existe"
```

- [ ] **Step 2: Escrever o teste do hook**

Criar/editar `packages/web/src/hooks/__tests__/useParticipants.spec.ts` adicionando:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { useImportParticipants } from '../useParticipants'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '@/lib/api'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useImportParticipants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama POST /events/:eventId/participants/bulk com array de nomes', async () => {
    const mockResult = { created: 2, skipped: 0, participants: [] }
    ;(apiClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useImportParticipants('event-1'), { wrapper })

    result.current.mutate({ names: ['Ana', 'Bruno'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient).toHaveBeenCalledWith({
      method: 'POST',
      path: '/events/event-1/participants/bulk',
      body: { names: ['Ana', 'Bruno'] },
    })
    expect(result.current.data).toEqual(mockResult)
  })

  it('propaga erro quando API falha', async () => {
    ;(apiClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Erro servidor'))

    const { result } = renderHook(() => useImportParticipants('event-1'), { wrapper })

    result.current.mutate({ names: ['Ana'] })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Erro servidor')
  })
})
```

- [ ] **Step 3: Rodar o teste para verificar que falha**

```bash
cd packages/web && pnpm vitest run src/hooks/__tests__/useParticipants.spec.ts 2>&1 | tail -20
```

Esperado: falha com `useImportParticipants is not a function`

- [ ] **Step 4: Implementar o hook**

Adicionar ao final de `packages/web/src/hooks/useParticipants.ts`:

```typescript
export interface BulkImportResult {
  created: number
  skipped: number
  participants: ParticipantResponse[]
}

export function useImportParticipants(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { names: string[] }) =>
      apiClient<BulkImportResult, { names: string[] }>({
        method: 'POST',
        path: `/events/${eventId}/participants/bulk`,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao importar participantes.')
    },
  })
}
```

- [ ] **Step 5: Rodar o teste para verificar que passa**

```bash
cd packages/web && pnpm vitest run src/hooks/__tests__/useParticipants.spec.ts 2>&1 | tail -20
```

Esperado: todos passam

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/hooks/useParticipants.ts \
        packages/web/src/hooks/__tests__/useParticipants.spec.ts
git commit -m "feat(web): add useImportParticipants hook"
```

---

## Task 6: Componente `ImportParticipantsModal` com testes (TDD)

**Files:**
- Create: `packages/web/src/components/admin/participants/ImportParticipantsModal.tsx`
- Create: `packages/web/src/components/admin/participants/__tests__/ImportParticipantsModal.spec.tsx`

- [ ] **Step 1: Criar fixtures de teste**

Criar diretório e fixtures:

```bash
mkdir -p packages/web/src/components/admin/participants/__tests__/fixtures
```

Criar `packages/web/src/components/admin/participants/__tests__/fixtures/participants.csv` com conteúdo:

```
nome
Ana Silva
Bruno Costa
Carlos Mendes
```

- [ ] **Step 2: Escrever os testes**

Criar `packages/web/src/components/admin/participants/__tests__/ImportParticipantsModal.spec.tsx`:

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ImportParticipantsModal } from '../ImportParticipantsModal'

vi.mock('@/hooks/useParticipants', () => ({
  useImportParticipants: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}))

import { useImportParticipants } from '@/hooks/useParticipants'

const mockExistingParticipants = [
  { id: '1', name: 'Ana Silva', presentationOrder: 1, isAbsent: false, currentState: 'WAITING', photoUrl: null, counts: { scoresRecorded: 0, scoresFinalized: 0 } },
]

describe('ImportParticipantsModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza drop zone na etapa 1', () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={mockExistingParticipants}
        onClose={onClose}
      />,
    )

    expect(screen.getByText(/arraste e solte/i)).toBeInTheDocument()
  })

  it('após parse de CSV exibe etapa 2 com nomes', async () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={[]}
        onClose={onClose}
      />,
    )

    const csvContent = 'nome\nBruno Costa\nCarlos Mendes\nDiana Lima'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
      expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
      expect(screen.getByText('Diana Lima')).toBeInTheDocument()
    })
  })

  it('marca nome duplicado como "já existe"', async () => {
    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={mockExistingParticipants}
        onClose={onClose}
      />,
    )

    const csvContent = 'nome\nAna Silva\nBruno Costa'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/já existe/i)).toBeInTheDocument()
    })
  })

  it('clique em Confirmar chama hook com nomes corretos', async () => {
    const mockMutate = vi.fn()
    ;(useImportParticipants as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    })

    render(
      <ImportParticipantsModal
        eventId="event-1"
        existingParticipants={[]}
        onClose={onClose}
      />,
    )

    const csvContent = 'nome\nAna\nBruno'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => screen.getByText('Ana'))

    fireEvent.click(screen.getByRole('button', { name: /confirmar importação/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { names: ['Ana', 'Bruno'] },
      expect.any(Object),
    )
  })
})
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
cd packages/web && pnpm vitest run src/components/admin/participants/__tests__/ImportParticipantsModal.spec.tsx 2>&1 | tail -20
```

Esperado: falha com `Cannot find module '../ImportParticipantsModal'`

- [ ] **Step 4: Criar o componente**

Criar `packages/web/src/components/admin/participants/ImportParticipantsModal.tsx`:

```typescript
'use client'

import React, { useRef, useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { useImportParticipants } from '@/hooks/useParticipants'
import type { ParticipantResponse } from '@judging/shared'
import { toast } from 'sonner'

interface Props {
  eventId: string
  existingParticipants: ParticipantResponse[]
  onClose: () => void
}

type Step = 'upload' | 'preview'

interface ParsedName {
  name: string
  isDuplicate: boolean
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function parseFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<string[]>(file, {
        skipEmptyLines: true,
        complete: (results) => {
          const names = results.data
            .map((row) => (Array.isArray(row) ? row[0] : ''))
            .map((n) => n.trim())
            .filter(Boolean)
          // pula linha de cabeçalho se for "nome" ou "name"
          const first = names[0]?.toLowerCase()
          resolve(first === 'nome' || first === 'name' ? names.slice(1) : names)
        },
        error: reject,
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
          const names = rows
            .map((row) => (Array.isArray(row) ? String(row[0] ?? '').trim() : ''))
            .filter(Boolean)
          const first = names[0]?.toLowerCase()
          resolve(first === 'nome' || first === 'name' ? names.slice(1) : names)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Formato não suportado. Use .csv ou .xlsx'))
    }
  })
}

export function ImportParticipantsModal({ eventId, existingParticipants, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [parsedNames, setParsedNames] = useState<ParsedName[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: importParticipants, isPending } = useImportParticipants(eventId)

  const existingNormalized = new Set(existingParticipants.map((p) => normalizeName(p.name)))

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null)
      try {
        const names = await parseFile(file)
        const seenInFile = new Set<string>()
        const result: ParsedName[] = []
        for (const name of names) {
          const norm = normalizeName(name)
          const isDuplicate = existingNormalized.has(norm) || seenInFile.has(norm)
          seenInFile.add(norm)
          result.push({ name, isDuplicate })
        }
        setParsedNames(result)
        setStep('preview')
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
      }
    },
    [existingNormalized],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = () => {
    const namesToCreate = parsedNames.filter((p) => !p.isDuplicate).map((p) => p.name)
    importParticipants(
      { names: namesToCreate },
      {
        onSuccess: (result) => {
          toast.success(`${result.created} participantes importados, ${result.skipped} ignorados`)
          onClose()
        },
        onError: (err) => {
          toast.error(err.message || 'Erro ao importar participantes.')
        },
      },
    )
  }

  const toCreate = parsedNames.filter((p) => !p.isDuplicate).length
  const toSkip = parsedNames.filter((p) => p.isDuplicate).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Importar Participantes</h2>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600" aria-label="Fechar">✕</button>
        </div>

        <div className="p-4">
          {step === 'upload' && (
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 hover:border-primary-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-secondary-600 font-medium">Arraste e solte o arquivo aqui</p>
                <p className="text-secondary-400 text-sm mt-1">ou clique para selecionar</p>
                <p className="text-secondary-400 text-xs mt-2">CSV ou XLSX — primeira coluna = nome</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              {parseError && (
                <p className="text-red-500 text-sm mt-2">{parseError}</p>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-secondary-600 mb-3">
                <span className="font-medium text-green-600">{toCreate} serão criados</span>
                {toSkip > 0 && <span className="ml-2 text-secondary-400">{toSkip} serão ignorados (já existem)</span>}
              </p>
              <ul className="max-h-64 overflow-y-auto divide-y divide-secondary-100 border rounded-lg">
                {parsedNames.map((item, i) => (
                  <li key={i} className={`px-3 py-2 text-sm flex items-center justify-between ${item.isDuplicate ? 'text-secondary-400' : 'text-secondary-800'}`}>
                    <span>{item.name}</span>
                    {item.isDuplicate && (
                      <span className="text-xs bg-secondary-100 text-secondary-500 px-2 py-0.5 rounded">já existe</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          {step === 'preview' && (
            <Button variant="secondary" onClick={() => setStep('upload')} disabled={isPending}>
              Voltar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          {step === 'preview' && (
            <Button onClick={handleConfirm} disabled={isPending || toCreate === 0}>
              {isPending ? 'Importando...' : 'Confirmar importação'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Rodar testes para verificar que passam**

```bash
cd packages/web && pnpm vitest run src/components/admin/participants/__tests__/ImportParticipantsModal.spec.tsx 2>&1 | tail -20
```

Esperado: todos passam

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/admin/participants/ImportParticipantsModal.tsx \
        packages/web/src/components/admin/participants/__tests__/ImportParticipantsModal.spec.tsx \
        packages/web/src/components/admin/participants/__tests__/fixtures/
git commit -m "feat(web): add ImportParticipantsModal component"
```

---

## Task 7: Integrar modal na página de participantes

**Files:**
- Modify: `packages/web/src/app/(admin)/events/[id]/participants/page.tsx`

- [ ] **Step 1: Adicionar botão e modal à página**

Editar `packages/web/src/app/(admin)/events/[id]/participants/page.tsx`.

Adicionar import no topo (junto aos imports existentes):

```typescript
import { ImportParticipantsModal } from '@/components/admin/participants/ImportParticipantsModal'
```

Adicionar estado dentro do componente `EventParticipantsPage` (junto aos outros `useState`):

```typescript
const [showImportModal, setShowImportModal] = useState(false)
```

Adicionar botão "Importar" ao lado do botão de embaralhar existente. Procurar o botão de shuffle e adicionar antes dele:

```tsx
<Button
  variant="secondary"
  onClick={() => setShowImportModal(true)}
  disabled={isFinished}
>
  Importar
</Button>
```

Adicionar o modal ao final do JSX retornado, antes do `</div>` de fechamento principal:

```tsx
{showImportModal && (
  <ImportParticipantsModal
    eventId={eventId}
    existingParticipants={participants ?? []}
    onClose={() => setShowImportModal(false)}
  />
)}
```

- [ ] **Step 2: Verificar type-check**

```bash
cd packages/web && pnpm type-check 2>&1 | tail -20
```

Esperado: sem erros

- [ ] **Step 3: Rodar todos os testes do web**

```bash
cd packages/web && pnpm vitest run 2>&1 | tail -30
```

Esperado: todos passam

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/(admin)/events/[id]/participants/page.tsx
git commit -m "feat(web): add import button and modal to participants page"
```

---

## Task 8: Verificação final

- [ ] **Step 1: Rodar todos os testes do monorepo**

```bash
pnpm test 2>&1 | tail -40
```

Esperado: todos passam

- [ ] **Step 2: Rodar type-check completo**

```bash
pnpm type-check 2>&1 | tail -20
```

Esperado: sem erros

- [ ] **Step 3: Commit final se houver arquivos soltos**

```bash
git status
# se houver algo não commitado:
git add -A && git commit -m "chore: finalize bulk import feature"
```
