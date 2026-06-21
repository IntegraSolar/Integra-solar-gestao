# Novos Módulos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar Estoque, Relatórios e Treinamento; reorganizar sidebar em dois grupos com separador; substituir emojis por ícones lucide-react monocromáticos.

**Architecture:** Sidebar refatorada com dois grupos + lucide-react. Estoque com tabela `stock_items` e CRUD. Relatórios com 4 abas e PDF via `window.print()`. Treinamento estático com cards YouTube.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, lucide-react, glassmorphism theme (navy + #FFD080), `(supabase as any)` para tabelas novas, Server Actions.

---

### Task 1: Instalar lucide-react e refatorar Sidebar

**Files:**
- Modify: `web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Instalar lucide-react**

```bash
cd web && npm install lucide-react
```

Expected: package instalado sem erros.

- [ ] **Step 2: Reescrever Sidebar.tsx**

Substituir o arquivo completo por:

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { CurrentUserData } from '@/lib/org/queries'
import {
  LayoutDashboard, Users, UserCheck, FileText, DollarSign,
  Drafting, ShoppingCart, Banknote, Package, Wrench,
  CheckSquare, Star, Settings, BarChart2, GraduationCap,
  Archive, LogOut,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  moduleKey?: string
}

const PIPELINE_ITEMS: NavItem[] = [
  { label: 'Dashboard',           href: '/dashboard',        icon: LayoutDashboard,  moduleKey: 'dashboard' },
  { label: 'CRM / Leads',         href: '/leads',            icon: Users,            moduleKey: 'leads' },
  { label: 'Clientes',            href: '/clientes',         icon: UserCheck,        moduleKey: 'clientes' },
  { label: 'Contratos',           href: '/contratos',        icon: FileText,         moduleKey: 'contratos' },
  { label: 'Financeiro',          href: '/financeiro',       icon: DollarSign,       moduleKey: 'financeiro' },
  { label: 'Projetos',            href: '/projetos',         icon: Drafting,         moduleKey: 'projetos' },
  { label: 'Compras',             href: '/compras',          icon: ShoppingCart,     moduleKey: 'compras' },
  { label: 'Comissões',           href: '/comissoes',        icon: Banknote,         moduleKey: 'comissoes' },
  { label: 'Entrega do Material', href: '/entrega-material', icon: Package,          moduleKey: 'entrega_material' },
  { label: 'Obra',                href: '/obra',             icon: Wrench,           moduleKey: 'obra' },
  { label: 'Entrega da Obra',     href: '/entrega-obra',     icon: CheckSquare,      moduleKey: 'entrega_obra' },
  { label: 'Pós Obra',            href: '/pos-obra',         icon: Star,             moduleKey: 'pos_obra' },
]

const SUPPORT_ITEMS: NavItem[] = [
  { label: 'Estoque',      href: '/estoque',      icon: Archive,        moduleKey: 'estoque' },
  { label: 'Relatórios',   href: '/relatorios',   icon: BarChart2,      moduleKey: 'relatorios' },
  { label: 'Treinamento',  href: '/treinamento',  icon: GraduationCap,  moduleKey: 'treinamento' },
  { label: 'Configurações',href: '/configuracoes', icon: Settings,      moduleKey: 'configuracoes' },
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
    gerente: 'Gerente',
    vendedor: 'Vendedor',
    instalador: 'Instalador',
    projetista: 'Projetista',
    manager: 'Gerente',
    user: 'Usuário',
  }

  const isAdmin = ['owner', 'admin'].includes(user.membership?.role ?? '')

  function filterItems(items: NavItem[]) {
    if (isAdmin) return items
    return items.filter((item) => {
      if (!item.moduleKey) return true
      return user.membership?.permissions?.[item.moduleKey]?.access === true
    })
  }

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    const color = isActive ? '#FFD080' : 'rgba(255,255,255,0.4)'
    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium my-0.5 transition-all"
        style={isActive ? { color: '#FFD080', background: 'rgba(255,200,100,0.08)', fontWeight: 600 } : undefined}
      >
        <Icon size={15} style={{ color, flexShrink: 0 }} />
        <span style={{ color }}>{item.label}</span>
      </Link>
    )
  }

  const pipelineVisible = filterItems(PIPELINE_ITEMS)
  const supportVisible = filterItems(SUPPORT_ITEMS)

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-56 flex flex-col z-50"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Image
          src="/Logo integra solar - sem nome.png"
          alt="Integra Solar"
          width={36}
          height={36}
          className="object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {pipelineVisible.map(renderItem)}

        {/* Separador */}
        <div className="mx-3 my-2 flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[9px] font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
            OUTROS
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {supportVisible.map(renderItem)}
      </nav>

      {/* User area */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="flex items-center gap-2 p-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-[#1A1A1A] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FFD080, #FF9F40)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">
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
              className="transition-colors p-1 rounded text-white/25 hover:text-red-400"
            >
              <LogOut size={14} />
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

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "sidebar\|lucide"
```

Expected: sem erros relacionados.

- [ ] **Step 4: Commit**

```bash
cd web && git add components/layout/Sidebar.tsx package.json package-lock.json
git commit -m "feat: refactor sidebar with lucide-react icons and pipeline/support groups"
```

---

### Task 2: Migration — stock_items

**Files:**
- Create: `web/supabase/migrations/20260618000007_estoque.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- web/supabase/migrations/20260618000007_estoque.sql

create table public.stock_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  quantity        numeric(12,3) not null default 0,
  unit_value      numeric(12,2) not null default 0,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.stock_items enable row level security;

create policy "stock_items_isolation" on public.stock_items
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

- [ ] **Step 2: Aplicar migration no Supabase**

Copiar o SQL acima e executar no SQL Editor do Supabase Dashboard.
Confirmar com o usuário que foi aplicado.

- [ ] **Step 3: Commit**

```bash
cd web && git add supabase/migrations/20260618000007_estoque.sql
git commit -m "feat: add stock_items migration"
```

---

### Task 3: Estoque — lib (queries + actions)

**Files:**
- Create: `web/lib/estoque/queries.ts`
- Create: `web/lib/estoque/actions.ts`

- [ ] **Step 1: Criar queries.ts**

```typescript
// web/lib/estoque/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type StockItem = {
  id: string
  name: string
  quantity: number
  unit_value: number
  total_value: number
  description: string | null
}

export async function getStockItems(): Promise<StockItem[]> {
  const supabase = await createClient()
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const { data, error } = await (supabase as any)
    .from('stock_items')
    .select('id, name, quantity, unit_value, description')
    .eq('organization_id', orgId)
    .order('name')

  if (error || !data) return []

  return (data as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    quantity: Number(r.quantity),
    unit_value: Number(r.unit_value),
    total_value: Number(r.quantity) * Number(r.unit_value),
    description: r.description ?? null,
  }))
}
```

- [ ] **Step 2: Criar actions.ts**

```typescript
// web/lib/estoque/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function createStockItem(data: {
  name: string
  quantity: number
  unit_value: number
  description: string | null
}): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any).from('stock_items').insert({
    organization_id: orgId,
    name: data.name,
    quantity: data.quantity,
    unit_value: data.unit_value,
    description: data.description ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item criado.' }
}

export async function updateStockItem(
  id: string,
  data: {
    name: string
    quantity: number
    unit_value: number
    description: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('stock_items')
    .update({
      name: data.name,
      quantity: data.quantity,
      unit_value: data.unit_value,
      description: data.description ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item atualizado.' }
}

export async function deleteStockItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('stock_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item removido.' }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "estoque"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd web && git add lib/estoque/
git commit -m "feat: add estoque queries and actions"
```

---

### Task 4: Estoque — página

**Files:**
- Create: `web/app/(dashboard)/estoque/page.tsx`
- Create: `web/app/(dashboard)/estoque/EstoqueClient.tsx`

- [ ] **Step 1: Criar page.tsx**

```tsx
// web/app/(dashboard)/estoque/page.tsx
import { getStockItems } from '@/lib/estoque/queries'
import EstoqueClient from './EstoqueClient'

export default async function EstoquePage() {
  const items = await getStockItems()
  return <EstoqueClient initialItems={items} />
}
```

- [ ] **Step 2: Criar EstoqueClient.tsx**

```tsx
// web/app/(dashboard)/estoque/EstoqueClient.tsx
'use client'

import { useState, useTransition } from 'react'
import type { StockItem } from '@/lib/estoque/queries'
import { createStockItem, updateStockItem, deleteStockItem } from '@/lib/estoque/actions'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type FormData = {
  name: string
  quantity: string
  unit_value: string
  description: string
}

const EMPTY_FORM: FormData = { name: '', quantity: '', unit_value: '', description: '' }

export default function EstoqueClient({ initialItems }: { initialItems: StockItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  function openEdit(item: StockItem) {
    setEditing(item)
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit_value: String(item.unit_value),
      description: item.description ?? '',
    })
    setError(null)
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    const quantity = parseFloat(form.quantity)
    const unit_value = parseFloat(form.unit_value)
    if (isNaN(quantity) || quantity < 0) { setError('Quantidade inválida.'); return }
    if (isNaN(unit_value) || unit_value < 0) { setError('Valor unitário inválido.'); return }

    startTransition(async () => {
      const data = {
        name: form.name.trim(),
        quantity,
        unit_value,
        description: form.description.trim() || null,
      }
      const result = editing
        ? await updateStockItem(editing.id, data)
        : await createStockItem(data)

      if (result.error) { setError(result.error); return }

      // optimistic update
      if (editing) {
        setItems((prev) => prev.map((i) =>
          i.id === editing.id
            ? { ...i, ...data, total_value: quantity * unit_value }
            : i
        ))
      } else {
        // reload page to get new id
        window.location.reload()
        return
      }
      setShowModal(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteStockItem(id)
      if (result.error) { setError(result.error); return }
      setItems((prev) => prev.filter((i) => i.id !== id))
      setConfirmDelete(null)
    })
  }

  const totalEstoque = items.reduce((s, i) => s + i.total_value, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Estoque</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {items.length} itens · Total: {formatCurrency(totalEstoque)}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: '#FFD080', color: '#1A1A1A' }}
        >
          + Adicionar Item
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Nome', 'Descrição', 'Quantidade', 'Valor Unit.', 'Valor Total', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-white/30">Nenhum item cadastrado.</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                <td className="px-4 py-3 text-white/50 max-w-xs truncate">{item.description ?? '—'}</td>
                <td className="px-4 py-3 text-white/80">{item.quantity}</td>
                <td className="px-4 py-3 text-white/80">{formatCurrency(item.unit_value)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: '#FFD080' }}>{formatCurrency(item.total_value)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Editar
                    </button>
                    {confirmDelete === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                          style={{ background: '#ef4444' }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-3 py-1.5 rounded-lg text-white/40"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: '#0f1424' }}>
            <h2 className="text-lg font-bold text-white mb-5">
              {editing ? 'Editar Item' : 'Novo Item'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Nome *</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Painel Solar 550W"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Quantidade</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    value={form.unit_value}
                    onChange={(e) => setForm({ ...form, unit_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descrição</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional..."
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#FFD080', color: '#1A1A1A' }}
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "estoque"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd web && git add app/\(dashboard\)/estoque/
git commit -m "feat: add estoque page with CRUD modal"
```

---

### Task 5: Relatórios — lib/relatorios/queries.ts

**Files:**
- Create: `web/lib/relatorios/queries.ts`

- [ ] **Step 1: Criar queries.ts**

```typescript
// web/lib/relatorios/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

// ---------- tipos ----------

export type RelatorioFilter = {
  dateFrom: string | null
  dateTo: string | null
}

export type VendasPorPeriodoRow = {
  mes: string
  label: string
  qtd_contratos: number
  valor_total: number
  ticket_medio: number
}

export type ComercialSummary = {
  qtd_propostas: number
  qtd_contratos: number
  valor_total: number
  ticket_medio: number
  taxa_conversao: number
  margem_media: number
  residencial: number
  comercial: number
  rural: number
  vendas_por_periodo: VendasPorPeriodoRow[]
}

export type LeadOrigemRow = {
  origem: string
  total_leads: number
  leads_convertidos: number
  taxa_conversao: number
}

export type RankingVendedorRow = {
  nome: string
  qtd_leads: number
  qtd_contratos: number
  valor_vendido: number
}

export type ComissaoVendedorRow = {
  nome: string
  qtd_contratos: number
  valor_total: number
  comissao: number
}

export type TecnicoSummary = {
  tempo_medio_implantacao: number | null
  modulos_por_fabricante: { fabricante: string; quantidade: number }[]
  inversores_por_fabricante: { fabricante: string; quantidade: number }[]
  total_kwh_projetados: number
  economia_financeira_estimada: number
}

// ---------- helpers ----------

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function mesLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${MES_LABELS[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
}

// ---------- Comercial ----------

export async function getComercialData(filter: RelatorioFilter): Promise<ComercialSummary> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return {
    qtd_propostas: 0, qtd_contratos: 0, valor_total: 0, ticket_medio: 0,
    taxa_conversao: 0, margem_media: 0, residencial: 0, comercial: 0, rural: 0,
    vendas_por_periodo: [],
  }

  const supabase = await createClient()

  // Propostas (todos clientes criados no período)
  let propQuery = (supabase as any)
    .from('clients')
    .select('id, client_type, created_at', { count: 'exact' })
    .eq('organization_id', orgId)
  if (filter.dateFrom) propQuery = propQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) propQuery = propQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: propostas, count: qtd_propostas_count } = await propQuery
  const qtd_propostas = qtd_propostas_count ?? 0

  // Contratos fechados (clients com contract_date no período)
  let contQuery = (supabase as any)
    .from('clients')
    .select(`
      id, client_type, contract_date,
      client_sale (sale_value),
      client_contracts (pct_margem)
    `)
    .eq('organization_id', orgId)
    .not('contract_date', 'is', null)
  if (filter.dateFrom) contQuery = contQuery.gte('contract_date', filter.dateFrom)
  if (filter.dateTo) contQuery = contQuery.lte('contract_date', filter.dateTo)
  const { data: contratos } = await contQuery
  const contratosArr = (contratos ?? []) as any[]

  const qtd_contratos = contratosArr.length
  let valor_total = 0
  let margem_soma = 0
  let margem_count = 0
  let residencial = 0, comercial = 0, rural = 0

  // vendas por mês
  const mesBucket: Record<string, { label: string; qtd: number; valor: number }> = {}

  for (const c of contratosArr) {
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    const valor = sale?.sale_value ?? 0
    valor_total += valor

    const contract = Array.isArray(c.client_contracts) ? c.client_contracts[0] : c.client_contracts
    if (contract?.pct_margem != null) {
      margem_soma += Number(contract.pct_margem)
      margem_count++
    }

    const ct = (c.client_type ?? '').toLowerCase()
    if (ct === 'residencial') residencial++
    else if (ct === 'comercial') comercial++
    else if (ct === 'rural') rural++

    if (c.contract_date) {
      const key = c.contract_date.substring(0, 7) // YYYY-MM
      if (!mesBucket[key]) mesBucket[key] = { label: mesLabel(c.contract_date), qtd: 0, valor: 0 }
      mesBucket[key].qtd++
      mesBucket[key].valor += valor
    }
  }

  const ticket_medio = qtd_contratos > 0 ? valor_total / qtd_contratos : 0
  const taxa_conversao = qtd_propostas > 0 ? (qtd_contratos / qtd_propostas) * 100 : 0
  const margem_media = margem_count > 0 ? margem_soma / margem_count : 0

  const vendas_por_periodo: VendasPorPeriodoRow[] = Object.entries(mesBucket)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({
      mes,
      label: v.label,
      qtd_contratos: v.qtd,
      valor_total: v.valor,
      ticket_medio: v.qtd > 0 ? v.valor / v.qtd : 0,
    }))

  return {
    qtd_propostas, qtd_contratos, valor_total, ticket_medio,
    taxa_conversao, margem_media, residencial, comercial, rural,
    vendas_por_periodo,
  }
}

// ---------- Leads ----------

export async function getLeadsData(filter: RelatorioFilter): Promise<{
  origens: LeadOrigemRow[]
  ranking: RankingVendedorRow[]
}> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { origens: [], ranking: [] }

  const supabase = await createClient()

  // Leads por origem
  let leadsQuery = (supabase as any)
    .from('leads')
    .select(`
      id, converted, lead_source_id,
      lead_sources!lead_source_id (name)
    `)
    .eq('organization_id', orgId)
  if (filter.dateFrom) leadsQuery = leadsQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) leadsQuery = leadsQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: leadsData } = await leadsQuery

  const origemMap: Record<string, { total: number; convertidos: number }> = {}
  for (const l of (leadsData ?? []) as any[]) {
    const nome = l.lead_sources?.name ?? 'Sem origem'
    if (!origemMap[nome]) origemMap[nome] = { total: 0, convertidos: 0 }
    origemMap[nome].total++
    if (l.converted) origemMap[nome].convertidos++
  }
  const origens: LeadOrigemRow[] = Object.entries(origemMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([origem, v]) => ({
      origem,
      total_leads: v.total,
      leads_convertidos: v.convertidos,
      taxa_conversao: v.total > 0 ? (v.convertidos / v.total) * 100 : 0,
    }))

  // Ranking de vendedores
  let rankQuery = (supabase as any)
    .from('clients')
    .select(`
      id, contract_date,
      responsible_id,
      profiles!responsible_id (full_name, email),
      client_sale (sale_value)
    `)
    .eq('organization_id', orgId)
  if (filter.dateFrom) rankQuery = rankQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) rankQuery = rankQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: clientsData } = await rankQuery

  const vendedorMap: Record<string, { nome: string; qtd_leads: number; qtd_contratos: number; valor: number }> = {}
  for (const c of (clientsData ?? []) as any[]) {
    const profile = c.profiles
    if (!profile) continue
    const nome = profile.full_name ?? profile.email ?? 'Desconhecido'
    const id = c.responsible_id ?? nome
    if (!vendedorMap[id]) vendedorMap[id] = { nome, qtd_leads: 0, qtd_contratos: 0, valor: 0 }
    vendedorMap[id].qtd_leads++
    if (c.contract_date) {
      vendedorMap[id].qtd_contratos++
      const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
      vendedorMap[id].valor += sale?.sale_value ?? 0
    }
  }
  const ranking: RankingVendedorRow[] = Object.values(vendedorMap)
    .sort((a, b) => b.valor - a.valor)
    .map((v) => ({
      nome: v.nome,
      qtd_leads: v.qtd_leads,
      qtd_contratos: v.qtd_contratos,
      valor_vendido: v.valor,
    }))

  return { origens, ranking }
}

// ---------- Financeiro ----------

export async function getFinanceiroData(filter: RelatorioFilter): Promise<{ comissoes: ComissaoVendedorRow[] }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { comissoes: [] }

  const supabase = await createClient()

  let query = (supabase as any)
    .from('clients')
    .select(`
      id, contract_date,
      responsible_id,
      profiles!responsible_id (full_name, email),
      client_sale (sale_value),
      client_contracts (pct_comissao)
    `)
    .eq('organization_id', orgId)
    .not('contract_date', 'is', null)
  if (filter.dateFrom) query = query.gte('contract_date', filter.dateFrom)
  if (filter.dateTo) query = query.lte('contract_date', filter.dateTo)
  const { data } = await query

  const map: Record<string, { nome: string; qtd: number; valor: number; comissao: number }> = {}
  for (const c of (data ?? []) as any[]) {
    const profile = c.profiles
    if (!profile) continue
    const nome = profile.full_name ?? profile.email ?? 'Desconhecido'
    const id = c.responsible_id ?? nome
    if (!map[id]) map[id] = { nome, qtd: 0, valor: 0, comissao: 0 }
    map[id].qtd++
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    const valor = sale?.sale_value ?? 0
    map[id].valor += valor
    const contract = Array.isArray(c.client_contracts) ? c.client_contracts[0] : c.client_contracts
    const pct = Number(contract?.pct_comissao ?? 0)
    map[id].comissao += valor * pct / 100
  }

  const comissoes: ComissaoVendedorRow[] = Object.values(map)
    .sort((a, b) => b.comissao - a.comissao)
    .map((v) => ({
      nome: v.nome,
      qtd_contratos: v.qtd,
      valor_total: v.valor,
      comissao: v.comissao,
    }))

  return { comissoes }
}

// ---------- Técnico ----------

export async function getTecnicoData(filter: RelatorioFilter): Promise<TecnicoSummary> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return {
    tempo_medio_implantacao: null,
    modulos_por_fabricante: [],
    inversores_por_fabricante: [],
    total_kwh_projetados: 0,
    economia_financeira_estimada: 0,
  }

  const supabase = await createClient()

  // Projetos
  let projQuery = (supabase as any)
    .from('client_projects')
    .select('modules_brand, inverter_brand, estimated_production, estimated_savings, client_id')
    .eq('organization_id', orgId)
  if (filter.dateFrom) projQuery = projQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) projQuery = projQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: projetos } = await projQuery

  const modulosMap: Record<string, number> = {}
  const inversoresMap: Record<string, number> = {}
  let total_kwh = 0
  let total_economia = 0

  for (const p of (projetos ?? []) as any[]) {
    const mb = p.modules_brand?.trim()
    if (mb) modulosMap[mb] = (modulosMap[mb] ?? 0) + 1
    const ib = p.inverter_brand?.trim()
    if (ib) inversoresMap[ib] = (inversoresMap[ib] ?? 0) + 1
    total_kwh += Number(p.estimated_production ?? 0)
    total_economia += Number(p.estimated_savings ?? 0)
  }

  // Tempo médio de implantação: dias entre contract_date e data_conclusao da obra
  const { data: obras } = await (supabase as any)
    .from('client_obras')
    .select(`
      client_id,
      data_inicio,
      clients!client_id (contract_date)
    `)
    .eq('organization_id', orgId)
    .not('data_inicio', 'is', null)

  let dias_total = 0
  let dias_count = 0
  for (const o of (obras ?? []) as any[]) {
    const contractDate = o.clients?.contract_date
    if (contractDate && o.data_inicio) {
      const dias = Math.floor(
        (new Date(o.data_inicio).getTime() - new Date(contractDate).getTime()) / 86400000
      )
      if (dias >= 0) { dias_total += dias; dias_count++ }
    }
  }

  return {
    tempo_medio_implantacao: dias_count > 0 ? Math.round(dias_total / dias_count) : null,
    modulos_por_fabricante: Object.entries(modulosMap).sort(([, a], [, b]) => b - a).map(([fabricante, quantidade]) => ({ fabricante, quantidade })),
    inversores_por_fabricante: Object.entries(inversoresMap).sort(([, a], [, b]) => b - a).map(([fabricante, quantidade]) => ({ fabricante, quantidade })),
    total_kwh_projetados: total_kwh,
    economia_financeira_estimada: total_economia,
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "relatorios"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add lib/relatorios/
git commit -m "feat: add relatorios queries"
```

---

### Task 6: Relatórios — página

**Files:**
- Create: `web/app/(dashboard)/relatorios/page.tsx`
- Create: `web/app/(dashboard)/relatorios/RelatoriosClient.tsx`
- Create: `web/app/(dashboard)/relatorios/print.css`

- [ ] **Step 1: Criar page.tsx**

```tsx
// web/app/(dashboard)/relatorios/page.tsx
import RelatoriosClient from './RelatoriosClient'

export default function RelatoriosPage() {
  return <RelatoriosClient />
}
```

- [ ] **Step 2: Criar print.css**

```css
/* web/app/(dashboard)/relatorios/print.css */
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    color: black !important;
    background: white !important;
  }
  #print-area table { width: 100%; border-collapse: collapse; }
  #print-area th, #print-area td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
  #print-area th { background: #f0f0f0; }
  #print-area .no-print { display: none !important; }
}
```

- [ ] **Step 3: Criar RelatoriosClient.tsx**

```tsx
// web/app/(dashboard)/relatorios/RelatoriosClient.tsx
'use client'

import { useState, useTransition } from 'react'
import './print.css'
import {
  getComercialData, getLeadsData, getFinanceiroData, getTecnicoData,
} from '@/lib/relatorios/queries'
import type {
  ComercialSummary, LeadOrigemRow, RankingVendedorRow,
  ComissaoVendedorRow, TecnicoSummary, RelatorioFilter,
} from '@/lib/relatorios/queries'

type Tab = 'comercial' | 'leads' | 'financeiro' | 'tecnico'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtNum(v: number, decimals = 0) { return v.toLocaleString('pt-BR', { maximumFractionDigits: decimals }) }
function fmtPct(v: number) { return v.toFixed(1) + '%' }

function PrintButton() {
  return (
    <button
      className="no-print px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
      style={{ background: '#FFD080', color: '#1A1A1A' }}
      onClick={() => window.print()}
    >
      Baixar PDF
    </button>
  )
}

function FilterBar({
  dateFrom, dateTo, onChange, onApply, isPending,
}: {
  dateFrom: string; dateTo: string
  onChange: (f: string, t: string) => void
  onApply: () => void
  isPending: boolean
}) {
  return (
    <div className="no-print flex items-center gap-3 mb-6">
      <div>
        <label className="text-xs text-white/40 block mb-1">De</label>
        <input
          type="date"
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          value={dateFrom}
          onChange={(e) => onChange(e.target.value, dateTo)}
        />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Até</label>
        <input
          type="date"
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          value={dateTo}
          onChange={(e) => onChange(dateFrom, e.target.value)}
        />
      </div>
      <button
        onClick={onApply}
        disabled={isPending}
        className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 text-white/70 hover:text-white transition-colors disabled:opacity-50"
      >
        {isPending ? 'Buscando...' : 'Aplicar'}
      </button>
    </div>
  )
}

// ---------- Aba Comercial ----------
function AbaComercial({ data }: { data: ComercialSummary | null }) {
  if (!data) return <p className="text-white/30 py-12 text-center">Aplique um filtro para ver os dados.</p>
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório Comercial</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
        {[
          { label: 'Propostas', value: fmtNum(data.qtd_propostas) },
          { label: 'Contratos', value: fmtNum(data.qtd_contratos) },
          { label: 'Valor Vendido', value: fmt(data.valor_total) },
          { label: 'Ticket Médio', value: fmt(data.ticket_medio) },
          { label: 'Taxa de Conversão', value: fmtPct(data.taxa_conversao) },
          { label: 'Margem Média', value: fmtPct(data.margem_media) },
          { label: 'Residencial', value: fmtNum(data.residencial) },
          { label: 'Comercial', value: fmtNum(data.comercial) },
          { label: 'Rural', value: fmtNum(data.rural) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/40 mb-1">{k.label}</p>
            <p className="text-lg font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Vendas por período */}
      <h3 className="text-sm font-semibold text-white/70 mb-2">Vendas por Período</h3>
      <table className="w-full text-sm rounded-xl overflow-hidden mb-4">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
            {['Mês', 'Contratos', 'Valor Total', 'Ticket Médio'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.vendas_por_periodo.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>
          )}
          {data.vendas_por_periodo.map((r) => (
            <tr key={r.mes} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-4 py-2.5 text-white/80">{r.label}</td>
              <td className="px-4 py-2.5 text-white/80">{r.qtd_contratos}</td>
              <td className="px-4 py-2.5 text-white/80">{fmt(r.valor_total)}</td>
              <td className="px-4 py-2.5 text-white/80">{fmt(r.ticket_medio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Aba Leads ----------
function AbaLeads({ origens, ranking }: { origens: LeadOrigemRow[] | null; ranking: RankingVendedorRow[] | null }) {
  if (!origens) return <p className="text-white/30 py-12 text-center">Aplique um filtro para ver os dados.</p>
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório de Leads</h2>

      <h3 className="text-sm font-semibold text-white/70 mb-2">Leads por Origem</h3>
      <table className="w-full text-sm rounded-xl overflow-hidden mb-6">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
            {['Origem', 'Total de Leads', 'Convertidos', 'Taxa de Conversão'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {origens.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {origens.map((r) => (
            <tr key={r.origem} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-4 py-2.5 text-white/80">{r.origem}</td>
              <td className="px-4 py-2.5 text-white/80">{r.total_leads}</td>
              <td className="px-4 py-2.5 text-white/80">{r.leads_convertidos}</td>
              <td className="px-4 py-2.5 text-white/80">{fmtPct(r.taxa_conversao)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-sm font-semibold text-white/70 mb-2">Ranking de Vendedores</h3>
      <table className="w-full text-sm rounded-xl overflow-hidden">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
            {['#', 'Vendedor', 'Leads', 'Contratos', 'Valor Vendido'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(ranking ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {(ranking ?? []).map((r, i) => (
            <tr key={r.nome} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-4 py-2.5 text-white/40">{i + 1}</td>
              <td className="px-4 py-2.5 text-white font-medium">{r.nome}</td>
              <td className="px-4 py-2.5 text-white/80">{r.qtd_leads}</td>
              <td className="px-4 py-2.5 text-white/80">{r.qtd_contratos}</td>
              <td className="px-4 py-2.5 font-semibold" style={{ color: '#FFD080' }}>{fmt(r.valor_vendido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Aba Financeiro ----------
function AbaFinanceiro({ comissoes }: { comissoes: ComissaoVendedorRow[] | null }) {
  if (!comissoes) return <p className="text-white/30 py-12 text-center">Aplique um filtro para ver os dados.</p>
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório Financeiro — Comissões</h2>
      <table className="w-full text-sm rounded-xl overflow-hidden">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
            {['Vendedor', 'Contratos', 'Valor Total', 'Comissão'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comissoes.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {comissoes.map((r) => (
            <tr key={r.nome} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-4 py-2.5 text-white font-medium">{r.nome}</td>
              <td className="px-4 py-2.5 text-white/80">{r.qtd_contratos}</td>
              <td className="px-4 py-2.5 text-white/80">{fmt(r.valor_total)}</td>
              <td className="px-4 py-2.5 font-semibold" style={{ color: '#FFD080' }}>{fmt(r.comissao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Aba Técnico ----------
function AbaTecnico({ data }: { data: TecnicoSummary | null }) {
  if (!data) return <p className="text-white/30 py-12 text-center">Aplique um filtro para ver os dados.</p>
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório Técnico</h2>

      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3">
        {[
          { label: 'Tempo Médio de Implantação', value: data.tempo_medio_implantacao != null ? `${data.tempo_medio_implantacao} dias` : '—' },
          { label: 'Total kWh Projetados', value: fmtNum(data.total_kwh_projetados, 2) + ' kWh' },
          { label: 'Economia Estimada', value: fmt(data.economia_financeira_estimada) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/40 mb-1">{k.label}</p>
            <p className="text-lg font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">Módulos por Fabricante</h3>
          <table className="w-full text-sm rounded-xl overflow-hidden">
            <thead><tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">Fabricante</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">Qtd</th>
            </tr></thead>
            <tbody>
              {data.modulos_por_fabricante.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-white/30">Sem dados</td></tr>}
              {data.modulos_por_fabricante.map((r) => (
                <tr key={r.fabricante} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2.5 text-white/80">{r.fabricante}</td>
                  <td className="px-4 py-2.5 text-white/80">{r.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">Inversores por Fabricante</h3>
          <table className="w-full text-sm rounded-xl overflow-hidden">
            <thead><tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">Fabricante</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">Qtd</th>
            </tr></thead>
            <tbody>
              {data.inversores_por_fabricante.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-white/30">Sem dados</td></tr>}
              {data.inversores_por_fabricante.map((r) => (
                <tr key={r.fabricante} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2.5 text-white/80">{r.fabricante}</td>
                  <td className="px-4 py-2.5 text-white/80">{r.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------- Main ----------

export default function RelatoriosClient() {
  const [tab, setTab] = useState<Tab>('comercial')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(0); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()

  const [comercialData, setComercialData] = useState<ComercialSummary | null>(null)
  const [leadsOrigens, setLeadsOrigens] = useState<LeadOrigemRow[] | null>(null)
  const [leadsRanking, setLeadsRanking] = useState<RankingVendedorRow[] | null>(null)
  const [comissoes, setComissoes] = useState<ComissaoVendedorRow[] | null>(null)
  const [tecnicoData, setTecnicoData] = useState<TecnicoSummary | null>(null)

  const filter: RelatorioFilter = { dateFrom: dateFrom || null, dateTo: dateTo || null }

  function handleApply() {
    startTransition(async () => {
      if (tab === 'comercial') {
        const d = await getComercialData(filter)
        setComercialData(d)
      } else if (tab === 'leads') {
        const d = await getLeadsData(filter)
        setLeadsOrigens(d.origens)
        setLeadsRanking(d.ranking)
      } else if (tab === 'financeiro') {
        const d = await getFinanceiroData(filter)
        setComissoes(d.comissoes)
      } else if (tab === 'tecnico') {
        const d = await getTecnicoData(filter)
        setTecnicoData(d)
      }
    })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'comercial', label: 'Comercial' },
    { key: 'leads', label: 'Leads' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'tecnico', label: 'Técnico' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <PrintButton />
      </div>

      {/* Tabs */}
      <div className="no-print flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'rgba(255,200,100,0.12)', color: '#FFD080', fontWeight: 600 }
              : { color: 'rgba(255,255,255,0.4)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
        onApply={handleApply}
        isPending={isPending}
      />

      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {tab === 'comercial' && <AbaComercial data={comercialData} />}
        {tab === 'leads' && <AbaLeads origens={leadsOrigens} ranking={leadsRanking} />}
        {tab === 'financeiro' && <AbaFinanceiro comissoes={comissoes} />}
        {tab === 'tecnico' && <AbaTecnico data={tecnicoData} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "relatorios"
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
cd web && git add app/\(dashboard\)/relatorios/
git commit -m "feat: add relatorios page with 4 tabs and PDF print"
```

---

### Task 7: Treinamento — página

**Files:**
- Create: `web/app/(dashboard)/treinamento/page.tsx`

- [ ] **Step 1: Criar page.tsx**

```tsx
// web/app/(dashboard)/treinamento/page.tsx
'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

type Video = {
  title: string
  description: string
  youtubeId: string
}

const VIDEOS: Video[] = [
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
]

export default function TreinamentoPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-1">Treinamento</h1>
      <p className="text-sm text-white/40 mb-8">Aprenda a usar a plataforma com os vídeos abaixo.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VIDEOS.map((video, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {/* Thumbnail */}
            <div
              className="relative aspect-video flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {video.youtubeId ? (
                <img
                  src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
              )}
              {video.youtubeId && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,208,128,0.9)' }}
                  >
                    <Play size={20} style={{ color: '#1A1A1A', marginLeft: 2 }} />
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-1">{video.title}</h3>
              <p className="text-xs text-white/40 mb-3">{video.description}</p>
              <button
                onClick={() => video.youtubeId && setActiveVideo(video)}
                disabled={!video.youtubeId}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#FFD080', color: '#1A1A1A' }}
              >
                Assistir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white/60 hover:text-white"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <X size={18} />
            </button>
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "treinamento"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add app/\(dashboard\)/treinamento/
git commit -m "feat: add treinamento page with YouTube embed modal"
```

---

### Task 8: Verificação final de TypeScript

**Files:** nenhum novo

- [ ] **Step 1: Rodar tsc completo**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: zero erros.

- [ ] **Step 2: Corrigir eventuais erros encontrados**

Se houver erros, corrigi-los antes de prosseguir.

- [ ] **Step 3: Commit final se necessário**

```bash
cd web && git add -A && git commit -m "fix: typescript fixes for new modules"
```

---

### Nota: Migration (Task 2)

Após criar o arquivo de migration em `web/supabase/migrations/20260618000007_estoque.sql`, o SQL deve ser aplicado manualmente no Supabase Dashboard pelo usuário antes de testar o módulo de Estoque.
