# Redesign da Página de Certificados

**Data:** 2026-05-05
**Status:** Aprovado

## Contexto

A página atual (`/events/[id]/certificates`) tem quatro seções empilhadas verticalmente (texto, background, assinaturas, geração). O design é funcional mas sem hierarquia visual. Assinaturas são gerenciadas via formulário raw sem preview de imagem e sem drag-and-drop.

## Objetivo

Redesenhar a página com layout mais agradável, texto padrão pré-preenchido, preview de imagem de assinatura imediato após upload, e reordenação por drag-and-drop.

---

## Layout Geral

**Linha superior — duas colunas:**
- Coluna esquerda (60%): `CertificateTextEditor`
- Coluna direita (40%): `BackgroundUploader` (repositionado, sem alteração funcional)

**Linha inferior — largura total:**
- `SignatureManager` (reescrito)
- `BatchGenerationCard` (sem alteração)

---

## Componente: `CertificateTextEditor`

### Texto padrão
Quando `initialText` está vazio, o componente inicializa com:

```
Certificamos que {{participante}} participou do evento {{evento}}, realizado em {{data}} em {{local}}, organizado por {{organizador}}.
```

Esse valor é tratado como `initialText` para fins de estado local — não é salvo automaticamente na API, só na ação explícita de "Salvar".

### UI
- `textarea` editável, fonte serif (Georgia), `rows={6}`
- Abaixo: chips clicáveis para cada placeholder (comportamento atual mantido — insere no final do texto)
- Chips estilizados: `bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-3 py-1 text-xs`
- Label acima dos chips: "Clique para inserir no texto"
- Contador de caracteres e botão Salvar (iguais ao atual)

---

## Componente: `SignatureManager` (rewrite)

### Grid
Grid de 3 colunas fixas. Cada coluna representa uma posição (1, 2, 3). As assinaturas existentes são mapeadas para suas colunas por `displayOrder`. Posições sem assinatura mostram slot vazio.

### Card preenchido
- Badge numérico de posição: canto superior esquerdo, `bg-primary-600 text-white rounded-full w-5 h-5`
- Drag handle: canto superior direito, ícone `GripVertical` do lucide, `cursor-grab`
- Imagem da assinatura: `<img>` centralizado, `h-16 object-contain`, URL via `${baseUrl}/uploads/${sig.imagePath}`
- Nome (bold) + cargo (muted) centralizados abaixo da imagem
- Botões Editar / Remover no rodapé do card

### Slot vazio
- `border-2 border-dashed border-secondary-200`, badge numérico cinza
- Clique → transforma o slot em formulário inline (sem modal):
  - Drop zone para imagem: `border-2 border-dashed`, aceita drag ou clique para abrir file picker
  - Após seleção do arquivo: mostra `<img>` com preview local via `URL.createObjectURL(file)` em vez da drop zone
  - Input nome + input cargo
  - Botões Salvar / Cancelar
  - Salvar chama `useAddSignature` com `displayOrder` igual à posição do slot

### Drag-and-drop para reordenar
- Usar `@dnd-kit/core` + `@dnd-kit/sortable` (já instalados: `^6.3.1` / `^10.0.0`)
- `SortableContext` em torno dos 3 cards com estratégia `rectSortingStrategy`
- Ao fim do drag (`onDragEnd`): recalcula `displayOrder` de todos os itens afetados e chama `useUpdateSignature` para cada um que mudou de posição
- Durante o drag: card arrastado recebe `opacity-50`, slot destino recebe highlight com borda primária

### Estado de edição inline (card existente)
Manter comportamento atual: clique em Editar substitui o card por formulário inline com inputs de nome e cargo (sem campo de imagem — imagem não é editável após upload).

---

## Dependências

| Pacote | Versão | Status |
|--------|--------|--------|
| `@dnd-kit/core` | `^6.3.1` | já instalado |
| `@dnd-kit/sortable` | `^10.0.0` | já instalado |
| `@dnd-kit/utilities` | `^3.2.2` | já instalado |

Nenhuma nova dependência necessária.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/web/src/app/(admin)/events/[id]/certificates/page.tsx` | Novo layout duas colunas |
| `packages/web/src/components/admin/certificates/CertificateTextEditor.tsx` | Texto padrão + chips redesenhados |
| `packages/web/src/components/admin/certificates/SignatureManager.tsx` | Rewrite completo |
| `packages/web/src/components/admin/certificates/BackgroundUploader.tsx` | Sem alteração funcional |
| `packages/web/src/components/admin/certificates/BatchGenerationCard.tsx` | Sem alteração |

---

## Fora de escopo

- Alterações na API
- Preview ao vivo do certificado completo (PDF/canvas)
- Edição da imagem de assinatura após upload
- Alterações em `BatchGenerationCard` ou `BackgroundUploader`
