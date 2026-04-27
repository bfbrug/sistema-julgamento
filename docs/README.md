# Entrega B — Especificação do Domínio

Esta pasta contém os 3 artefatos que descrevem o **domínio** do Sistema de Julgamento de Eventos. São complementares ao `PROJECT_STANDARDS.md` (que descreve a arquitetura) e aos prompts P00-P19 (que descrevem a implementação).

## Arquivos

| Arquivo | Conteúdo | Para quem |
|---|---|---|
| `01-visao-do-produto.md` | O que o sistema faz, decisões-chave, escopo da v1 | Qualquer pessoa que precise entender o sistema |
| `02-modelo-dominio.png` | Diagrama ER com todas as entidades e relações | Desenvolvedor implementando schema/migrations |
| `02-modelo-dominio.mmd` | Código-fonte Mermaid do diagrama (editável) | Para evoluir o modelo no futuro |
| `03-maquina-estados.png` | Estados do participante durante o julgamento | Desenvolvedor implementando UI e gateway |
| `03-maquina-estados.mmd` | Código-fonte Mermaid do diagrama (editável) | Para evoluir o fluxo no futuro |

## Como editar os diagramas

Os arquivos `.mmd` são texto puro (Mermaid). Para regenerar o PNG após editar:

```bash
mmdc -i 02-modelo-dominio.mmd -o 02-modelo-dominio.png -w 2400 -H 1800 -b white
```

Editor online sem instalar nada: https://mermaid.live — cole o conteúdo do `.mmd` e baixe a imagem.

## Notas sobre o modelo de domínio

### Tabela `JUDGING_EVENT` (não `EVENT`)

A tabela do evento de competição se chama `JudgingEvent` no código (`Event` é palavra reservada em vários contextos: WebSockets, EventEmitter, eventos de domínio em DDD). Essa convenção evita ambiguidade.

### Matriz Jurado × Categoria

Modelada como tabela de junção `JUDGE_CATEGORY`. Cada par jurado-categoria é uma linha. Permite que um jurado avalie 1 ou várias categorias, e que uma categoria seja avaliada por 1 ou vários jurados.

### Estado do participante: campo + histórico

`PARTICIPANT.currentState` armazena o estado atual (acesso rápido). `PARTICIPANT_STATE` registra todas as transições com timestamp e quem disparou. Útil para auditoria.

### Imutabilidade das notas

`SCORE.isFinalized` é a marca de imutabilidade. Antes de `true`, o jurado pode alterar (estado REVIEW). Depois de `true`, nenhuma operação de UPDATE é permitida — só INSERT de novas notas. A regra é de aplicação (no service); o banco apenas armazena.

### AuditLog separado dos logs de aplicação

`AUDIT_LOG` registra **eventos de negócio** (notas registradas, mudanças de estado, geração de relatórios) — distinto dos logs do `pino` (que são técnicos). Detalhes na seção 13 do `PROJECT_STANDARDS.md`.
