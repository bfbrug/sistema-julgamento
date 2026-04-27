# Sistema de Julgamento de Eventos

Plataforma web para gerenciar competições com jurados, participantes e categorias variáveis. Permite configurar eventos, atribuir jurados, registrar notas e gerar resultados e certificados em tempo real.

## Pré-requisitos

- Node.js 20+
- pnpm 9.x (`npm install -g pnpm`)
- Docker e Docker Compose

## Instalação

```bash
pnpm install
```

## Desenvolvimento local

```bash
# Sobe Postgres e Redis
docker compose up -d

# Verifica serviços (aguardar status healthy)
docker compose ps

# Inicia todos os pacotes em modo dev
pnpm dev
```

## Referências

- [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md) — fonte de verdade arquitetural
- [docs/](./docs/) — documentação do produto, modelo de domínio e máquina de estados
