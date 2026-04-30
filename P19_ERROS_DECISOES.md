# P19 — Relatório de Erros e Decisões Técnicas

## Data: 2026-04-29

### Decisões tomadas
1. Padrão transacional: `record(input, tx?)` explícito — consistente com scoring.repository.ts existente.
2. Processors (BullMQ) não usam tx compartilhada — audit direto no prisma.
3. Cursor-based pagination via `id` (UUID) com `take + 1` e ordenação por `createdAt desc`.

### Erros encontrados
