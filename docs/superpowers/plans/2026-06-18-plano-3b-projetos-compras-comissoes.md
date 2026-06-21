# Projetos + Compras + Comissões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Projetos, Compras and Comissões pipeline modules — parallel modules activated when the 1st installment is confirmed, with Comissões triggered when a purchase is confirmed.

**Architecture:** Three parallel modules share the `pipeline_flags` JSONB column on `clients`. Each module has its own lib/ folder (queries + actions) and app/(dashboard)/ pages following the established server → client component pattern. `confirmInstallment` is extended to activate Projetos and Compras when `position = 1`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), `(supabase as any)` for new tables

**Codebase context:**
- App dir: `web/` (all paths below relative to repo root)
- Dashboard routes: `web/app/(dashboard)/`
- Supabase client: `import { createClient } from '@/lib/supabase/server'`
- `useFormState` NOT used here — actions called directly in `useTransition`
- New tables: use `(supabase as any)` — not in generated types
- org_id: `getCurrentUserData()` → `membership.organization.id`
- UI: `Button` (variant: primary/secondary/ghost, loading prop), glassmorphism theme
- Gold accent `#FFD080`, borders `rgba(255,255,255,0.06)`
- `pipeline_flags` JSONB on `clients` — merge carefully (spread existing flags before writing)

---

## File Structure

```
web/supabase/migrations/
  20260618000004_projetos_compras_comissoes.sql   NEW

web/lib/financeiro/
  actions.ts                                      MODIFY — confirmInstallment sets flags when position=1

web/lib/projetos/
  queries.ts    NEW — getProjectos(), getProjetoById(), getProjetoMembers()
  actions.ts    NEW — upsertProject(), uploadProjectDocument()

web/lib/compras/
  queries.ts    NEW — getCompras(), getCompraById()
  actions.ts    NEW — upsertPurchase(), uploadPurchaseDocument()

web/lib/comissoes/
  queries.ts    NEW — getComissoesPainel(), getComissaoById(), getComissoesMembers()
  actions.ts    NEW — markCommissionPaid(), uploadCommissionProof()

web/app/(dashboard)/projetos/
  page.tsx              NEW — lista (server)
  [id]/
    page.tsx            NEW — detalhe (server)
    ProjetoDetail.tsx   NEW — formulário + upload (client)

web/app/(dashboard)/compras/
  page.tsx              NEW — lista (server)
  [id]/
    page.tsx            NEW — detalhe (server)
    CompraDetail.tsx    NEW — formulário + upload (client)

web/app/(dashboard)/comissoes/
  page.tsx                      NEW — painel (server)
  ComissoesPainelClient.tsx     NEW — filtros + lista (client)
  [id]/
    page.tsx                    NEW — detalhe (server)
    ComissaoDetail.tsx          NEW — marcar paga + upload (client)
```

---

### Task 1: Migration SQL

**Files:**
- Create: `web/supabase/migrations/20260618000004_projetos_compras_comissoes.sql`

- [ ] **Step 1: Criar arquivo de migration**

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

- [ ] **Step 2: Aplicar no Supabase Dashboard → SQL Editor → Run**

Confirmar ausência de erros.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/supabase/migrations/20260618000004_projetos_compras_comissoes.sql
git commit -m "feat: migration — tabelas client_projects, client_purchases, client_commissions"
```

---

### Task 2: Modificar confirmInstallment

**Files:**
- Modify: `web/lib/financeiro/actions.ts`

Quando `position = 1` é confirmada, setar `pipeline_flags.projetos = 'pendente'` e `pipeline_flags.compras = 'aguardando'` no cliente.

- [ ] **Step 1: Substituir a função `confirmInstallment` completa**

Localizar a função `confirmInstallment` em `web/lib/financeiro/actions.ts` e substituir por:

```typescript
export async function confirmInstallment(installmentId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Busca position e client_id da parcela
  const { data: installment } = await (supabase as any)
    .from('client_installments')
    .select('id, position, client_id')
    .eq('id', installmentId)
    .single()

  if (!installment) return { error: 'Parcela não encontrada.' }

  const { error } = await (supabase as any)
    .from('client_installments')
    .update({
      status: 'confirmada',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', installmentId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  // Entrada (position = 1): ativa Projetos e Compras
  if (installment.position === 1) {
    const { data: clientData } = await (supabase as any)
      .from('clients')
      .select('pipeline_flags')
      .eq('id', installment.client_id)
      .single()

    const currentFlags = ((clientData?.pipeline_flags) as Record<string, string>) ?? {}
    await (supabase as any)
      .from('clients')
      .update({
        pipeline_flags: { ...currentFlags, projetos: 'pendente', compras: 'aguardando' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', installment.client_id)
  }

  revalidatePath('/financeiro')
  return { success: 'Pagamento confirmado.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros no arquivo modificado.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/financeiro/actions.ts
git commit -m "feat: confirmInstallment ativa pipeline_flags projetos+compras na entrada"
```

---

### Task 3: lib/projetos/queries.ts

**Files:**
- Create: `web/lib/projetos/queries.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/projetos/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ProjetoChecklist = {
  memorial_calculo: boolean
  art: boolean
  homologacao: boolean
}

export type ProjetoStatus = 'pendente' | 'enviado' | 'em_analise' | 'aprovado'

export type ProjetoMember = {
  id: string
  full_name: string | null
  email: string
}

export type ProjetoAttachment = {
  id: string
  type: string
  file_url: string
}

export type ProjetoClient = {
  id: string
  name: string
  city: string | null
  contract_max_days: number | null
  dias_usados: number | null
  project: {
    id: string
    responsavel_id: string | null
    responsavel_nome: string | null
    numero_processo: string | null
    data_protocolo: string | null
    prazo_protocolo: string | null
    data_solicitacao_vistoria: string | null
    prazo_vistoria: string | null
    status: ProjetoStatus
    checklist: ProjetoChecklist
  } | null
  attachments: ProjetoAttachment[]
}

function computeDiasUsados(installments: { position: number; confirmed_at: string | null }[]): number | null {
  const entrada = installments.find((i) => i.position === 1)
  if (!entrada?.confirmed_at) return null
  return Math.floor((Date.now() - new Date(entrada.confirmed_at).getTime()) / (1000 * 60 * 60 * 24))
}

function normalizeProject(raw: any): ProjetoClient {
  const projectArr = Array.isArray(raw.project) ? raw.project : raw.project ? [raw.project] : []
  const proj = projectArr[0] ?? null
  const installments = (raw.installments ?? []) as { position: number; confirmed_at: string | null }[]
  const attachments = (raw.attachments ?? []) as any[]

  return {
    id: raw.id,
    name: raw.name,
    city: raw.city ?? null,
    contract_max_days: raw.contract_max_days ?? null,
    dias_usados: computeDiasUsados(installments),
    project: proj
      ? {
          id: proj.id,
          responsavel_id: proj.responsavel_id ?? null,
          responsavel_nome: Array.isArray(proj.responsavel)
            ? (proj.responsavel[0]?.full_name ?? null)
            : (proj.responsavel?.full_name ?? null),
          numero_processo: proj.numero_processo ?? null,
          data_protocolo: proj.data_protocolo ?? null,
          prazo_protocolo: proj.prazo_protocolo ?? null,
          data_solicitacao_vistoria: proj.data_solicitacao_vistoria ?? null,
          prazo_vistoria: proj.prazo_vistoria ?? null,
          status: (proj.status as ProjetoStatus) ?? 'pendente',
          checklist: (proj.checklist as ProjetoChecklist) ?? {
            memorial_calculo: false,
            art: false,
            homologacao: false,
          },
        }
      : null,
    attachments: attachments
      .filter((a) => ['projeto_eletrico', 'art_assinada'].includes(a.type))
      .map((a) => ({ id: a.id, type: a.type, file_url: a.file_url })),
  }
}

export async function getProjectos(): Promise<ProjetoClient[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_max_days, pipeline_flags,
      project:client_projects(id, responsavel_id, status, numero_processo, data_protocolo, prazo_protocolo, data_solicitacao_vistoria, prazo_vistoria, checklist, responsavel:profiles(id, full_name)),
      installments:client_installments(position, confirmed_at),
      attachments:client_attachments(id, type, file_url)
    `)
    .eq('organization_id', user.membership.organization.id)
    .not('pipeline_flags->>projetos', 'is', null)
    .filter('pipeline_flags->>projetos', 'neq', 'aprovado')
    .order('created_at', { ascending: false })
  return ((data ?? []) as any[]).map(normalizeProject)
}

export async function getProjetoById(clientId: string): Promise<ProjetoClient | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_max_days, pipeline_flags,
      project:client_projects(id, responsavel_id, status, numero_processo, data_protocolo, prazo_protocolo, data_solicitacao_vistoria, prazo_vistoria, checklist, responsavel:profiles(id, full_name)),
      installments:client_installments(position, confirmed_at),
      attachments:client_attachments(id, type, file_url)
    `)
    .eq('id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeProject(data as any)
}

export async function getProjetoMembers(): Promise<ProjetoMember[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, profiles:profiles(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return ((data ?? []) as any[]).map((m) => m.profiles).filter(Boolean) as ProjetoMember[]
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/projetos/queries.ts
git commit -m "feat: projetos queries — getProjectos, getProjetoById, getProjetoMembers"
```

---

### Task 4: lib/projetos/actions.ts

**Files:**
- Create: `web/lib/projetos/actions.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/projetos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ProjetoChecklist, ProjetoStatus } from './queries'

export type ActionResult = { error?: string; success?: string }

export type UpsertProjectData = {
  responsavel_id?: string | null
  numero_processo?: string | null
  data_protocolo?: string | null
  prazo_protocolo?: string | null
  data_solicitacao_vistoria?: string | null
  prazo_vistoria?: string | null
  status: ProjetoStatus
  checklist: ProjetoChecklist
}

export async function upsertProject(clientId: string, data: UpsertProjectData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()

  // Upsert client_projects
  const { data: existing } = await (supabase as any)
    .from('client_projects')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existing) {
    const { error } = await (supabase as any)
      .from('client_projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await (supabase as any)
      .from('client_projects')
      .insert({ ...data, client_id: clientId, organization_id: orgId })
    if (error) return { error: error.message }
  }

  // Atualiza pipeline_flags.projetos
  const { data: clientData } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()
  const currentFlags = ((clientData?.pipeline_flags) as Record<string, string>) ?? {}
  await (supabase as any)
    .from('clients')
    .update({
      pipeline_flags: { ...currentFlags, projetos: data.status },
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  revalidatePath('/projetos')
  revalidatePath(`/projetos/${clientId}`)
  return { success: data.status === 'aprovado' ? 'Projeto aprovado!' : 'Projeto salvo.' }
}

export async function uploadProjectDocument(
  clientId: string,
  docType: 'projeto_eletrico' | 'art_assinada',
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${orgId}/${clientId}/${docType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)

  const { data: existing } = await (supabase as any)
    .from('client_attachments')
    .select('id')
    .eq('client_id', clientId)
    .eq('type', docType)
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
      type: docType,
      file_url: publicUrl,
    })
  }

  revalidatePath(`/projetos/${clientId}`)
  return { success: 'Documento enviado.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/projetos/actions.ts
git commit -m "feat: projetos actions — upsertProject, uploadProjectDocument"
```

---

### Task 5: /projetos pages

**Files:**
- Create: `web/app/(dashboard)/projetos/page.tsx`
- Create: `web/app/(dashboard)/projetos/[id]/page.tsx`
- Create: `web/app/(dashboard)/projetos/[id]/ProjetoDetail.tsx`

- [ ] **Step 1: Criar `/projetos/page.tsx`**

```tsx
// web/app/(dashboard)/projetos/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getProjectos } from '@/lib/projetos/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ProjetoClient, ProjetoStatus } from '@/lib/projetos/queries'

const STATUS_LABELS: Record<ProjetoStatus, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
}

const STATUS_COLORS: Record<ProjetoStatus, { bg: string; color: string; border: string }> = {
  pendente: { bg: 'rgba(239,68,68,0.10)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  enviado: { bg: 'rgba(59,130,246,0.10)', color: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  em_analise: { bg: 'rgba(245,158,11,0.10)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  aprovado: { bg: 'rgba(16,185,129,0.10)', color: '#10B981', border: 'rgba(16,185,129,0.25)' },
}

function PrazoTag({ diasUsados, maxDias }: { diasUsados: number | null; maxDias: number | null }) {
  if (diasUsados === null || maxDias === null) return null
  const isLate = diasUsados > maxDias
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
      style={{
        background: isLate ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)',
        color: isLate ? '#EF4444' : 'rgba(255,255,255,0.45)',
        border: `1px solid ${isLate ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.10)'}`,
      }}
    >
      {diasUsados} - {maxDias} dias
    </span>
  )
}

function ProjetoRow({ client }: { client: ProjetoClient }) {
  const status = client.project?.status ?? 'pendente'
  const colors = STATUS_COLORS[status]
  return (
    <Link
      href={`/projetos/${client.id}`}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {client.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {client.city ?? '—'}
          {client.project?.responsavel_nome ? ` · ${client.project.responsavel_nome}` : ''}
        </p>
      </div>
      <PrazoTag diasUsados={client.dias_usados} maxDias={client.contract_max_days} />
      <span
        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
      >
        {STATUS_LABELS[status]}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
    </Link>
  )
}

export default async function ProjetosPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')
  const clients = await getProjectos()
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>Projetos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {clients.length} projetos em andamento
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {clients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>Nenhum projeto ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((c) => <ProjetoRow key={c.id} client={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `/projetos/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/projetos/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getProjetoById, getProjetoMembers } from '@/lib/projetos/queries'
import { redirect, notFound } from 'next/navigation'
import { ProjetoDetail } from './ProjetoDetail'

export default async function ProjetoPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const [client, members] = await Promise.all([
    getProjetoById(params.id),
    getProjetoMembers(),
  ])
  if (!client) notFound()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a href="/projetos" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>← Projetos</a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>{client.name}</h1>
          {client.city && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{client.city}</p>}
        </div>
        {client.dias_usados !== null && client.contract_max_days !== null && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            {client.dias_usados} - {client.contract_max_days} dias
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <ProjetoDetail client={client} members={members} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar `ProjetoDetail.tsx`**

```tsx
// web/app/(dashboard)/projetos/[id]/ProjetoDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { upsertProject, uploadProjectDocument } from '@/lib/projetos/actions'
import type { ProjetoClient, ProjetoMember, ProjetoStatus, ProjetoChecklist } from '@/lib/projetos/queries'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 4,
  display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

const DOC_LABELS: Record<string, string> = {
  projeto_eletrico: 'Projeto Elétrico',
  art_assinada: 'ART Assinada',
}

function DocUploadRow({
  clientId,
  docType,
  existing,
}: {
  clientId: string
  docType: 'projeto_eletrico' | 'art_assinada'
  existing?: { file_url: string } | null
}) {
  const [isPending, startTransition] = useTransition()
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadProjectDocument(clientId, docType, {}, fd)
    })
    e.target.value = ''
  }
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{DOC_LABELS[docType]}</p>
        {existing ? (
          <a href={existing.file_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#3B82F6' }}>
            Ver arquivo →
          </a>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>Não enviado</p>
        )}
      </div>
      <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleChange} />
        {isPending ? '...' : existing ? 'Substituir' : 'Enviar'}
      </label>
    </div>
  )
}

export function ProjetoDetail({ client, members }: { client: ProjetoClient; members: ProjetoMember[] }) {
  const proj = client.project
  const [responsavelId, setResponsavelId] = useState(proj?.responsavel_id ?? '')
  const [status, setStatus] = useState<ProjetoStatus>(proj?.status ?? 'pendente')
  const [checklist, setChecklist] = useState<ProjetoChecklist>(
    proj?.checklist ?? { memorial_calculo: false, art: false, homologacao: false }
  )
  const [numeroProcesso, setNumeroProcesso] = useState(proj?.numero_processo ?? '')
  const [dataProtocolo, setDataProtocolo] = useState(proj?.data_protocolo ?? '')
  const [prazoProtocolo, setPrazoProtocolo] = useState(proj?.prazo_protocolo ?? '')
  const [dataSolicitacaoVistoria, setDataSolicitacaoVistoria] = useState(proj?.data_solicitacao_vistoria ?? '')
  const [prazoVistoria, setPrazoVistoria] = useState(proj?.prazo_vistoria ?? '')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleChecklist(key: keyof ProjetoChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertProject(client.id, {
        responsavel_id: responsavelId || null,
        numero_processo: numeroProcesso || null,
        data_protocolo: dataProtocolo || null,
        prazo_protocolo: prazoProtocolo || null,
        data_solicitacao_vistoria: dataSolicitacaoVistoria || null,
        prazo_vistoria: prazoVistoria || null,
        status,
        checklist,
      })
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  const projetoEletrico = client.attachments.find((a) => a.type === 'projeto_eletrico')
  const artAssinada = client.attachments.find((a) => a.type === 'art_assinada')

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Responsável */}
      <Field label="Responsável técnico">
        <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} style={inputStyle}>
          <option value="">— Sem responsável —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
      </Field>

      {/* Status */}
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value as ProjetoStatus)} style={inputStyle}>
          <option value="pendente">Pendente</option>
          <option value="enviado">Enviado</option>
          <option value="em_analise">Em análise</option>
          <option value="aprovado">Aprovado</option>
        </select>
      </Field>

      {/* Checklist */}
      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={labelStyle}>Checklist</p>
        {([ ['memorial_calculo', 'Memorial de Cálculo'], ['art', 'ART'], ['homologacao', 'Homologação junto à concessionária'] ] as [keyof ProjetoChecklist, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist[key]}
              onChange={() => toggleChecklist(key)}
              className="w-4 h-4 accent-yellow-400"
            />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Protocolo */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número do processo">
          <input type="text" value={numeroProcesso} onChange={(e) => setNumeroProcesso(e.target.value)} style={inputStyle} placeholder="Ex: 2024/00123" />
        </Field>
        <Field label="Data de protocolo">
          <input type="date" value={dataProtocolo} onChange={(e) => setDataProtocolo(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Prazo do protocolo">
          <input type="date" value={prazoProtocolo} onChange={(e) => setPrazoProtocolo(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Data solicitação vistoria">
          <input type="date" value={dataSolicitacaoVistoria} onChange={(e) => setDataSolicitacaoVistoria(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Prazo da vistoria">
          <input type="date" value={prazoVistoria} onChange={(e) => setPrazoVistoria(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      {/* Documentos técnicos */}
      <div className="flex flex-col gap-2">
        <p style={labelStyle}>Documentos Técnicos</p>
        <DocUploadRow clientId={client.id} docType="projeto_eletrico" existing={projetoEletrico} />
        <DocUploadRow clientId={client.id} docType="art_assinada" existing={artAssinada} />
      </div>

      {message && (
        <p className="text-sm" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>
          {message.text}
        </p>
      )}

      <Button variant="primary" onClick={handleSave} loading={isPending} disabled={isPending} type="button" className="self-start">
        {status === 'aprovado' ? 'Marcar como Aprovado' : 'Salvar Projeto'}
      </Button>
      {status === 'aprovado' && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Ao salvar com status Aprovado, o cliente sai da lista de Projetos.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add "web/app/(dashboard)/projetos/"
git commit -m "feat: modulo Projetos — lista, detalhe e formulario tecnico"
```

---

### Task 6: lib/compras/queries.ts

**Files:**
- Create: `web/lib/compras/queries.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/compras/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type PurchaseStatus = 'aguardando' | 'confirmado' | 'entregue'

export type CompraClient = {
  id: string
  name: string
  city: string | null
  contract_max_days: number | null
  dias_usados: number | null
  purchase: {
    id: string
    fornecedor: string | null
    itens: string | null
    valor: number | null
    data_prevista: string | null
    status: PurchaseStatus
    nf_url: string | null
    comprovante_url: string | null
  } | null
}

function computeDiasUsados(installments: { position: number; confirmed_at: string | null }[]): number | null {
  const entrada = installments.find((i) => i.position === 1)
  if (!entrada?.confirmed_at) return null
  return Math.floor((Date.now() - new Date(entrada.confirmed_at).getTime()) / (1000 * 60 * 60 * 24))
}

function normalizeCompra(raw: any): CompraClient {
  const purchaseArr = Array.isArray(raw.purchase) ? raw.purchase : raw.purchase ? [raw.purchase] : []
  const purchase = purchaseArr[0] ?? null
  const installments = (raw.installments ?? []) as { position: number; confirmed_at: string | null }[]
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city ?? null,
    contract_max_days: raw.contract_max_days ?? null,
    dias_usados: computeDiasUsados(installments),
    purchase: purchase
      ? {
          id: purchase.id,
          fornecedor: purchase.fornecedor ?? null,
          itens: purchase.itens ?? null,
          valor: purchase.valor !== null ? Number(purchase.valor) : null,
          data_prevista: purchase.data_prevista ?? null,
          status: (purchase.status as PurchaseStatus) ?? 'aguardando',
          nf_url: purchase.nf_url ?? null,
          comprovante_url: purchase.comprovante_url ?? null,
        }
      : null,
  }
}

export async function getCompras(): Promise<CompraClient[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_max_days, pipeline_flags,
      purchase:client_purchases(id, fornecedor, itens, valor, data_prevista, status, nf_url, comprovante_url),
      installments:client_installments(position, confirmed_at)
    `)
    .eq('organization_id', user.membership.organization.id)
    .not('pipeline_flags->>compras', 'is', null)
    .filter('pipeline_flags->>compras', 'neq', 'entregue')
    .order('created_at', { ascending: false })
  return ((data ?? []) as any[]).map(normalizeCompra)
}

export async function getCompraById(clientId: string): Promise<CompraClient | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_max_days, pipeline_flags,
      purchase:client_purchases(id, fornecedor, itens, valor, data_prevista, status, nf_url, comprovante_url),
      installments:client_installments(position, confirmed_at)
    `)
    .eq('id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeCompra(data as any)
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/compras/queries.ts
git commit -m "feat: compras queries — getCompras, getCompraById"
```

---

### Task 7: lib/compras/actions.ts

**Files:**
- Create: `web/lib/compras/actions.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/compras/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { PurchaseStatus } from './queries'

export type ActionResult = { error?: string; success?: string }

export type UpsertPurchaseData = {
  fornecedor?: string | null
  itens?: string | null
  valor?: number | null
  data_prevista?: string | null
  status: PurchaseStatus
}

export async function upsertPurchase(clientId: string, data: UpsertPurchaseData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()

  // Upsert client_purchases
  const { data: existing } = await (supabase as any)
    .from('client_purchases')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existing) {
    const { error } = await (supabase as any)
      .from('client_purchases')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await (supabase as any)
      .from('client_purchases')
      .insert({ ...data, client_id: clientId, organization_id: orgId })
    if (error) return { error: error.message }
  }

  // Atualiza pipeline_flags.compras
  const { data: clientData } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags, lead_id')
    .eq('id', clientId)
    .single()

  const currentFlags = ((clientData?.pipeline_flags) as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, compras: data.status }

  // Se confirmado: cria comissão e ativa flag
  if (data.status === 'confirmado' && currentFlags.comissoes === undefined) {
    newFlags.comissoes = 'pendente'

    // Busca sale para calcular comissão
    const { data: sale } = await (supabase as any)
      .from('client_sale')
      .select('sale_value, commission_pct')
      .eq('client_id', clientId)
      .maybeSingle()

    if (sale && sale.commission_pct > 0) {
      const valorComissao = Number(sale.sale_value) * Number(sale.commission_pct) / 100

      // Busca vendedor via lead
      let vendedorId: string | null = null
      if (clientData.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('assigned_to_user_id')
          .eq('id', clientData.lead_id)
          .single()
        vendedorId = (lead as any)?.assigned_to_user_id ?? null
      }

      await (supabase as any).from('client_commissions').insert({
        client_id: clientId,
        organization_id: orgId,
        vendedor_id: vendedorId,
        valor_comissao: valorComissao,
        status: 'pendente',
      })
    }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  revalidatePath('/compras')
  revalidatePath(`/compras/${clientId}`)
  return { success: data.status === 'entregue' ? 'Pedido marcado como entregue.' : 'Compra salva.' }
}

export async function uploadPurchaseDocument(
  clientId: string,
  field: 'nf' | 'comprovante',
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${orgId}/${clientId}/compra_${field}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
  const dbField = field === 'nf' ? 'nf_url' : 'comprovante_url'

  const { data: existing } = await (supabase as any)
    .from('client_purchases')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('client_purchases')
      .update({ [dbField]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await (supabase as any).from('client_purchases').insert({
      client_id: clientId,
      organization_id: orgId,
      [dbField]: publicUrl,
    })
  }

  revalidatePath(`/compras/${clientId}`)
  return { success: 'Documento enviado.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/compras/actions.ts
git commit -m "feat: compras actions — upsertPurchase (cria comissao automatica), uploadPurchaseDocument"
```

---

### Task 8: /compras pages

**Files:**
- Create: `web/app/(dashboard)/compras/page.tsx`
- Create: `web/app/(dashboard)/compras/[id]/page.tsx`
- Create: `web/app/(dashboard)/compras/[id]/CompraDetail.tsx`

- [ ] **Step 1: Criar `/compras/page.tsx`**

```tsx
// web/app/(dashboard)/compras/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getCompras } from '@/lib/compras/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { CompraClient, PurchaseStatus } from '@/lib/compras/queries'

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  aguardando: 'Aguardando',
  confirmado: 'Confirmado',
  entregue: 'Entregue',
}

const STATUS_COLORS: Record<PurchaseStatus, { bg: string; color: string; border: string }> = {
  aguardando: { bg: 'rgba(245,158,11,0.10)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  confirmado: { bg: 'rgba(59,130,246,0.10)', color: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  entregue: { bg: 'rgba(16,185,129,0.10)', color: '#10B981', border: 'rgba(16,185,129,0.25)' },
}

function formatBRL(value: number | null) {
  if (value === null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CompraRow({ client }: { client: CompraClient }) {
  const status = client.purchase?.status ?? 'aguardando'
  const colors = STATUS_COLORS[status]
  return (
    <Link
      href={`/compras/${client.id}`}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{client.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {client.purchase?.fornecedor ?? '—'} · {formatBRL(client.purchase?.valor ?? null)}
          {client.purchase?.data_prevista ? ` · Prev: ${new Date(client.purchase.data_prevista).toLocaleDateString('pt-BR')}` : ''}
        </p>
      </div>
      {client.dias_usados !== null && client.contract_max_days !== null && (
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }}>
          {client.dias_usados} - {client.contract_max_days} dias
        </span>
      )}
      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
        {STATUS_LABELS[status]}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
    </Link>
  )
}

export default async function ComprasPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')
  const clients = await getCompras()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>Compras</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{clients.length} pedidos em andamento</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {clients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>Nenhum pedido ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((c) => <CompraRow key={c.id} client={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `/compras/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/compras/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getCompraById } from '@/lib/compras/queries'
import { redirect, notFound } from 'next/navigation'
import { CompraDetail } from './CompraDetail'

export default async function CompraPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')
  const client = await getCompraById(params.id)
  if (!client) notFound()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/compras" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>← Compras</a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>{client.name}</h1>
          {client.city && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{client.city}</p>}
        </div>
        {client.dias_usados !== null && client.contract_max_days !== null && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            {client.dias_usados} - {client.contract_max_days} dias
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <CompraDetail client={client} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar `CompraDetail.tsx`**

```tsx
// web/app/(dashboard)/compras/[id]/CompraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { upsertPurchase, uploadPurchaseDocument } from '@/lib/compras/actions'
import type { CompraClient, PurchaseStatus } from '@/lib/compras/queries'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 4,
  display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function DocRow({ clientId, field, label, url }: { clientId: string; field: 'nf' | 'comprovante'; label: string; url: string | null }) {
  const [isPending, startTransition] = useTransition()
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadPurchaseDocument(clientId, field, {}, fd)
    })
    e.target.value = ''
  }
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</p>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#3B82F6' }}>Ver arquivo →</a>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>Não enviado</p>
        )}
      </div>
      <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleChange} />
        {isPending ? '...' : url ? 'Substituir' : 'Enviar'}
      </label>
    </div>
  )
}

export function CompraDetail({ client }: { client: CompraClient }) {
  const p = client.purchase
  const [fornecedor, setFornecedor] = useState(p?.fornecedor ?? '')
  const [itens, setItens] = useState(p?.itens ?? '')
  const [valor, setValor] = useState(p?.valor !== null ? String(p?.valor ?? '') : '')
  const [dataPrevista, setDataPrevista] = useState(p?.data_prevista ?? '')
  const [status, setStatus] = useState<PurchaseStatus>(p?.status ?? 'aguardando')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await upsertPurchase(client.id, {
        fornecedor: fornecedor || null,
        itens: itens || null,
        valor: valor ? Number(valor) : null,
        data_prevista: dataPrevista || null,
        status,
      })
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <Field label="Fornecedor">
        <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} style={inputStyle} placeholder="Nome do fornecedor" />
      </Field>
      <Field label="Itens do pedido">
        <textarea
          value={itens}
          onChange={(e) => setItens(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Descreva os itens comprados..."
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} style={inputStyle} placeholder="0,00" min="0" step="0.01" />
        </Field>
        <Field label="Data prevista entrega">
          <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value as PurchaseStatus)} style={inputStyle}>
          <option value="aguardando">Aguardando</option>
          <option value="confirmado">Confirmado</option>
          <option value="entregue">Entregue</option>
        </select>
      </Field>

      {/* Documentos */}
      <div className="flex flex-col gap-2">
        <p style={labelStyle}>Documentos</p>
        <DocRow clientId={client.id} field="nf" label="NF / Comprovante / PDF do pedido" url={p?.nf_url ?? null} />
        <DocRow clientId={client.id} field="comprovante" label="Comprovante adicional" url={p?.comprovante_url ?? null} />
      </div>

      {message && (
        <p className="text-sm" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>{message.text}</p>
      )}

      <Button variant="primary" onClick={handleSave} loading={isPending} disabled={isPending} type="button" className="self-start">
        Salvar Compra
      </Button>
      {status === 'confirmado' && !p?.status?.includes('confirmado') && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Ao confirmar, a comissão do vendedor será calculada automaticamente.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add "web/app/(dashboard)/compras/"
git commit -m "feat: modulo Compras — lista, detalhe e pedido de compra"
```

---

### Task 9: lib/comissoes/queries.ts

**Files:**
- Create: `web/lib/comissoes/queries.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/comissoes/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type CommissionStatus = 'pendente' | 'paga'

export type ComissaoItem = {
  id: string
  client_id: string
  client_name: string
  vendedor_id: string | null
  vendedor_nome: string | null
  valor_comissao: number
  status: CommissionStatus
  paid_at: string | null
  comprovante_url: string | null
  created_at: string
}

export type ComissoesPainel = {
  total_pendente: number
  total_pago_mes: number
  items: ComissaoItem[]
}

export type ComissaoMember = {
  id: string
  full_name: string | null
  email: string
}

function normalizeComissao(raw: any): ComissaoItem {
  const clientArr = Array.isArray(raw.client) ? raw.client : raw.client ? [raw.client] : []
  const vendedorArr = Array.isArray(raw.vendedor) ? raw.vendedor : raw.vendedor ? [raw.vendedor] : []
  return {
    id: raw.id,
    client_id: raw.client_id,
    client_name: clientArr[0]?.name ?? 'Cliente',
    vendedor_id: raw.vendedor_id ?? null,
    vendedor_nome: vendedorArr[0]?.full_name ?? null,
    valor_comissao: Number(raw.valor_comissao),
    status: (raw.status as CommissionStatus) ?? 'pendente',
    paid_at: raw.paid_at ?? null,
    comprovante_url: raw.comprovante_url ?? null,
    created_at: raw.created_at,
  }
}

export async function getComissoesPainel(params: {
  month: number
  year: number
  vendedorId?: string
}): Promise<ComissoesPainel> {
  const user = await getCurrentUserData()
  if (!user?.membership) return { total_pendente: 0, total_pago_mes: 0, items: [] }
  const supabase = await createClient()
  const orgId = user.membership.organization.id

  let query = (supabase as any)
    .from('client_commissions')
    .select(`
      id, client_id, vendedor_id, valor_comissao, status, paid_at, comprovante_url, created_at,
      client:clients!client_id(id, name),
      vendedor:profiles!vendedor_id(id, full_name, email)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (params.vendedorId) {
    query = query.eq('vendedor_id', params.vendedorId)
  }

  const { data } = await query
  const all: ComissaoItem[] = ((data ?? []) as any[]).map(normalizeComissao)

  const startDate = new Date(params.year, params.month - 1, 1)
  const endDate = new Date(params.year, params.month, 0)

  const total_pendente = all
    .filter((c) => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor_comissao, 0)

  const total_pago_mes = all
    .filter((c) => {
      if (c.status !== 'paga' || !c.paid_at) return false
      const paidDate = new Date(c.paid_at)
      return paidDate >= startDate && paidDate <= endDate
    })
    .reduce((sum, c) => sum + c.valor_comissao, 0)

  return { total_pendente, total_pago_mes, items: all }
}

export async function getComissaoById(commissionId: string): Promise<ComissaoItem | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('client_commissions')
    .select(`
      id, client_id, vendedor_id, valor_comissao, status, paid_at, comprovante_url, created_at,
      client:clients!client_id(id, name),
      vendedor:profiles!vendedor_id(id, full_name, email)
    `)
    .eq('id', commissionId)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeComissao(data as any)
}

export async function getComissoesMembers(): Promise<ComissaoMember[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, profiles:profiles(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return ((data ?? []) as any[]).map((m) => m.profiles).filter(Boolean) as ComissaoMember[]
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/comissoes/queries.ts
git commit -m "feat: comissoes queries — getComissoesPainel, getComissaoById, getComissoesMembers"
```

---

### Task 10: lib/comissoes/actions.ts

**Files:**
- Create: `web/lib/comissoes/actions.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
// web/lib/comissoes/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ActionResult = { error?: string; success?: string }

export async function markCommissionPaid(commissionId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()

  // Busca client_id para atualizar pipeline_flags
  const { data: commission } = await (supabase as any)
    .from('client_commissions')
    .select('id, client_id')
    .eq('id', commissionId)
    .single()

  if (!commission) return { error: 'Comissão não encontrada.' }

  const { error } = await (supabase as any)
    .from('client_commissions')
    .update({ status: 'paga', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', commissionId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  // Atualiza pipeline_flags.comissoes = 'paga'
  const { data: clientData } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', commission.client_id)
    .single()
  const currentFlags = ((clientData?.pipeline_flags) as Record<string, string>) ?? {}
  await (supabase as any)
    .from('clients')
    .update({
      pipeline_flags: { ...currentFlags, comissoes: 'paga' },
      updated_at: new Date().toISOString(),
    })
    .eq('id', commission.client_id)

  revalidatePath('/comissoes')
  revalidatePath(`/comissoes/${commissionId}`)
  return { success: 'Comissão marcada como paga.' }
}

export async function uploadCommissionProof(
  commissionId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${orgId}/comissoes/${commissionId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)

  const { error } = await (supabase as any)
    .from('client_commissions')
    .update({ comprovante_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', commissionId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/comissoes/${commissionId}`)
  return { success: 'Comprovante enviado.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add web/lib/comissoes/actions.ts
git commit -m "feat: comissoes actions — markCommissionPaid, uploadCommissionProof"
```

---

### Task 11: /comissoes pages

**Files:**
- Create: `web/app/(dashboard)/comissoes/page.tsx`
- Create: `web/app/(dashboard)/comissoes/ComissoesPainelClient.tsx`
- Create: `web/app/(dashboard)/comissoes/[id]/page.tsx`
- Create: `web/app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx`

- [ ] **Step 1: Criar `/comissoes/page.tsx`**

```tsx
// web/app/(dashboard)/comissoes/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getComissoesPainel, getComissoesMembers } from '@/lib/comissoes/queries'
import { redirect } from 'next/navigation'
import { ComissoesPainelClient } from './ComissoesPainelClient'

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; vendedor?: string }
}) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const now = new Date()
  const month = Number(searchParams.month ?? now.getMonth() + 1)
  const year = Number(searchParams.year ?? now.getFullYear())
  const vendedorId = searchParams.vendedor || undefined

  const [painel, members] = await Promise.all([
    getComissoesPainel({ month, year, vendedorId }),
    getComissoesMembers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>Comissões</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Painel de comissões</p>
        </div>
      </div>
      <ComissoesPainelClient painel={painel} members={members} month={month} year={year} vendedorId={vendedorId ?? ''} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `ComissoesPainelClient.tsx`**

```tsx
// web/app/(dashboard)/comissoes/ComissoesPainelClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ComissoesPainel, ComissaoMember, ComissaoItem } from '@/lib/comissoes/queries'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: 'pendente' | 'paga' }) {
  const isPaid = status === 'paga'
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{
      background: isPaid ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
      color: isPaid ? '#10B981' : '#F59E0B',
      border: `1px solid ${isPaid ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {isPaid ? 'Paga' : 'Pendente'}
    </span>
  )
}

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <p className="text-xl font-semibold" style={{ color: accent ?? 'rgba(255,255,255,0.85)' }}>{formatBRL(value)}</p>
    </div>
  )
}

function ComissaoRow({ item }: { item: ComissaoItem }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>{item.client_name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {item.vendedor_nome ?? 'Sem vendedor'}
        </p>
      </div>
      <p className="text-sm font-semibold flex-shrink-0" style={{ color: '#FFD080' }}>{formatBRL(item.valor_comissao)}</p>
      <StatusBadge status={item.status} />
      <Link href={`/comissoes/${item.id}`} className="text-xs flex-shrink-0" style={{ color: '#3B82F6' }}>ver →</Link>
    </div>
  )
}

export function ComissoesPainelClient({ painel, members, month, year, vendedorId }: {
  painel: ComissoesPainel
  members: ComissaoMember[]
  month: number
  year: number
  vendedorId: string
}) {
  const router = useRouter()
  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    color: '#E0E8F0', borderRadius: 10, padding: '7px 12px', fontSize: 13, outline: 'none',
  }

  function applyFilter(params: { month?: number; year?: number; vendedor?: string }) {
    const newMonth = params.month ?? month
    const newYear = params.year ?? year
    const newVendedor = params.vendedor !== undefined ? params.vendedor : vendedorId
    const qs = new URLSearchParams({ month: String(newMonth), year: String(newYear) })
    if (newVendedor) qs.set('vendedor', newVendedor)
    router.push(`/comissoes?${qs.toString()}`)
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col flex-1 overflow-auto px-6 py-5 gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={(e) => applyFilter({ month: Number(e.target.value) })} style={selectStyle}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => applyFilter({ year: Number(e.target.value) })} style={selectStyle}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={vendedorId} onChange={(e) => applyFilter({ vendedor: e.target.value })} style={selectStyle}>
          <option value="">Todos os vendedores</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card label="Total pendente" value={painel.total_pendente} accent="#F59E0B" />
        <Card label="Pago no período" value={painel.total_pago_mes} accent="#10B981" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Comissões ({painel.items.length})
        </p>
        {painel.items.length === 0 ? (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhuma comissão encontrada.</p>
        ) : (
          painel.items.map((item) => <ComissaoRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar `/comissoes/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/comissoes/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getComissaoById } from '@/lib/comissoes/queries'
import { redirect, notFound } from 'next/navigation'
import { ComissaoDetail } from './ComissaoDetail'

export default async function ComissaoPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')
  const commission = await getComissaoById(params.id)
  if (!commission) notFound()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/comissoes" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>← Comissões</a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>{commission.client_name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{commission.vendedor_nome ?? 'Sem vendedor'}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <ComissaoDetail commission={commission} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar `ComissaoDetail.tsx`**

```tsx
// web/app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx
'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { markCommissionPaid, uploadCommissionProof } from '@/lib/comissoes/actions'
import type { ComissaoItem } from '@/lib/comissoes/queries'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ComissaoDetail({ commission }: { commission: ComissaoItem }) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePaid() {
    startTransition(async () => {
      const result = await markCommissionPaid(commission.id)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  function handleProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      const result = await uploadCommissionProof(commission.id, {}, fd)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
    e.target.value = ''
  }

  const isPaid = commission.status === 'paga'

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Resumo */}
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>Comissão</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            background: isPaid ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
            color: isPaid ? '#10B981' : '#F59E0B',
            border: `1px solid ${isPaid ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}>
            {isPaid ? 'Paga' : 'Pendente'}
          </span>
        </div>
        <p className="text-2xl font-bold" style={{ color: '#FFD080' }}>{formatBRL(commission.valor_comissao)}</p>
        <div className="flex flex-col gap-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <p>Cliente: <span style={{ color: 'rgba(255,255,255,0.80)' }}>{commission.client_name}</span></p>
          <p>Vendedor: <span style={{ color: 'rgba(255,255,255,0.80)' }}>{commission.vendedor_nome ?? '—'}</span></p>
          {isPaid && commission.paid_at && (
            <p>Pago em: <span style={{ color: '#10B981' }}>{new Date(commission.paid_at).toLocaleDateString('pt-BR')}</span></p>
          )}
        </div>
        {commission.comprovante_url && (
          <a href={commission.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: '#3B82F6' }}>
            Ver comprovante →
          </a>
        )}
      </div>

      {message && (
        <p className="text-sm" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>{message.text}</p>
      )}

      {!isPaid && (
        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={handlePaid} loading={isPending} disabled={isPending} type="button" className="self-start">
            Marcar como Paga
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Comprovante (opcional):</p>
            <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleProof} />
              {isPending ? '...' : 'Enviar comprovante'}
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main"
git add "web/app/(dashboard)/comissoes/" web/lib/comissoes/
git commit -m "feat: modulo Comissoes — painel, detalhe e marcacao de pagamento"
```

---

### Task 12: Verificação final

- [ ] **Step 1: TypeScript check completo**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npx tsc --noEmit 2>&1
```

Esperado: zero erros.

- [ ] **Step 2: Testar no browser — checklist**

```bash
cd "C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main\web" && npm run dev
```

1. Confirmar 1ª parcela de um cliente em `/financeiro/[id]` → verificar que `pipeline_flags.projetos = 'pendente'` e `pipeline_flags.compras = 'aguardando'` foram setados (cliente deve aparecer em `/projetos` e `/compras`)
2. `/projetos/[id]` — preencher campos, marcar checklist, fazer upload de documento técnico, salvar → status muda
3. Mudar status para `aprovado` → cliente some de `/projetos`
4. `/compras/[id]` — registrar pedido, mudar status para `confirmado` → comissão criada automaticamente em `/comissoes`
5. `/comissoes` — cards mostram total pendente, lista mostra comissão criada
6. `/comissoes/[id]` — clicar "Marcar como Paga" → badge muda para Paga, cliente some da lista pendente

---

## Notas para o implementador

**Migration obrigatória antes de testar:** Aplicar `20260618000004_projetos_compras_comissoes.sql` no Supabase Dashboard → SQL Editor.

**`(supabase as any)`** obrigatório para `client_projects`, `client_purchases`, `client_commissions` e para colunas `pipeline_flags`, `lead_id` em `clients` — não estão nos tipos gerados.

**pipeline_flags merge:** Sempre fazer spread dos flags atuais antes de atualizar (`{ ...currentFlags, projetos: 'pendente' }`). Nunca sobrescrever o objeto inteiro.

**Comissão criada apenas uma vez:** A lógica em `upsertPurchase` verifica `currentFlags.comissoes === undefined` antes de criar o registro, evitando duplicatas ao re-salvar com status `confirmado`.

**Filtro JSONB no Supabase JS:** Use `.not('pipeline_flags->>campo', 'is', null)` e `.filter('pipeline_flags->>campo', 'neq', 'valor')` para filtrar por chaves JSONB.
