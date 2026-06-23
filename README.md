# Integra Solar CRM - Versao Limpa

Repositorio preparado para iniciar uma nova operacao sem dados simulados de clientes, propostas, contratos e demais cadastros de exemplo.

## Estrutura

- `frontend/index.html`: interface principal.
- `backend/`: API Node.js para propostas em PDF.
- `database/supabase-schema.sql`: schema recuperado, sem seed operacional na versao limpa.
- `docs/`: documentacao e material de auditoria.

## Rodar localmente

### Frontend

Na raiz:

```bash
npm.cmd run frontend
```

### Backend

Na pasta `backend`:

```bash
npm.cmd install
copy .env.example .env
npm.cmd start
```

## Observacoes

- Esta versao foi limpa de dados simulados no codigo.
- Esta versao nao aponta para a base antiga por padrao; configure novas credenciais antes de usar banco remoto.
- Credenciais e chaves devem ficar fora do GitHub.
- `.env`, logs, `node_modules` e caches nao entram no repositorio.
