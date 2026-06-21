# Clientes — Cadastro Completo (Plano 2 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete 8-tab client registration form at /clientes/[id], with file uploads via Supabase Storage, installments management, and tab-completion tracking that drives pipeline progression.

**Architecture:** Server Components fetch full client data (with related sale, installments, attachments, contract). Each tab is a Client Component with its own `useFormState` form calling a Server Action. File uploads go through Server Actions receiving FormData with File objects, uploaded to Supabase Storage bucket `client-files`. Tab completion is tracked in `completed_tabs` JSONB column on clients.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS + Storage), zod

**Codebase context:**
- App directory: `web/` (all paths below relative to repo root)
- Dashboard routes: `web/app/(dashboard)/`
- Supabase client: `import { createClient } from '@/lib/supabase/server'`
- `useFormState` from `react-dom` (React 18 — NOT `useActionState`)
- New DB tables: use `(supabase as any)` — not in generated types
- org_id: `getCurrentUserData()` → `membership.organization.id`
- Column naming: `organization_id` (not `org_id`)
- UI primitives: `Button` (`variant`: primary/secondary/ghost, `loading`), `Input` (extends HTMLInputElement attrs), `SubmitButton`, `FormError`

---

## File Structure

```
web/supabase/migrations/
  20260618000002_clients_full.sql     NEW — adds columns to clients + 4 new tables

web/next.config.mjs                   MODIFY — increase Server Actions body size limit (file uploads)

web/lib/clients/
  types.ts                            NEW — TypeScript types for client module
  queries.ts                          NEW — getClients(), getClientById()
  actions.ts                          NEW — tab data saves (tabs 1-5) + file uploads (tabs 6-7)

web/app/(dashboard)/clientes/
  page.tsx                            NEW — list clients where tabs 1-6 complete
  [id]/
    page.tsx                          NEW — server component, fetches client + renders ClientTabs
    ClientTabs.tsx                    NEW — client component, tab navigation + tab completion badges
    tabs/
      Tab1DadosPessoais.tsx           NEW
      Tab2EquVendidos.tsx             NEW
      Tab3VendaFat.tsx                NEW — includes dynamic installments form
      Tab4Vistoria.tsx                NEW
      Tab5Prazos.tsx                  NEW
      Tab6Anexos.tsx                  NEW — file upload per attachment type
      Tab7Contrato.tsx                NEW — upload contrato + procuracao
      Tab8PastaCompleta.tsx           NEW — read-only dossier
```

---

### Task 1: Migration SQL + Supabase Storage bucket

**Files:**
- Create: `web/supabase/migrations/20260618000002_clients_full.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- web/supabase/migrations/20260618000002_clients_full.sql
-- ─────────────────────────────────────────────────────────────────
-- Clientes: adiciona colunas + 4 novas tabelas relacionadas
-- Apply via: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- ── Colunas extras na tabela clients ─────────────────────────────
alter table public.clients
  add column if not exists lead_id            uuid references public.leads(id) on delete set null,
  -- Aba 1
  add column if not exists type               text default 'pf',
  add column if not exists cpf_cnpj          text,
  add column if not exists email              text,
  add column if not exists "number"           text,
  add column if not exists neighborhood       text,
  add column if not exists zip                text,
  add column if not exists state              text,
  -- Aba 2
  add column if not exists promised_kwh       numeric,
  add column if not exists system_power_kwp   numeric,
  add column if not exists panel_brand        text,
  add column if not exists panel_power_w      numeric,
  add column if not exists inverter_brand     text,
  add column if not exists inverter_power_w   numeric,
  add column if not exists specific_panels    boolean default false,
  add column if not exists specific_inverter  boolean default false,
  add column if not exists direct_delivery    boolean default false,
  add column if not exists viability_proposal_id uuid references public.proposals(id) on delete set null,
  -- Aba 4
  add column if not exists has_adaptation_works boolean default false,
  add column if not exists roof_type          text,
  add column if not exists roof_orientation   text,
  add column if not exists maps_coordinates   text,
  add column if not exists entry_breaker      text,
  add column if not exists entry_cable_mm     text,
  add column if not exists inspection_done    boolean default false,
  add column if not exists client_notes       text,
  add column if not exists extra_promises     text,
  -- Aba 5
  add column if not exists delivery_start_date date,
  add column if not exists contract_date      date,
  add column if not exists contract_max_days  integer,
  -- Pipeline tracking
  add column if not exists pipeline_stage     text default 'crm',
  add column if not exists completed_tabs     jsonb default '{}',
  add column if not exists pipeline_flags     jsonb default '{}',
  add column if not exists updated_at         timestamptz default now();

-- ── client_sale ────────────────────────────────────────────────────
create table if not exists public.client_sale (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_value      numeric not null default 0,
  payment_method  text,
  nf_notes        text,
  commission_pct  numeric default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.client_sale enable row level security;
create policy "client_sale_org_isolation" on public.client_sale for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_installments ───────────────────────────────────────────
create table if not exists public.client_installments (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  position          integer not null,
  due_date          date not null,
  amount            numeric not null,
  notes             text,
  status            text not null default 'pendente',
  payment_proof_url text,
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists client_installments_client_id_idx on public.client_installments(client_id);
alter table public.client_installments enable row level security;
create policy "client_installments_org_isolation" on public.client_installments for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_attachments ────────────────────────────────────────────
create table if not exists public.client_attachments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type            text not null,
  file_url        text not null,
  uploaded_at     timestamptz not null default now()
);
alter table public.client_attachments enable row level security;
create policy "client_attachments_org_isolation" on public.client_attachments for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_contracts ──────────────────────────────────────────────
create table if not exists public.client_contracts (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  contract_url          text,
  power_of_attorney_url text,
  signed                boolean not null default false,
  signed_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.client_contracts enable row level security;
create policy "client_contracts_org_isolation" on public.client_contracts for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

- [ ] **Step 2: Aplicar no Supabase Dashboard → SQL Editor → Run**

Confirmar que não há erros.

- [ ] **Step 3: Criar bucket de storage**

No Supabase Dashboard → Storage → New bucket:
- Name: `client-files`
- Public: **ON** (para MVP; URLs são guessable mas incluem orgId/clientId)
- Clicar "Save"

- [ ] **Step 4: Atualizar convertLeadToClient para passar lead_id**

Em `web/lib/crm/actions.ts`, na função `convertLeadToClient`, adicionar `lead_id: leadId` no insert de clients:

```typescript
// linha ~308, no insert de clients
const { data: client, error: clientError } = await supabase
  .from('clients')
  .insert({
    organization_id: orgId,
    name: lead.name,
    phone: lead.phone,
    city: lead.city,
    street: lead.address ?? null,
    lead_id: leadId,   // ADD THIS LINE
  })
  .select('id')
  .single()
```

---

### Task 2: next.config.mjs — limite de upload

**Files:**
- Modify: `web/next.config.mjs`

- [ ] **Step 1: Configurar limite de body para Server Actions**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 3: TypeScript types (web/lib/clients/types.ts)

**Files:**
- Create: `web/lib/clients/types.ts`

- [ ] **Step 1: Criar arquivo de tipos**

```typescript
// web/lib/clients/types.ts

export type ClientType = 'pf' | 'pj'

export type ClientSale = {
  id: string
  client_id: string
  sale_value: number
  payment_method: string | null
  nf_notes: string | null
  commission_pct: number
}

export type ClientInstallment = {
  id: string
  client_id: string
  position: number
  due_date: string
  amount: number
  notes: string | null
  status: 'pendente' | 'confirmada'
  payment_proof_url: string | null
  confirmed_at: string | null
}

export type ClientAttachment = {
  id: string
  client_id: string
  type: string
  file_url: string
  uploaded_at: string
}

export type ClientContract = {
  id: string
  client_id: string
  contract_url: string | null
  power_of_attorney_url: string | null
  signed: boolean
  signed_at: string | null
}

export type Client = {
  id: string
  organization_id: string
  lead_id: string | null
  // Aba 1
  type: ClientType
  name: string
  cpf_cnpj: string | null
  email: string | null
  phone: string | null
  zip: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  // Aba 2
  promised_kwh: number | null
  system_power_kwp: number | null
  panel_brand: string | null
  panel_power_w: number | null
  inverter_brand: string | null
  inverter_power_w: number | null
  specific_panels: boolean
  specific_inverter: boolean
  direct_delivery: boolean
  viability_proposal_id: string | null
  // Aba 4
  has_adaptation_works: boolean
  roof_type: string | null
  roof_orientation: string | null
  maps_coordinates: string | null
  entry_breaker: string | null
  entry_cable_mm: string | null
  inspection_done: boolean
  client_notes: string | null
  extra_promises: string | null
  // Aba 5
  delivery_start_date: string | null
  contract_date: string | null
  contract_max_days: number | null
  // Pipeline
  pipeline_stage: string
  completed_tabs: Record<string, boolean>
  pipeline_flags: Record<string, unknown>
  // Related
  sale: ClientSale | null
  installments: ClientInstallment[]
  attachments: ClientAttachment[]
  contract: ClientContract | null
  created_at: string
  updated_at: string | null
}

export type ActionResult = {
  error?: string
  success?: string
}

export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  procuracao: 'Procuração',
  conta_luz: 'Conta de Luz',
  rg_cnh: 'RG / CNH',
  foto_disjuntor: 'Foto do Disjuntor',
  foto_maps: 'Foto Maps',
  foto_frente: 'Foto da Frente',
  proposta_formalizada: 'Proposta Formalizada',
  cotacao_material: 'Cotação de Material',
}

export const ATTACHMENT_TYPES = Object.keys(ATTACHMENT_TYPE_LABELS)
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 4: Queries (web/lib/clients/queries.ts)

**Files:**
- Create: `web/lib/clients/queries.ts`

- [ ] **Step 1: Criar queries**

```typescript
// web/lib/clients/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { Client } from './types'

const CLIENT_SELECT = `
  *,
  sale:client_sale(id, client_id, sale_value, payment_method, nf_notes, commission_pct),
  installments:client_installments(id, client_id, position, due_date, amount, notes, status, payment_proof_url, confirmed_at),
  attachments:client_attachments(id, client_id, type, file_url, uploaded_at),
  contract:client_contracts(id, client_id, contract_url, power_of_attorney_url, signed, signed_at)
`

// Only clients where tabs 1-6 are completed (appear in the /clientes pipeline module)
export async function getClients(): Promise<Client[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('organization_id', user.membership.organization.id)
    .contains('completed_tabs', { tab1: true, tab2: true, tab3: true, tab4: true, tab5: true, tab6: true })
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalizeClient) as Client[]
}

// All clients (for navigation after lead conversion — tabs may be incomplete)
export async function getAllClients(): Promise<Client[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalizeClient) as Client[]
}

export async function getClientById(id: string): Promise<Client | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('id', id)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeClient(data as any) as Client
}

function normalizeClient(raw: any): Client {
  // Supabase returns 1-to-many as arrays, 1-to-1 FKs also as arrays
  const saleArr = Array.isArray(raw.sale) ? raw.sale : (raw.sale ? [raw.sale] : [])
  const contractArr = Array.isArray(raw.contract) ? raw.contract : (raw.contract ? [raw.contract] : [])
  return {
    ...raw,
    type: raw.type ?? 'pf',
    specific_panels: raw.specific_panels ?? false,
    specific_inverter: raw.specific_inverter ?? false,
    direct_delivery: raw.direct_delivery ?? false,
    has_adaptation_works: raw.has_adaptation_works ?? false,
    inspection_done: raw.inspection_done ?? false,
    pipeline_stage: raw.pipeline_stage ?? 'crm',
    completed_tabs: (raw.completed_tabs ?? {}) as Record<string, boolean>,
    pipeline_flags: (raw.pipeline_flags ?? {}) as Record<string, unknown>,
    sale: saleArr[0] ?? null,
    installments: Array.isArray(raw.installments) ? raw.installments : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    contract: contractArr[0] ?? null,
  }
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 5: Server Actions — Tabs 1-5 (web/lib/clients/actions.ts)

**Files:**
- Create: `web/lib/clients/actions.ts`

- [ ] **Step 1: Criar actions para tabs 1-5**

```typescript
// web/lib/clients/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from './types'

// ── Helpers ───────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

async function mergeCompletedTabs(
  clientId: string,
  supabase: any,
  update: Record<string, boolean>
): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('clients')
    .select('completed_tabs')
    .eq('id', clientId)
    .single()
  const current = ((data?.completed_tabs) ?? {}) as Record<string, boolean>
  return { ...current, ...update }
}

// ── Tab 1: Dados Pessoais ─────────────────────────────────────────

const tab1Schema = z.object({
  type: z.enum(['pf', 'pj']).default('pf'),
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf_cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  zip: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export async function updateTab1(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const parsed = tab1Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      ...parsed.data,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab1: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Dados pessoais salvos.' }
}

// ── Tab 2: Equipamentos Vendidos ──────────────────────────────────

export async function updateTab2(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      promised_kwh: raw.promised_kwh ? Number(raw.promised_kwh) : null,
      system_power_kwp: raw.system_power_kwp ? Number(raw.system_power_kwp) : null,
      panel_brand: (raw.panel_brand as string) || null,
      panel_power_w: raw.panel_power_w ? Number(raw.panel_power_w) : null,
      inverter_brand: (raw.inverter_brand as string) || null,
      inverter_power_w: raw.inverter_power_w ? Number(raw.inverter_power_w) : null,
      specific_panels: raw.specific_panels === 'on',
      specific_inverter: raw.specific_inverter === 'on',
      direct_delivery: raw.direct_delivery === 'on',
      viability_proposal_id: (raw.viability_proposal_id as string) || null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab2: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Equipamentos salvos.' }
}

// ── Tab 3: Venda e Faturamento ────────────────────────────────────

const tab3Schema = z.object({
  sale_value: z.coerce.number().min(0, 'Valor da venda é obrigatório'),
  payment_method: z.string().optional(),
  nf_notes: z.string().optional(),
  commission_pct: z.coerce.number().min(0).max(100).default(0),
  installments_json: z.string().min(1, 'Parcelas são obrigatórias'),
})

export async function updateTab3(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const parsed = tab3Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let installments: Array<{ position: number; due_date: string; amount: number; notes?: string }>
  try {
    installments = JSON.parse(parsed.data.installments_json)
  } catch {
    return { error: 'Dados de parcelas inválidos.' }
  }
  if (installments.length === 0) return { error: 'Adicione pelo menos uma parcela.' }

  const supabase = await createClient()

  // Upsert client_sale
  const { data: existingSale } = await (supabase as any)
    .from('client_sale')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingSale) {
    await (supabase as any).from('client_sale').update({
      sale_value: parsed.data.sale_value,
      payment_method: parsed.data.payment_method ?? null,
      nf_notes: parsed.data.nf_notes ?? null,
      commission_pct: parsed.data.commission_pct,
      updated_at: new Date().toISOString(),
    }).eq('id', existingSale.id)
  } else {
    await (supabase as any).from('client_sale').insert({
      client_id: clientId,
      organization_id: orgId,
      sale_value: parsed.data.sale_value,
      payment_method: parsed.data.payment_method ?? null,
      nf_notes: parsed.data.nf_notes ?? null,
      commission_pct: parsed.data.commission_pct,
    })
  }

  // Replace installments
  await (supabase as any).from('client_installments').delete().eq('client_id', clientId)
  const { error: instError } = await (supabase as any).from('client_installments').insert(
    installments.map((inst) => ({
      client_id: clientId,
      organization_id: orgId,
      position: inst.position,
      due_date: inst.due_date,
      amount: inst.amount,
      notes: inst.notes ?? null,
    }))
  )
  if (instError) return { error: instError.message }

  const { error } = await supabase
    .from('clients')
    .update({
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab3: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Venda e faturamento salvos.' }
}

// ── Tab 4: Vistoria ───────────────────────────────────────────────

export async function updateTab4(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      has_adaptation_works: raw.has_adaptation_works === 'on',
      roof_type: (raw.roof_type as string) || null,
      roof_orientation: (raw.roof_orientation as string) || null,
      maps_coordinates: (raw.maps_coordinates as string) || null,
      entry_breaker: (raw.entry_breaker as string) || null,
      entry_cable_mm: (raw.entry_cable_mm as string) || null,
      inspection_done: raw.inspection_done === 'on',
      client_notes: (raw.client_notes as string) || null,
      extra_promises: (raw.extra_promises as string) || null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab4: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Vistoria salva.' }
}

// ── Tab 5: Prazos ─────────────────────────────────────────────────

export async function updateTab5(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      delivery_start_date: (raw.delivery_start_date as string) || null,
      contract_date: (raw.contract_date as string) || null,
      contract_max_days: raw.contract_max_days ? Number(raw.contract_max_days) : null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab5: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Prazos salvos.' }
}

// ── Tab 6: Anexos (File Uploads) ──────────────────────────────────

export async function uploadAttachment(
  clientId: string,
  attachmentType: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${orgId}/${clientId}/${attachmentType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)

  const { data: existing } = await (supabase as any)
    .from('client_attachments')
    .select('id')
    .eq('client_id', clientId)
    .eq('type', attachmentType)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('client_attachments')
      .update({ file_url: publicUrl, uploaded_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await (supabase as any).from('client_attachments').insert({
      client_id: clientId,
      organization_id: orgId,
      type: attachmentType,
      file_url: publicUrl,
    })
  }

  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Arquivo enviado.' }
}

export async function confirmTab6(clientId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab6: true }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Anexos confirmados.' }
}

// ── Tab 7: Contrato / Procuração ──────────────────────────────────

export async function uploadContractFile(
  clientId: string,
  field: 'contract' | 'procuracao',
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${orgId}/${clientId}/${field}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
  const dbField = field === 'contract' ? 'contract_url' : 'power_of_attorney_url'

  const { data: existing } = await (supabase as any)
    .from('client_contracts')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('client_contracts')
      .update({ [dbField]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await (supabase as any).from('client_contracts').insert({
      client_id: clientId,
      organization_id: orgId,
      [dbField]: publicUrl,
    })
  }

  // Contrato enviado = tab7 completa + avança pipeline para 'contratos'
  if (field === 'contract') {
    const { error } = await supabase
      .from('clients')
      .update({
        completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab7: true }),
        pipeline_stage: 'contratos',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/clientes/${clientId}`)
  return { success: field === 'contract' ? 'Contrato enviado.' : 'Procuração enviada.' }
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 6: /clientes page — lista

**Files:**
- Create: `web/app/(dashboard)/clientes/page.tsx`

- [ ] **Step 1: Criar página de lista**

```tsx
// web/app/(dashboard)/clientes/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClients } from '@/lib/clients/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Client } from '@/lib/clients/types'

function ClientRow({ client }: { client: Client }) {
  const tabsDone = Object.values(client.completed_tabs).filter(Boolean).length
  return (
    <Link
      href={`/clientes/${client.id}`}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {client.name}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {client.city ?? ''}{client.city && client.phone ? ' · ' : ''}{client.phone ?? ''}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
          {tabsDone}/8 abas
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(16,185,129,0.12)',
            color: '#10B981',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          {client.pipeline_stage}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
      </div>
    </Link>
  )
}

export default async function ClientesPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const clients = await getClients()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            Clientes
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {clients.length} clientes com cadastro completo
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Nenhum cliente com cadastro completo ainda.
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
              Converta um lead em cliente e preencha as 6 primeiras abas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 7: /clientes/[id] page + ClientTabs

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/page.tsx`
- Create: `web/app/(dashboard)/clientes/[id]/ClientTabs.tsx`

- [ ] **Step 1: Criar page.tsx (server component)**

```tsx
// web/app/(dashboard)/clientes/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClientById } from '@/lib/clients/queries'
import { redirect, notFound } from 'next/navigation'
import { ClientTabs } from './ClientTabs'

export default async function ClientePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const client = await getClientById(params.id)
  if (!client) notFound()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a
          href="/clientes"
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          ← Clientes
        </a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            {client.name}
          </h1>
          {client.city && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {client.city}
            </p>
          )}
        </div>
      </div>
      <ClientTabs client={client} />
    </div>
  )
}
```

- [ ] **Step 2: Criar ClientTabs.tsx**

```tsx
// web/app/(dashboard)/clientes/[id]/ClientTabs.tsx
'use client'

import { useState } from 'react'
import type { Client } from '@/lib/clients/types'
import { Tab1DadosPessoais } from './tabs/Tab1DadosPessoais'
import { Tab2EquVendidos } from './tabs/Tab2EquVendidos'
import { Tab3VendaFat } from './tabs/Tab3VendaFat'
import { Tab4Vistoria } from './tabs/Tab4Vistoria'
import { Tab5Prazos } from './tabs/Tab5Prazos'
import { Tab6Anexos } from './tabs/Tab6Anexos'
import { Tab7Contrato } from './tabs/Tab7Contrato'
import { Tab8PastaCompleta } from './tabs/Tab8PastaCompleta'

const TABS = [
  { key: 'tab1', label: 'Dados Pessoais' },
  { key: 'tab2', label: 'Equ. Vendidos' },
  { key: 'tab3', label: 'Venda e Fat.' },
  { key: 'tab4', label: 'Vistoria' },
  { key: 'tab5', label: 'Prazos' },
  { key: 'tab6', label: 'Anexos' },
  { key: 'tab7', label: 'Contrato' },
  { key: 'tab8', label: 'Pasta Completa' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ClientTabs({ client }: { client: Client }) {
  const [active, setActive] = useState<TabKey>('tab1')

  function isDone(key: string) {
    return key === 'tab8' ? false : client.completed_tabs[key] === true
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab nav */}
      <div
        className="flex gap-1 px-6 py-3 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={
              active === tab.key
                ? { background: 'rgba(255,200,100,0.12)', color: '#FFD080' }
                : { color: 'rgba(255,255,255,0.40)' }
            }
          >
            {isDone(tab.key) && (
              <span style={{ color: '#10B981', fontSize: 10 }}>✓</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {active === 'tab1' && <Tab1DadosPessoais client={client} />}
        {active === 'tab2' && <Tab2EquVendidos client={client} />}
        {active === 'tab3' && <Tab3VendaFat client={client} />}
        {active === 'tab4' && <Tab4Vistoria client={client} />}
        {active === 'tab5' && <Tab5Prazos client={client} />}
        {active === 'tab6' && <Tab6Anexos client={client} />}
        {active === 'tab7' && <Tab7Contrato client={client} />}
        {active === 'tab8' && <Tab8PastaCompleta client={client} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

Erros esperados neste ponto: os 8 arquivos de tab ainda não existem. Não deve haver outros erros.

---

### Task 8: Tab1DadosPessoais

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx`

- [ ] **Step 1: Criar Tab1**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab1 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function Tab1DadosPessoais({ client }: { client: Client }) {
  const action = updateTab1.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Tipo de pessoa</label>
        <select name="type" defaultValue={client.type ?? 'pf'} style={selectStyle}>
          <option value="pf">Pessoa Física</option>
          <option value="pj">Pessoa Jurídica</option>
        </select>
      </div>

      <Input name="name" label="Nome *" defaultValue={client.name} required />
      <Input name="cpf_cnpj" label="CPF / CNPJ" defaultValue={client.cpf_cnpj ?? ''} placeholder="000.000.000-00" />
      <Input name="email" label="Email" type="email" defaultValue={client.email ?? ''} />
      <Input name="phone" label="Telefone" defaultValue={client.phone ?? ''} placeholder="(11) 99999-9999" />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input name="street" label="Rua" defaultValue={client.street ?? ''} />
        </div>
        <Input name="number" label="Número" defaultValue={client.number ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="neighborhood" label="Bairro" defaultValue={client.neighborhood ?? ''} />
        <Input name="zip" label="CEP" defaultValue={client.zip ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="city" label="Cidade" defaultValue={client.city ?? ''} />
        <Input name="state" label="Estado" defaultValue={client.state ?? ''} placeholder="SP" />
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Dados Pessoais</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 9: Tab2EquVendidos

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab2EquVendidos.tsx`

- [ ] **Step 1: Criar Tab2**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab2EquVendidos.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab2 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

const checkboxRow = (name: string, label: string, checked: boolean) => (
  <label className="flex items-center gap-2.5 cursor-pointer">
    <input
      type="checkbox"
      name={name}
      defaultChecked={checked}
      className="w-4 h-4 rounded cursor-pointer"
    />
    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{label}</span>
  </label>
)

export function Tab2EquVendidos({ client }: { client: Client }) {
  const action = updateTab2.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="promised_kwh"
          label="kWh prometido/mês"
          type="number"
          step="0.01"
          defaultValue={client.promised_kwh?.toString() ?? ''}
          placeholder="Ex: 400"
        />
        <Input
          name="system_power_kwp"
          label="Potência do sistema (kWp)"
          type="number"
          step="0.01"
          defaultValue={client.system_power_kwp?.toString() ?? ''}
          placeholder="Ex: 5.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input name="panel_brand" label="Marca do painel" defaultValue={client.panel_brand ?? ''} placeholder="Ex: Jinko" />
        <Input
          name="panel_power_w"
          label="Potência placa (W)"
          type="number"
          defaultValue={client.panel_power_w?.toString() ?? ''}
          placeholder="Ex: 550"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input name="inverter_brand" label="Marca do inversor" defaultValue={client.inverter_brand ?? ''} placeholder="Ex: Growatt" />
        <Input
          name="inverter_power_w"
          label="Potência inversor (W)"
          type="number"
          defaultValue={client.inverter_power_w?.toString() ?? ''}
          placeholder="Ex: 5000"
        />
      </div>

      <div
        className="flex flex-col gap-3 p-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {checkboxRow('specific_panels', 'Painéis específicos (marca/modelo definido)', client.specific_panels)}
        {checkboxRow('specific_inverter', 'Inversor específico (marca/modelo definido)', client.specific_inverter)}
        {checkboxRow('direct_delivery', 'Entrega direta (cliente recebe o material)', client.direct_delivery)}
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Equipamentos</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 10: Tab3VendaFat

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx`

- [ ] **Step 1: Criar Tab3 (inclui formulário dinâmico de parcelas)**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx
'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab3 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

interface Installment {
  position: number
  due_date: string
  amount: number
  notes: string
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function Tab3VendaFat({ client }: { client: Client }) {
  const action = updateTab3.bind(null, client.id)

  const initialInstallments: Installment[] = client.installments.map((inst) => ({
    position: inst.position,
    due_date: inst.due_date,
    amount: inst.amount,
    notes: inst.notes ?? '',
  }))

  const [installments, setInstallments] = useState<Installment[]>(
    initialInstallments.length > 0
      ? initialInstallments
      : [{ position: 1, due_date: '', amount: 0, notes: '' }]
  )

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('installments_json', JSON.stringify(installments))
      return action(prev, formData)
    },
    {} as ActionResult
  )

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { position: prev.length + 1, due_date: '', amount: 0, notes: '' },
    ])
  }

  function removeInstallment(idx: number) {
    setInstallments((prev) =>
      prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, position: i + 1 }))
    )
  }

  function updateInstallment(idx: number, field: keyof Installment, value: string | number) {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === idx ? { ...inst, [field]: value } : inst))
    )
  }

  const totalInstallments = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {/* Dados da venda */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          Dados da Venda
        </p>
        <Input
          name="sale_value"
          label="Valor total da venda (R$) *"
          type="number"
          step="0.01"
          min="0"
          defaultValue={client.sale?.sale_value.toString() ?? ''}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Forma de pagamento</label>
          <select name="payment_method" defaultValue={client.sale?.payment_method ?? ''} style={selectStyle}>
            <option value="">— Selecione —</option>
            <option value="financiamento">Financiamento</option>
            <option value="a_vista">À Vista</option>
            <option value="parcelado_cartao">Parcelado no Cartão</option>
            <option value="consorcio">Consórcio</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="commission_pct"
            label="Comissão (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={client.sale?.commission_pct.toString() ?? '0'}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Observações NF</label>
          <textarea
            name="nf_notes"
            defaultValue={client.sale?.nf_notes ?? ''}
            placeholder="Observações para nota fiscal..."
            rows={2}
            style={{ ...selectStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Parcelas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Parcelas
          </p>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Total: {totalInstallments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {installments.map((inst, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: idx === 0 ? '#FFD080' : 'rgba(255,255,255,0.50)' }}>
                {idx === 0 ? 'Parcela 1 (Entrada)' : `Parcela ${idx + 1}`}
              </span>
              {installments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstallment(idx)}
                  className="text-xs"
                  style={{ color: 'rgba(255,80,80,0.50)' }}
                >
                  remover
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label style={{ ...labelStyle, marginBottom: 3 }}>Vencimento</label>
                <input
                  type="date"
                  value={inst.due_date}
                  onChange={(e) => updateInstallment(idx, 'due_date', e.target.value)}
                  style={selectStyle}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ ...labelStyle, marginBottom: 3 }}>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inst.amount || ''}
                  onChange={(e) => updateInstallment(idx, 'amount', Number(e.target.value))}
                  style={selectStyle}
                  required
                />
              </div>
            </div>
            <input
              type="text"
              value={inst.notes}
              onChange={(e) => updateInstallment(idx, 'notes', e.target.value)}
              placeholder="Observação (opcional)"
              style={{ ...selectStyle, padding: '7px 12px', fontSize: 13 }}
            />
          </div>
        ))}

        <Button type="button" variant="secondary" className="self-start text-xs py-1.5" onClick={addInstallment}>
          + Adicionar parcela
        </Button>
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Venda e Faturamento</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 11: Tab4Vistoria + Tab5Prazos

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab4Vistoria.tsx`
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab5Prazos.tsx`

- [ ] **Step 1: Criar Tab4Vistoria**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab4Vistoria.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab4 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function Tab4Vistoria({ client }: { client: Client }) {
  const action = updateTab4.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" name="has_adaptation_works" defaultChecked={client.has_adaptation_works} className="w-4 h-4 rounded" />
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>Possui obras de adaptação</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Tipo de telhado</label>
          <select name="roof_type" defaultValue={client.roof_type ?? ''} style={selectStyle}>
            <option value="">— Selecione —</option>
            <option value="fibrocimento">Fibrocimento</option>
            <option value="ceramica">Cerâmica</option>
            <option value="metalica">Metálica</option>
            <option value="laje">Laje</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <Input name="roof_orientation" label="Orientação do telhado" defaultValue={client.roof_orientation ?? ''} placeholder="Ex: Norte" />
      </div>

      <Input name="maps_coordinates" label="Coordenadas Google Maps" defaultValue={client.maps_coordinates ?? ''} placeholder="-23.5505, -46.6333" />

      <div className="grid grid-cols-2 gap-3">
        <Input name="entry_breaker" label="Disjuntor de entrada" defaultValue={client.entry_breaker ?? ''} placeholder="Ex: 63A" />
        <Input name="entry_cable_mm" label="Cabo de entrada (mm²)" defaultValue={client.entry_cable_mm ?? ''} placeholder="Ex: 10mm²" />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" name="inspection_done" defaultChecked={client.inspection_done} className="w-4 h-4 rounded" />
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>Vistoria realizada</span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Observações do cliente</label>
        <textarea name="client_notes" defaultValue={client.client_notes ?? ''} placeholder="Anotações da vistoria..." rows={3}
          style={{ ...selectStyle, resize: 'vertical' }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Promessas extras</label>
        <textarea name="extra_promises" defaultValue={client.extra_promises ?? ''} placeholder="Combinados extras com o cliente..." rows={2}
          style={{ ...selectStyle, resize: 'vertical' }} />
      </div>

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>}
      <SubmitButton className="self-start">Salvar Vistoria</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Criar Tab5Prazos**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab5Prazos.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab5 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

export function Tab5Prazos({ client }: { client: Client }) {
  const action = updateTab5.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="contract_date"
          label="Data do contrato"
          type="date"
          defaultValue={client.contract_date ?? ''}
        />
        <Input
          name="contract_max_days"
          label="Prazo máximo (dias)"
          type="number"
          min="1"
          defaultValue={client.contract_max_days?.toString() ?? ''}
          placeholder="Ex: 45"
        />
      </div>
      <Input
        name="delivery_start_date"
        label="Data de início do prazo"
        type="date"
        defaultValue={client.delivery_start_date ?? ''}
      />

      {client.contract_date && client.contract_max_days && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,200,100,0.06)', border: '1px solid rgba(255,200,100,0.15)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Prazo de entrega calculado</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#FFD080' }}>
            {new Date(
              new Date(client.contract_date).getTime() + client.contract_max_days * 86400000
            ).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>}
      <SubmitButton className="self-start">Salvar Prazos</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 12: Tab6Anexos

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab6Anexos.tsx`

- [ ] **Step 1: Criar Tab6**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab6Anexos.tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { uploadAttachment, confirmTab6 } from '@/lib/clients/actions'
import { ATTACHMENT_TYPE_LABELS, ATTACHMENT_TYPES } from '@/lib/clients/types'
import type { Client } from '@/lib/clients/types'

function AttachmentRow({ client, type, label }: { client: Client; type: string; label: string }) {
  const existing = client.attachments.find((a) => a.type === type)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await uploadAttachment(client.id, type, {}, formData)
    })
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</p>
        {existing ? (
          <a
            href={existing.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs truncate block"
            style={{ color: '#3B82F6' }}
          >
            Arquivo enviado — ver →
          </a>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>Não enviado</p>
        )}
      </div>
      <form action={handleSubmit}>
        <label
          className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.60)',
          }}
        >
          <input
            type="file"
            name="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const fd = new FormData()
                fd.append('file', e.target.files[0])
                handleSubmit(fd)
                e.target.value = ''
              }
            }}
          />
          {isPending ? '...' : existing ? 'Substituir' : 'Enviar'}
        </label>
      </form>
    </div>
  )
}

export function Tab6Anexos({ client }: { client: Client }) {
  const [isPending, startTransition] = useTransition()
  const uploadedCount = ATTACHMENT_TYPES.filter((t) => client.attachments.some((a) => a.type === t)).length

  function handleConfirm() {
    startTransition(async () => {
      await confirmTab6(client.id)
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          Documentos e Fotos
        </p>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {uploadedCount}/{ATTACHMENT_TYPES.length} enviados
        </span>
      </div>

      {ATTACHMENT_TYPES.map((type) => (
        <AttachmentRow
          key={type}
          client={client}
          type={type}
          label={ATTACHMENT_TYPE_LABELS[type]}
        />
      ))}

      <div
        className="flex items-center justify-between p-3 rounded-xl mt-2"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>
          {client.completed_tabs?.tab6 ? 'Anexos confirmados ✓' : 'Marcar esta aba como concluída'}
        </p>
        <Button
          variant="secondary"
          className="text-xs py-1.5 px-3"
          onClick={handleConfirm}
          loading={isPending}
          disabled={client.completed_tabs?.tab6}
          type="button"
        >
          Confirmar Anexos
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 13: Tab7Contrato

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab7Contrato.tsx`

- [ ] **Step 1: Criar Tab7**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab7Contrato.tsx
'use client'

import { useTransition } from 'react'
import { uploadContractFile } from '@/lib/clients/actions'
import type { Client } from '@/lib/clients/types'

function UploadField({
  client,
  field,
  label,
  currentUrl,
}: {
  client: Client
  field: 'contract' | 'procuracao'
  label: string
  currentUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadContractFile(client.id, field, {}, fd)
    })
    e.target.value = ''
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>{label}</p>

      {currentUrl ? (
        <div className="flex items-center justify-between">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver arquivo enviado →
          </a>
          <label
            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
          >
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
            {isPending ? 'Enviando...' : 'Substituir'}
          </label>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 cursor-pointer py-6 rounded-xl transition-all"
          style={{
            border: '2px dashed rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
          <span className="text-sm">{isPending ? 'Enviando...' : '+ Clique para enviar (PDF, JPG ou PNG)'}</span>
        </label>
      )}
    </div>
  )
}

export function Tab7Contrato({ client }: { client: Client }) {
  const contract = client.contract

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <UploadField
        client={client}
        field="contract"
        label="Contrato assinado"
        currentUrl={contract?.contract_url ?? null}
      />

      <UploadField
        client={client}
        field="procuracao"
        label="Procuração (se aplicável)"
        currentUrl={contract?.power_of_attorney_url ?? null}
      />

      {contract?.contract_url && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}
        >
          <span style={{ color: '#10B981' }}>✓</span>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Contrato enviado — cliente liberado no módulo <strong>Contratos</strong>
          </p>
        </div>
      )}

      {!contract?.contract_url && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
          O envio do contrato libera o cliente no módulo Contratos.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 14: Tab8PastaCompleta

**Files:**
- Create: `web/app/(dashboard)/clientes/[id]/tabs/Tab8PastaCompleta.tsx`

- [ ] **Step 1: Criar Tab8 (dossier read-only)**

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab8PastaCompleta.tsx
import type { Client } from '@/lib/clients/types'
import { ATTACHMENT_TYPE_LABELS } from '@/lib/clients/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {title}
      </p>
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs flex-shrink-0 w-40" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{display}</span>
    </div>
  )
}

export function Tab8PastaCompleta({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl pb-8">
      <Section title="Dados Pessoais">
        <Row label="Tipo" value={client.type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'} />
        <Row label="Nome" value={client.name} />
        <Row label="CPF/CNPJ" value={client.cpf_cnpj} />
        <Row label="Email" value={client.email} />
        <Row label="Telefone" value={client.phone} />
        <Row label="Endereço" value={[client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', ')} />
        <Row label="CEP" value={client.zip} />
      </Section>

      <Section title="Equipamentos Vendidos">
        <Row label="kWh prometido/mês" value={client.promised_kwh} />
        <Row label="Potência do sistema" value={client.system_power_kwp ? `${client.system_power_kwp} kWp` : null} />
        <Row label="Painel" value={[client.panel_brand, client.panel_power_w ? `${client.panel_power_w}W` : null].filter(Boolean).join(' ')} />
        <Row label="Inversor" value={[client.inverter_brand, client.inverter_power_w ? `${client.inverter_power_w}W` : null].filter(Boolean).join(' ')} />
        <Row label="Painéis específicos" value={client.specific_panels} />
        <Row label="Inversor específico" value={client.specific_inverter} />
        <Row label="Entrega direta" value={client.direct_delivery} />
      </Section>

      {client.sale && (
        <Section title="Venda e Faturamento">
          <Row label="Valor da venda" value={client.sale.sale_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          <Row label="Forma de pagamento" value={client.sale.payment_method} />
          <Row label="Comissão" value={client.sale.commission_pct ? `${client.sale.commission_pct}%` : null} />
          <Row label="Obs. NF" value={client.sale.nf_notes} />
          {client.installments.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Parcelas</span>
              {client.installments
                .sort((a, b) => a.position - b.position)
                .map((inst) => (
                  <div key={inst.id} className="flex items-center gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span className="w-20">{inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`}</span>
                    <span>{new Date(inst.due_date).toLocaleDateString('pt-BR')}</span>
                    <span>{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        background: inst.status === 'confirmada' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                        color: inst.status === 'confirmada' ? '#10B981' : 'rgba(255,255,255,0.40)',
                      }}
                    >
                      {inst.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Vistoria">
        <Row label="Tipo de telhado" value={client.roof_type} />
        <Row label="Orientação" value={client.roof_orientation} />
        <Row label="Coordenadas" value={client.maps_coordinates} />
        <Row label="Disjuntor entrada" value={client.entry_breaker} />
        <Row label="Cabo entrada" value={client.entry_cable_mm} />
        <Row label="Obras de adaptação" value={client.has_adaptation_works} />
        <Row label="Vistoria feita" value={client.inspection_done} />
        <Row label="Observações" value={client.client_notes} />
        <Row label="Promessas extras" value={client.extra_promises} />
      </Section>

      <Section title="Prazos">
        <Row label="Data do contrato" value={client.contract_date ? new Date(client.contract_date).toLocaleDateString('pt-BR') : null} />
        <Row label="Prazo máximo" value={client.contract_max_days ? `${client.contract_max_days} dias` : null} />
        <Row label="Início do prazo" value={client.delivery_start_date ? new Date(client.delivery_start_date).toLocaleDateString('pt-BR') : null} />
      </Section>

      {client.attachments.length > 0 && (
        <Section title="Anexos">
          {client.attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {ATTACHMENT_TYPE_LABELS[att.type] ?? att.type}
              </span>
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
                style={{ color: '#3B82F6' }}
              >
                ver →
              </a>
            </div>
          ))}
        </Section>
      )}

      {client.contract && (
        <Section title="Contrato">
          {client.contract.contract_url && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Contrato</span>
              <a href={client.contract.contract_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#3B82F6' }}>ver →</a>
            </div>
          )}
          {client.contract.power_of_attorney_url && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Procuração</span>
              <a href={client.contract.power_of_attorney_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#3B82F6' }}>ver →</a>
            </div>
          )}
          <Row label="Assinado" value={client.contract.signed} />
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

Esperado: **zero erros** TypeScript (todos os componentes existem agora).

---

### Task 15: Verificação final e commit

- [ ] **Step 1: TypeScript check completo**

```bash
cd web && npx tsc --noEmit
```

Esperado: zero erros (erros em `database.types.ts` ou `node_modules` não contam).

- [ ] **Step 2: Verificar no browser**

```bash
cd web && npm run dev
```

Checar:
1. `http://localhost:3000/clientes` — página lista carrega (mesmo que vazia)
2. Converter um lead em cliente → redireciona para `/clientes/[id]`
3. 8 abas navegáveis com checkmarks ao salvar
4. Tab 1: preencher + salvar → checkmark verde aparece
5. Tab 3: adicionar parcelas dinamicamente → salvar
6. Tab 6: upload de arquivo → aparece link "ver →"
7. Tab 7: upload contrato → banner "liberado no módulo Contratos"
8. Tab 8: dossier exibe todos os dados salvos

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/supabase/migrations/20260618000002_clients_full.sql \
        web/next.config.mjs \
        web/lib/clients/ \
        web/lib/crm/actions.ts \
        "web/app/(dashboard)/clientes/"
git commit -m "feat: modulo Clientes com cadastro de 8 abas e uploads

- Migration: colunas extras em clients + 4 novas tabelas (sale, installments, attachments, contracts)
- Types, queries e server actions para todas as 8 abas
- Formulario dinamico de parcelas na aba Venda e Fat.
- Upload de arquivos via Supabase Storage (bucket client-files)
- Aba Contrato: upload dispara avanco de pipeline para 'contratos'
- Tab8 PastaCompleta: dossier read-only com todos os dados do cliente
- /clientes lista clientes com cadastro completo (tabs 1-6)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Notas para o implementador

**Supabase Storage:** Criar o bucket `client-files` (public) manualmente em Supabase Dashboard → Storage antes de testar uploads.

**Tabelas novas:** `client_sale`, `client_installments`, `client_attachments`, `client_contracts` não estão nos tipos gerados (`database.types.ts`). Usar `(supabase as any)` para todas as queries nessas tabelas — isso já está feito nos actions.

**Tab 6 — confirmação manual:** O usuário precisa clicar "Confirmar Anexos" para marcar tab6 como completa. Uploads individuais não marcam a aba automaticamente.

**Tab 7 — gatilho de pipeline:** Enviar o contrato (`field: 'contract'`) automaticamente avança `pipeline_stage` para `'contratos'` e marca tab7 como completa. Procuração é opcional e não dispara nenhum gatilho.

**Plano 3** cobre os módulos do pipeline: Contratos → Financeiro → Projetos → Compras → Comissões → Entrega do Material → Obra → Entrega da Obra → Pós Obra.
