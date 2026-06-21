# Spec 3b — Projetos + Compras + Comissões

**Data:** 2026-06-18
**Projeto:** Integra Solar CRM
**Escopo:** Módulos de pipeline Projetos, Compras e Comissões

---

## Contexto

Após a 1ª parcela (entrada) ser confirmada no módulo Financeiro, o cliente entra simultaneamente em **Projetos** e **Compras** — dois módulos paralelos. Quando a compra é confirmada, o módulo **Comissões** é ativado automaticamente. O campo `pipeline_flags` JSONB da tabela `clients` é usado para rastrear o estado de cada módulo paralelo de forma independente.

---

## Arquitetura — pipeline_flags

| Evento | Efeito em `pipeline_flags` |
|---|---|
| 1ª parcela confirmada (Financeiro) | `flags.projetos = 'pendente'`, `flags.compras = 'aguardando'` |
| Compra marcada como `confirmado` | `flags.comissoes = 'pendente'` |

Cada página de módulo filtra clientes onde seu respectivo flag existe e não está no estado final (`aprovado` / `entregue` / `paga`).

A ação `confirmInstallment` existente em `web/lib/financeiro/actions.ts` deve ser estendida: quando `position = 1`, setar os dois flags acima.

---

## Módulo 1 — Projetos

### Objetivo
Registrar e acompanhar o processo técnico de homologação do projeto junto à concessionária.

### Rotas
- `GET /projetos` — lista de clientes com `pipeline_flags.projetos` ativo
- `GET /projetos/[id]` — detalhe do projeto do cliente

### `/projetos` — Lista

Server Component. Filtra clientes onde `pipeline_flags->>'projetos' IS NOT NULL AND pipeline_flags->>'projetos' != 'aprovado'`.

Colunas:
- Nome do cliente
- Cidade
- Responsável técnico
- Prazo global (`X - Y dias`)
- Status (badge colorido)

### `/projetos/[id]` — Detalhe

Server Component que renderiza um Client Component com as ações.

Exibe e permite editar:
- **Responsável técnico** — select de membros da organização
- **Checklist** — 3 checkboxes: Memorial de Cálculo, ART, Homologação junto à concessionária
- **Número do processo** — campo texto
- **Data de protocolo** — campo date
- **Prazo do protocolo** — campo date
- **Data de solicitação de vistoria** — campo date
- **Prazo da vistoria** — campo date
- **Status** — select: `pendente` | `enviado` | `em_analise` | `aprovado`
- **Documentos técnicos** — upload de arquivos (projeto elétrico, ART assinada) via `client_attachments` com tipos `projeto_eletrico` e `art_assinada`

**Botão "Salvar"** — atualiza `client_projects` e `pipeline_flags.projetos` com o status selecionado.

Quando status = `aprovado`: `pipeline_flags.projetos = 'aprovado'` → cliente some da lista.

### Banco de Dados

```sql
create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  numero_processo text,
  data_protocolo date,
  prazo_protocolo date,
  data_solicitacao_vistoria date,
  prazo_vistoria date,
  status text not null default 'pendente',
  checklist jsonb not null default '{"memorial_calculo": false, "art": false, "homologacao": false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_projects enable row level security;
create policy "projetos_org_isolation" on public.client_projects
  using (organization_id = any(get_my_org_ids()));
```

Novos tipos em `client_attachments`: `projeto_eletrico`, `art_assinada`.

### Server Actions

```
upsertProject(clientId, data) → ActionResult
  - Cria ou atualiza client_projects
  - Atualiza pipeline_flags.projetos com o status informado
  - Se status = 'aprovado': pipeline_flags.projetos = 'aprovado'
  - revalidatePath('/projetos')
```

### Pipeline
- Entrada: `pipeline_flags.projetos = 'pendente'` (setado pela 1ª parcela confirmada)
- Saída: `pipeline_flags.projetos = 'aprovado'` (manual, via select de status)

---

## Módulo 2 — Compras

### Objetivo
Registrar o pedido de compra de material/equipamento e acompanhar seu status até a entrega.

### Rotas
- `GET /compras` — lista de clientes com `pipeline_flags.compras` ativo
- `GET /compras/[id]` — detalhe do pedido de compra

### `/compras` — Lista

Server Component. Filtra clientes onde `pipeline_flags->>'compras' IS NOT NULL AND pipeline_flags->>'compras' != 'entregue'`.

Colunas:
- Nome do cliente
- Fornecedor
- Valor do pedido
- Data prevista de entrega
- Prazo global (`X - Y dias`)
- Status (badge colorido)

### `/compras/[id]` — Detalhe

Server Component + Client Component para ações.

Campos:
- **Fornecedor** — texto
- **Itens** — texto livre (descrição do que foi pedido)
- **Valor** — numérico
- **Data prevista** — date
- **Status** — select: `aguardando` | `confirmado` | `entregue`
- **Upload NF / comprovante / PDF do pedido** — arquivo único, URL salva em `client_purchases.nf_url`

**Efeitos do status:**
- `confirmado` → aciona `pipeline_flags.comissoes = 'pendente'` (cria registro em `client_commissions`)
- `entregue` → `pipeline_flags.compras = 'entregue'` → cliente some da lista de Compras; aciona futuramente `pipeline_flags.entrega_material`

### Banco de Dados

```sql
create table public.client_purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  fornecedor text,
  itens text,
  valor numeric(12,2),
  data_prevista date,
  status text not null default 'aguardando',
  nf_url text,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_purchases enable row level security;
create policy "purchases_org_isolation" on public.client_purchases
  using (organization_id = any(get_my_org_ids()));
```

### Server Actions

```
upsertPurchase(clientId, data) → ActionResult
  - Cria ou atualiza client_purchases
  - Atualiza pipeline_flags.compras com o status
  - Se status = 'confirmado': pipeline_flags.comissoes = 'pendente', cria client_commissions
  - Se status = 'entregue': pipeline_flags.compras = 'entregue'
  - revalidatePath('/compras')
```

### Pipeline
- Entrada: `pipeline_flags.compras = 'aguardando'` (setado pela 1ª parcela confirmada)
- Saída: `pipeline_flags.compras = 'entregue'`
- Efeito colateral: `confirmado` aciona Comissões

---

## Módulo 3 — Comissões

### Objetivo
Painel de comissões por vendedor com marcação de pagamento.

### Rotas
- `GET /comissoes` — painel com cards e lista de comissões
- `GET /comissoes/[id]` — detalhe da comissão do cliente

### `/comissoes` — Painel

Server Component com filtros por:
- **Mês/Ano** (padrão: mês atual — baseado em `created_at` da comissão)
- **Vendedor** (via `vendedor_id`)

**2 cards:**
- Total pendente (soma de `valor_comissao` onde `status = 'pendente'`)
- Total pago no período (soma onde `status = 'paga'` e `paid_at` no mês)

Lista abaixo com: Cliente, Vendedor, Valor, Status (badge), link para `/comissoes/[id]`.

### `/comissoes/[id]` — Detalhe

Server Component + Client Component.

Exibe:
- Nome do cliente, vendedor, valor da venda, percentual de comissão, **valor calculado**
- Status badge
- Se `paga`: data de pagamento + link do comprovante
- Botão **"Marcar como Paga"** (só aparece se `pendente`) → `status = 'paga'`, `paid_at = now()`, upload de comprovante opcional

### Banco de Dados

```sql
create table public.client_commissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  vendedor_id uuid references public.profiles(id) on delete set null,
  valor_comissao numeric(12,2) not null,
  status text not null default 'pendente',
  paid_at timestamptz,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_commissions enable row level security;
create policy "commissions_org_isolation" on public.client_commissions
  using (organization_id = any(get_my_org_ids()));
```

### Server Actions

```
markCommissionPaid(commissionId, comprovanteUrl?) → ActionResult
  - status = 'paga', paid_at = now()
  - comprovante_url se fornecido
  - pipeline_flags.comissoes = 'paga'
  - revalidatePath('/comissoes')
```

### Criação automática do registro
Quando `upsertPurchase` aciona status `confirmado`:
- Busca `client_sale` para calcular `valor_comissao = sale_value × commission_pct / 100`
- Busca `vendedor_id` via `clients.lead_id → leads.assigned_to_user_id`
- Insere em `client_commissions` com `status = 'pendente'`

### Pipeline
- Entrada: `pipeline_flags.comissoes = 'pendente'` (setado quando compra confirmada)
- Saída: `pipeline_flags.comissoes = 'paga'` (manual)

---

## Prazo Global

Em todas as listas dos módulos, exibir para cada cliente: **`X - Y dias`**
- X = dias desde o pagamento da 1ª parcela (`client_installments` onde `position = 1` e `confirmed_at IS NOT NULL`) até hoje
- Y = `clients.contract_max_days`

Exemplo: `15 - 45` = 15 dias usados de 45 dias de prazo.

---

## Arquitetura Geral

### Padrão de arquivos

```
web/
  lib/
    projetos/
      queries.ts    — getProjectos(), getProjetoById()
      actions.ts    — upsertProject()
    compras/
      queries.ts    — getCompras(), getCompraById()
      actions.ts    — upsertPurchase()
    comissoes/
      queries.ts    — getComissoesPainel(), getComissaoById(), getComissoesMembers()
      actions.ts    — markCommissionPaid()
  app/(dashboard)/
    projetos/
      page.tsx
      [id]/
        page.tsx
        ProjetoDetail.tsx      (client)
    compras/
      page.tsx
      [id]/
        page.tsx
        CompraDetail.tsx       (client)
    comissoes/
      page.tsx
      ComissoesPainelClient.tsx (client)
      [id]/
        page.tsx
        ComissaoDetail.tsx     (client)
```

### Modificação necessária em arquivo existente

`web/lib/financeiro/actions.ts` — `confirmInstallment()`:
- Quando `position = 1`: setar `pipeline_flags.projetos = 'pendente'` e `pipeline_flags.compras = 'aguardando'` via `jsonb_set` ou merge no cliente.

### Convenções herdadas
- `(supabase as any)` para tabelas fora dos tipos gerados
- Server Actions retornam `{ error?: string; success?: string }`
- Glassmorphism: dark navy, gold accent `#FFD080`, `rgba(255,255,255,0.06)` borders
- `revalidatePath` após cada mutation

---

## Migration SQL

```sql
-- web/supabase/migrations/20260618000004_projetos_compras_comissoes.sql

-- Projetos
create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  numero_processo text,
  data_protocolo date,
  prazo_protocolo date,
  data_solicitacao_vistoria date,
  prazo_vistoria date,
  status text not null default 'pendente',
  checklist jsonb not null default '{"memorial_calculo": false, "art": false, "homologacao": false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_projects enable row level security;
create policy "projetos_org_isolation" on public.client_projects
  using (organization_id = any(get_my_org_ids()));

-- Compras
create table public.client_purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  fornecedor text,
  itens text,
  valor numeric(12,2),
  data_prevista date,
  status text not null default 'aguardando',
  nf_url text,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_purchases enable row level security;
create policy "purchases_org_isolation" on public.client_purchases
  using (organization_id = any(get_my_org_ids()));

-- Comissões
create table public.client_commissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  vendedor_id uuid references public.profiles(id) on delete set null,
  valor_comissao numeric(12,2) not null,
  status text not null default 'pendente',
  paid_at timestamptz,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_commissions enable row level security;
create policy "commissions_org_isolation" on public.client_commissions
  using (organization_id = any(get_my_org_ids()));
```
