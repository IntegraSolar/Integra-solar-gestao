# Plano 3c — Entrega do Material + Obra + Entrega da Obra + Pós Obra

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os 4 módulos de pipeline pós-compra: Entrega do Material, Obra, Entrega da Obra e Pós Obra.

**Architecture:** Cada módulo usa `pipeline_flags` JSONB para ativar o próximo automaticamente. Cada módulo tem sua própria tabela, par de queries/actions e 3 arquivos de UI (list page, detail page server, detail component client). O gatilho de entrada de cada módulo cria o registro inicial na tabela seguinte.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS + Storage), `(supabase as any)` para tabelas fora dos tipos gerados, `useTransition` para server actions no client, Tailwind CSS com glassmorphism.

---

## Estrutura de Arquivos

**Criar:**
- `web/supabase/migrations/20260618000005_entrega_obra_pos_obra.sql`
- `web/lib/entrega-material/queries.ts`
- `web/lib/entrega-material/actions.ts`
- `web/app/(dashboard)/entrega-material/page.tsx`
- `web/app/(dashboard)/entrega-material/[id]/page.tsx`
- `web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx`
- `web/lib/obra/queries.ts`
- `web/lib/obra/actions.ts`
- `web/app/(dashboard)/obra/page.tsx`
- `web/app/(dashboard)/obra/[id]/page.tsx`
- `web/app/(dashboard)/obra/[id]/ObraDetail.tsx`
- `web/lib/entrega-obra/queries.ts`
- `web/lib/entrega-obra/actions.ts`
- `web/app/(dashboard)/entrega-obra/page.tsx`
- `web/app/(dashboard)/entrega-obra/[id]/page.tsx`
- `web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx`
- `web/lib/pos-obra/queries.ts`
- `web/lib/pos-obra/actions.ts`
- `web/app/(dashboard)/pos-obra/page.tsx`
- `web/app/(dashboard)/pos-obra/[id]/page.tsx`
- `web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx`

**Modificar:**
- `web/lib/compras/actions.ts` — adicionar trigger `entrega_material` quando status = `'entregue'`

---

## Contexto do Projeto

- Diretório de trabalho: `C:\Users\PC\Desktop\RAFAEL DEV - COPIA DE TESTE\LIMPO\integra-solar-crm-versao-limpa-main`
- App Next.js em `web/`
- Convenção: `(supabase as any)` para tabelas não geradas
- ActionResult type em `@/lib/crm/types`
- getCurrentUserData em `@/lib/org/queries`
- createClient em `@/lib/supabase/server`
- Glassmorphism: fundo dark navy, gold `#FFD080`, bordas `rgba(255,255,255,0.10)`

---

### Task 1: Migration SQL

**Files:**
- Create: `web/supabase/migrations/20260618000005_entrega_obra_pos_obra.sql`

- [ ] **Step 1: Criar o arquivo de migration**

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

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/20260618000005_entrega_obra_pos_obra.sql
git commit -m "feat: add migration for client_deliveries, client_obras, client_obra_deliveries, client_pos_obra"
```

> **Nota para o executor:** Após commit, o usuário precisa aplicar esta migration manualmente no Supabase Dashboard → SQL Editor antes de testar.

---

### Task 2: Modificar upsertPurchase — gatilho entrega_material

**Files:**
- Modify: `web/lib/compras/actions.ts`

- [ ] **Step 1: Adicionar bloco do gatilho entrega_material após o bloco do gatilho comissoes**

Localizar o bloco que termina com:
```typescript
  await (supabase as any)
    .from('clients')
    .update({
      pipeline_flags: newFlags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  revalidatePath('/compras')
  return { success: 'Compra salva.' }
```

Substituir por:
```typescript
  // If entregue: activate entrega_material
  if (data.status === 'entregue' && !currentFlags.entrega_material) {
    newFlags.entrega_material = 'pendente'

    const { data: existingDelivery } = await (supabase as any)
      .from('client_deliveries')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingDelivery) {
      await (supabase as any).from('client_deliveries').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'pendente',
        checklist: { limpeza: false, manuais: false, orientacao_uso: false },
      })
    }
  }

  await (supabase as any)
    .from('clients')
    .update({
      pipeline_flags: newFlags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  revalidatePath('/compras')
  return { success: 'Compra salva.' }
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/compras/actions.ts
git commit -m "feat: upsertPurchase sets entrega_material flag when status=entregue"
```

---

### Task 3: lib/entrega-material/queries.ts

**Files:**
- Create: `web/lib/entrega-material/queries.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/entrega-material/queries.ts
import { createClient } from '@/lib/supabase/server'

export type EntregaMaterialChecklist = {
  limpeza: boolean
  manuais: boolean
  orientacao_uso: boolean
}

export type EntregaMaterialClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_entrega: string | null
  termo_url: string | null
  checklist: EntregaMaterialChecklist
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getEntregasMaterial(): Promise<EntregaMaterialClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>entrega_material', 'is', null)
    .neq('status', 'concluida')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await (supabase as any)
    .from('client_installments')
    .select('client_id, confirmed_at')
    .in('client_id', clientIds)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)

  const parcelaMap: Record<string, string> = {}
  for (const p of parcelas ?? []) {
    parcelaMap[p.client_id] = p.confirmed_at
  }

  return data.map((r: any) => {
    const confirmedAt = parcelaMap[r.client_id] ?? null
    const diasUsados = confirmedAt
      ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_entrega: r.data_entrega ?? null,
      termo_url: r.termo_url ?? null,
      checklist: r.checklist ?? { limpeza: false, manuais: false, orientacao_uso: false },
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getEntregaMaterialById(clientId: string): Promise<EntregaMaterialClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const { data: parcela } = await (supabase as any)
    .from('client_installments')
    .select('confirmed_at')
    .eq('client_id', clientId)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)
    .maybeSingle()

  const confirmedAt = parcela?.confirmed_at ?? null
  const diasUsados = confirmedAt
    ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    checklist: data.checklist ?? { limpeza: false, manuais: false, orientacao_uso: false },
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/entrega-material/queries.ts
git commit -m "feat: add lib/entrega-material/queries.ts"
```

---

### Task 4: lib/entrega-material/actions.ts

**Files:**
- Create: `web/lib/entrega-material/actions.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/entrega-material/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertDeliveryData = {
  data_entrega?: string | null
  termo_url?: string | null
  checklist: {
    limpeza: boolean
    manuais: boolean
    orientacao_uso: boolean
  }
  status: string
}

export async function upsertDelivery(
  clientId: string,
  data: UpsertDeliveryData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const deliveryData = {
    client_id: clientId,
    organization_id: orgId,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    checklist: data.checklist,
    status: data.status,
    updated_at: new Date().toISOString(),
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_deliveries')
      .update(deliveryData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_deliveries')
      .insert(deliveryData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, entrega_material: data.status }

  // If termo_url set and obra not yet activated → activate obra
  if (data.termo_url && !currentFlags.obra) {
    newFlags.obra = 'pendente'

    const { data: existingObra } = await (supabase as any)
      .from('client_obras')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingObra) {
      await (supabase as any).from('client_obras').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'aguardando',
      })
    }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  revalidatePath('/entrega-material')
  return { success: 'Entrega salva.' }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/entrega-material/actions.ts
git commit -m "feat: add lib/entrega-material/actions.ts"
```

---

### Task 5: /entrega-material pages (3 arquivos)

**Files:**
- Create: `web/app/(dashboard)/entrega-material/page.tsx`
- Create: `web/app/(dashboard)/entrega-material/[id]/page.tsx`
- Create: `web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx`

- [ ] **Step 1: Criar `web/app/(dashboard)/entrega-material/page.tsx`**

```tsx
// web/app/(dashboard)/entrega-material/page.tsx
import Link from 'next/link'
import { getEntregasMaterial } from '@/lib/entrega-material/queries'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { pendente: 'Pendente', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function EntregaMaterialPage() {
  const entregas = await getEntregasMaterial()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Entrega do Material</h1>
        <p className="text-white/50 text-sm mt-1">Confirmação de entrega dos materiais ao cliente</p>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Cidade</th>
              <th className="text-left px-4 py-3 font-medium">Prazo</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entregas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Nenhuma entrega pendente.
                </td>
              </tr>
            )}
            {entregas.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.client_name}</td>
                <td className="px-4 py-3 text-white/60">{e.client_city ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">
                  {e.contract_max_days ? `${e.dias_usados} / ${e.contract_max_days} dias` : `${e.dias_usados} dias`}
                </td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/entrega-material/${e.client_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: 'rgba(255,208,128,0.4)', color: '#FFD080' }}
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `web/app/(dashboard)/entrega-material/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/entrega-material/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEntregaMaterialById } from '@/lib/entrega-material/queries'
import EntregaMaterialDetail from './EntregaMaterialDetail'

export default async function EntregaMaterialDetailPage({ params }: { params: { id: string } }) {
  const entrega = await getEntregaMaterialById(params.id)
  if (!entrega) notFound()
  return <EntregaMaterialDetail entrega={entrega} clientId={params.id} />
}
```

- [ ] **Step 3: Criar `web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx`**

```tsx
// web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EntregaMaterialClient } from '@/lib/entrega-material/queries'
import { upsertDelivery } from '@/lib/entrega-material/actions'

export default function EntregaMaterialDetail({
  entrega,
  clientId,
}: {
  entrega: EntregaMaterialClient
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    data_entrega: entrega.data_entrega ?? '',
    termo_url: entrega.termo_url ?? '',
    status: entrega.status,
    checklist: { ...entrega.checklist },
  })

  function handleCheckbox(key: keyof typeof form.checklist) {
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertDelivery(clientId, {
        data_entrega: form.data_entrega || null,
        termo_url: form.termo_url || null,
        checklist: form.checklist,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/entrega-material')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'rgba(255,255,255,0.04)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{entrega.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{entrega.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${entrega.status === 'concluida' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
          {entrega.status === 'concluida' ? 'Concluída' : 'Pendente'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{entrega.dias_usados} / {entrega.contract_max_days ?? '—'} dias</span>
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Checklist de Entrega</h2>
        {([
          ['limpeza', 'Limpeza do local'],
          ['manuais', 'Entrega dos manuais'],
          ['orientacao_uso', 'Orientação de uso'],
        ] as [keyof typeof form.checklist, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.checklist[key]} onChange={() => handleCheckbox(key)} className="w-4 h-4 accent-yellow-400" />
            <span className="text-sm text-white/80">{label}</span>
          </label>
        ))}
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados da Entrega</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data de entrega ao cliente</label>
            <input type="date" value={form.data_entrega} onChange={(e) => setForm((f) => ({ ...f, data_entrega: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>URL do termo de entrega assinado</label>
            <input type="url" value={form.termo_url} onChange={(e) => setForm((f) => ({ ...f, termo_url: e.target.value }))} className={inputCls} placeholder="https://..." />
          </div>
          {entrega.termo_url && (
            <div className="col-span-2">
              <a href={entrega.termo_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: '#FFD080' }}>Ver termo atual</a>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: '#FFD080', color: '#0a0e1a' }}>
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/(dashboard)/entrega-material/
git commit -m "feat: add /entrega-material pages"
```

---

### Task 6: lib/obra/queries.ts

**Files:**
- Create: `web/lib/obra/queries.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/obra/queries.ts
import { createClient } from '@/lib/supabase/server'

export type ObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_inicio: string | null
  data_prevista: string | null
  status: string
  responsavel_id: string | null
  responsavel_name: string | null
  equipe_nome: string | null
  dias_usados: number
  contract_max_days: number | null
}

export type ObraMember = {
  id: string
  name: string
}

export async function getObras(): Promise<ObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obras')
    .select(`
      id,
      client_id,
      data_inicio,
      data_prevista,
      status,
      responsavel_id,
      equipe_nome,
      clients!inner (
        name,
        city,
        contract_max_days,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>obra', 'is', null)
    .neq('status', 'concluida')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await (supabase as any)
    .from('client_installments')
    .select('client_id, confirmed_at')
    .in('client_id', clientIds)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)

  const parcelaMap: Record<string, string> = {}
  for (const p of parcelas ?? []) {
    parcelaMap[p.client_id] = p.confirmed_at
  }

  const responsavelIds = Array.from(new Set(data.map((r: any) => r.responsavel_id).filter(Boolean))) as string[]
  const responsavelMap: Record<string, string> = {}
  if (responsavelIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, name')
      .in('id', responsavelIds)
    for (const p of profiles ?? []) {
      responsavelMap[p.id] = p.name
    }
  }

  return data.map((r: any) => {
    const confirmedAt = parcelaMap[r.client_id] ?? null
    const diasUsados = confirmedAt
      ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_inicio: r.data_inicio ?? null,
      data_prevista: r.data_prevista ?? null,
      status: r.status,
      responsavel_id: r.responsavel_id ?? null,
      responsavel_name: r.responsavel_id ? (responsavelMap[r.responsavel_id] ?? null) : null,
      equipe_nome: r.equipe_nome ?? null,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getObraById(clientId: string): Promise<ObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obras')
    .select(`
      id,
      client_id,
      data_inicio,
      data_prevista,
      status,
      responsavel_id,
      equipe_nome,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const { data: parcela } = await (supabase as any)
    .from('client_installments')
    .select('confirmed_at')
    .eq('client_id', clientId)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)
    .maybeSingle()

  const confirmedAt = parcela?.confirmed_at ?? null
  const diasUsados = confirmedAt
    ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
    : 0

  let responsavelName: string | null = null
  if (data.responsavel_id) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('name')
      .eq('id', data.responsavel_id)
      .single()
    responsavelName = profile?.name ?? null
  }

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_inicio: data.data_inicio ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    responsavel_id: data.responsavel_id ?? null,
    responsavel_name: responsavelName,
    equipe_nome: data.equipe_nome ?? null,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}

export async function getObraMembers(): Promise<ObraMember[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any).from('profiles').select('id, name').order('name')
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.name }))
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/obra/queries.ts
git commit -m "feat: add lib/obra/queries.ts"
```

---

### Task 7: lib/obra/actions.ts

**Files:**
- Create: `web/lib/obra/actions.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/obra/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertObraData = {
  data_inicio?: string | null
  data_prevista?: string | null
  status: string
  responsavel_id?: string | null
  equipe_nome?: string | null
}

export async function upsertObra(
  clientId: string,
  data: UpsertObraData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_obras')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const obraData = {
    client_id: clientId,
    organization_id: orgId,
    data_inicio: data.data_inicio ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    responsavel_id: data.responsavel_id ?? null,
    equipe_nome: data.equipe_nome ?? null,
    updated_at: new Date().toISOString(),
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_obras')
      .update(obraData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_obras')
      .insert(obraData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, obra: data.status }

  // If concluida → activate entrega_obra
  if (data.status === 'concluida' && !currentFlags.entrega_obra) {
    newFlags.entrega_obra = 'pendente'

    const { data: existingObraDelivery } = await (supabase as any)
      .from('client_obra_deliveries')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingObraDelivery) {
      await (supabase as any).from('client_obra_deliveries').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'pendente',
        checklist: { limpeza: false, manuais: false, orientacao_uso: false },
      })
    }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  revalidatePath('/obra')
  return { success: 'Obra salva.' }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/obra/actions.ts
git commit -m "feat: add lib/obra/actions.ts"
```

---

### Task 8: /obra pages (3 arquivos)

**Files:**
- Create: `web/app/(dashboard)/obra/page.tsx`
- Create: `web/app/(dashboard)/obra/[id]/page.tsx`
- Create: `web/app/(dashboard)/obra/[id]/ObraDetail.tsx`

- [ ] **Step 1: Criar `web/app/(dashboard)/obra/page.tsx`**

```tsx
// web/app/(dashboard)/obra/page.tsx
import Link from 'next/link'
import { getObras } from '@/lib/obra/queries'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    em_andamento: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { aguardando: 'Aguardando', em_andamento: 'Em Andamento', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function ObraPage() {
  const obras = await getObras()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Obra</h1>
        <p className="text-white/50 text-sm mt-1">Acompanhamento da instalação</p>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Equipe</th>
              <th className="text-left px-4 py-3 font-medium">Data Prevista</th>
              <th className="text-left px-4 py-3 font-medium">Prazo</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {obras.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/40">Nenhuma obra em andamento.</td></tr>
            )}
            {obras.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{o.client_name}</td>
                <td className="px-4 py-3 text-white/60">{o.equipe_nome ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{o.data_prevista ? new Date(o.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3 text-white/60">{o.contract_max_days ? `${o.dias_usados} / ${o.contract_max_days} dias` : `${o.dias_usados} dias`}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/obra/${o.client_id}`} className="text-xs px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'rgba(255,208,128,0.4)', color: '#FFD080' }}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `web/app/(dashboard)/obra/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getObraById, getObraMembers } from '@/lib/obra/queries'
import ObraDetail from './ObraDetail'

export default async function ObraDetailPage({ params }: { params: { id: string } }) {
  const [obra, members] = await Promise.all([getObraById(params.id), getObraMembers()])
  if (!obra) notFound()
  return <ObraDetail obra={obra} members={members} clientId={params.id} />
}
```

- [ ] **Step 3: Criar `web/app/(dashboard)/obra/[id]/ObraDetail.tsx`**

```tsx
// web/app/(dashboard)/obra/[id]/ObraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ObraClient, ObraMember } from '@/lib/obra/queries'
import { upsertObra } from '@/lib/obra/actions'

const STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
]

const STATUS_BADGE: Record<string, string> = {
  aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  em_andamento: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
}

export default function ObraDetail({ obra, members, clientId }: { obra: ObraClient; members: ObraMember[]; clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    data_inicio: obra.data_inicio ?? '',
    data_prevista: obra.data_prevista ?? '',
    status: obra.status,
    responsavel_id: obra.responsavel_id ?? '',
    equipe_nome: obra.equipe_nome ?? '',
  })

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertObra(clientId, {
        data_inicio: form.data_inicio || null,
        data_prevista: form.data_prevista || null,
        status: form.status,
        responsavel_id: form.responsavel_id || null,
        equipe_nome: form.equipe_nome || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/obra')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'rgba(255,255,255,0.04)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{obra.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{obra.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${STATUS_BADGE[obra.status] ?? 'bg-gray-500/20 text-gray-300'}`}>
          {STATUS_OPTIONS.find((o) => o.value === obra.status)?.label ?? obra.status}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{obra.dias_usados} / {obra.contract_max_days ?? '—'} dias</span>
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados da Obra</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data de início</label>
            <input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Data prevista de conclusão</label>
            <input type="date" value={form.data_prevista} onChange={(e) => setForm((f) => ({ ...f, data_prevista: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Responsável pela instalação</label>
            <select value={form.responsavel_id} onChange={(e) => setForm((f) => ({ ...f, responsavel_id: e.target.value }))} className={inputCls}>
              <option value="">— Selecionar —</option>
              {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nome da equipe</label>
            <input type="text" value={form.equipe_nome} onChange={(e) => setForm((f) => ({ ...f, equipe_nome: e.target.value }))} className={inputCls} placeholder="Ex: Equipe Alpha" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: '#FFD080', color: '#0a0e1a' }}>
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/(dashboard)/obra/
git commit -m "feat: add /obra pages"
```

---

### Task 9: lib/entrega-obra/queries.ts

**Files:**
- Create: `web/lib/entrega-obra/queries.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/entrega-obra/queries.ts
import { createClient } from '@/lib/supabase/server'

export type EntregaObraChecklist = {
  limpeza: boolean
  manuais: boolean
  orientacao_uso: boolean
}

export type EntregaObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_entrega: string | null
  termo_url: string | null
  checklist: EntregaObraChecklist
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getEntregasObra(): Promise<EntregaObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obra_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>entrega_obra', 'is', null)
    .neq('status', 'concluida')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await (supabase as any)
    .from('client_installments')
    .select('client_id, confirmed_at')
    .in('client_id', clientIds)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)

  const parcelaMap: Record<string, string> = {}
  for (const p of parcelas ?? []) {
    parcelaMap[p.client_id] = p.confirmed_at
  }

  return data.map((r: any) => {
    const confirmedAt = parcelaMap[r.client_id] ?? null
    const diasUsados = confirmedAt
      ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_entrega: r.data_entrega ?? null,
      termo_url: r.termo_url ?? null,
      checklist: r.checklist ?? { limpeza: false, manuais: false, orientacao_uso: false },
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getEntregaObraById(clientId: string): Promise<EntregaObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obra_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const { data: parcela } = await (supabase as any)
    .from('client_installments')
    .select('confirmed_at')
    .eq('client_id', clientId)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)
    .maybeSingle()

  const confirmedAt = parcela?.confirmed_at ?? null
  const diasUsados = confirmedAt
    ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    checklist: data.checklist ?? { limpeza: false, manuais: false, orientacao_uso: false },
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/entrega-obra/queries.ts
git commit -m "feat: add lib/entrega-obra/queries.ts"
```

---

### Task 10: lib/entrega-obra/actions.ts

**Files:**
- Create: `web/lib/entrega-obra/actions.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/entrega-obra/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertObraDeliveryData = {
  data_entrega?: string | null
  termo_url?: string | null
  checklist: {
    limpeza: boolean
    manuais: boolean
    orientacao_uso: boolean
  }
  status: string
}

export async function upsertObraDelivery(
  clientId: string,
  data: UpsertObraDeliveryData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_obra_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const deliveryData = {
    client_id: clientId,
    organization_id: orgId,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    checklist: data.checklist,
    status: data.status,
    updated_at: new Date().toISOString(),
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_obra_deliveries')
      .update(deliveryData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_obra_deliveries')
      .insert(deliveryData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, entrega_obra: data.status }

  // If data_entrega set → activate pos_obra
  if (data.data_entrega && !currentFlags.pos_obra) {
    newFlags.pos_obra = 'pendente'

    const { data: existingPosObra } = await (supabase as any)
      .from('client_pos_obra')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingPosObra) {
      await (supabase as any).from('client_pos_obra').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'pendente',
      })
    }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  revalidatePath('/entrega-obra')
  return { success: 'Entrega da obra salva.' }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/entrega-obra/actions.ts
git commit -m "feat: add lib/entrega-obra/actions.ts"
```

---

### Task 11: /entrega-obra pages (3 arquivos)

**Files:**
- Create: `web/app/(dashboard)/entrega-obra/page.tsx`
- Create: `web/app/(dashboard)/entrega-obra/[id]/page.tsx`
- Create: `web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx`

- [ ] **Step 1: Criar `web/app/(dashboard)/entrega-obra/page.tsx`**

```tsx
// web/app/(dashboard)/entrega-obra/page.tsx
import Link from 'next/link'
import { getEntregasObra } from '@/lib/entrega-obra/queries'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { pendente: 'Pendente', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function EntregaObraPage() {
  const entregas = await getEntregasObra()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Entrega da Obra</h1>
        <p className="text-white/50 text-sm mt-1">Entrega formal da obra concluída ao cliente</p>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Cidade</th>
              <th className="text-left px-4 py-3 font-medium">Prazo</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entregas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-white/40">Nenhuma entrega de obra pendente.</td></tr>
            )}
            {entregas.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.client_name}</td>
                <td className="px-4 py-3 text-white/60">{e.client_city ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{e.contract_max_days ? `${e.dias_usados} / ${e.contract_max_days} dias` : `${e.dias_usados} dias`}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/entrega-obra/${e.client_id}`} className="text-xs px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'rgba(255,208,128,0.4)', color: '#FFD080' }}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `web/app/(dashboard)/entrega-obra/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/entrega-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEntregaObraById } from '@/lib/entrega-obra/queries'
import EntregaObraDetail from './EntregaObraDetail'

export default async function EntregaObraDetailPage({ params }: { params: { id: string } }) {
  const entrega = await getEntregaObraById(params.id)
  if (!entrega) notFound()
  return <EntregaObraDetail entrega={entrega} clientId={params.id} />
}
```

- [ ] **Step 3: Criar `web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx`**

```tsx
// web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EntregaObraClient } from '@/lib/entrega-obra/queries'
import { upsertObraDelivery } from '@/lib/entrega-obra/actions'

export default function EntregaObraDetail({ entrega, clientId }: { entrega: EntregaObraClient; clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    data_entrega: entrega.data_entrega ?? '',
    termo_url: entrega.termo_url ?? '',
    status: entrega.status,
    checklist: { ...entrega.checklist },
  })

  function handleCheckbox(key: keyof typeof form.checklist) {
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertObraDelivery(clientId, {
        data_entrega: form.data_entrega || null,
        termo_url: form.termo_url || null,
        checklist: form.checklist,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/entrega-obra')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'rgba(255,255,255,0.04)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{entrega.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{entrega.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${entrega.status === 'concluida' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
          {entrega.status === 'concluida' ? 'Concluída' : 'Pendente'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{entrega.dias_usados} / {entrega.contract_max_days ?? '—'} dias</span>
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Checklist de Entrega</h2>
        {([
          ['limpeza', 'Limpeza do local'],
          ['manuais', 'Entrega dos manuais'],
          ['orientacao_uso', 'Orientação de uso'],
        ] as [keyof typeof form.checklist, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.checklist[key]} onChange={() => handleCheckbox(key)} className="w-4 h-4 accent-yellow-400" />
            <span className="text-sm text-white/80">{label}</span>
          </label>
        ))}
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados da Entrega</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data de entrega ao cliente</label>
            <input type="date" value={form.data_entrega} onChange={(e) => setForm((f) => ({ ...f, data_entrega: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>URL do termo de entrega assinado</label>
            <input type="url" value={form.termo_url} onChange={(e) => setForm((f) => ({ ...f, termo_url: e.target.value }))} className={inputCls} placeholder="https://..." />
          </div>
          {entrega.termo_url && (
            <div className="col-span-2">
              <a href={entrega.termo_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: '#FFD080' }}>Ver termo atual</a>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: '#FFD080', color: '#0a0e1a' }}>
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/(dashboard)/entrega-obra/
git commit -m "feat: add /entrega-obra pages"
```

---

### Task 12: lib/pos-obra/queries.ts

**Files:**
- Create: `web/lib/pos-obra/queries.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/pos-obra/queries.ts
import { createClient } from '@/lib/supabase/server'

export type MonitoramentoData = {
  app: string
  usuario: string
  senha: string
}

export type PosObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_ativacao: string | null
  parecer_url: string | null
  ocorrencias: string | null
  monitoramento: MonitoramentoData | null
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getPosObras(): Promise<PosObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_pos_obra')
    .select(`
      id,
      client_id,
      data_ativacao,
      parecer_url,
      ocorrencias,
      monitoramento,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>pos_obra', 'is', null)
    .neq('status', 'concluida')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await (supabase as any)
    .from('client_installments')
    .select('client_id, confirmed_at')
    .in('client_id', clientIds)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)

  const parcelaMap: Record<string, string> = {}
  for (const p of parcelas ?? []) {
    parcelaMap[p.client_id] = p.confirmed_at
  }

  return data.map((r: any) => {
    const confirmedAt = parcelaMap[r.client_id] ?? null
    const diasUsados = confirmedAt
      ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_ativacao: r.data_ativacao ?? null,
      parecer_url: r.parecer_url ?? null,
      ocorrencias: r.ocorrencias ?? null,
      monitoramento: r.monitoramento ?? null,
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getPosObraById(clientId: string): Promise<PosObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_pos_obra')
    .select(`
      id,
      client_id,
      data_ativacao,
      parecer_url,
      ocorrencias,
      monitoramento,
      status,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const { data: parcela } = await (supabase as any)
    .from('client_installments')
    .select('confirmed_at')
    .eq('client_id', clientId)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)
    .maybeSingle()

  const confirmedAt = parcela?.confirmed_at ?? null
  const diasUsados = confirmedAt
    ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_ativacao: data.data_ativacao ?? null,
    parecer_url: data.parecer_url ?? null,
    ocorrencias: data.ocorrencias ?? null,
    monitoramento: data.monitoramento ?? null,
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/pos-obra/queries.ts
git commit -m "feat: add lib/pos-obra/queries.ts"
```

---

### Task 13: lib/pos-obra/actions.ts

**Files:**
- Create: `web/lib/pos-obra/actions.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/pos-obra/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertPosObraData = {
  data_ativacao?: string | null
  parecer_url?: string | null
  ocorrencias?: string | null
  monitoramento?: {
    app: string
    usuario: string
    senha: string
  } | null
  status: string
}

export async function upsertPosObra(
  clientId: string,
  data: UpsertPosObraData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_pos_obra')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const posObraData = {
    client_id: clientId,
    organization_id: orgId,
    data_ativacao: data.data_ativacao ?? null,
    parecer_url: data.parecer_url ?? null,
    ocorrencias: data.ocorrencias ?? null,
    monitoramento: data.monitoramento ?? null,
    status: data.status,
    updated_at: new Date().toISOString(),
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_pos_obra')
      .update(posObraData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_pos_obra')
      .insert(posObraData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}

  await (supabase as any)
    .from('clients')
    .update({
      pipeline_flags: { ...currentFlags, pos_obra: data.status },
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  revalidatePath('/pos-obra')
  return { success: 'Pós obra salva.' }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/pos-obra/actions.ts
git commit -m "feat: add lib/pos-obra/actions.ts"
```

---

### Task 14: /pos-obra pages (3 arquivos)

**Files:**
- Create: `web/app/(dashboard)/pos-obra/page.tsx`
- Create: `web/app/(dashboard)/pos-obra/[id]/page.tsx`
- Create: `web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx`

- [ ] **Step 1: Criar `web/app/(dashboard)/pos-obra/page.tsx`**

```tsx
// web/app/(dashboard)/pos-obra/page.tsx
import Link from 'next/link'
import { getPosObras } from '@/lib/pos-obra/queries'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { pendente: 'Pendente', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function PosObraPage() {
  const posObras = await getPosObras()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pós Obra</h1>
        <p className="text-white/50 text-sm mt-1">Ativação junto à concessionária e monitoramento</p>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Cidade</th>
              <th className="text-left px-4 py-3 font-medium">Data Ativação</th>
              <th className="text-left px-4 py-3 font-medium">Prazo</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {posObras.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/40">Nenhum pós obra em andamento.</td></tr>
            )}
            {posObras.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.client_name}</td>
                <td className="px-4 py-3 text-white/60">{p.client_city ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{p.data_ativacao ? new Date(p.data_ativacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3 text-white/60">{p.contract_max_days ? `${p.dias_usados} / ${p.contract_max_days} dias` : `${p.dias_usados} dias`}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/pos-obra/${p.client_id}`} className="text-xs px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'rgba(255,208,128,0.4)', color: '#FFD080' }}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `web/app/(dashboard)/pos-obra/[id]/page.tsx`**

```tsx
// web/app/(dashboard)/pos-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getPosObraById } from '@/lib/pos-obra/queries'
import PosObraDetail from './PosObraDetail'

export default async function PosObraDetailPage({ params }: { params: { id: string } }) {
  const posObra = await getPosObraById(params.id)
  if (!posObra) notFound()
  return <PosObraDetail posObra={posObra} clientId={params.id} />
}
```

- [ ] **Step 3: Criar `web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx`**

```tsx
// web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PosObraClient } from '@/lib/pos-obra/queries'
import { upsertPosObra } from '@/lib/pos-obra/actions'

export default function PosObraDetail({ posObra, clientId }: { posObra: PosObraClient; clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSenha, setShowSenha] = useState(false)

  const [form, setForm] = useState({
    data_ativacao: posObra.data_ativacao ?? '',
    parecer_url: posObra.parecer_url ?? '',
    ocorrencias: posObra.ocorrencias ?? '',
    status: posObra.status,
    monitoramento: {
      app: posObra.monitoramento?.app ?? '',
      usuario: posObra.monitoramento?.usuario ?? '',
      senha: posObra.monitoramento?.senha ?? '',
    },
  })

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const hasMonitoramento = form.monitoramento.app || form.monitoramento.usuario || form.monitoramento.senha
      const result = await upsertPosObra(clientId, {
        data_ativacao: form.data_ativacao || null,
        parecer_url: form.parecer_url || null,
        ocorrencias: form.ocorrencias || null,
        monitoramento: hasMonitoramento ? form.monitoramento : null,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/pos-obra')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'rgba(255,255,255,0.04)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{posObra.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{posObra.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${posObra.status === 'concluida' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
          {posObra.status === 'concluida' ? 'Concluída' : 'Pendente'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{posObra.dias_usados} / {posObra.contract_max_days ?? '—'} dias</span>
      </div>

      {/* Ativação */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Ativação junto à Concessionária</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data de ativação</label>
            <input type="date" value={form.data_ativacao} onChange={(e) => setForm((f) => ({ ...f, data_ativacao: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>URL do parecer de acesso / aprovação</label>
            <input type="url" value={form.parecer_url} onChange={(e) => setForm((f) => ({ ...f, parecer_url: e.target.value }))} className={inputCls} placeholder="https://..." />
          </div>
          {posObra.parecer_url && (
            <div className="col-span-2">
              <a href={posObra.parecer_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: '#FFD080' }}>Ver parecer atual</a>
            </div>
          )}
        </div>
      </div>

      {/* Ocorrências */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Ocorrências / Reclamações</h2>
        <textarea
          value={form.ocorrencias}
          onChange={(e) => setForm((f) => ({ ...f, ocorrencias: e.target.value }))}
          className={inputCls + ' min-h-[80px] resize-none'}
          placeholder="Registre aqui ocorrências ou reclamações pós-instalação..."
        />
      </div>

      {/* Monitoramento */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Monitoramento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nome do app de monitoramento</label>
            <input type="text" value={form.monitoramento.app} onChange={(e) => setForm((f) => ({ ...f, monitoramento: { ...f.monitoramento, app: e.target.value } }))} className={inputCls} placeholder="Ex: SolarEdge, Growatt, Fronius..." />
          </div>
          <div>
            <label className={labelCls}>Usuário</label>
            <input type="text" value={form.monitoramento.usuario} onChange={(e) => setForm((f) => ({ ...f, monitoramento: { ...f.monitoramento, usuario: e.target.value } }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Senha</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={form.monitoramento.senha}
                onChange={(e) => setForm((f) => ({ ...f, monitoramento: { ...f.monitoramento, senha: e.target.value } }))}
                className={inputCls + ' pr-16'}
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                {showSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: '#FFD080', color: '#0a0e1a' }}>
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/(dashboard)/pos-obra/
git commit -m "feat: add /pos-obra pages"
```

---

### Task 15: Verificação final — TypeScript

**Files:**
- No files created/modified

- [ ] **Step 1: Rodar tsc**

```bash
cd web && npx tsc --noEmit 2>&1 | head -80
```

Expected: zero output (sem erros).

- [ ] **Step 2: Se houver erros, corrigir e re-rodar**

Erros comuns:
- `Array.from(new Set(...))` em vez de `[...new Set(...)]` (downlevelIteration)
- Explicit `Record<string, string>` em flags
- Tipos faltando em props de componentes

- [ ] **Step 3: Commit dos fixes se necessário**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors in plan 3c"
```
