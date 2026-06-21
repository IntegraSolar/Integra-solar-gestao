# Spec 3c — Entrega do Material + Obra + Entrega da Obra + Pós Obra

**Data:** 2026-06-18
**Projeto:** Integra Solar CRM
**Escopo:** Módulos de pipeline pós-compra até conclusão e ativação

---

## Contexto

Após a compra ser marcada como `entregue` no módulo Compras, o cliente entra no fluxo de execução da obra. Este spec cobre 4 módulos sequenciais, todos usando `pipeline_flags` JSONB para rastrear o estado independentemente do `pipeline_stage`.

---

## Arquitetura — pipeline_flags

| Evento | Efeito em `pipeline_flags` |
|---|---|
| `compras = 'entregue'` (em `upsertPurchase`) | `flags.entrega_material = 'pendente'` + cria `client_deliveries` |
| Upload do termo em Entrega do Material | `flags.obra = 'pendente'` + cria `client_obras` |
| Obra status = `'concluida'` | `flags.entrega_obra = 'pendente'` + cria `client_obra_deliveries` |
| `data_entrega` registrada em Entrega da Obra | `flags.pos_obra = 'pendente'` + cria `client_pos_obra` |
| Pós Obra status = `'concluida'` | `flags.pos_obra = 'concluida'` |

Cada módulo filtra clientes onde seu flag existe e não está no estado final. Os registros iniciais são criados automaticamente no gatilho anterior (mesmo padrão do `confirmInstallment`).

---

## Módulo 1 — Entrega do Material

### Objetivo
Registrar a entrega física dos materiais ao cliente com confirmação formal via termo assinado.

### Rotas
- `GET /entrega-material` — lista de clientes com `pipeline_flags.entrega_material` ativo
- `GET /entrega-material/[id]` — detalhe da entrega

### `/entrega-material` — Lista
Server Component. Filtra clientes onde `pipeline_flags->>'entrega_material' IS NOT NULL AND pipeline_flags->>'entrega_material' != 'concluida'`.

Colunas: Nome do cliente, Cidade, Prazo global (`X / Y dias`), Status (badge).

### `/entrega-material/[id]` — Detalhe
Server Component + Client Component.

Campos:
- **Data de entrega ao cliente** — campo date
- **Termo de entrega assinado** — upload de arquivo via `client_attachments` com tipo `termo_entrega_material`, URL salva em `client_deliveries.termo_url`
- **Checklist** — 3 checkboxes: Limpeza do local, Entrega dos manuais, Orientação de uso
- **Status** — select: `pendente` | `concluida`

**Gatilho de saída:** ao salvar com `termo_url` preenchido → `pipeline_flags.obra = 'pendente'` + cria registro em `client_obras`.

### Banco de Dados

```sql
create table public.client_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  checklist jsonb not null default '{"limpeza": false, "manuais": false, "orientacao_uso": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_deliveries enable row level security;
create policy "deliveries_org_isolation" on public.client_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

### Server Actions

```
upsertDelivery(clientId, data) → ActionResult
  - Cria ou atualiza client_deliveries
  - Atualiza pipeline_flags.entrega_material com o status
  - Se termo_url preenchido e pipeline_flags.obra não existe:
      pipeline_flags.obra = 'pendente'
      cria client_obras com status = 'aguardando'
  - revalidatePath('/entrega-material')
```

### Pipeline
- Entrada: `pipeline_flags.entrega_material = 'pendente'` (setado por `upsertPurchase` quando `status = 'entregue'`)
- Saída: `pipeline_flags.entrega_material = 'concluida'` + ativa `obra`

---

## Módulo 2 — Obra

### Objetivo
Acompanhar a execução da instalação do sistema fotovoltaico.

### Rotas
- `GET /obra` — lista de clientes com `pipeline_flags.obra` ativo
- `GET /obra/[id]` — detalhe da obra

### `/obra` — Lista
Server Component. Filtra clientes onde `pipeline_flags->>'obra' IS NOT NULL AND pipeline_flags->>'obra' != 'concluida'`.

Colunas: Nome do cliente, Cidade, Equipe, Data prevista, Prazo global, Status (badge).

### `/obra/[id]` — Detalhe
Server Component + Client Component.

Campos:
- **Data de início** — campo date
- **Data prevista de conclusão** — campo date
- **Status** — select: `aguardando` | `em_andamento` | `concluida`
- **Responsável pela instalação** — select de membros da organização
- **Nome da equipe** — campo texto livre (ex: "Equipe Alpha")
- **Fotos da obra** — upload múltiplo via `client_attachments` com tipo `foto_obra`

**Gatilho de saída:** ao salvar com `status = 'concluida'` → `pipeline_flags.entrega_obra = 'pendente'` + cria registro em `client_obra_deliveries`.

### Banco de Dados

```sql
create table public.client_obras (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_inicio date,
  data_prevista date,
  status text not null default 'aguardando',
  responsavel_id uuid references public.profiles(id) on delete set null,
  equipe_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obras enable row level security;
create policy "obras_org_isolation" on public.client_obras
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

Fotos armazenadas em `client_attachments` (tabela existente) com `attachment_type = 'foto_obra'`.

### Server Actions

```
upsertObra(clientId, data) → ActionResult
  - Cria ou atualiza client_obras
  - Atualiza pipeline_flags.obra com o status
  - Se status = 'concluida' e pipeline_flags.entrega_obra não existe:
      pipeline_flags.entrega_obra = 'pendente'
      cria client_obra_deliveries com status = 'pendente'
  - revalidatePath('/obra')
```

### Pipeline
- Entrada: `pipeline_flags.obra = 'pendente'` (setado por `upsertDelivery` quando termo_url preenchido)
- Saída: `pipeline_flags.obra = 'concluida'` + ativa `entrega_obra`

---

## Módulo 3 — Entrega da Obra

### Objetivo
Registrar a entrega formal da obra concluída ao cliente.

### Rotas
- `GET /entrega-obra` — lista de clientes com `pipeline_flags.entrega_obra` ativo
- `GET /entrega-obra/[id]` — detalhe

### `/entrega-obra` — Lista
Server Component. Filtra clientes onde `pipeline_flags->>'entrega_obra' IS NOT NULL AND pipeline_flags->>'entrega_obra' != 'concluida'`.

Colunas: Nome do cliente, Cidade, Prazo global, Status (badge).

### `/entrega-obra/[id]` — Detalhe
Server Component + Client Component.

Campos:
- **Data de entrega ao cliente** — campo date
- **Termo de entrega/aceite assinado** — upload via `client_attachments` com tipo `termo_entrega_obra`, URL salva em `client_obra_deliveries.termo_url`
- **Checklist** — 3 checkboxes: Limpeza do local, Entrega dos manuais, Orientação de uso
- **Status** — select: `pendente` | `concluida`

**Gatilho de saída:** ao salvar com `data_entrega` preenchida → `pipeline_flags.pos_obra = 'pendente'` + cria registro em `client_pos_obra`.

### Banco de Dados

```sql
create table public.client_obra_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  checklist jsonb not null default '{"limpeza": false, "manuais": false, "orientacao_uso": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obra_deliveries enable row level security;
create policy "obra_deliveries_org_isolation" on public.client_obra_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

### Server Actions

```
upsertObraDelivery(clientId, data) → ActionResult
  - Cria ou atualiza client_obra_deliveries
  - Atualiza pipeline_flags.entrega_obra com o status
  - Se data_entrega preenchida e pipeline_flags.pos_obra não existe:
      pipeline_flags.pos_obra = 'pendente'
      cria client_pos_obra com status = 'pendente'
  - revalidatePath('/entrega-obra')
```

### Pipeline
- Entrada: `pipeline_flags.entrega_obra = 'pendente'` (setado por `upsertObra` quando status = 'concluida')
- Saída: `pipeline_flags.entrega_obra = 'concluida'` + ativa `pos_obra`

---

## Módulo 4 — Pós Obra

### Objetivo
Registrar a ativação do sistema junto à concessionária, monitoramento e ocorrências pós-instalação.

### Rotas
- `GET /pos-obra` — lista de clientes com `pipeline_flags.pos_obra` ativo
- `GET /pos-obra/[id]` — detalhe

### `/pos-obra` — Lista
Server Component. Filtra clientes onde `pipeline_flags->>'pos_obra' IS NOT NULL AND pipeline_flags->>'pos_obra' != 'concluida'`.

Colunas: Nome do cliente, Cidade, Data de ativação, Prazo global, Status (badge).

### `/pos-obra/[id]` — Detalhe
Server Component + Client Component.

Campos:
- **Data de ativação junto à concessionária** — campo date
- **Parecer de acesso / documento de aprovação** — upload via `client_attachments` com tipo `parecer_acesso`, URL salva em `client_pos_obra.parecer_url`
- **Ocorrências/reclamações** — campo textarea (texto livre)
- **Monitoramento:**
  - Nome do app (texto)
  - Usuário (texto)
  - Senha (texto — armazenado em JSONB, exibido com toggle mostrar/ocultar)
- **Status** — select: `pendente` | `concluida`

**Saída do pipeline:** status = `'concluida'` → `pipeline_flags.pos_obra = 'concluida'` → cliente some da lista.

### Banco de Dados

```sql
create table public.client_pos_obra (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_ativacao date,
  parecer_url text,
  ocorrencias text,
  monitoramento jsonb,  -- {app: string, usuario: string, senha: string}
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_pos_obra enable row level security;
create policy "pos_obra_org_isolation" on public.client_pos_obra
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

### Server Actions

```
upsertPosObra(clientId, data) → ActionResult
  - Cria ou atualiza client_pos_obra
  - Atualiza pipeline_flags.pos_obra com o status
  - Se status = 'concluida': pipeline_flags.pos_obra = 'concluida'
  - revalidatePath('/pos-obra')
```

### Pipeline
- Entrada: `pipeline_flags.pos_obra = 'pendente'` (setado por `upsertObraDelivery` quando data_entrega preenchida)
- Saída: `pipeline_flags.pos_obra = 'concluida'` (manual, via select de status)

---

## Modificação necessária em arquivo existente

`web/lib/compras/actions.ts` — `upsertPurchase()`:
- Quando `status = 'entregue'`: setar `pipeline_flags.entrega_material = 'pendente'` e criar registro em `client_deliveries`.

---

## Prazo Global

Em todas as listas, exibir `X / Y dias`:
- X = dias desde confirmação da 1ª parcela
- Y = `clients.contract_max_days`

---

## Arquitetura Geral

### Padrão de arquivos

```
web/
  lib/
    entrega-material/
      queries.ts    — getEntregasMaterial(), getEntregaMaterialById()
      actions.ts    — upsertDelivery()
    obra/
      queries.ts    — getObras(), getObraById(), getObraMembers()
      actions.ts    — upsertObra()
    entrega-obra/
      queries.ts    — getEntregasObra(), getEntregaObraById()
      actions.ts    — upsertObraDelivery()
    pos-obra/
      queries.ts    — getPosObras(), getPosObraById()
      actions.ts    — upsertPosObra()
  app/(dashboard)/
    entrega-material/
      page.tsx
      [id]/
        page.tsx
        EntregaMaterialDetail.tsx   (client)
    obra/
      page.tsx
      [id]/
        page.tsx
        ObraDetail.tsx              (client)
    entrega-obra/
      page.tsx
      [id]/
        page.tsx
        EntregaObraDetail.tsx       (client)
    pos-obra/
      page.tsx
      [id]/
        page.tsx
        PosObraDetail.tsx           (client)
```

### Convenções herdadas
- `(supabase as any)` para tabelas fora dos tipos gerados
- Server Actions retornam `{ error?: string; success?: string }`
- Glassmorphism: dark navy, gold accent `#FFD080`, `rgba(255,255,255,0.06)` borders
- `revalidatePath` após cada mutation
- `useTransition` para chamar server actions no client

---

## Migration SQL

```sql
-- web/supabase/migrations/20260618000005_entrega_obra_pos_obra.sql

-- Entrega do Material
create table public.client_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  checklist jsonb not null default '{"limpeza": false, "manuais": false, "orientacao_uso": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_deliveries enable row level security;
create policy "deliveries_org_isolation" on public.client_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Obra
create table public.client_obras (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_inicio date,
  data_prevista date,
  status text not null default 'aguardando',
  responsavel_id uuid references public.profiles(id) on delete set null,
  equipe_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obras enable row level security;
create policy "obras_org_isolation" on public.client_obras
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Entrega da Obra
create table public.client_obra_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  checklist jsonb not null default '{"limpeza": false, "manuais": false, "orientacao_uso": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obra_deliveries enable row level security;
create policy "obra_deliveries_org_isolation" on public.client_obra_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Pós Obra
create table public.client_pos_obra (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_ativacao date,
  parecer_url text,
  ocorrencias text,
  monitoramento jsonb,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_pos_obra enable row level security;
create policy "pos_obra_org_isolation" on public.client_pos_obra
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```
