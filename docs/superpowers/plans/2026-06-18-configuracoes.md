# Configurações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página /configuracoes com 3 abas — Empresa (dados + cálculos + origens de lead + meta anual), Acesso (colaboradores + permissões), Auditoria (log de ações).

**Architecture:** Nova tabela `org_config` (flat, uma linha por org), `audit_logs`, coluna `permissions` JSONB em `organization_members`. Criação de colaboradores via Supabase admin client (service role). Sidebar filtra itens por permissão.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Postgres + Auth, glassmorphism theme (navy + `#FFD080`), `(supabase as any)` para novas tabelas, Server Actions `'use server'`.

---

## File Map

| File | Action |
|---|---|
| `web/supabase/migrations/20260618000006_configuracoes.sql` | Create |
| `web/lib/supabase/admin.ts` | Create — admin client with service role |
| `web/lib/configuracoes/queries.ts` | Create |
| `web/lib/configuracoes/actions.ts` | Create |
| `web/lib/colaboradores/queries.ts` | Create |
| `web/lib/colaboradores/actions.ts` | Create |
| `web/lib/auditoria/queries.ts` | Create |
| `web/lib/auditoria/actions.ts` | Create — logAction helper |
| `web/app/(dashboard)/configuracoes/page.tsx` | Create |
| `web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx` | Create |
| `web/app/(dashboard)/configuracoes/EmpresaTab.tsx` | Create |
| `web/app/(dashboard)/configuracoes/AcessoTab.tsx` | Create |
| `web/app/(dashboard)/configuracoes/AuditoriaTab.tsx` | Create |
| `web/components/layout/Sidebar.tsx` | Modify — filter nav by permissions |
| `web/lib/org/queries.ts` | Modify — include permissions in getCurrentUserData |

---

### Task 1: Migration

**Files:**
- Create: `web/supabase/migrations/20260618000006_configuracoes.sql`

- [ ] **Step 1: Write migration file**

```sql
-- web/supabase/migrations/20260618000006_configuracoes.sql

-- org_config: flat config table, one row per organization
create table public.org_config (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null unique references public.organizations(id) on delete cascade,
  -- Dados da empresa
  razao_social              text,
  nome_fantasia             text,
  cnpj                      text,
  email                     text,
  telefone                  text,
  cep                       text,
  endereco                  text,
  bairro                    text,
  numero                    text,
  cidade                    text,
  estado                    text,
  cor_principal             text default '#FFD080',
  cor_secundaria            text default '#0a0e1a',
  concessionaria            text,
  logo_url                  text,
  -- Dados bancários
  banco                     text,
  agencia                   text,
  conta                     text,
  tipo_chave_pix            text,
  pix                       text,
  -- Dados de cálculo
  kwh_por_kwp               numeric(10,4),
  valor_projeto_por_kwp     numeric(12,2),
  valor_instalacao_por_placa numeric(12,2),
  pct_material_ca           numeric(6,2),
  quilometragem             numeric(10,2),
  pct_comissao              numeric(6,2),
  pct_imposto               numeric(6,2),
  pct_margem                numeric(6,2),
  -- Meta
  meta_anual                numeric(15,2),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
alter table public.org_config enable row level security;
create policy "org_config_isolation" on public.org_config
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- audit_logs
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  user_name       text,
  action          text not null,
  description     text,
  created_at      timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit_logs_isolation" on public.audit_logs
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Add permissions column to organization_members
alter table public.organization_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Extend role check to include new roles
alter table public.organization_members
  drop constraint if exists organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'gerente', 'vendedor', 'instalador', 'projetista'));
```

- [ ] **Step 2: Apply migration in Supabase Dashboard → SQL Editor**

Run the SQL above. Confirm no errors.

- [ ] **Step 3: Commit migration file**

```bash
git add web/supabase/migrations/20260618000006_configuracoes.sql
git commit -m "feat: add org_config, audit_logs, permissions column migration"
```

---

### Task 2: Supabase Admin Client

**Files:**
- Create: `web/lib/supabase/admin.ts`

- [ ] **Step 1: Create admin client**

```typescript
// web/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/supabase/admin.ts
git commit -m "feat: add supabase admin client"
```

---

### Task 3: lib/configuracoes/queries.ts

**Files:**
- Create: `web/lib/configuracoes/queries.ts`

- [ ] **Step 1: Write queries**

```typescript
// web/lib/configuracoes/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type OrgConfig = {
  id: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  cep: string | null
  endereco: string | null
  bairro: string | null
  numero: string | null
  cidade: string | null
  estado: string | null
  cor_principal: string | null
  cor_secundaria: string | null
  concessionaria: string | null
  logo_url: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_chave_pix: string | null
  pix: string | null
  kwh_por_kwp: number | null
  valor_projeto_por_kwp: number | null
  valor_instalacao_por_placa: number | null
  pct_material_ca: number | null
  quilometragem: number | null
  pct_comissao: number | null
  pct_imposto: number | null
  pct_margem: number | null
  meta_anual: number | null
}

export type LeadOrigin = {
  id: string
  name: string
}

export async function getOrgConfig(): Promise<OrgConfig> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return emptyConfig()

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('org_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!data) return emptyConfig()
  return data as OrgConfig
}

export async function getLeadOrigins(): Promise<LeadOrigin[]> {
  const supabase = await createClient()
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const { data } = await (supabase as any)
    .from('lead_sources')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  return (data ?? []) as LeadOrigin[]
}

function emptyConfig(): OrgConfig {
  return {
    id: null, razao_social: null, nome_fantasia: null, cnpj: null,
    email: null, telefone: null, cep: null, endereco: null, bairro: null,
    numero: null, cidade: null, estado: null, cor_principal: '#FFD080',
    cor_secundaria: '#0a0e1a', concessionaria: null, logo_url: null,
    banco: null, agencia: null, conta: null, tipo_chave_pix: null, pix: null,
    kwh_por_kwp: null, valor_projeto_por_kwp: null, valor_instalacao_por_placa: null,
    pct_material_ca: null, quilometragem: null, pct_comissao: null,
    pct_imposto: null, pct_margem: null, meta_anual: null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/configuracoes/queries.ts
git commit -m "feat: add configuracoes queries"
```

---

### Task 4: lib/configuracoes/actions.ts

**Files:**
- Create: `web/lib/configuracoes/actions.ts`

- [ ] **Step 1: Write actions**

```typescript
// web/lib/configuracoes/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

export async function saveOrgConfig(formData: Record<string, unknown>): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Check if record exists
  const { data: existing } = await (supabase as any)
    .from('org_config')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  const payload = { ...formData, organization_id: orgId, updated_at: new Date().toISOString() }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any).from('org_config').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any).from('org_config').insert(payload))
  }

  if (error) return { error: error.message }

  await logAction('Configurações', 'Dados da empresa atualizados')
  revalidatePath('/configuracoes')
  return { success: 'Configurações salvas.' }
}

export async function addLeadOrigin(name: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!name.trim()) return { error: 'Nome obrigatório.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('lead_sources')
    .insert({ organization_id: orgId, name: name.trim() })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem adicionada.' }
}

export async function removeLeadOrigin(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('lead_sources').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem removida.' }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/configuracoes/actions.ts
git commit -m "feat: add configuracoes actions"
```

---

### Task 5: lib/auditoria/actions.ts (logAction helper)

**Files:**
- Create: `web/lib/auditoria/actions.ts`
- Create: `web/lib/auditoria/queries.ts`

- [ ] **Step 1: Write logAction helper**

```typescript
// web/lib/auditoria/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function logAction(action: string, description: string): Promise<void> {
  try {
    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return

    const supabase = await createClient()
    await (supabase as any).from('audit_logs').insert({
      organization_id: orgId,
      user_id: user.profile.id,
      user_name: user.profile.full_name ?? user.profile.email,
      action,
      description,
    })
  } catch {
    // audit failures should never crash the main flow
  }
}
```

- [ ] **Step 2: Write auditoria queries**

```typescript
// web/lib/auditoria/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type AuditLog = {
  id: string
  user_name: string | null
  action: string
  description: string | null
  created_at: string
}

export async function getAuditLogs(page = 1, pageSize = 20): Promise<{ logs: AuditLog[]; total: number }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { logs: [], total: 0 }

  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await (supabase as any)
    .from('audit_logs')
    .select('id, user_name, action, description, created_at', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { logs: [], total: 0 }
  return { logs: (data ?? []) as AuditLog[], total: count ?? 0 }
}
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/auditoria/actions.ts web/lib/auditoria/queries.ts
git commit -m "feat: add audit log helper and queries"
```

---

### Task 6: lib/colaboradores/queries.ts + actions.ts

**Files:**
- Create: `web/lib/colaboradores/queries.ts`
- Create: `web/lib/colaboradores/actions.ts`

- [ ] **Step 1: Write queries**

```typescript
// web/lib/colaboradores/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type Colaborador = {
  id: string           // organization_members.id
  user_id: string
  full_name: string | null
  email: string
  role: string
  permissions: Record<string, { access: boolean; view_all: boolean; add: boolean; edit: boolean; delete: boolean }>
  created_at: string
}

export async function getColaboradores(): Promise<Colaborador[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('organization_members')
    .select(`
      id,
      user_id,
      role,
      permissions,
      created_at,
      profiles!user_id (full_name, email)
    `)
    .eq('organization_id', orgId)
    .order('created_at')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? '',
    role: r.role,
    permissions: r.permissions ?? {},
    created_at: r.created_at,
  }))
}
```

- [ ] **Step 2: Write actions**

```typescript
// web/lib/colaboradores/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

type CreateColaboradorData = {
  full_name: string
  email: string
  password: string
  role: string
  permissions: Record<string, unknown>
}

export async function createColaborador(data: CreateColaboradorData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  if (!data.email || !data.password || !data.full_name) {
    return { error: 'Nome, e-mail e senha são obrigatórios.' }
  }

  const adminClient = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  })

  if (authError) return { error: authError.message }

  const newUserId = authData.user.id
  const supabase = await createClient()

  // Ensure profile exists
  await (supabase as any).from('profiles').upsert({
    id: newUserId,
    email: data.email,
    full_name: data.full_name,
  })

  // Create membership with permissions
  const { error: memberError } = await (supabase as any).from('organization_members').insert({
    organization_id: orgId,
    user_id: newUserId,
    role: data.role,
    permissions: data.permissions,
  })

  if (memberError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: memberError.message }
  }

  await logAction('Colaboradores', `Colaborador ${data.full_name} criado`)
  revalidatePath('/configuracoes')
  return { success: 'Colaborador criado com sucesso.' }
}

export async function updateColaboradorPermissions(
  memberId: string,
  permissions: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('organization_members')
    .update({ permissions })
    .eq('id', memberId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Permissões atualizadas.' }
}

export async function removeColaborador(memberId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Remove membership
  const { error } = await (supabase as any)
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }

  // Delete auth user via admin
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(userId)

  await logAction('Colaboradores', 'Colaborador removido')
  revalidatePath('/configuracoes')
  return { success: 'Colaborador removido.' }
}
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/colaboradores/queries.ts web/lib/colaboradores/actions.ts
git commit -m "feat: add colaboradores queries and actions"
```

---

### Task 7: /configuracoes pages

**Files:**
- Create: `web/app/(dashboard)/configuracoes/page.tsx`
- Create: `web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx`
- Create: `web/app/(dashboard)/configuracoes/EmpresaTab.tsx`
- Create: `web/app/(dashboard)/configuracoes/AcessoTab.tsx`
- Create: `web/app/(dashboard)/configuracoes/AuditoriaTab.tsx`

#### page.tsx

```typescript
// web/app/(dashboard)/configuracoes/page.tsx
import { getOrgConfig, getLeadOrigins } from '@/lib/configuracoes/queries'
import { getColaboradores } from '@/lib/colaboradores/queries'
import { getAuditLogs } from '@/lib/auditoria/queries'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const [config, origins, colaboradores, { logs, total }] = await Promise.all([
    getOrgConfig(),
    getLeadOrigins(),
    getColaboradores(),
    getAuditLogs(1, 20),
  ])

  return (
    <ConfiguracoesClient
      config={config}
      origins={origins}
      colaboradores={colaboradores}
      auditLogs={logs}
      auditTotal={total}
    />
  )
}
```

#### ConfiguracoesClient.tsx

Client component with 3 tabs: `empresa | acesso | auditoria`. Renders the active tab.

```typescript
'use client'

import { useState } from 'react'
import type { OrgConfig, LeadOrigin } from '@/lib/configuracoes/queries'
import type { Colaborador } from '@/lib/colaboradores/queries'
import type { AuditLog } from '@/lib/auditoria/queries'
import EmpresaTab from './EmpresaTab'
import AcessoTab from './AcessoTab'
import AuditoriaTab from './AuditoriaTab'

const TABS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'acesso', label: 'Acesso' },
  { key: 'auditoria', label: 'Auditoria' },
]

export default function ConfiguracoesClient({
  config, origins, colaboradores, auditLogs, auditTotal,
}: {
  config: OrgConfig
  origins: LeadOrigin[]
  colaboradores: Colaborador[]
  auditLogs: AuditLog[]
  auditTotal: number
}) {
  const [activeTab, setActiveTab] = useState<'empresa' | 'acesso' | 'auditoria'>('empresa')

  const tabCls = (key: string) =>
    `px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      activeTab === key
        ? 'text-[#0a0e1a]'
        : 'text-white/50 hover:text-white/80'
    }`

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-white/50 text-sm mt-1">Gerencie sua empresa, equipe e auditoria</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={tabCls(t.key)}
            style={activeTab === t.key ? { background: '#FFD080' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa' && <EmpresaTab config={config} origins={origins} />}
      {activeTab === 'acesso' && <AcessoTab colaboradores={colaboradores} />}
      {activeTab === 'auditoria' && <AuditoriaTab logs={auditLogs} total={auditTotal} />}
    </div>
  )
}
```

#### EmpresaTab.tsx

Client component with 4 sections (cards), each with its own save button.

Sections:
1. **Dados da Empresa**: razao_social, nome_fantasia, cnpj, email, telefone, cep, endereco, bairro, numero, cidade, estado, concessionaria, cor_principal, cor_secundaria — saved via `saveOrgConfig({ ...dadosEmpresa })`
2. **Dados para Cálculo**: kwh_por_kwp, valor_projeto_por_kwp, valor_instalacao_por_placa, pct_material_ca, quilometragem, pct_comissao, pct_imposto, pct_margem — saved via `saveOrgConfig({ ...dadosCalculo })`
3. **Dados Bancários**: banco, agencia, conta, tipo_chave_pix, pix — saved via `saveOrgConfig({ ...dadosBancarios })`
4. **Meta Anual**: meta_anual input + "Meta mensal: R$ X" display — saved via `saveOrgConfig({ meta_anual })`
5. **Origens de Lead**: list of origins + add form + remove button. Uses `addLeadOrigin`, `removeLeadOrigin`.

All inputs use glassmorphism style: `bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm`.
Save buttons: gold `#FFD080`.

#### AcessoTab.tsx

Client component with:
- **List of members**: table showing full_name, email, role badge, "Remover" button
- **Add form**: full_name, email, password fields + role selector + permissions grid
- **Permissions grid**: rows = modules, columns = (Acessar | Ver todos | Adicionar | Editar | Excluir), checkboxes

Modules to display:
```typescript
const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'CRM / Leads' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'projetos', label: 'Projetos' },
  { key: 'compras', label: 'Compras' },
  { key: 'comissoes', label: 'Comissões' },
  { key: 'entrega_material', label: 'Entrega do Material' },
  { key: 'obra', label: 'Obra' },
  { key: 'entrega_obra', label: 'Entrega da Obra' },
  { key: 'pos_obra', label: 'Pós-Obra' },
  { key: 'configuracoes', label: 'Configurações' },
]
```

Role options: `admin | gerente | vendedor | instalador | projetista`

Calls `createColaborador(data)` and `removeColaborador(memberId, userId)`.

#### AuditoriaTab.tsx

Client component with:
- Table: user_name, action, description, formatted date
- Pagination: previous/next buttons, "Página X de Y"
- On page change, calls a Server Action `getAuditLogsPage(page)` or uses URL params

Simplest approach: local state with all logs pre-loaded (first 20). Add "Carregar mais" button that calls a server action for next page.

```typescript
// AuditoriaTab.tsx
'use client'
import { useState, useTransition } from 'react'
import type { AuditLog } from '@/lib/auditoria/queries'
import { getAuditLogsPage } from '@/lib/auditoria/actions'

// getAuditLogsPage is a server action that returns { logs, total }
```

Add to `web/lib/auditoria/actions.ts`:
```typescript
export async function getAuditLogsPage(page: number): Promise<{ logs: AuditLog[]; total: number }> {
  // calls getAuditLogs(page, 20)
  const { getAuditLogs } = await import('./queries')
  return getAuditLogs(page, 20)
}
```

- [ ] **Step 1: Create page.tsx**
- [ ] **Step 2: Create ConfiguracoesClient.tsx**
- [ ] **Step 3: Create EmpresaTab.tsx**
- [ ] **Step 4: Create AcessoTab.tsx**
- [ ] **Step 5: Create AuditoriaTab.tsx**
- [ ] **Step 6: Commit**

```bash
git add web/app/(dashboard)/configuracoes/
git commit -m "feat: add configuracoes pages"
```

---

### Task 8: Permission enforcement in Sidebar + getCurrentUserData

**Files:**
- Modify: `web/components/layout/Sidebar.tsx`
- Modify: `web/lib/org/queries.ts`

- [ ] **Step 1: Extend getCurrentUserData to include permissions**

In `web/lib/org/queries.ts`, extend the query to also select `permissions` from `organization_members`:

```typescript
// Add to CurrentUserData type:
membership: {
  id: string
  role: 'owner' | 'admin' | 'gerente' | 'vendedor' | 'instalador' | 'projetista' | string
  permissions: Record<string, { access: boolean; view_all: boolean; add: boolean; edit: boolean; delete: boolean }>
  organization: {
    id: string
    name: string
    plan: string
    status: string
  }
} | null
```

Update the select query to include `permissions`.

- [ ] **Step 2: Filter Sidebar nav by permissions**

In `web/components/layout/Sidebar.tsx`, the Sidebar receives user data. Map each nav item to its module key. For non-owner/admin users, filter out items where `permissions[moduleKey]?.access !== true`.

```typescript
// Module key map
const MODULE_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/leads': 'leads',
  '/clientes': 'clientes',
  '/contratos': 'contratos',
  '/financeiro': 'financeiro',
  '/projetos': 'projetos',
  '/compras': 'compras',
  '/comissoes': 'comissoes',
  '/entrega-material': 'entrega_material',
  '/obra': 'obra',
  '/entrega-obra': 'entrega_obra',
  '/pos-obra': 'pos_obra',
  '/configuracoes': 'configuracoes',
}

// Filter logic (owner and admin always have full access)
const isAdmin = ['owner', 'admin'].includes(user?.membership?.role ?? '')
const visibleItems = isAdmin
  ? NAV_ITEMS
  : NAV_ITEMS.filter(item => {
      const key = MODULE_KEYS[item.href]
      if (!key) return true
      return user?.membership?.permissions?.[key]?.access === true
    })
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add web/components/layout/Sidebar.tsx web/lib/org/queries.ts
git commit -m "feat: add permissions to user data and filter sidebar by access"
```

---

### Task 9: TypeScript final verification

- [ ] **Step 1: Run full type check**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 2: Fix any errors found**

Common issues:
- Missing `permissions` in `CurrentUserData` type
- `(supabase as any)` already handles unknown table errors
- `createAdminClient()` return type may need `as any` for admin methods

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: typescript errors in configuracoes implementation"
```
