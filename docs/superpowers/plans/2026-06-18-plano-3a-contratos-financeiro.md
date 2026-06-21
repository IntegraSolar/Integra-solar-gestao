# Contratos + Financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Contratos and Financeiro pipeline modules — contract status tracking with pipeline advancement, and a financial panel with installment confirmation.

**Architecture:** Each module follows the established pattern: server component list page (clients filtered by `pipeline_stage`) → server component detail page → client component for mutations. `pipeline_stage` advances via server actions. Financeiro painel aggregates installment data with month/year + vendedor filters processed server-side.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), zod

**Codebase context:**
- App dir: `web/` (all paths below relative to repo root)
- Dashboard routes: `web/app/(dashboard)/`
- Supabase client: `import { createClient } from '@/lib/supabase/server'`
- `useFormState` from `react-dom` (React 18 — NOT `useActionState`)
- New columns on existing tables: use `(supabase as any)` — not in generated types
- org_id: `getCurrentUserData()` → `membership.organization.id`
- UI primitives: `Button` (variant: primary/secondary/ghost, loading), `Input`, `SubmitButton`, `FormError`
- Glassmorphism: dark navy bg, `rgba(255,255,255,0.06)` borders, gold accent `#FFD080`

---

## File Structure

```
web/supabase/migrations/
  20260618000003_contratos_financeiro.sql   NEW — add status col to client_contracts

web/lib/contratos/
  queries.ts    NEW — getContratos(), getContratoById()
  actions.ts    NEW — updateContractStatus()

web/lib/financeiro/
  queries.ts    NEW — getFinanceiroPainel(), getParcelasByClient(), getFinanceiroMembers()
  actions.ts    NEW — confirmInstallment(), advanceToProjects()

web/app/(dashboard)/contratos/
  page.tsx              NEW — lista clientes pipeline_stage='contratos' (server)
  [id]/
    page.tsx            NEW — detalhe server component
    ContratoDetail.tsx  NEW — status select + confirm button (client)

web/app/(dashboard)/financeiro/
  page.tsx              NEW — painel com 3 cards + lista parcelas (server, searchParams)
  FinanceiroPainelClient.tsx  NEW — filtros interativos (client)
  [id]/
    page.tsx            NEW — parcelas do cliente (server)
    ParcelasClient.tsx  NEW — confirmar pagamentos + avançar pipeline (client)
```

---

### Task 1: Migration SQL

**Files:**
- Create: `web/supabase/migrations/20260618000003_contratos_financeiro.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- web/supabase/migrations/20260618000003_contratos_financeiro.sql
-- Adiciona coluna status em client_contracts para rastreamento no módulo Contratos

alter table public.client_contracts
  add column if not exists status text not null default 'aguardando_assinatura';
```

- [ ] **Step 2: Aplicar no Supabase Dashboard → SQL Editor → Run**

Confirmar que não há erros.

---

### Task 2: lib/contratos/queries.ts

**Files:**
- Create: `web/lib/contratos/queries.ts`

- [ ] **Step 1: Criar queries de contratos**

```typescript
// web/lib/contratos/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ContratoClient = {
  id: string
  name: string
  city: string | null
  contract_date: string | null
  pipeline_stage: string
  contract: {
    id: string
    status: string
    signed: boolean
    signed_at: string | null
    contract_url: string | null
    power_of_attorney_url: string | null
  } | null
}

export async function getContratos(): Promise<ContratoClient[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_date, pipeline_stage,
      contract:client_contracts(id, status, signed, signed_at, contract_url, power_of_attorney_url)
    `)
    .eq('organization_id', user.membership.organization.id)
    .eq('pipeline_stage', 'contratos')
    .order('created_at', { ascending: false })
  return ((data ?? []) as any[]).map(normalizeContrato)
}

export async function getContratoById(clientId: string): Promise<ContratoClient | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_date, pipeline_stage,
      contract:client_contracts(id, status, signed, signed_at, contract_url, power_of_attorney_url)
    `)
    .eq('id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeContrato(data as any)
}

function normalizeContrato(raw: any): ContratoClient {
  const contractArr = Array.isArray(raw.contract)
    ? raw.contract
    : raw.contract
    ? [raw.contract]
    : []
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city ?? null,
    contract_date: raw.contract_date ?? null,
    pipeline_stage: raw.pipeline_stage ?? 'contratos',
    contract: contractArr[0] ?? null,
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 3: lib/contratos/actions.ts

**Files:**
- Create: `web/lib/contratos/actions.ts`

- [ ] **Step 1: Criar actions de contratos**

```typescript
// web/lib/contratos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ActionResult = { error?: string; success?: string }

export type ContractStatus = 'aguardando_assinatura' | 'assinado' | 'distratado'

export async function updateContractStatus(
  clientId: string,
  status: ContractStatus
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Busca o contrato existente
  const { data: existing } = await (supabase as any)
    .from('client_contracts')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existing) return { error: 'Contrato não encontrado.' }

  const contractUpdate: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'assinado') {
    contractUpdate.signed = true
    contractUpdate.signed_at = new Date().toISOString()
  }

  const { error: contractError } = await (supabase as any)
    .from('client_contracts')
    .update(contractUpdate)
    .eq('id', existing.id)

  if (contractError) return { error: contractError.message }

  // Avança pipeline se assinado
  if (status === 'assinado') {
    const { error: clientError } = await (supabase as any)
      .from('clients')
      .update({ pipeline_stage: 'financeiro', updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('organization_id', orgId)
    if (clientError) return { error: clientError.message }
  }

  revalidatePath('/contratos')
  revalidatePath(`/contratos/${clientId}`)
  return { success: status === 'assinado' ? 'Contrato confirmado. Cliente avançado para Financeiro.' : 'Status atualizado.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 4: /contratos pages

**Files:**
- Create: `web/app/(dashboard)/contratos/page.tsx`
- Create: `web/app/(dashboard)/contratos/[id]/page.tsx`
- Create: `web/app/(dashboard)/contratos/[id]/ContratoDetail.tsx`

- [ ] **Step 1: Criar página de lista /contratos**

```tsx
// web/app/(dashboard)/contratos/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getContratos } from '@/lib/contratos/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ContratoClient } from '@/lib/contratos/queries'

const STATUS_LABELS: Record<string, string> = {
  aguardando_assinatura: 'Aguardando assinatura',
  assinado: 'Assinado',
  distratado: 'Distratado',
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  aguardando_assinatura: {
    bg: 'rgba(245,158,11,0.10)',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.25)',
  },
  assinado: {
    bg: 'rgba(16,185,129,0.10)',
    color: '#10B981',
    border: 'rgba(16,185,129,0.25)',
  },
  distratado: {
    bg: 'rgba(239,68,68,0.10)',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.25)',
  },
}

function ContratoRow({ client }: { client: ContratoClient }) {
  const status = client.contract?.status ?? 'aguardando_assinatura'
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.aguardando_assinatura
  return (
    <Link
      href={`/contratos/${client.id}`}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {client.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {client.city ?? '—'}
          {client.contract_date
            ? ` · Contrato: ${new Date(client.contract_date).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
      </div>
      <span
        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
      >
        {STATUS_LABELS[status] ?? status}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
    </Link>
  )
}

export default async function ContratosPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const clients = await getContratos()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            Contratos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {clients.length} clientes aguardando/assinando contrato
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Nenhum cliente neste módulo ainda.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((c) => (
              <ContratoRow key={c.id} client={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar /contratos/[id]/page.tsx**

```tsx
// web/app/(dashboard)/contratos/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getContratoById } from '@/lib/contratos/queries'
import { redirect, notFound } from 'next/navigation'
import { ContratoDetail } from './ContratoDetail'

export default async function ContratoPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const client = await getContratoById(params.id)
  if (!client) notFound()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a href="/contratos" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          ← Contratos
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
      <div className="flex-1 overflow-auto px-6 py-5">
        <ContratoDetail client={client} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar ContratoDetail.tsx**

```tsx
// web/app/(dashboard)/contratos/[id]/ContratoDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { updateContractStatus } from '@/lib/contratos/actions'
import type { ContratoClient } from '@/lib/contratos/queries'
import type { ContractStatus } from '@/lib/contratos/actions'

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
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function ContratoDetail({ client }: { client: ContratoClient }) {
  const contract = client.contract
  const [status, setStatus] = useState<ContractStatus>(
    (contract?.status as ContractStatus) ?? 'aguardando_assinatura'
  )
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateContractStatus(client.id, status)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Arquivos */}
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          Documentos
        </p>
        {contract?.contract_url ? (
          <a
            href={contract.contract_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver contrato assinado →
          </a>
        ) : (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Nenhum contrato enviado.
          </p>
        )}
        {contract?.power_of_attorney_url && (
          <a
            href={contract.power_of_attorney_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver procuração →
          </a>
        )}
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Status do contrato</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ContractStatus)}
          style={selectStyle}
        >
          <option value="aguardando_assinatura">Aguardando assinatura</option>
          <option value="assinado">Assinado</option>
          <option value="distratado">Distratado</option>
        </select>
      </div>

      {message && (
        <p
          className="text-sm"
          style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}
        >
          {message.text}
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        loading={isPending}
        disabled={isPending}
        type="button"
        className="self-start"
      >
        {status === 'assinado' ? 'Confirmar Assinatura' : 'Salvar Status'}
      </Button>

      {status === 'assinado' && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Ao confirmar, o cliente avança automaticamente para o módulo Financeiro.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
cd ..
git add web/supabase/migrations/20260618000003_contratos_financeiro.sql \
        web/lib/contratos/ \
        "web/app/(dashboard)/contratos/"
git commit -m "feat: modulo Contratos — lista, detalhe e confirmacao de assinatura"
```

---

### Task 5: lib/financeiro/queries.ts

**Files:**
- Create: `web/lib/financeiro/queries.ts`

- [ ] **Step 1: Criar queries de financeiro**

```typescript
// web/lib/financeiro/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type FinanceiroInstallment = {
  id: string
  client_id: string
  client_name: string
  position: number
  due_date: string
  amount: number
  notes: string | null
  status: 'pendente' | 'confirmada'
  confirmed_at: string | null
}

export type FinanceiroPainel = {
  faturamento_total: number
  a_receber: number
  em_atraso: number
  installments: FinanceiroInstallment[]
}

export type FinanceiroMember = {
  id: string
  full_name: string | null
  email: string
}

export async function getFinanceiroMembers(): Promise<FinanceiroMember[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, profiles:profiles(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return ((data ?? []) as any[]).map((m) => m.profiles).filter(Boolean) as FinanceiroMember[]
}

export async function getFinanceiroPainel(params: {
  month: number
  year: number
  vendedorId?: string
}): Promise<FinanceiroPainel> {
  const user = await getCurrentUserData()
  if (!user?.membership) return { faturamento_total: 0, a_receber: 0, em_atraso: 0, installments: [] }

  const supabase = await createClient()
  const orgId = user.membership.organization.id

  // Date range for the month
  const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`
  const lastDay = new Date(params.year, params.month, 0).getDate()
  const endDate = `${params.year}-${String(params.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await (supabase as any)
    .from('client_installments')
    .select(`
      id, client_id, position, due_date, amount, notes, status, confirmed_at,
      client:clients!client_id(id, name)
    `)
    .eq('organization_id', orgId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })

  let installments = (data ?? []) as any[]

  // Filter by vendedor in JS (join clients → leads)
  if (params.vendedorId) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('assigned_to_user_id', params.vendedorId)
      .eq('organization_id', orgId)
    const leadIds = ((leads ?? []) as any[]).map((l) => l.id)

    if (leadIds.length > 0) {
      const { data: clientsForVendedor } = await (supabase as any)
        .from('clients')
        .select('id')
        .in('lead_id', leadIds)
      const clientIds = new Set(((clientsForVendedor ?? []) as any[]).map((c) => c.id))
      installments = installments.filter((i) => clientIds.has(i.client_id))
    } else {
      installments = []
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const normalized: FinanceiroInstallment[] = installments.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    client_name: Array.isArray(i.client) ? (i.client[0]?.name ?? 'Cliente') : (i.client?.name ?? 'Cliente'),
    position: i.position,
    due_date: i.due_date,
    amount: Number(i.amount),
    notes: i.notes ?? null,
    status: i.status as 'pendente' | 'confirmada',
    confirmed_at: i.confirmed_at ?? null,
  }))

  return {
    faturamento_total: normalized.reduce((sum, i) => sum + i.amount, 0),
    a_receber: normalized
      .filter((i) => i.status === 'pendente' && i.due_date >= today)
      .reduce((sum, i) => sum + i.amount, 0),
    em_atraso: normalized
      .filter((i) => i.status === 'pendente' && i.due_date < today)
      .reduce((sum, i) => sum + i.amount, 0),
    installments: normalized,
  }
}

export async function getParcelasByClient(clientId: string): Promise<FinanceiroInstallment[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('client_installments')
    .select('id, client_id, position, due_date, amount, notes, status, confirmed_at')
    .eq('client_id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .order('position', { ascending: true })

  // Need client name — fetch separately
  const { data: clientData } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()
  const clientName = (clientData as any)?.name ?? 'Cliente'

  return ((data ?? []) as any[]).map((i) => ({
    id: i.id,
    client_id: clientId,
    client_name: clientName,
    position: i.position,
    due_date: i.due_date,
    amount: Number(i.amount),
    notes: i.notes ?? null,
    status: i.status as 'pendente' | 'confirmada',
    confirmed_at: i.confirmed_at ?? null,
  }))
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 6: lib/financeiro/actions.ts

**Files:**
- Create: `web/lib/financeiro/actions.ts`

- [ ] **Step 1: Criar actions de financeiro**

```typescript
// web/lib/financeiro/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ActionResult = { error?: string; success?: string }

export async function confirmInstallment(installmentId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('client_installments')
    .update({
      status: 'confirmada',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', installmentId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: 'Pagamento confirmado.' }
}

export async function advanceToProjects(clientId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('clients')
    .update({ pipeline_stage: 'projetos', updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath(`/financeiro/${clientId}`)
  return { success: 'Cliente avançado para Projetos.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: sem erros.

---

### Task 7: /financeiro pages

**Files:**
- Create: `web/app/(dashboard)/financeiro/page.tsx`
- Create: `web/app/(dashboard)/financeiro/FinanceiroPainelClient.tsx`
- Create: `web/app/(dashboard)/financeiro/[id]/page.tsx`
- Create: `web/app/(dashboard)/financeiro/[id]/ParcelasClient.tsx`

- [ ] **Step 1: Criar /financeiro/page.tsx**

```tsx
// web/app/(dashboard)/financeiro/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getFinanceiroPainel, getFinanceiroMembers } from '@/lib/financeiro/queries'
import { redirect } from 'next/navigation'
import { FinanceiroPainelClient } from './FinanceiroPainelClient'

export default async function FinanceiroPage({
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
    getFinanceiroPainel({ month, year, vendedorId }),
    getFinanceiroMembers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            Financeiro
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Painel de parcelas
          </p>
        </div>
      </div>
      <FinanceiroPainelClient
        painel={painel}
        members={members}
        month={month}
        year={year}
        vendedorId={vendedorId ?? ''}
      />
    </div>
  )
}
```

- [ ] **Step 2: Criar FinanceiroPainelClient.tsx**

```tsx
// web/app/(dashboard)/financeiro/FinanceiroPainelClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FinanceiroPainel, FinanceiroMember, FinanceiroInstallment } from '@/lib/financeiro/queries'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: 'pendente' | 'confirmada' }) {
  const isConfirmed = status === 'confirmada'
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: isConfirmed ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
        color: isConfirmed ? '#10B981' : '#F59E0B',
        border: `1px solid ${isConfirmed ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
      }}
    >
      {isConfirmed ? 'Confirmada' : 'Pendente'}
    </span>
  )
}

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: accent ?? 'rgba(255,255,255,0.85)' }}>
        {formatBRL(value)}
      </p>
    </div>
  )
}

function InstallmentRow({ inst }: { inst: FinanceiroInstallment }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>
          {inst.client_name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`} ·{' '}
          {new Date(inst.due_date).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>
        {formatBRL(inst.amount)}
      </p>
      <StatusBadge status={inst.status} />
      <Link
        href={`/financeiro/${inst.client_id}`}
        className="text-xs flex-shrink-0"
        style={{ color: '#3B82F6' }}
      >
        ver →
      </Link>
    </div>
  )
}

export function FinanceiroPainelClient({
  painel,
  members,
  month,
  year,
  vendedorId,
}: {
  painel: FinanceiroPainel
  members: FinanceiroMember[]
  month: number
  year: number
  vendedorId: string
}) {
  const router = useRouter()

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#E0E8F0',
    borderRadius: 10,
    padding: '7px 12px',
    fontSize: 13,
    outline: 'none',
  }

  function applyFilter(params: { month?: number; year?: number; vendedor?: string }) {
    const newMonth = params.month ?? month
    const newYear = params.year ?? year
    const newVendedor = params.vendedor !== undefined ? params.vendedor : vendedorId
    const qs = new URLSearchParams({ month: String(newMonth), year: String(newYear) })
    if (newVendedor) qs.set('vendedor', newVendedor)
    router.push(`/financeiro?${qs.toString()}`)
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col flex-1 overflow-auto px-6 py-5 gap-5">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={month}
          onChange={(e) => applyFilter({ month: Number(e.target.value) })}
          style={selectStyle}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => applyFilter({ year: Number(e.target.value) })}
          style={selectStyle}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={vendedorId}
          onChange={(e) => applyFilter({ vendedor: e.target.value })}
          style={selectStyle}
        >
          <option value="">Todos os vendedores</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card label="Faturamento total" value={painel.faturamento_total} accent="#FFD080" />
        <Card label="A receber" value={painel.a_receber} accent="#3B82F6" />
        <Card label="Em atraso" value={painel.em_atraso} accent="#EF4444" />
      </div>

      {/* Lista de parcelas */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Parcelas do período ({painel.installments.length})
        </p>
        {painel.installments.length === 0 ? (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Nenhuma parcela no período selecionado.
          </p>
        ) : (
          painel.installments.map((inst) => (
            <InstallmentRow key={inst.id} inst={inst} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar /financeiro/[id]/page.tsx**

```tsx
// web/app/(dashboard)/financeiro/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getParcelasByClient } from '@/lib/financeiro/queries'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParcelasClient } from './ParcelasClient'

export default async function FinanceiroClientePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const supabase = await createClient()
  const { data: clientData } = await supabase
    .from('clients')
    .select('id, name, city, pipeline_stage')
    .eq('id', params.id)
    .eq('organization_id', user.membership.organization.id)
    .single()

  if (!clientData) redirect('/financeiro')

  const parcelas = await getParcelasByClient(params.id)

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a href="/financeiro" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          ← Financeiro
        </a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
            {(clientData as any).name}
          </h1>
          {(clientData as any).city && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {(clientData as any).city}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <ParcelasClient
          clientId={params.id}
          parcelas={parcelas}
          pipelineStage={(clientData as any).pipeline_stage}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar ParcelasClient.tsx**

```tsx
// web/app/(dashboard)/financeiro/[id]/ParcelasClient.tsx
'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { confirmInstallment, advanceToProjects } from '@/lib/financeiro/actions'
import type { FinanceiroInstallment } from '@/lib/financeiro/queries'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ParcelasClient({
  clientId,
  parcelas,
  pipelineStage,
}: {
  clientId: string
  parcelas: FinanceiroInstallment[]
  pipelineStage: string
}) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm(installmentId: string) {
    startTransition(async () => {
      const result = await confirmInstallment(installmentId)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  function handleAdvance() {
    startTransition(async () => {
      const result = await advanceToProjects(clientId)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  const total = parcelas.reduce((sum, p) => sum + p.amount, 0)
  const confirmadas = parcelas.filter((p) => p.status === 'confirmada').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total da venda</p>
          <p className="text-base font-semibold mt-1" style={{ color: '#FFD080' }}>{formatBRL(total)}</p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirmado</p>
          <p className="text-base font-semibold mt-1" style={{ color: '#10B981' }}>{formatBRL(confirmadas)}</p>
        </div>
      </div>

      {/* Parcelas */}
      <div className="flex flex-col gap-2">
        {parcelas.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {p.position === 1 ? 'Entrada' : `Parcela ${p.position}`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Venc: {new Date(p.due_date).toLocaleDateString('pt-BR')}
                {p.confirmed_at
                  ? ` · Pago em: ${new Date(p.confirmed_at).toLocaleDateString('pt-BR')}`
                  : ''}
              </p>
            </div>
            <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {formatBRL(p.amount)}
            </p>
            {p.status === 'confirmada' ? (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                ✓ Pago
              </span>
            ) : (
              <Button
                variant="secondary"
                className="text-xs py-1 px-2.5"
                onClick={() => handleConfirm(p.id)}
                loading={isPending}
                type="button"
              >
                Confirmar
              </Button>
            )}
          </div>
        ))}
      </div>

      {message && (
        <p className="text-sm" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>
          {message.text}
        </p>
      )}

      {/* Avançar pipeline */}
      {pipelineStage === 'financeiro' && (
        <div
          className="flex items-center justify-between p-3 rounded-xl mt-2"
          style={{ background: 'rgba(255,200,100,0.05)', border: '1px solid rgba(255,200,100,0.15)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Avançar para Projetos
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Quando o financeiro estiver em ordem
            </p>
          </div>
          <Button
            variant="primary"
            className="text-xs py-1.5 px-3"
            onClick={handleAdvance}
            loading={isPending}
            type="button"
          >
            Avançar →
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit final**

```bash
cd ..
git add web/lib/financeiro/ \
        "web/app/(dashboard)/financeiro/"
git commit -m "feat: modulo Financeiro — painel mensal com filtros e confirmacao de parcelas"
```

---

### Task 8: Verificação final

- [ ] **Step 1: TypeScript check completo**

```bash
cd web && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 2: Testar no browser**

```bash
cd web && npm run dev
```

Checar:
1. `/contratos` — lista carrega (vazia se nenhum cliente no stage)
2. Converter lead → cliente → Tab 7 → enviar contrato → verificar que `pipeline_stage = 'contratos'`
3. `/contratos/[id]` — links do contrato aparecem, status select funciona
4. Confirmar assinatura → cliente some da lista Contratos e aparece em `/financeiro`
5. `/financeiro` — cards mostram valores do mês atual, filtros de mês/ano/vendedor funcionam
6. `/financeiro/[id]` — parcelas listadas, "Confirmar" muda badge para ✓ Pago
7. Botão "Avançar para Projetos" aparece quando `pipeline_stage = 'financeiro'`

---

## Notas para o implementador

**Migration obrigatória antes de testar:** Aplicar `20260618000003_contratos_financeiro.sql` no Supabase Dashboard → SQL Editor.

**`pipeline_stage = 'contratos'`** já é setado automaticamente pela Tab 7 do cadastro de clientes (Upload de contrato em `web/lib/clients/actions.ts:uploadContractFile`).

**Filtro por vendedor no painel financeiro:** Funciona via `clients.lead_id → leads.assigned_to_user_id`. Clientes sem `lead_id` (criados manualmente, sem conversão de lead) não aparecem no filtro por vendedor — ficam visíveis apenas quando "Todos os vendedores" está selecionado.

**`(supabase as any)`** obrigatório para `client_installments`, `client_contracts` e colunas novas em `clients` — não estão nos tipos gerados.
