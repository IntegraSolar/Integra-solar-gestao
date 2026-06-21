# Auth Migration — Integra Solar CRM

> **Para agentes:** USE o skill `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Goal:** Migrar o sistema de autenticação, autorização e multi-tenancy do projeto de uma SPA vanilla HTML/JS para Next.js 14 + TypeScript + Supabase Auth com fluxo de convite por e-mail, RLS real e arquitetura multi-tenant.

**Architecture:** Novo app Next.js 14 (App Router) em `web/` substituindo o `frontend/` atual. Supabase Auth exclusivo (sem senhas próprias). Edge Function Supabase para `inviteUserByEmail`. Middleware Next.js para proteção de rotas. RLS real no banco isolando dados por `organization_id`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Auth + PostgreSQL + Edge Functions + RLS), `@supabase/ssr`, Zod, Vercel.

**Escopo deste plano:** Autenticação, autorização, schema do banco, RLS, shell do app. A migração dos módulos CRM (leads, clientes, propostas etc.) é um plano separado posterior.

---

## Estrutura de arquivos que será criada

```
web/                                        # Novo app Next.js
  app/
    (auth)/
      login/page.tsx                        # Página de login
      reset-password/page.tsx              # Solicitar reset de senha
      update-password/page.tsx             # Definir nova senha (via link)
      accept-invite/page.tsx               # Aceitar convite + definir senha
    (dashboard)/
      layout.tsx                           # Layout protegido com sidebar
      dashboard/page.tsx                   # Dashboard placeholder
    auth/
      callback/route.ts                    # Troca de code por sessão (PKCE)
    api/
      webhooks/
        asaas/route.ts                     # Webhook stub do Asaas
    layout.tsx                             # Root layout
    globals.css
  components/
    auth/
      LoginForm.tsx
      ResetPasswordForm.tsx
      UpdatePasswordForm.tsx
      AcceptInviteForm.tsx
    layout/
      Sidebar.tsx
      TopBar.tsx
    ui/
      Button.tsx
      Input.tsx
      FormError.tsx
  lib/
    supabase/
      client.ts                            # Cliente browser
      server.ts                            # Cliente server components
    auth/
      actions.ts                           # Server Actions de auth
    org/
      queries.ts                           # Queries de organização
  middleware.ts                            # Proteção de rotas
  types/
    database.types.ts                      # Tipos gerados pelo Supabase
  supabase/
    migrations/
      20260617000001_initial_schema.sql    # Schema completo do zero
    functions/
      invite-user/
        index.ts                           # Edge Function de convite
  .env.local                               # Variáveis de ambiente (não comitar)
  .env.example                             # Exemplo de env vars
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json

database/
  supabase-schema.sql                      # SUBSTITUÍDO pelo migration acima
```

---

## Task 1: Inicializar projeto Next.js

**Files:**
- Create: `web/` (diretório do app)
- Create: `web/package.json`, `web/next.config.ts`, `web/tsconfig.json`, `web/tailwind.config.ts`

- [ ] **Step 1.1: Criar o app Next.js**

Execute no diretório raiz do projeto:

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
npx create-next-app@14 web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --no-git
```

Responda às perguntas:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: `@/*`

- [ ] **Step 1.2: Instalar dependências do Supabase e Zod**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm install @supabase/ssr @supabase/supabase-js zod
```

- [ ] **Step 1.3: Verificar que o projeto inicia corretamente**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm run build
```

Esperado: build sem erros (app padrão do Next.js).

- [ ] **Step 1.4: Criar estrutura de diretórios**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
mkdir -p app/(auth)/login app/(auth)/reset-password app/(auth)/update-password app/(auth)/accept-invite
mkdir -p app/(dashboard)/dashboard
mkdir -p app/auth/callback
mkdir -p app/api/webhooks/asaas
mkdir -p components/auth components/layout components/ui
mkdir -p lib/supabase lib/auth lib/org
mkdir -p types
mkdir -p supabase/migrations supabase/functions/invite-user
```

- [ ] **Step 1.5: Commit do scaffold inicial**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/
git commit -m "chore: scaffold Next.js 14 app in web/"
```

---

## Task 2: Variáveis de ambiente

**Files:**
- Create: `web/.env.local`
- Create: `web/.env.example`

- [ ] **Step 2.1: Criar `.env.example`**

Crie o arquivo `web/.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Backend PDF (Node.js separado)
NEXT_PUBLIC_PDF_BACKEND_URL=https://<railway-url>
PDF_BACKEND_API_KEY=<api-key>

# Asaas (futuro)
ASAAS_WEBHOOK_SECRET=<secret>
```

- [ ] **Step 2.2: Criar `.env.local` com valores reais**

Acesse o painel Supabase → Settings → API e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_PDF_BACKEND_URL=http://localhost:3001
PDF_BACKEND_API_KEY=integra-solar-api-2025
ASAAS_WEBHOOK_SECRET=placeholder-trocar-depois
```

- [ ] **Step 2.3: Adicionar `.env.local` ao `.gitignore`**

Verifique que `web/.gitignore` (gerado pelo create-next-app) já contém `.env.local`. Se não:

```bash
echo ".env.local" >> "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web\.gitignore"
```

- [ ] **Step 2.4: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/.env.example web/.gitignore
git commit -m "chore: add env vars example"
```

---

## Task 3: Clientes Supabase (browser e server)

**Files:**
- Create: `web/lib/supabase/client.ts`
- Create: `web/lib/supabase/server.ts`

- [ ] **Step 3.1: Criar cliente browser**

Crie `web/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3.2: Criar cliente server (para Server Components e Route Handlers)**

Crie `web/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorado em Server Components (só Route Handlers podem setar cookies)
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3.3: Criar placeholder de types para o TypeScript não reclamar ainda**

Crie `web/types/database.types.ts`:

```typescript
// Este arquivo será substituído pelos types gerados pelo Supabase CLI (Task 6)
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          plan: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          plan?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          plan?: string
          status?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'user'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'user'
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'manager' | 'user'
        }
      }
    }
    Functions: {
      get_my_org_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      get_my_role: {
        Args: { org_id: string }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
  }
}
```

- [ ] **Step 3.4: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/ web/types/
git commit -m "feat: add Supabase client utilities"
```

---

## Task 4: Schema do banco (migration SQL)

**Files:**
- Create: `web/supabase/migrations/20260617000001_initial_schema.sql`
- Modify: `database/supabase-schema.sql` (substituído)

- [ ] **Step 4.1: Escrever o migration completo**

Crie `web/supabase/migrations/20260617000001_initial_schema.sql`:

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Integra Solar CRM — Schema inicial
-- Migração 001: Schema completo com auth multi-tenant
-- Execute via: Supabase Dashboard → SQL Editor ou Supabase CLI
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. ORGANIZATIONS ─────────────────────────────────────────────
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'starter'
              check (plan in ('starter', 'professional', 'enterprise')),
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.organizations is 'Empresas clientes da plataforma (tenants).';

-- ── 2. PROFILES (espelha auth.users) ─────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público de cada usuário autenticado.';

-- ── 3. ORGANIZATION MEMBERS ──────────────────────────────────────
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('owner', 'admin', 'manager', 'user')),
  created_at      timestamptz not null default now(),
  unique(organization_id, user_id)
);
comment on table public.organization_members is 'Relação entre usuários e organizações com papel (role).';

create index on public.organization_members(user_id);
create index on public.organization_members(organization_id);

-- ── Trigger: auto-criar profile quando auth.users recebe novo user ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Função: retornar org IDs do usuário atual ────────────────────
create or replace function public.get_my_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;

-- ── Função: retornar role do usuário em uma org ──────────────────
create or replace function public.get_my_role(org_id uuid)
returns text
language sql
security definer
stable
as $$
  select role
  from public.organization_members
  where user_id = auth.uid()
    and organization_id = org_id
$$;

-- ── Função: atualizar updated_at automaticamente ─────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- TABELAS OPERACIONAIS DO CRM (serão populadas nos próximos planos)
-- ════════════════════════════════════════════════════════════════

-- ENUMs operacionais
do $$ begin create type proposal_status as enum
  ('draft','sent','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type project_status as enum
  ('not_submitted','submitted','awaiting_approval','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type work_status as enum
  ('awaiting_scheduling','scheduled','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_status as enum
  ('paid','pending','overdue','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type financial_entry_type as enum
  ('revenue','expense');
exception when duplicate_object then null; end $$;

-- Pipeline stages
create table public.pipeline_stages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  "order"         integer not null,
  color           text not null default '#6B7A90',
  is_final_stage  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(organization_id, "order")
);

-- Lead sources
create table public.lead_sources (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique(organization_id, name)
);

-- Clients
create table public.clients (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  name                     text not null,
  document_number          text,
  phone                    text,
  email                    text,
  street                   text,
  number                   text,
  complement               text,
  neighborhood             text,
  city                     text,
  state                    text,
  zip_code                 text,
  current_project_stage_id uuid references public.pipeline_stages(id),
  system_type              text default 'On-Grid',
  estimated_kwp            numeric(10,2),
  contract_signed_date     date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index on public.clients(organization_id);

-- Leads
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  phone               text not null,
  city                text,
  lead_source_id      uuid references public.lead_sources(id),
  observations        text,
  next_action_date    date,
  current_stage_id    uuid not null references public.pipeline_stages(id),
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  system_type         text default 'On-Grid',
  estimated_kwp       numeric(10,2),
  estimated_value     numeric(15,2),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.leads(organization_id);
create index on public.leads(current_stage_id);

-- Suppliers
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  contact_person  text,
  phone           text,
  email           text,
  city            text,
  state           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.suppliers(organization_id);

-- Proposals
create table public.proposals (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  client_id              uuid not null references public.clients(id),
  lead_id                uuid references public.leads(id) on delete set null,
  version_number         integer not null default 1,
  total_modules          integer not null default 0,
  module_power_wp        numeric(10,2) not null default 0,
  total_inverters        integer not null default 0,
  inverter_power_w       numeric(10,2) not null default 0,
  supplier_id            uuid references public.suppliers(id),
  kit_value              numeric(15,2) not null default 0,
  total_power_kwp        numeric(10,2) not null default 0,
  monthly_generation_kwh numeric(10,2) not null default 0,
  final_value            numeric(15,2) not null default 0,
  status                 proposal_status not null default 'draft',
  created_by_user_id     uuid references public.profiles(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.proposals(organization_id);
create index on public.proposals(client_id);

-- Contracts
create table public.contracts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid not null references public.clients(id),
  proposal_id     uuid references public.proposals(id),
  signature_date  date,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  rejection_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.contracts(organization_id);

-- Financial entries
create table public.financial_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid references public.clients(id),
  contract_id     uuid references public.contracts(id),
  description     text,
  entry_type      financial_entry_type not null default 'revenue',
  due_date        date not null default current_date,
  value           numeric(15,2) not null default 0,
  status          payment_status not null default 'pending',
  payment_date    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.financial_entries(organization_id);

-- Projects (licenciamento)
create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  client_id            uuid not null references public.clients(id),
  assigned_engineer_id uuid references public.profiles(id),
  status               project_status not null default 'not_submitted',
  submission_date      date,
  approval_date        date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.projects(organization_id);

-- Purchases
create table public.purchases (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  client_id              uuid references public.clients(id),
  supplier_id            uuid not null references public.suppliers(id),
  purchase_date          date not null default current_date,
  status                 text not null default 'pending'
                         check (status in ('pending','approved','rejected','in_progress','delivered','cancelled')),
  expected_delivery_date date,
  actual_delivery_date   date,
  kit_description        text,
  invoice_number         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.purchases(organization_id);

-- Works (obras)
create table public.works (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  client_id            uuid not null references public.clients(id),
  project_id           uuid references public.projects(id),
  scheduled_date       date,
  start_date           date,
  end_date             date,
  status               work_status not null default 'awaiting_scheduling',
  street               text,
  number               text,
  city                 text,
  state                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.works(organization_id);

-- Tasks
create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  title                text not null,
  description          text,
  due_date             date,
  completed_at         timestamptz,
  assigned_to_user_id  uuid references public.profiles(id),
  related_to_lead_id   uuid references public.leads(id) on delete set null,
  related_to_client_id uuid references public.clients(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.tasks(organization_id);

-- Notifications
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  message           text not null,
  is_read           boolean not null default false,
  notification_type text,
  related_entity    text,
  related_entity_id uuid,
  created_at        timestamptz not null default now()
);
create index on public.notifications(user_id);
create index on public.notifications(organization_id);

-- Organization settings (chave-valor por org)
create table public.organization_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setting_key     text not null,
  setting_value   jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(organization_id, setting_key)
);
create index on public.organization_settings(organization_id);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

-- Habilitar RLS em todas as tabelas
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.lead_sources enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.suppliers enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.financial_entries enable row level security;
alter table public.projects enable row level security;
alter table public.purchases enable row level security;
alter table public.works enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.organization_settings enable row level security;

-- ── Profiles ─────────────────────────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- ── Organizations ─────────────────────────────────────────────────
create policy "orgs_select_members"
  on public.organizations for select
  using (id in (select get_my_org_ids()));

create policy "orgs_update_admins"
  on public.organizations for update
  using (
    id in (select get_my_org_ids())
    and get_my_role(id) in ('owner', 'admin')
  );

-- ── Organization Members ──────────────────────────────────────────
create policy "members_select_same_org"
  on public.organization_members for select
  using (organization_id in (select get_my_org_ids()));

create policy "members_insert_admins"
  on public.organization_members for insert
  with check (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

create policy "members_update_admins"
  on public.organization_members for update
  using (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

create policy "members_delete_admins"
  on public.organization_members for delete
  using (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

-- ── Pipeline Stages ───────────────────────────────────────────────
create policy "pipeline_stages_org_isolation"
  on public.pipeline_stages for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Lead Sources ──────────────────────────────────────────────────
create policy "lead_sources_org_isolation"
  on public.lead_sources for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Clients ───────────────────────────────────────────────────────
create policy "clients_org_isolation"
  on public.clients for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Leads ─────────────────────────────────────────────────────────
create policy "leads_org_isolation"
  on public.leads for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Suppliers ─────────────────────────────────────────────────────
create policy "suppliers_org_isolation"
  on public.suppliers for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Proposals ─────────────────────────────────────────────────────
create policy "proposals_org_isolation"
  on public.proposals for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Contracts ─────────────────────────────────────────────────────
create policy "contracts_org_isolation"
  on public.contracts for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Financial Entries ─────────────────────────────────────────────
create policy "financial_entries_org_isolation"
  on public.financial_entries for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Projects ──────────────────────────────────────────────────────
create policy "projects_org_isolation"
  on public.projects for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Purchases ─────────────────────────────────────────────────────
create policy "purchases_org_isolation"
  on public.purchases for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Works ─────────────────────────────────────────────────────────
create policy "works_org_isolation"
  on public.works for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Tasks ─────────────────────────────────────────────────────────
create policy "tasks_org_isolation"
  on public.tasks for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Notifications ─────────────────────────────────────────────────
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert_org"
  on public.notifications for insert
  with check (organization_id in (select get_my_org_ids()));

-- ── Organization Settings ─────────────────────────────────────────
create policy "org_settings_org_isolation"
  on public.organization_settings for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

- [ ] **Step 4.2: Commit do migration**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/supabase/migrations/
git commit -m "feat: add complete database schema migration with RLS"
```

---

## Task 5: Aplicar migration no Supabase

**Pré-requisito:** Acesso ao Supabase Dashboard (SQL Editor) ou Supabase CLI instalado.

- [ ] **Step 5.1: Opção A — Via Supabase Dashboard (recomendado para aplicação única)**

1. Acesse o Supabase Dashboard → seu projeto → SQL Editor
2. Clique em "New Query"
3. Cole o conteúdo de `web/supabase/migrations/20260617000001_initial_schema.sql`
4. Clique em "Run"
5. Verifique que todas as tabelas foram criadas em Database → Tables

- [ ] **Step 5.2: Opção B — Via Supabase CLI**

```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Linkar ao projeto (substitua <project-ref>)
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
supabase link --project-ref <project-ref>

# Aplicar migration
supabase db push
```

- [ ] **Step 5.3: Verificar via SQL Editor que as tabelas existem**

Execute no SQL Editor do Supabase:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Esperado: lista com `clients`, `contracts`, `financial_entries`, `leads`, `notifications`, `organization_members`, `organization_settings`, `organizations`, `pipeline_stages`, `profiles`, `projects`, `proposals`, `purchases`, `suppliers`, `tasks`, `works`.

- [ ] **Step 5.4: Verificar que o trigger de profiles existe**

```sql
select trigger_name, event_object_table
from information_schema.triggers
where trigger_name = 'on_auth_user_created';
```

Esperado: 1 linha com `on_auth_user_created`.

- [ ] **Step 5.5: Verificar policies RLS**

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Esperado: pelo menos 25 políticas listadas (nenhuma `allow_all`).

---

## Task 6: Gerar tipos TypeScript do Supabase

**Files:**
- Modify: `web/types/database.types.ts` (substituir placeholder)

- [ ] **Step 6.1: Gerar types via Supabase CLI**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx supabase gen types typescript --project-id <project-ref> > types/database.types.ts
```

Substitua `<project-ref>` pelo ID do projeto (visível no Supabase Dashboard → Settings → General).

- [ ] **Step 6.2: Verificar que o TypeScript compila sem erros**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/types/
git commit -m "feat: add generated Supabase TypeScript types"
```

---

## Task 7: Middleware de proteção de rotas

**Files:**
- Create: `web/middleware.ts`

- [ ] **Step 7.1: Escrever o middleware**

Crie `web/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/reset-password',
  '/update-password',
  '/accept-invite',
  '/auth/callback',
  '/api/webhooks',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Atualiza sessão (IMPORTANTE: nunca use getSession aqui — use getUser)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rota raiz → redirecionar
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  // Usuário não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Usuário autenticado tentando acessar página de login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/middleware.ts
git commit -m "feat: add Next.js middleware for route protection"
```

---

## Task 8: Server Actions de autenticação

**Files:**
- Create: `web/lib/auth/actions.ts`

- [ ] **Step 8.1: Escrever as Server Actions**

Crie `web/lib/auth/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ── Schemas de validação ──────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
})

const resetSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

// ── Tipos de retorno ──────────────────────────────────────────────

type ActionResult = {
  error?: string
  success?: string
}

// ── Login ─────────────────────────────────────────────────────────

export async function signIn(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { error: 'E-mail ou senha incorretos.' }
    }
    return { error: error.message }
  }

  const next = '/dashboard'
  revalidatePath('/', 'layout')
  redirect(next)
}

// ── Logout ────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ── Solicitar reset de senha ──────────────────────────────────────

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/update-password` }
  )

  if (error) {
    return { error: error.message }
  }

  // Sempre retornar sucesso (não revelar se e-mail existe)
  return { success: 'Se este e-mail estiver cadastrado, você receberá um link em instantes.' }
}

// ── Definir nova senha (via link de email) ────────────────────────

export async function updatePassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

- [ ] **Step 8.2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx tsc --noEmit
```

- [ ] **Step 8.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/auth/
git commit -m "feat: add auth server actions (login, logout, reset, update-password)"
```

---

## Task 9: Componentes UI reutilizáveis

**Files:**
- Create: `web/components/ui/Button.tsx`
- Create: `web/components/ui/Input.tsx`
- Create: `web/components/ui/FormError.tsx`

- [ ] **Step 9.1: Criar Button**

Crie `web/components/ui/Button.tsx`:

```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[#1A3A5C] text-white hover:bg-[#142E4A] focus-visible:ring-[#1A3A5C]':
              variant === 'primary',
            'border border-[#DDE3EB] bg-white text-[#1A2B3C] hover:bg-[#F2F5F8]':
              variant === 'secondary',
            'text-[#1A2B3C] hover:bg-[#F2F5F8]': variant === 'ghost',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

- [ ] **Step 9.2: Criar Input**

Crie `web/components/ui/Input.tsx`:

```typescript
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={id}
            className="text-xs font-bold uppercase tracking-wide text-[#3D5166]"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-md border border-[#DDE3EB] bg-white px-3.5 py-2.5 text-sm text-[#1A2B3C] placeholder:text-[#A8BCCE] outline-none transition-all focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10',
            { 'border-red-500 focus:border-red-500 focus:ring-red-500/10': !!error },
            className
          )}
          {...props}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

- [ ] **Step 9.3: Criar FormError**

Crie `web/components/ui/FormError.tsx`:

```typescript
interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null
  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
```

- [ ] **Step 9.4: Criar utilitário `cn` para classnames**

Crie `web/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 9.5: Instalar clsx e tailwind-merge**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm install clsx tailwind-merge
```

- [ ] **Step 9.6: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/components/ui/ web/lib/utils.ts
git commit -m "feat: add reusable UI components (Button, Input, FormError)"
```

---

## Task 10: Página de Login

**Files:**
- Create: `web/app/(auth)/login/page.tsx`
- Create: `web/components/auth/LoginForm.tsx`
- Create: `web/app/(auth)/layout.tsx`

- [ ] **Step 10.1: Criar layout das páginas de auth**

Crie `web/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(145deg, #0E2236, #1A3A5C 55%, #1e4a73)',
      }}
    >
      {children}
    </main>
  )
}
```

- [ ] **Step 10.2: Criar componente LoginForm (client)**

Crie `web/components/auth/LoginForm.tsx`:

```typescript
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/auth/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'

const initialState = { error: undefined, success: undefined }

export function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3A5C] text-white text-xl font-black">
          IS
        </div>
        <h1 className="text-xl font-bold text-[#1A2B3C]">Integra Solar</h1>
        <p className="text-sm text-[#7A90A4]">Plataforma de Gestão</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />

        <div className="flex flex-col gap-1.5">
          <Input
            id="password"
            name="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-xs text-[#1A3A5C] font-semibold hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <FormError message={state?.error} />

        <Button type="submit" loading={isPending} className="mt-2 w-full py-3">
          {isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-[#A8BCCE]">
        Acesso por convite. Fale com seu administrador para obter acesso.
      </p>
    </div>
  )
}
```

- [ ] **Step 10.3: Criar página de login**

Crie `web/app/(auth)/login/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Login — Integra Solar',
}

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 10.4: Verificar TypeScript e build**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx tsc --noEmit
```

- [ ] **Step 10.5: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/(auth)/ web/components/auth/LoginForm.tsx
git commit -m "feat: add login page with server action"
```

---

## Task 11: Página de Recuperação de Senha

**Files:**
- Create: `web/app/(auth)/reset-password/page.tsx`
- Create: `web/components/auth/ResetPasswordForm.tsx`

- [ ] **Step 11.1: Criar componente ResetPasswordForm**

Crie `web/components/auth/ResetPasswordForm.tsx`:

```typescript
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'

const initialState = { error: undefined, success: undefined }

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(
    requestPasswordReset,
    initialState
  )

  if (state?.success) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
            ✓
          </div>
          <h2 className="text-lg font-bold text-[#1A2B3C]">E-mail enviado</h2>
          <p className="text-sm text-[#7A90A4]">{state.success}</p>
          <Link href="/login" className="mt-4 text-sm font-semibold text-[#1A3A5C] hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      <h2 className="mb-2 text-xl font-bold text-[#1A2B3C]">Recuperar senha</h2>
      <p className="mb-6 text-sm text-[#7A90A4]">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />

        <FormError message={state?.error} />

        <Button type="submit" loading={isPending} className="w-full py-3">
          {isPending ? 'Enviando...' : 'Enviar link de recuperação'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-[#7A90A4] hover:text-[#1A3A5C]">
          ← Voltar ao login
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 11.2: Criar página**

Crie `web/app/(auth)/reset-password/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar senha — Integra Solar',
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
```

- [ ] **Step 11.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/(auth)/reset-password/ web/components/auth/ResetPasswordForm.tsx
git commit -m "feat: add reset password page"
```

---

## Task 12: Página de Atualizar Senha (via link de email)

**Files:**
- Create: `web/app/(auth)/update-password/page.tsx`
- Create: `web/components/auth/UpdatePasswordForm.tsx`
- Create: `web/app/auth/callback/route.ts`

- [ ] **Step 12.1: Criar route handler para troca de code (PKCE)**

Crie `web/app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Convite ou reset de senha → redirecionar para definir senha
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
```

- [ ] **Step 12.2: Criar componente UpdatePasswordForm**

Crie `web/components/auth/UpdatePasswordForm.tsx`:

```typescript
'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'

const initialState = { error: undefined, success: undefined }

export function UpdatePasswordForm() {
  const [state, action, isPending] = useActionState(updatePassword, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      <h2 className="mb-2 text-xl font-bold text-[#1A2B3C]">Definir nova senha</h2>
      <p className="mb-6 text-sm text-[#7A90A4]">
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="password"
          name="password"
          type="password"
          label="Nova senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmar senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <FormError message={state?.error} />

        <Button type="submit" loading={isPending} className="mt-2 w-full py-3">
          {isPending ? 'Salvando...' : 'Salvar senha e entrar'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 12.3: Criar página**

Crie `web/app/(auth)/update-password/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Definir senha — Integra Solar',
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
```

- [ ] **Step 12.4: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/(auth)/update-password/ web/app/auth/ web/components/auth/UpdatePasswordForm.tsx
git commit -m "feat: add update-password page and auth callback route"
```

---

## Task 13: Página de Aceitar Convite

**Files:**
- Create: `web/app/(auth)/accept-invite/page.tsx`
- Create: `web/components/auth/AcceptInviteForm.tsx`

A página de aceitar convite é idêntica à de definir senha — o fluxo é: usuário recebe e-mail → clica no link → o callback route (`/auth/callback?type=invite`) redireciona para `/update-password`. A página `/accept-invite` é um alias mais descritivo para uso direto na URL do convite.

- [ ] **Step 13.1: Criar página (delega para UpdatePasswordForm)**

Crie `web/app/(auth)/accept-invite/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Bem-vindo — Integra Solar',
}

export default function AcceptInvitePage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-white/80">
          Você foi convidado para a plataforma Integra Solar.
        </p>
        <p className="text-xs text-white/50 mt-1">
          Crie sua senha para acessar.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
```

- [ ] **Step 13.2: Configurar Supabase para redirecionar convites para `/auth/callback`**

No Supabase Dashboard:
1. Vá em **Authentication → URL Configuration**
2. Em **Site URL**: coloque `http://localhost:3000` (desenvolvimento)
3. Em **Redirect URLs**: adicione `http://localhost:3000/auth/callback`
4. Em **Email Templates → Invite User**: verifique que o link usa `{{ .ConfirmationURL }}`

- [ ] **Step 13.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/(auth)/accept-invite/
git commit -m "feat: add accept-invite page"
```

---

## Task 14: Layout e Shell do App (área protegida)

**Files:**
- Create: `web/app/(dashboard)/layout.tsx`
- Create: `web/components/layout/Sidebar.tsx`
- Create: `web/components/layout/TopBar.tsx`
- Create: `web/lib/org/queries.ts`
- Create: `web/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 14.1: Criar queries de organização**

Crie `web/lib/org/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export type CurrentUserData = {
  profile: {
    id: string
    email: string
    full_name: string | null
  }
  membership: {
    role: 'owner' | 'admin' | 'manager' | 'user'
    organization: {
      id: string
      name: string
      plan: string
      status: string
    }
  } | null
}

export async function getCurrentUserData(): Promise<CurrentUserData | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(id, name, plan, status)
    `)
    .eq('user_id', user.id)
    .single()

  return {
    profile,
    membership: membership
      ? {
          role: membership.role as CurrentUserData['membership']['role'],
          organization: membership.organization as CurrentUserData['membership']['organization'],
        }
      : null,
  }
}
```

- [ ] **Step 14.2: Criar Sidebar**

Crie `web/components/layout/Sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { CurrentUserData } from '@/lib/org/queries'

type NavItem = {
  label: string
  href: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '▣' },
  { label: 'CRM / Leads', href: '/leads', icon: '⟳' },
  { label: 'Clientes', href: '/clientes', icon: '👤' },
  { label: 'Propostas', href: '/propostas', icon: '📄' },
  { label: 'Contratos', href: '/contratos', icon: '📋' },
  { label: 'Financeiro', href: '/financeiro', icon: '💰' },
  { label: 'Projetos', href: '/projetos', icon: '📐' },
  { label: 'Compras', href: '/compras', icon: '🛒' },
  { label: 'Obras', href: '/obras', icon: '🔧' },
  { label: 'Configurações', href: '/configuracoes', icon: '⚙' },
]

interface SidebarProps {
  user: CurrentUserData
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const initials = (user.profile.full_name ?? user.profile.email)
    .substring(0, 2)
    .toUpperCase()

  const roleLabel: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gerente',
    user: 'Usuário',
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#0E2236] flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-[#4AABDB] flex items-center justify-center text-white text-xs font-black">
          IS
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[12.5px] font-extrabold text-white tracking-[0.3px]">
            Integra <span className="text-[#4AABDB]">Solar</span>
          </span>
          <span className="text-[8px] font-semibold text-white/30 uppercase tracking-[0.12em]">
            CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] font-medium my-0.5 transition-all ${
                isActive
                  ? 'bg-[#4AABDB]/15 text-white border-l-2 border-[#4AABDB]'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
              }`}
            >
              <span className="w-4 text-center text-sm flex-shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User area */}
      <div className="p-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 p-2 rounded-md bg-white/[0.05]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4AABDB] to-[#1A3A5C] flex items-center justify-center text-[11px] font-black text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate">
              {user.profile.full_name ?? user.profile.email.split('@')[0]}
            </p>
            <p className="text-[10px] text-white/30">
              {user.membership ? roleLabel[user.membership.role] : ''}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className="text-white/25 hover:text-red-400 transition-colors p-1 rounded"
            >
              ↩
            </button>
          </form>
        </div>

        {user.membership && (
          <p className="mt-1.5 text-[10px] text-white/20 text-center truncate px-1">
            {user.membership.organization.name}
          </p>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 14.3: Criar TopBar**

Crie `web/components/layout/TopBar.tsx`:

```typescript
interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="fixed left-56 right-0 top-0 h-14 bg-white border-b border-[#DDE3EB] flex items-center px-5 z-40 shadow-sm">
      <h1 className="text-[15px] font-bold text-[#1A2B3C]">{title}</h1>
    </header>
  )
}
```

- [ ] **Step 14.4: Criar layout protegido**

Crie `web/app/(dashboard)/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getCurrentUserData } from '@/lib/org/queries'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUserData()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#F2F5F8]">
      <Sidebar user={user} />
      <div className="flex-1 ml-56 overflow-y-auto pt-14">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 14.5: Criar página de dashboard placeholder**

Crie `web/app/(dashboard)/dashboard/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { TopBar } from '@/components/layout/TopBar'
import { getCurrentUserData } from '@/lib/org/queries'

export const metadata: Metadata = {
  title: 'Dashboard — Integra Solar',
}

export default async function DashboardPage() {
  const user = await getCurrentUserData()

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="p-6">
        <div className="rounded-xl border border-[#DDE3EB] bg-white p-8 text-center">
          <h2 className="text-lg font-bold text-[#1A2B3C]">
            Bem-vindo, {user?.profile.full_name ?? 'usuário'}!
          </h2>
          {user?.membership && (
            <p className="mt-2 text-sm text-[#7A90A4]">
              Organização:{' '}
              <span className="font-semibold text-[#1A3A5C]">
                {user.membership.organization.name}
              </span>
            </p>
          )}
          <p className="mt-4 text-sm text-[#7A90A4]">
            Módulos do CRM em desenvolvimento. Autenticação e multi-tenancy
            configurados com sucesso.
          </p>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 14.6: Criar root layout**

Substitua o conteúdo de `web/app/layout.tsx` gerado pelo create-next-app:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Integra Solar — Plataforma de Gestão',
  description: 'CRM para gestão de projetos de energia solar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 14.7: Criar página raiz (redirect)**

Substitua `web/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 14.8: Verificar build completo**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm run build
```

Esperado: build sem erros.

- [ ] **Step 14.9: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/ web/components/layout/ web/lib/org/
git commit -m "feat: add protected dashboard layout with sidebar and topbar"
```

---

## Task 15: Edge Function — Convite de Usuário

**Files:**
- Create: `web/supabase/functions/invite-user/index.ts`

Esta função usa a **service role key** (nunca exposta ao cliente) para chamar `admin.inviteUserByEmail()`. Requer Supabase CLI para deploy.

- [ ] **Step 15.1: Escrever a Edge Function**

Crie `web/supabase/functions/invite-user/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  email: string
  organization_id: string
  role: 'owner' | 'admin' | 'manager' | 'user'
  full_name?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

    // Verificar o usuário que está fazendo a chamada
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: callerUser },
      error: callerError,
    } = await supabaseUser.auth.getUser()

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: InvitePayload = await req.json()
    const { email, organization_id, role, full_name } = payload

    if (!email || !organization_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, organization_id, role' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Cliente admin para verificar permissões e enviar convite
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar que o caller tem permissão (owner ou admin na org)
    const { data: callerMembership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('organization_id', organization_id)
      .maybeSingle()

    if (membershipError || !callerMembership) {
      return new Response(
        JSON.stringify({ error: 'Você não pertence a esta organização.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!['owner', 'admin'].includes(callerMembership.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas owners e admins podem convidar usuários.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar que o role convidado não é maior que o caller
    const roleHierarchy = ['user', 'manager', 'admin', 'owner']
    const callerLevel = roleHierarchy.indexOf(callerMembership.role)
    const inviteeLevel = roleHierarchy.indexOf(role)

    if (inviteeLevel > callerLevel) {
      return new Response(
        JSON.stringify({ error: 'Você não pode convidar um usuário com papel superior ao seu.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Enviar convite
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? '', organization_id, role },
        redirectTo: `${siteUrl}/auth/callback?type=invite`,
      })

    if (inviteError) {
      throw inviteError
    }

    // Adicionar membro à org (otimista — o trigger cria o profile quando o user confirmar)
    const { error: memberInsertError } = await supabaseAdmin
      .from('organization_members')
      .upsert(
        {
          organization_id,
          user_id: inviteData.user.id,
          role,
        },
        { onConflict: 'organization_id,user_id' }
      )

    if (memberInsertError) {
      console.error('Erro ao inserir membro:', memberInsertError.message)
      // Não falhar — o convite já foi enviado
    }

    return new Response(
      JSON.stringify({ success: true, user_id: inviteData.user.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro na Edge Function invite-user:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
```

- [ ] **Step 15.2: Deploy da Edge Function via Supabase CLI**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
supabase functions deploy invite-user --project-ref <project-ref>
```

- [ ] **Step 15.3: Configurar variável SITE_URL na Edge Function**

No Supabase Dashboard → Edge Functions → invite-user → Environment Variables:

```
SITE_URL=http://localhost:3000
```

(Após deploy em produção, atualizar para a URL do Vercel.)

- [ ] **Step 15.4: Testar a Edge Function manualmente**

No Supabase Dashboard → Edge Functions → invite-user → Test:

```json
{
  "email": "teste@exemplo.com",
  "organization_id": "<uuid-de-uma-org-de-teste>",
  "role": "user",
  "full_name": "Usuário Teste"
}
```

Header: `Authorization: Bearer <access_token_de_um_owner_ou_admin>`

Esperado: `{ "success": true, "user_id": "..." }` e e-mail de convite enviado.

- [ ] **Step 15.5: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/supabase/functions/
git commit -m "feat: add invite-user Edge Function with permission checks"
```

---

## Task 16: Webhook Asaas (estrutura para integração futura)

**Files:**
- Create: `web/app/api/webhooks/asaas/route.ts`
- Create: `web/lib/webhooks/asaas.ts`

- [ ] **Step 16.1: Criar service de eventos Asaas**

Crie `web/lib/webhooks/asaas.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Tipos de eventos Asaas suportados
export type AsaasEventType = 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED'

export interface AsaasWebhookPayload {
  event: AsaasEventType
  payment: {
    id: string
    customer: string
    value: number
    netValue: number
    description: string
    billingType: string
    status: string
    dueDate: string
    paymentDate?: string
    externalReference?: string // Usaremos para linkar ao organization_id futuro
  }
}

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Handler para PAYMENT_CONFIRMED ──────────────────────────────
// TODO (fase Asaas): implementar criação de organization + convite ao owner
export async function handlePaymentConfirmed(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  console.log('[Asaas] PAYMENT_CONFIRMED recebido:', {
    paymentId: payload.payment.id,
    value: payload.payment.value,
    externalReference: payload.payment.externalReference,
  })

  // Estrutura futura:
  // 1. Validar externalReference (contém dados do cliente que pagou)
  // 2. Criar organization
  // 3. Criar usuário owner via supabase.auth.admin.inviteUserByEmail()
  // 4. Inserir em organization_members com role 'owner'

  return {
    success: true,
    message: 'Evento PAYMENT_CONFIRMED recebido e registrado. Integração Asaas pendente de implementação.',
  }
}

// ── Dispatcher de eventos ─────────────────────────────────────────
export async function dispatchAsaasEvent(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  switch (payload.event) {
    case 'PAYMENT_CONFIRMED':
      return handlePaymentConfirmed(payload)
    default:
      console.log(`[Asaas] Evento não tratado: ${payload.event}`)
      return { success: true, message: `Evento ${payload.event} ignorado.` }
  }
}
```

- [ ] **Step 16.2: Criar route handler do webhook**

Crie `web/app/api/webhooks/asaas/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import type { AsaasWebhookPayload } from '@/lib/webhooks/asaas'
import { dispatchAsaasEvent } from '@/lib/webhooks/asaas'

function verifyAsaasSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    // Em desenvolvimento, permitir sem assinatura
    if (process.env.NODE_ENV === 'development') return true
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: Request) {
  let rawBody: string

  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const signature = request.headers.get('asaas-access-token')
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET ?? ''

  if (!verifyAsaasSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: AsaasWebhookPayload

  try {
    payload = JSON.parse(rawBody) as AsaasWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.event || !payload.payment) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = await dispatchAsaasEvent(payload)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[Asaas webhook] Erro interno:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET para verificar que o endpoint existe
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Integra Solar Asaas Webhook',
    note: 'Integração Asaas pendente de configuração.',
  })
}
```

- [ ] **Step 16.3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/app/api/ web/lib/webhooks/
git commit -m "feat: add Asaas webhook stub with signature verification structure"
```

---

## Task 17: Configurar Vercel para produção

**Files:**
- Create: `web/vercel.json`

- [ ] **Step 17.1: Criar `vercel.json`**

Crie `web/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

- [ ] **Step 17.2: Build final para validação**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm run build
```

Esperado: build sem erros, sem warnings de tipo.

- [ ] **Step 17.3: Fazer deploy via MCP Vercel**

Use a ferramenta `deploy_to_vercel` do MCP com o diretório `web/` apontando para o root do projeto Vercel.

Se preferir pelo CLI:
```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx vercel --prod
```

- [ ] **Step 17.4: Configurar variáveis de ambiente no Vercel**

No Vercel Dashboard → Project → Settings → Environment Variables, adicionar:

```
NEXT_PUBLIC_SUPABASE_URL          = https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = <anon-key>
SUPABASE_SERVICE_ROLE_KEY         = <service-role-key>   [somente server]
NEXT_PUBLIC_SITE_URL              = https://<seu-dominio>.vercel.app
PDF_BACKEND_API_KEY               = integra-solar-api-2025
NEXT_PUBLIC_PDF_BACKEND_URL       = https://<railway-url>
ASAAS_WEBHOOK_SECRET              = <secret>
```

- [ ] **Step 17.5: Atualizar URLs no Supabase após deploy**

No Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://<seu-dominio>.vercel.app`
- **Redirect URLs**: adicionar `https://<seu-dominio>.vercel.app/auth/callback`

No Supabase Edge Functions → invite-user → Environment Variables:
- **SITE_URL**: `https://<seu-dominio>.vercel.app`

- [ ] **Step 17.6: Commit final**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/vercel.json
git commit -m "chore: add Vercel configuration"
```

---

## Task 18: Remoção do frontend legado e cleanup

**Files:**
- Delete: `frontend/index.html`
- Modify: `database/supabase-schema.sql` (substituído)
- Modify: `README.md`
- Modify: `package.json` (raiz)

- [ ] **Step 18.1: Remover frontend legado**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git rm frontend/index.html
```

- [ ] **Step 18.2: Substituir schema legado pelo novo**

```bash
cp "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web\supabase\migrations\20260617000001_initial_schema.sql" "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\database\supabase-schema.sql"
```

- [ ] **Step 18.3: Atualizar `package.json` raiz**

Substitua o conteúdo de `package.json` (raiz):

```json
{
  "name": "integra-solar-crm",
  "private": true,
  "scripts": {
    "dev": "npm --prefix web run dev",
    "build": "npm --prefix web run build",
    "start": "npm --prefix web run start",
    "pdf-backend": "npm --prefix backend start",
    "type-check": "npm --prefix web run tsc --noEmit"
  }
}
```

- [ ] **Step 18.4: Commit de remoção do legado**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add -A
git commit -m "chore: remove legacy frontend SPA, update root package.json"
```

---

## Task 19: Validação final

- [ ] **Step 19.1: TypeScript sem erros**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npx tsc --noEmit
```

Esperado: `0 errors`.

- [ ] **Step 19.2: Build sem erros**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm run build
```

Esperado: `✓ Compiled successfully`.

- [ ] **Step 19.3: Testar fluxo de login localmente**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web"
npm run dev
```

1. Acesse `http://localhost:3000` → deve redirecionar para `/login`
2. Tente acessar `/dashboard` sem login → deve redirecionar para `/login`
3. Acesse `http://localhost:3000/reset-password` → deve exibir formulário
4. Acesse `http://localhost:3000/accept-invite` → deve exibir formulário

- [ ] **Step 19.4: Criar primeiro usuário owner manualmente (bootstrapping)**

Como o sistema agora usa convites, o primeiro usuário owner precisa ser criado diretamente no Supabase:

1. Supabase Dashboard → Authentication → Users → **Add User**
2. Preencha e-mail e senha (apenas para o primeiro owner)
3. Anote o `user.id` gerado

Execute no SQL Editor do Supabase:
```sql
-- Criar organização de teste
insert into public.organizations (name, plan, status)
values ('Integra Solar Matriz', 'professional', 'active')
returning id;

-- Substituir <org-id> e <user-id> pelos valores reais
insert into public.organization_members (organization_id, user_id, role)
values ('<org-id>', '<user-id>', 'owner');
```

5. Faça login com as credenciais criadas → deve exibir o dashboard

- [ ] **Step 19.5: Testar convite via Edge Function**

Após estar logado como owner, chame a Edge Function:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/invite-user \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo_usuario@exemplo.com",
    "organization_id": "<org-id>",
    "role": "user",
    "full_name": "Novo Usuário"
  }'
```

Esperado: `{"success":true,"user_id":"..."}` e e-mail de convite enviado.

- [ ] **Step 19.6: Verificar RLS — isolamento entre organizações**

Execute no SQL Editor do Supabase como anon (sem autenticação):

```sql
-- Deve retornar 0 linhas (RLS bloqueia sem auth)
select count(*) from public.organizations;
select count(*) from public.clients;
```

Esperado: `0` em todas.

- [ ] **Step 19.7: Verificar ausência de código legado**

```bash
# Buscar referências a "Empresas" no código novo
grep -r "empresas\|empresa" "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" --include="*.ts" --include="*.tsx" -i
```

Esperado: nenhuma referência à página "Empresas" (podem existir referências a `organizations` que é o termo correto).

---

## Checklist de conclusão

- [ ] Build TypeScript sem erros
- [ ] Supabase Auth funcionando (login, logout, reset de senha)
- [ ] Convite por e-mail funcionando via Edge Function
- [ ] Usuário define sua própria senha via link de convite
- [ ] Multi-tenancy funcionando (`organizations`, `profiles`, `organization_members`)
- [ ] RLS ativo e isolando dados por `organization_id`
- [ ] Middleware protegendo todas as rotas autenticadas
- [ ] Nenhuma senha armazenada fora do Supabase Auth
- [ ] Nenhum bypass de autenticação hardcoded
- [ ] Página/módulo "Empresas" removida completamente
- [ ] Frontend legado (`frontend/index.html`) removido
- [ ] Webhook Asaas com estrutura preparada
- [ ] Deploy no Vercel configurado

---

## Riscos e notas

| Item | Nota |
|---|---|
| `organization_members` insert otimista no invite | Se o usuário não aceitar o convite, o registro fica órfão. Cleanup periódico pode ser adicionado depois. |
| Backend PDF (`backend/`) | Não alterado neste plano. Continua funcionando independentemente. |
| Módulos CRM | Leads, clientes, propostas etc. são o próximo plano. Este plano só entrega autenticação + shell. |
| Geração de types | Rexecutar `supabase gen types` sempre que o schema mudar. |
| Edge Function SITE_URL | Lembrar de atualizar no Supabase após cada mudança de domínio. |
