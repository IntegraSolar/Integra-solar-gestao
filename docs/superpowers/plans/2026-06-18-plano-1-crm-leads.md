# CRM / Leads — Plano de Implementação (Plano 1 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CRM/Leads module with kanban + list views, configurable funnel stages, proposals per lead, notes, follow-ups, and lead-to-client conversion stub.

**Architecture:** Server Components fetch data via Supabase, Client Components handle kanban DnD and drawer interactions. Server Actions handle all mutations. A secondary migration adds missing columns to existing tables.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), @dnd-kit/core + @dnd-kit/sortable (kanban), zod (validation)

**Codebase context:**
- App directory: `web/` (all paths below are relative to repo root)
- Dashboard routes: `web/app/(dashboard)/`
- Supabase client (server): `import { createClient } from '@/lib/supabase/server'`
- Pattern for Server Actions: returns `{ error?: string; success?: string }`
- org_id obtained from: `getCurrentUserData()` in `web/lib/org/queries.ts` — field is `membership.organization.id`
- DB column naming: `organization_id` (not `org_id`), membership table is `organization_members`
- Existing RLS helper: `get_my_org_ids()` function already defined in Supabase

---

## File Structure

```
web/supabase/migrations/
  20260618000001_crm_additions.sql       NEW — adds missing columns + lead_notes table

web/lib/crm/
  types.ts                               NEW — TypeScript types for all CRM entities
  queries.ts                             NEW — server-side data fetching functions
  actions.ts                             NEW — Server Actions (CRUD for leads, stages, proposals, notes, followups)

web/components/ui/
  Drawer.tsx                             NEW — reusable right-side drawer component

web/components/crm/
  LeadsTable.tsx                         NEW — list view (table)
  KanbanBoard.tsx                        NEW — kanban view with DnD context
  KanbanColumn.tsx                       NEW — single kanban column (droppable)
  LeadCard.tsx                           NEW — lead card (draggable)
  LeadDrawer.tsx                         NEW — full lead detail/edit drawer
  LeadForm.tsx                           NEW — create/edit lead form
  NotesList.tsx                          NEW — notes tab in drawer
  FollowUpsList.tsx                      NEW — follow-ups tab in drawer
  ProposalsList.tsx                      NEW — proposals tab in drawer
  ProposalForm.tsx                       NEW — create/edit proposal form
  FunnelConfig.tsx                       NEW — funnel stages configuration

web/app/(dashboard)/leads/
  page.tsx                               NEW — server component, fetches data
  LeadsClient.tsx                        NEW — client component, toggle kanban/list

web/app/(dashboard)/leads/configurar-funil/
  page.tsx                               NEW — funnel configuration page

web/components/layout/
  Sidebar.tsx                            MODIFY — update nav items to full pipeline
```

---

### Task 1: Migration — adicionar colunas e tabela lead_notes

**Files:**
- Create: `web/supabase/migrations/20260618000001_crm_additions.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- web/supabase/migrations/20260618000001_crm_additions.sql
-- ─────────────────────────────────────────────────────────────────
-- CRM additions: missing lead columns, lead_notes, proposal tweaks
-- Apply via: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Adicionar colunas faltando em leads
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists avg_kwh numeric;
alter table public.leads add column if not exists installation_type text;
alter table public.leads add column if not exists converted boolean not null default false;
alter table public.leads add column if not exists converted_to_client_id uuid references public.clients(id) on delete set null;

-- Adicionar flags de terminal nas etapas do funil
alter table public.pipeline_stages add column if not exists is_terminal_won boolean not null default false;
alter table public.pipeline_stages add column if not exists is_terminal_lost boolean not null default false;

-- Adicionar nome e brand/model nas propostas
alter table public.proposals add column if not exists name text not null default 'Proposta';
alter table public.proposals add column if not exists panel_brand_model text;
alter table public.proposals add column if not exists inverter_brand_model text;
-- Tornar client_id nullable (proposta pode existir antes da conversão)
alter table public.proposals alter column client_id drop not null;

-- Tabela de notas de lead
create table if not exists public.lead_notes (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid references public.profiles(id) on delete set null,
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);
alter table public.lead_notes enable row level security;
create policy "lead_notes_org_isolation" on public.lead_notes for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

- [ ] **Step 2: Aplicar no Supabase**

Acessar Supabase Dashboard → SQL Editor → colar o conteúdo do arquivo → Run.
Confirmar que não há erros.

---

### Task 2: Instalar dependências de drag & drop

**Files:**
- Modify: `web/package.json` (via npm install)

- [ ] **Step 1: Instalar dnd-kit**

```bash
cd web
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verificar instalação**

```bash
cd web
npx tsc --noEmit
```
Esperado: sem erros de tipo.

---

### Task 3: TypeScript types para o módulo CRM

**Files:**
- Create: `web/lib/crm/types.ts`

- [ ] **Step 1: Criar arquivo de tipos**

```typescript
// web/lib/crm/types.ts

export type FunnelStage = {
  id: string
  organization_id: string
  name: string
  order: number
  color: string
  is_final_stage: boolean
  is_terminal_won: boolean
  is_terminal_lost: boolean
}

export type LeadSource = {
  id: string
  name: string
}

export type LeadUser = {
  id: string
  full_name: string | null
  email: string
}

export type LeadNote = {
  id: string
  lead_id: string
  content: string
  created_at: string
  created_by: string | null
  author: { full_name: string | null; email: string } | null
}

export type LeadFollowUp = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
  assigned_to_user_id: string | null
}

export type Lead = {
  id: string
  organization_id: string
  name: string
  phone: string | null
  city: string | null
  address: string | null
  avg_kwh: number | null
  installation_type: string | null
  observations: string | null
  next_action_date: string | null
  converted: boolean
  converted_to_client_id: string | null
  created_at: string
  updated_at: string
  current_stage_id: string
  assigned_to_user_id: string | null
  stage: FunnelStage | null
  assigned_user: LeadUser | null
  lead_source: LeadSource | null
  notes: LeadNote[]
  followups: LeadFollowUp[]
}

export type Supplier = {
  id: string
  name: string
}

export type Proposal = {
  id: string
  lead_id: string | null
  name: string
  panel_qty: number
  panel_power_w: number
  panel_brand_model: string | null
  inverter_qty: number
  inverter_power_w: number
  inverter_brand_model: string | null
  kit_value: number
  total_power_kwp: number
  monthly_generation_kwh: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  supplier: Supplier | null
}

export type ActionResult = {
  error?: string
  success?: string
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros.

---

### Task 4: Atualizar Sidebar com os 13 módulos do pipeline

**Files:**
- Modify: `web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Substituir NAV_ITEMS**

Abrir `web/components/layout/Sidebar.tsx` e substituir o array `NAV_ITEMS` (linhas 15-26) por:

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',          href: '/dashboard',          icon: '▣' },
  { label: 'CRM / Leads',        href: '/leads',              icon: '⟳' },
  { label: 'Clientes',           href: '/clientes',           icon: '👤' },
  { label: 'Contratos',          href: '/contratos',          icon: '📋' },
  { label: 'Financeiro',         href: '/financeiro',         icon: '💰' },
  { label: 'Projetos',           href: '/projetos',           icon: '📐' },
  { label: 'Compras',            href: '/compras',            icon: '🛒' },
  { label: 'Comissões',          href: '/comissoes',          icon: '💵' },
  { label: 'Entrega do Material', href: '/entrega-material',  icon: '📦' },
  { label: 'Obra',               href: '/obra',               icon: '🔧' },
  { label: 'Entrega da Obra',    href: '/entrega-obra',       icon: '✅' },
  { label: 'Pós Obra',           href: '/pos-obra',           icon: '⭐' },
  { label: 'Configurações',      href: '/configuracoes',      icon: '⚙' },
]
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros. Abrir http://localhost:3000 e confirmar que a sidebar mostra os 13 itens.

---

### Task 5: CRM queries (busca de dados no servidor)

**Files:**
- Create: `web/lib/crm/queries.ts`

- [ ] **Step 1: Criar queries**

```typescript
// web/lib/crm/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { Lead, FunnelStage, LeadSource, Proposal, Supplier } from './types'

export async function getFunnelStages(): Promise<FunnelStage[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', user.membership.organization.id)
    .order('order', { ascending: true })
  return (data as FunnelStage[]) ?? []
}

export async function getLeadSources(): Promise<LeadSource[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('lead_sources')
    .select('id, name')
    .eq('organization_id', user.membership.organization.id)
    .order('name')
  return data ?? []
}

export async function getOrgMembers() {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, profiles:profiles(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return (data ?? []).map((m: any) => m.profiles).filter(Boolean)
}

export async function getLeads(): Promise<Lead[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select(`
      *,
      stage:pipeline_stages(id, name, color, is_terminal_won, is_terminal_lost, is_final_stage, order),
      assigned_user:profiles!assigned_to_user_id(id, full_name, email),
      lead_source:lead_sources(id, name),
      notes:lead_notes(id, content, created_at, created_by, author:profiles!created_by(full_name, email)),
      followups:tasks!related_to_lead_id(id, title, description, due_date, completed_at, assigned_to_user_id)
    `)
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
  return (data as Lead[]) ?? []
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select(`
      *,
      stage:pipeline_stages(id, name, color, is_terminal_won, is_terminal_lost, is_final_stage, order),
      assigned_user:profiles!assigned_to_user_id(id, full_name, email),
      lead_source:lead_sources(id, name),
      notes:lead_notes(id, content, created_at, created_by, author:profiles!created_by(full_name, email)),
      followups:tasks!related_to_lead_id(id, title, description, due_date, completed_at, assigned_to_user_id)
    `)
    .eq('id', id)
    .single()
  return (data as Lead | null)
}

export async function getProposalsByLead(leadId: string): Promise<Proposal[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('proposals')
    .select(`*, supplier:suppliers(id, name)`)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  return (data as Proposal[]) ?? []
}

export async function getSuppliers(): Promise<Supplier[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('organization_id', user.membership.organization.id)
    .order('name')
  return data ?? []
}

// Retorna fator de geração da org (padrão 1.0 se não configurado)
export async function getGenerationFactor(): Promise<number> {
  const user = await getCurrentUserData()
  if (!user?.membership) return 1.0
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_settings')
    .select('setting_value')
    .eq('organization_id', user.membership.organization.id)
    .eq('setting_key', 'generation_factor')
    .single()
  return (data?.setting_value as number) ?? 1.0
}

// Cria etapas padrão se a org não tiver nenhuma
export async function ensureDefaultStages(orgId: string): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('pipeline_stages')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (count && count > 0) return
  const defaults = [
    { name: 'Novo', order: 1, color: '#6B7A90' },
    { name: 'Em contato', order: 2, color: '#3B82F6' },
    { name: 'Visita agendada', order: 3, color: '#8B5CF6' },
    { name: 'Proposta enviada', order: 4, color: '#F59E0B' },
    { name: 'Fechado', order: 5, color: '#10B981', is_terminal_won: true },
    { name: 'Perdido', order: 6, color: '#EF4444', is_terminal_lost: true },
  ]
  await supabase.from('pipeline_stages').insert(
    defaults.map((d) => ({ ...d, organization_id: orgId }))
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros.

---

### Task 6: CRM Server Actions

**Files:**
- Create: `web/lib/crm/actions.ts`

- [ ] **Step 1: Criar actions**

```typescript
// web/lib/crm/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from './types'

// ── Helpers ───────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ── Lead Actions ──────────────────────────────────────────────────

const leadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  avg_kwh: z.coerce.number().optional(),
  installation_type: z.string().optional(),
  observations: z.string().optional(),
  current_stage_id: z.string().uuid('Etapa inválida'),
  assigned_to_user_id: z.string().uuid().optional().or(z.literal('')),
  lead_source_id: z.string().uuid().optional().or(z.literal('')),
  next_action_date: z.string().optional(),
})

export async function createLead(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const orgId = await getOrgId()
  const userId = await getUserId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { assigned_to_user_id, lead_source_id, avg_kwh, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('leads').insert({
    ...rest,
    avg_kwh: avg_kwh ?? null,
    assigned_to_user_id: assigned_to_user_id || null,
    lead_source_id: lead_source_id || null,
    organization_id: orgId,
    created_by: userId,
  })

  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Lead criado.' }
}

export async function updateLead(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { assigned_to_user_id, lead_source_id, avg_kwh, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('leads').update({
    ...rest,
    avg_kwh: avg_kwh ?? null,
    assigned_to_user_id: assigned_to_user_id || null,
    lead_source_id: lead_source_id || null,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId)

  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Lead atualizado.' }
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Lead excluído.' }
}

export async function moveLeadStage(leadId: string, stageId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ current_stage_id: stageId, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa atualizada.' }
}

// ── Note Actions ──────────────────────────────────────────────────

export async function createNote(leadId: string, content: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  const userId = await getUserId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!content.trim()) return { error: 'Anotação não pode ser vazia.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lead_notes').insert({
    lead_id: leadId,
    organization_id: orgId,
    created_by: userId,
    content: content.trim(),
  })
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Anotação salva.' }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Anotação excluída.' }
}

// ── Follow-up Actions ─────────────────────────────────────────────

const followUpSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_date: z.string().min(1, 'Data é obrigatória'),
})

export async function createFollowUp(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  const userId = await getUserId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = followUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({
    organization_id: orgId,
    related_to_lead_id: leadId,
    assigned_to_user_id: userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_date: parsed.data.due_date,
  })
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Follow-up agendado.' }
}

export async function toggleFollowUp(taskId: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Follow-up atualizado.' }
}

// ── Proposal Actions ──────────────────────────────────────────────

const proposalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  panel_qty: z.coerce.number().min(0),
  panel_power_w: z.coerce.number().min(0),
  panel_brand_model: z.string().optional(),
  inverter_qty: z.coerce.number().min(0),
  inverter_power_w: z.coerce.number().min(0),
  inverter_brand_model: z.string().optional(),
  kit_value: z.coerce.number().min(0),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  total_power_kwp: z.coerce.number().min(0),
  monthly_generation_kwh: z.coerce.number().min(0),
})

export async function createProposal(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  const userId = await getUserId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = proposalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { supplier_id, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('proposals').insert({
    ...rest,
    supplier_id: supplier_id || null,
    lead_id: leadId,
    organization_id: orgId,
    created_by_user_id: userId,
    total_modules: rest.panel_qty,
    module_power_wp: rest.panel_power_w,
    total_inverters: rest.inverter_qty,
    final_value: rest.kit_value,
  })
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Proposta criada.' }
}

export async function deleteProposal(proposalId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('proposals').delete().eq('id', proposalId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Proposta excluída.' }
}

// ── Funnel Stage Actions ──────────────────────────────────────────

export async function createFunnelStage(name: string, order: number): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase.from('pipeline_stages').insert({
    organization_id: orgId,
    name,
    order,
    color: '#6B7A90',
  })
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa criada.' }
}

export async function updateFunnelStage(
  stageId: string,
  updates: { name?: string; color?: string; order?: number; is_terminal_won?: boolean; is_terminal_lost?: boolean }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('pipeline_stages').update(updates).eq('id', stageId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa atualizada.' }
}

export async function deleteFunnelStage(stageId: string, moveTo: string): Promise<ActionResult> {
  const supabase = await createClient()
  // Move leads para outra etapa antes de excluir
  await supabase.from('leads').update({ current_stage_id: moveTo }).eq('current_stage_id', stageId)
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa excluída.' }
}

export async function reorderFunnelStages(stages: { id: string; order: number }[]): Promise<ActionResult> {
  const supabase = await createClient()
  for (const s of stages) {
    await supabase.from('pipeline_stages').update({ order: s.order }).eq('id', s.id)
  }
  revalidatePath('/leads')
  return { success: 'Ordem salva.' }
}

// ── Convert Lead to Client ────────────────────────────────────────

export async function convertLeadToClient(leadId: string): Promise<{ clientId?: string; error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()

  // Buscar dados do lead
  const { data: lead } = await supabase
    .from('leads')
    .select('name, phone, city, address')
    .eq('id', leadId)
    .single()

  if (!lead) return { error: 'Lead não encontrado.' }

  // Criar cliente básico
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      organization_id: orgId,
      name: lead.name,
      phone: lead.phone,
      city: lead.city,
      street: lead.address ?? null,
    })
    .select('id')
    .single()

  if (clientError || !client) return { error: clientError?.message ?? 'Erro ao criar cliente.' }

  // Marcar lead como convertido
  await supabase.from('leads').update({
    converted: true,
    converted_to_client_id: client.id,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId)

  revalidatePath('/leads')
  redirect(`/clientes/${client.id}`)
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros.

---

### Task 7: Componente Drawer (reutilizável)

**Files:**
- Create: `web/components/ui/Drawer.tsx`

- [ ] **Step 1: Criar Drawer**

```tsx
// web/components/ui/Drawer.tsx
'use client'

import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: number
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, width = 520, children }: DrawerProps) {
  // Fechar com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.40)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width,
          background: 'rgba(15,30,55,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {title && (
            <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 8: Página /leads — server component

**Files:**
- Create: `web/app/(dashboard)/leads/page.tsx`
- Create: `web/app/(dashboard)/leads/LeadsClient.tsx`

- [ ] **Step 1: Criar page.tsx (server component)**

```tsx
// web/app/(dashboard)/leads/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getLeads, getFunnelStages, getLeadSources, getOrgMembers, ensureDefaultStages } from '@/lib/crm/queries'
import { redirect } from 'next/navigation'
import { LeadsClient } from './LeadsClient'

export default async function LeadsPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  await ensureDefaultStages(user.membership.organization.id)

  const [leads, stages, sources, members] = await Promise.all([
    getLeads(),
    getFunnelStages(),
    getLeadSources(),
    getOrgMembers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            CRM / Leads
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {leads.length} leads
          </p>
        </div>
      </div>

      <LeadsClient
        initialLeads={leads}
        stages={stages}
        sources={sources}
        members={members}
      />
    </div>
  )
}
```

- [ ] **Step 2: Criar LeadsClient.tsx**

```tsx
// web/app/(dashboard)/leads/LeadsClient.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Lead, FunnelStage, LeadSource, LeadUser } from '@/lib/crm/types'
import { LeadsTable } from '@/components/crm/LeadsTable'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { LeadDrawer } from '@/components/crm/LeadDrawer'
import { Button } from '@/components/ui/Button'

interface LeadsClientProps {
  initialLeads: Lead[]
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
}

export function LeadsClient({ initialLeads, stages, sources, members }: LeadsClientProps) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Toggle kanban/list */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {(['kanban', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={
                view === v
                  ? { background: 'rgba(255,200,100,0.15)', color: '#FFD080' }
                  : { color: 'rgba(255,255,255,0.40)' }
              }
            >
              {v === 'kanban' ? '⊞ Kanban' : '☰ Lista'}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Link href="/leads/configurar-funil">
          <Button variant="secondary" className="text-xs py-1.5 px-3">
            ⚙ Configurar funil
          </Button>
        </Link>

        <Button
          className="text-xs py-1.5 px-3"
          onClick={() => setCreatingNew(true)}
        >
          + Novo Lead
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <KanbanBoard
            leads={initialLeads}
            stages={stages}
            onLeadClick={setSelectedLead}
          />
        ) : (
          <LeadsTable
            leads={initialLeads}
            onLeadClick={setSelectedLead}
          />
        )}
      </div>

      {/* Lead drawer */}
      <LeadDrawer
        lead={selectedLead}
        isNew={creatingNew}
        stages={stages}
        sources={sources}
        members={members}
        onClose={() => {
          setSelectedLead(null)
          setCreatingNew(false)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 9: LeadsTable — visualização em lista

**Files:**
- Create: `web/components/crm/LeadsTable.tsx`

- [ ] **Step 1: Criar tabela**

```tsx
// web/components/crm/LeadsTable.tsx
'use client'

import type { Lead } from '@/lib/crm/types'

interface LeadsTableProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function LeadsTable({ leads, onLeadClick }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Nenhum lead cadastrado ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full px-6 py-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['Nome', 'Telefone', 'Cidade', 'Etapa', 'Responsável', 'Criado em'].map((h) => (
              <th
                key={h}
                className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              className="cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background =
                  'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
              }}
            >
              <td className="py-2.5 px-3 font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {lead.name}
              </td>
              <td className="py-2.5 px-3" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {lead.phone ?? '—'}
              </td>
              <td className="py-2.5 px-3" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {lead.city ?? '—'}
              </td>
              <td className="py-2.5 px-3">
                {lead.stage ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: `${lead.stage.color}25`,
                      color: lead.stage.color,
                      border: `1px solid ${lead.stage.color}40`,
                    }}
                  >
                    {lead.stage.name}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-2.5 px-3" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {lead.assigned_user?.full_name ?? lead.assigned_user?.email ?? '—'}
              </td>
              <td className="py-2.5 px-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

### Task 10: KanbanBoard — visualização kanban com drag & drop

**Files:**
- Create: `web/components/crm/KanbanBoard.tsx`
- Create: `web/components/crm/KanbanColumn.tsx`
- Create: `web/components/crm/LeadCard.tsx`

- [ ] **Step 1: Criar LeadCard**

```tsx
// web/components/crm/LeadCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/lib/crm/types'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(lead)}
      className="rounded-xl p-3 cursor-pointer mb-2 transition-all"
    >
      <div
        className="rounded-xl p-3 cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={() => onClick(lead)}
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {lead.name}
        </p>
        {lead.city && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
            📍 {lead.city}
          </p>
        )}
        {lead.phone && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
            📞 {lead.phone}
          </p>
        )}
        {lead.assigned_user && (
          <p className="text-xs mt-1.5" style={{ color: 'rgba(255,200,100,0.60)' }}>
            👤 {lead.assigned_user.full_name ?? lead.assigned_user.email}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar KanbanColumn**

```tsx
// web/components/crm/KanbanColumn.tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead, FunnelStage } from '@/lib/crm/types'
import { LeadCard } from './LeadCard'

interface KanbanColumnProps {
  stage: FunnelStage
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="flex flex-col flex-shrink-0 w-64">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: stage.color }}
        />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {stage.name}
        </span>
        <span
          className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.40)' }}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-xl p-2 min-h-32 transition-colors"
        style={{
          background: isOver ? 'rgba(255,200,100,0.05)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isOver ? 'rgba(255,200,100,0.20)' : 'rgba(255,255,255,0.05)'}`,
        }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar KanbanBoard**

```tsx
// web/components/crm/KanbanBoard.tsx
'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Lead, FunnelStage } from '@/lib/crm/types'
import { KanbanColumn } from './KanbanColumn'
import { moveLeadStage } from '@/lib/crm/actions'

interface KanbanBoardProps {
  leads: Lead[]
  stages: FunnelStage[]
  onLeadClick: (lead: Lead) => void
}

export function KanbanBoard({ leads: initialLeads, stages, onLeadClick }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getLeadsForStage(stageId: string) {
    return leads.filter((l) => l.current_stage_id === stageId)
  }

  function handleDragStart({ active }: { active: { id: string } }) {
    setActiveLead(leads.find((l) => l.id === active.id) ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const overId = over.id as string
    // over pode ser um lead (sortable) ou uma coluna (droppable)
    const overStage = stages.find((s) => s.id === overId)
    const overLead = leads.find((l) => l.id === overId)
    const targetStageId = overStage?.id ?? overLead?.current_stage_id

    if (!targetStageId) return
    const activeId = active.id as string
    setLeads((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, current_stage_id: targetStageId } : l))
    )
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLead(null)
    if (!over) return
    const overId = over.id as string
    const overStage = stages.find((s) => s.id === overId)
    const overLead = leads.find((l) => l.id === overId)
    const targetStageId = overStage?.id ?? overLead?.current_stage_id
    if (!targetStageId) return
    await moveLeadStage(active.id as string, targetStageId)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto h-full p-6 pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={getLeadsForStage(stage.id)}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <div
            className="rounded-xl p-3 w-60 rotate-2"
            style={{
              background: 'rgba(15,30,55,0.97)',
              border: '1px solid rgba(255,200,100,0.30)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {activeLead.name}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 4: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros de tipo.

---

### Task 11: LeadDrawer — drawer de detalhes/edição

**Files:**
- Create: `web/components/crm/LeadDrawer.tsx`
- Create: `web/components/crm/LeadForm.tsx`

- [ ] **Step 1: Criar LeadForm**

```tsx
// web/components/crm/LeadForm.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { Lead, FunnelStage, LeadSource, LeadUser, ActionResult } from '@/lib/crm/types'
import { createLead, updateLead } from '@/lib/crm/actions'

interface LeadFormProps {
  lead?: Lead
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
  onSuccess?: () => void
}

export function LeadForm({ lead, stages, sources, members, onSuccess }: LeadFormProps) {
  const action = lead
    ? updateLead.bind(null, lead.id)
    : createLead

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData)
      if (result.success && onSuccess) onSuccess()
      return result
    },
    {}
  )

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        name="name"
        label="Nome *"
        defaultValue={lead?.name}
        placeholder="Nome do lead"
        required
      />
      <Input
        name="phone"
        label="Telefone"
        defaultValue={lead?.phone ?? ''}
        placeholder="(11) 99999-9999"
      />
      <Input
        name="city"
        label="Cidade"
        defaultValue={lead?.city ?? ''}
        placeholder="Cidade"
      />
      <Input
        name="address"
        label="Endereço"
        defaultValue={lead?.address ?? ''}
        placeholder="Rua, número"
      />
      <Input
        name="avg_kwh"
        label="Consumo médio (kWh/mês)"
        type="number"
        defaultValue={lead?.avg_kwh?.toString() ?? ''}
        placeholder="Ex: 350"
      />
      <Input
        name="installation_type"
        label="Tipo de instalação"
        defaultValue={lead?.installation_type ?? ''}
        placeholder="Ex: Residencial, Comercial"
      />

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Etapa do funil *</label>
        <select name="current_stage_id" defaultValue={lead?.current_stage_id ?? stages[0]?.id} style={selectStyle} required>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Responsável</label>
        <select name="assigned_to_user_id" defaultValue={lead?.assigned_to_user_id ?? ''} style={selectStyle}>
          <option value="">— Nenhum —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Origem do lead</label>
        <select name="lead_source_id" defaultValue={lead?.lead_source?.id ?? ''} style={selectStyle}>
          <option value="">— Nenhuma —</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <Input
        name="next_action_date"
        label="Data da próxima ação"
        type="date"
        defaultValue={lead?.next_action_date ?? ''}
      />

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Observações</label>
        <textarea
          name="observations"
          defaultValue={lead?.observations ?? ''}
          placeholder="Observações sobre o lead..."
          rows={3}
          style={{
            ...selectStyle,
            resize: 'vertical',
          }}
        />
      </div>

      <FormError message={state?.error} />

      <div className="flex gap-2 mt-2">
        <SubmitButton className="flex-1">
          {lead ? 'Salvar alterações' : 'Criar lead'}
        </SubmitButton>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Criar LeadDrawer**

```tsx
// web/components/crm/LeadDrawer.tsx
'use client'

import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { LeadForm } from './LeadForm'
import { NotesList } from './NotesList'
import { FollowUpsList } from './FollowUpsList'
import { ProposalsList } from './ProposalsList'
import { deleteLead, convertLeadToClient } from '@/lib/crm/actions'
import type { Lead, FunnelStage, LeadSource, LeadUser } from '@/lib/crm/types'

type Tab = 'dados' | 'notas' | 'followups' | 'propostas'

interface LeadDrawerProps {
  lead: Lead | null
  isNew: boolean
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
  onClose: () => void
}

export function LeadDrawer({ lead, isNew, stages, sources, members, onClose }: LeadDrawerProps) {
  const [tab, setTab] = useState<Tab>('dados')
  const [converting, setConverting] = useState(false)

  const isOpen = !!lead || isNew
  const title = isNew ? 'Novo Lead' : (lead?.name ?? '')

  async function handleDelete() {
    if (!lead) return
    if (!confirm(`Excluir "${lead.name}"?`)) return
    await deleteLead(lead.id)
    onClose()
  }

  async function handleConvert() {
    if (!lead) return
    setConverting(true)
    await convertLeadToClient(lead.id)
    // redirect happens inside convertLeadToClient
    setConverting(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados' },
    { key: 'notas', label: 'Notas' },
    { key: 'followups', label: 'Follow-ups' },
    { key: 'propostas', label: 'Propostas' },
  ]

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} width={540}>
      {!isNew && lead && (
        <>
          {/* Tabs */}
          <div
            className="flex gap-1 mb-5 -mx-5 px-5 pb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  tab === t.key
                    ? { background: 'rgba(255,200,100,0.12)', color: '#FFD080' }
                    : { color: 'rgba(255,255,255,0.40)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'dados' && (
            <>
              <LeadForm
                lead={lead}
                stages={stages}
                sources={sources}
                members={members}
                onSuccess={onClose}
              />
              <div
                className="mt-5 pt-4 flex gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                {!lead.converted && (
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={handleConvert}
                    loading={converting}
                  >
                    Converter em Cliente
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-xs"
                  style={{ color: '#FF6060' }}
                  onClick={handleDelete}
                >
                  Excluir
                </Button>
              </div>
            </>
          )}

          {tab === 'notas' && <NotesList lead={lead} />}
          {tab === 'followups' && <FollowUpsList lead={lead} />}
          {tab === 'propostas' && <ProposalsList lead={lead} />}
        </>
      )}

      {isNew && (
        <LeadForm
          stages={stages}
          sources={sources}
          members={members}
          onSuccess={onClose}
        />
      )}
    </Drawer>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 12: NotesList e FollowUpsList

**Files:**
- Create: `web/components/crm/NotesList.tsx`
- Create: `web/components/crm/FollowUpsList.tsx`

- [ ] **Step 1: Criar NotesList**

```tsx
// web/components/crm/NotesList.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { createNote, deleteNote } from '@/lib/crm/actions'
import type { Lead } from '@/lib/crm/types'

export function NotesList({ lead }: { lead: Lead }) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!content.trim()) return
    startTransition(async () => {
      await createNote(lead.id, content)
      setContent('')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nova anotação..."
          rows={3}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#E0E8F0',
          }}
        />
        <Button
          className="self-end text-xs py-1.5 px-4"
          onClick={handleAdd}
          loading={isPending}
          disabled={!content.trim()}
        >
          Adicionar nota
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {lead.notes.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Nenhuma anotação ainda.
          </p>
        )}
        {[...lead.notes].reverse().map((note) => (
          <div
            key={note.id}
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.80)' }}>{note.content}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {note.author?.full_name ?? 'Usuário'} · {new Date(note.created_at).toLocaleString('pt-BR')}
              </p>
              <button
                onClick={() => startTransition(() => deleteNote(note.id))}
                className="text-xs transition-colors"
                style={{ color: 'rgba(255,80,80,0.50)' }}
              >
                excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar FollowUpsList**

```tsx
// web/components/crm/FollowUpsList.tsx
'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { createFollowUp, toggleFollowUp } from '@/lib/crm/actions'
import type { Lead } from '@/lib/crm/types'

export function FollowUpsList({ lead }: { lead: Lead }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const boundCreate = createFollowUp.bind(null, lead.id)
  const [state, formAction] = useFormState(
    async (prev: any, formData: FormData) => {
      const result = await boundCreate(prev, formData)
      if (result.success) setShowForm(false)
      return result
    },
    {}
  )

  const pending = lead.followups.filter((f) => !f.completed_at)
  const done = lead.followups.filter((f) => !!f.completed_at)

  return (
    <div className="flex flex-col gap-4">
      {!showForm ? (
        <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
          + Agendar follow-up
        </Button>
      ) : (
        <form action={formAction} className="flex flex-col gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Input name="title" label="Título *" placeholder="Ex: Ligar para o cliente" required />
          <Input name="description" label="Descrição" placeholder="Detalhes..." />
          <Input name="due_date" label="Data *" type="datetime-local" required />
          <FormError message={state?.error} />
          <div className="flex gap-2">
            <SubmitButton className="flex-1 text-xs">Agendar</SubmitButton>
            <Button variant="ghost" className="text-xs" onClick={() => setShowForm(false)} type="button">Cancelar</Button>
          </div>
        </form>
      )}

      {pending.length === 0 && done.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Nenhum follow-up agendado.
        </p>
      )}

      {pending.map((f) => (
        <div key={f.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <input
            type="checkbox"
            checked={false}
            onChange={() => startTransition(() => toggleFollowUp(f.id, true))}
            className="mt-0.5 cursor-pointer"
            disabled={isPending}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>{f.title}</p>
            {f.description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{f.description}</p>}
            {f.due_date && (
              <p className="text-xs mt-1" style={{ color: '#FFD080' }}>
                📅 {new Date(f.due_date).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.25)' }}>Concluídos</p>
          {done.map((f) => (
            <div key={f.id} className="flex items-start gap-3 p-3 rounded-xl opacity-50" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <input
                type="checkbox"
                checked
                onChange={() => startTransition(() => toggleFollowUp(f.id, false))}
                className="mt-0.5 cursor-pointer"
              />
              <p className="text-sm line-through" style={{ color: 'rgba(255,255,255,0.50)' }}>{f.title}</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 13: ProposalsList e ProposalForm

**Files:**
- Create: `web/app/api/leads/[id]/proposals/route.ts`
- Create: `web/components/crm/ProposalsList.tsx`
- Create: `web/components/crm/ProposalForm.tsx`

- [ ] **Step 1: Criar Route Handler para buscar propostas e dados de suporte**

`ProposalsList` é um Client Component e não pode chamar funções server-only diretamente. Criar um Route Handler para isso:

```typescript
// web/app/api/leads/[id]/proposals/route.ts
import { NextResponse } from 'next/server'
import { getProposalsByLead, getSuppliers, getGenerationFactor } from '@/lib/crm/queries'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [proposals, suppliers, generationFactor] = await Promise.all([
    getProposalsByLead(params.id),
    getSuppliers(),
    getGenerationFactor(),
  ])
  return NextResponse.json({ proposals, suppliers, generationFactor })
}
```

- [ ] **Step 2: Criar ProposalForm**

```tsx
// web/components/crm/ProposalForm.tsx
'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Button } from '@/components/ui/Button'
import { createProposal } from '@/lib/crm/actions'
import type { Supplier, ActionResult } from '@/lib/crm/types'

interface ProposalFormProps {
  leadId: string
  suppliers: Supplier[]
  generationFactor: number
  onSuccess: () => void
  onCancel: () => void
}

export function ProposalForm({ leadId, suppliers, generationFactor, onSuccess, onCancel }: ProposalFormProps) {
  const [panelQty, setPanelQty] = useState(0)
  const [panelPower, setPanelPower] = useState(0)

  const systemKwp = (panelQty * panelPower) / 1000
  const monthlyGen = systemKwp * generationFactor

  const boundAction = createProposal.bind(null, leadId)
  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      // inject calculated fields
      formData.set('total_power_kwp', systemKwp.toFixed(3))
      formData.set('monthly_generation_kwh', monthlyGen.toFixed(1))
      const result = await boundAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    {}
  )

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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input name="name" label="Nome da proposta *" placeholder="Ex: Proposta Residencial 5kWp" required />

      <div className="grid grid-cols-2 gap-3">
        <Input name="panel_qty" label="Qtd. painéis" type="number" min="0" value={panelQty}
          onChange={(e) => setPanelQty(Number(e.target.value))} />
        <Input name="panel_power_w" label="Potência placa (W)" type="number" min="0" value={panelPower}
          onChange={(e) => setPanelPower(Number(e.target.value))} />
      </div>
      <Input name="panel_brand_model" label="Marca/Modelo do painel" placeholder="Ex: Jinko 550W" />

      <div className="grid grid-cols-2 gap-3">
        <Input name="inverter_qty" label="Qtd. inversores" type="number" min="0" defaultValue="1" />
        <Input name="inverter_power_w" label="Potência inversor (W)" type="number" min="0" />
      </div>
      <Input name="inverter_brand_model" label="Marca/Modelo do inversor" placeholder="Ex: Growatt 5kW" />

      <Input name="kit_value" label="Valor do kit (R$)" type="number" min="0" step="0.01" />

      <div className="flex flex-col gap-1.5">
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.40)', marginBottom: 4, display: 'block' }}>
          Fornecedor
        </label>
        <select name="supplier_id" style={selectStyle}>
          <option value="">— Nenhum —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Calculated fields (read-only preview) */}
      <div
        className="rounded-xl p-3 grid grid-cols-2 gap-3"
        style={{ background: 'rgba(255,200,100,0.06)', border: '1px solid rgba(255,200,100,0.15)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Potência do sistema</p>
          <p className="text-sm font-semibold" style={{ color: '#FFD080' }}>{systemKwp.toFixed(2)} kWp</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Geração média/mês</p>
          <p className="text-sm font-semibold" style={{ color: '#FFD080' }}>{monthlyGen.toFixed(0)} kWh</p>
        </div>
      </div>

      <FormError message={state?.error} />
      <div className="flex gap-2">
        <SubmitButton className="flex-1 text-xs">Criar proposta</SubmitButton>
        <Button variant="ghost" className="text-xs" onClick={onCancel} type="button">Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Criar ProposalsList** (usa o Route Handler criado no Step 1)

```tsx
// web/components/crm/ProposalsList.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ProposalForm } from './ProposalForm'
import { deleteProposal } from '@/lib/crm/actions'
import type { Lead, Proposal, Supplier } from '@/lib/crm/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'rgba(255,255,255,0.40)',
  sent: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: 'rgba(255,255,255,0.25)',
}

export function ProposalsList({ lead }: { lead: Lead }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [generationFactor, setGenerationFactor] = useState(1.0)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/proposals`)
      .then((r) => r.json())
      .then(({ proposals, suppliers, generationFactor }) => {
        setProposals(proposals)
        setSuppliers(suppliers)
        setGenerationFactor(generationFactor)
      })
  }, [lead.id])

  function handleDelete(id: string) {
    if (!confirm('Excluir proposta?')) return
    startTransition(async () => {
      await deleteProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {!showForm ? (
        <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
          + Nova Proposta
        </Button>
      ) : (
        <ProposalForm
          leadId={lead.id}
          suppliers={suppliers}
          generationFactor={generationFactor}
          onSuccess={() => {
            setShowForm(false)
            fetch(`/api/leads/${lead.id}/proposals`)
              .then((r) => r.json())
              .then(({ proposals }) => setProposals(proposals))
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {proposals.length === 0 && !showForm && (
        <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Nenhuma proposta criada ainda.
        </p>
      )}

      {proposals.map((p) => (
        <div
          key={p.id}
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.name}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status], border: `1px solid ${STATUS_COLORS[p.status]}40` }}
            >
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sistema</p>
              <p className="text-sm font-medium" style={{ color: '#FFD080' }}>{p.total_power_kwp.toFixed(2)} kWp</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Geração/mês</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>{p.monthly_generation_kwh.toFixed(0)} kWh</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Valor kit</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {p.kit_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          {p.supplier && (
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Fornecedor: {p.supplier.name}</p>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => handleDelete(p.id)}
              disabled={isPending}
              className="text-xs"
              style={{ color: 'rgba(255,80,80,0.50)' }}
            >
              excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

```bash
cd web && npx tsc --noEmit
```

---

### Task 14: Configuração do funil (/leads/configurar-funil)

**Files:**
- Create: `web/components/crm/FunnelConfig.tsx`
- Create: `web/app/(dashboard)/leads/configurar-funil/page.tsx`

- [ ] **Step 1: Criar FunnelConfig**

```tsx
// web/components/crm/FunnelConfig.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  createFunnelStage,
  updateFunnelStage,
  deleteFunnelStage,
  reorderFunnelStages,
} from '@/lib/crm/actions'
import type { FunnelStage } from '@/lib/crm/types'

const COLORS = ['#6B7A90', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#14B8A6']

function StageRow({ stage, stages, onUpdate }: { stage: FunnelStage; stages: FunnelStage[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)
  const [isPending, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  function save() {
    startTransition(async () => {
      await updateFunnelStage(stage.id, { name, color })
      setEditing(false)
      onUpdate()
    })
  }

  function handleDelete() {
    const others = stages.filter((s) => s.id !== stage.id)
    if (others.length === 0) { alert('Não é possível excluir a única etapa.'); return }
    const moveTo = others[0].id
    if (!confirm(`Excluir "${stage.name}"? Os leads serão movidos para "${others[0].name}".`)) return
    startTransition(async () => {
      await deleteFunnelStage(stage.id, moveTo)
      onUpdate()
    })
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-xl mb-2" css-note="stage row">
      <div
        >
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-sm flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          ⠿
        </span>

        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: stage.color }}
        />

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#E0E8F0' }}
            />
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <Button className="text-xs py-1 px-2" onClick={save} loading={isPending}>Salvar</Button>
            <Button variant="ghost" className="text-xs py-1 px-2" onClick={() => setEditing(false)}>×</Button>
          </div>
        ) : (
          <span className="flex-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{stage.name}</span>
        )}

        {!editing && (
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setEditing(true)} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>editar</button>
            <button onClick={handleDelete} disabled={isPending} className="text-xs" style={{ color: 'rgba(255,80,80,0.50)' }}>excluir</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function FunnelConfig({ initialStages }: { initialStages: FunnelStage[] }) {
  const [stages, setStages] = useState(initialStages)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [version, setVersion] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function refresh() { setVersion((v) => v + 1) }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIdx = stages.findIndex((s) => s.id === active.id)
    const newIdx = stages.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(stages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 }))
    setStages(reordered)
    startTransition(async () => {
      await reorderFunnelStages(reordered.map((s) => ({ id: s.id, order: s.order })))
    })
  }

  function addStage() {
    if (!newName.trim()) return
    startTransition(async () => {
      await createFunnelStage(newName.trim(), stages.length + 1)
      setNewName('')
      refresh()
    })
  }

  return (
    <div className="max-w-lg">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {stages.map((stage) => (
            <StageRow key={`${stage.id}-${version}`} stage={stage} stages={stages} onUpdate={refresh} />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da nova etapa..."
          onKeyDown={(e) => e.key === 'Enter' && addStage()}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#E0E8F0',
          }}
        />
        <Button className="text-xs px-4" onClick={addStage} loading={isPending}>
          + Adicionar
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar página configurar-funil**

```tsx
// web/app/(dashboard)/leads/configurar-funil/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getFunnelStages } from '@/lib/crm/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FunnelConfig } from '@/components/crm/FunnelConfig'

export default async function ConfigurarFunilPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const stages = await getFunnelStages()

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/leads"
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.40)' }}
        >
          ← CRM / Leads
        </Link>
        <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
          Configurar funil
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.40)' }}>
        Arraste para reordenar as etapas. Clique em "editar" para renomear ou trocar a cor.
      </p>
      <FunnelConfig initialStages={stages} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros.

---

### Task 15: Verificação final e commit

- [ ] **Step 1: Checar build completo**

```bash
cd web && npx tsc --noEmit
```
Esperado: sem erros de TypeScript.

- [ ] **Step 2: Testar no browser**

```bash
cd web && npm run dev
```

Verificar manualmente:
1. `http://localhost:3000/leads` — página carrega sem erro
2. Sidebar mostra os 13 itens do pipeline
3. Toggle kanban/lista funciona
4. "+ Novo Lead" abre drawer com formulário
5. Criar um lead → aparece no kanban na etapa correta
6. Arrastar card entre colunas → muda de etapa
7. Clicar em lead → drawer de detalhes abre
8. Abas Notas, Follow-ups, Propostas funcionam
9. `http://localhost:3000/leads/configurar-funil` — listar/reordenar/adicionar/excluir etapas

- [ ] **Step 3: Commit**

```bash
cd ..
git add web/supabase/migrations/20260618000001_crm_additions.sql \
        web/lib/crm/ \
        web/components/ui/Drawer.tsx \
        web/components/crm/ \
        "web/app/(dashboard)/leads/" \
        web/app/api/leads/ \
        web/components/layout/Sidebar.tsx \
        web/package.json \
        web/package-lock.json
git commit -m "$(cat <<'EOF'
feat: modulo CRM com kanban/lista, funil configuravel e propostas

- Pipeline de 13 modulos na sidebar
- Leads com visualizacao kanban (dnd-kit) e lista
- Drawer de detalhes com notas, follow-ups e propostas
- Propostas com calculo automatico de kWp e geracao mensal
- Funil configuravel: adicionar, renomear, reordenar, excluir etapas
- Conversao lead -> cliente (cria registro em clients e redireciona)
- Migration crm_additions: colunas extras em leads/proposals, tabela lead_notes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Notas para o implementador

**Supabase:** O projeto usa `organization_members` (não `memberships`) e `organization_id` (não `org_id`). Usar `get_my_org_ids()` nas queries RLS.

**Queries client-side:** `ProposalsList` busca dados via `fetch('/api/leads/[id]/proposals')` — Route Handler criado na Task 13. Funções em `lib/crm/queries.ts` são server-only e não podem ser chamadas diretamente de Client Components.

**Plano 2** cobre o cadastro completo do cliente (8 abas, uploads de arquivos, conversão completa).
**Plano 3** cobre os módulos do pipeline (Contratos → Pós Obra).
