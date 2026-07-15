# Simuladores — Fundação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o setor "Simuladores" (menu + hub + gating por empresa + cabeçalho compartilhado), sem nenhum simulador funcional ainda.

**Architecture:** Item de menu sempre visível (selo PRO). A rota `/simuladores` checa no servidor a flag `organizations.simuladores_habilitado` via um helper isolado (fallback seguro = false) — o caminho crítico `getCurrentUserData` NÃO é alterado. Um registro central (`registry.ts`) descreve os 6 simuladores; o hub renderiza a grade (Estilo 1) com estados disponível/em breve. Backoffice ganha um toggle por empresa, protegido por `requireBackofficeSession()` + auditoria.

**Tech Stack:** Next 16 (App Router, Server Components/Actions), Supabase (Postgres/RLS), TypeScript, Tailwind, Vitest.

**Branch:** `feat/simuladores` (já criada). Validação de UI/DB é feita no **Preview do Vercel** (build local falha por acento no path). Gate padrão antes de cada commit: `npx tsc --noEmit` + `npx vitest run` (rodar dentro de `web/`).

---

## Estrutura de arquivos

**Criar:**
- `web/supabase/migrations/20260715000001_simuladores_habilitado.sql` — coluna do toggle.
- `web/lib/simuladores/registry.ts` — lista central dos 6 simuladores (puro, testável).
- `web/lib/simuladores/access.ts` — `isSimuladoresEnabled()` (leitura da flag, fallback false).
- `web/components/simuladores/SimuladoresHub.tsx` — grade do hub (Estilo 1).
- `web/components/simuladores/SimuladoresLocked.tsx` — tela de bloqueio/upsell.
- `web/components/simuladores/SimuladorHeader.tsx` — cabeçalho compartilhado (título/cliente/descrição).
- `web/app/(dashboard)/simuladores/page.tsx` — rota do hub (checa a flag).
- `web/__tests__/simuladores-registry.test.ts` — teste do registry.

**Modificar:**
- `web/components/layout/Sidebar.tsx` — item "Simuladores" com selo PRO.
- `web/lib/backoffice/empresas/queries.ts` — `setSimuladoresHabilitado()` + campo no `EmpresaRow`/`buscarEmpresa`.
- `web/lib/backoffice/empresas/actions.ts` — `toggleSimuladoresAction()`.
- `web/app/backoffice/(admin)/empresas/[id]/EmpresaActions.tsx` — botão/toggle na UI.
- `web/app/backoffice/(admin)/empresas/[id]/page.tsx` — renderiza o toggle no card da organização.

---

## Task 1: Migration da flag `simuladores_habilitado`

**Files:**
- Create: `web/supabase/migrations/20260715000001_simuladores_habilitado.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Fundação Simuladores: flag de habilitação por empresa (gating do setor).
-- Aditiva e reversível. Default false = ninguém tem acesso até o backoffice ligar.
-- Não afeta nenhuma tabela/coluna existente nem a RLS.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS simuladores_habilitado boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: [AÇÃO MANUAL] rodar no SQL Editor do Supabase real**

Colar o conteúdo no SQL Editor e executar. É pré-requisito para as Tasks 2 e 8 funcionarem no Preview.
Como é aditiva com default, rodar cedo NÃO afeta produção (o código de produção ainda não lê a coluna).

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/20260715000001_simuladores_habilitado.sql
git commit -m "feat(simuladores): migration da flag simuladores_habilitado por empresa"
```

---

## Task 2: Registry dos simuladores (puro, TDD)

**Files:**
- Create: `web/lib/simuladores/registry.ts`
- Test: `web/__tests__/simuladores-registry.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// web/__tests__/simuladores-registry.test.ts
import { describe, it, expect } from 'vitest'
import { SIMULADORES, getSimulador } from '@/lib/simuladores/registry'

describe('registry de simuladores', () => {
  it('tem os 6 simuladores previstos', () => {
    expect(SIMULADORES).toHaveLength(6)
  })
  it('todos os slugs são únicos', () => {
    const slugs = SIMULADORES.map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('na fundação todos nascem como "em_breve"', () => {
    expect(SIMULADORES.every(s => s.status === 'em_breve')).toBe(true)
  })
  it('getSimulador acha por slug e retorna undefined para inexistente', () => {
    expect(getSimulador('financiamento')?.titulo).toBe('Financiamento')
    expect(getSimulador('nao-existe')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npx vitest run simuladores-registry`
Expected: FAIL ("Cannot find module '@/lib/simuladores/registry'").

- [ ] **Step 3: Implementar o registry**

```ts
// web/lib/simuladores/registry.ts
export type SimuladorStatus = 'disponivel' | 'em_breve'

export type SimuladorInfo = {
  slug: string
  titulo: string
  descricao: string
  icone: string // emoji exibido no card do hub
  status: SimuladorStatus
}

// Fundação: todos "em_breve". Cada simulador vira 'disponivel' quando construído.
export const SIMULADORES: SimuladorInfo[] = [
  { slug: 'viabilidade-usina',       titulo: 'Viabilidade de usina', descricao: 'ROI de usina de investimento',            icone: '📊', status: 'em_breve' },
  { slug: 'hibrido-offgrid',         titulo: 'Híbrido / Off-grid',   descricao: 'Dimensionamento e autonomia de baterias', icone: '🔋', status: 'em_breve' },
  { slug: 'conta-pos-instalacao',    titulo: 'Conta pós-instalação', descricao: 'Lei 14.300 e payback',                    icone: '⚡', status: 'em_breve' },
  { slug: 'parcelamento-cartao',     titulo: 'Parcelamento no cartão', descricao: 'Simula parcelas no cartão',             icone: '💳', status: 'em_breve' },
  { slug: 'financiamento',           titulo: 'Financiamento',        descricao: 'Parcela e juros',                         icone: '🏦', status: 'em_breve' },
  { slug: 'comparativo-concorrente', titulo: 'Comparativo',          descricao: 'Vs. proposta concorrente',                icone: '⚖️', status: 'em_breve' },
]

export function getSimulador(slug: string): SimuladorInfo | undefined {
  return SIMULADORES.find(s => s.slug === slug)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npx vitest run simuladores-registry`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/registry.ts web/__tests__/simuladores-registry.test.ts
git commit -m "feat(simuladores): registry central dos 6 simuladores + teste"
```

---

## Task 3: Helper de acesso `isSimuladoresEnabled()`

**Files:**
- Create: `web/lib/simuladores/access.ts`

Nota: não há teste unitário aqui (toca o Supabase; o repo valida esse tipo de código no Preview). A lógica é mínima e com fallback seguro. Verificação real na Task 7 (Preview).

- [ ] **Step 1: Implementar o helper**

```ts
// web/lib/simuladores/access.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

/**
 * Retorna true se a organização do usuário atual tem os Simuladores habilitados.
 * Isolado de propósito: NÃO altera getCurrentUserData (caminho crítico). Qualquer
 * erro (inclusive coluna ausente antes da migration) resulta em false — fail-closed.
 */
export async function isSimuladoresEnabled(): Promise<boolean> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return false
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('simuladores_habilitado')
      .eq('id', orgId)
      .maybeSingle()
    if (error) return false
    return (data as { simuladores_habilitado?: boolean } | null)?.simuladores_habilitado === true
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros novos (ignorar o erro de cache stale de `app/register/page`).

- [ ] **Step 3: Commit**

```bash
git add web/lib/simuladores/access.ts
git commit -m "feat(simuladores): helper isSimuladoresEnabled (fail-closed)"
```

---

## Task 4: Componentes do hub e do bloqueio

**Files:**
- Create: `web/components/simuladores/SimuladoresHub.tsx`
- Create: `web/components/simuladores/SimuladoresLocked.tsx`

- [ ] **Step 1: Implementar a grade do hub (Estilo 1)**

```tsx
// web/components/simuladores/SimuladoresHub.tsx
import Link from 'next/link'
import { SIMULADORES } from '@/lib/simuladores/registry'

export function SimuladoresHub() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simuladores</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#FF9F40] text-[#1a1a1a] rounded px-1.5 py-0.5">PRO</span>
      </div>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-5">
        Escolha uma ferramenta para gerar uma simulação.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULADORES.map((s) => {
          const disponivel = s.status === 'disponivel'
          const card = (
            <div
              className={`h-full rounded-xl border p-4 text-left transition-colors ${
                disponivel
                  ? 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] hover:border-[#FF9F40]'
                  : 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{s.icone}</span>
                <span
                  className={`text-[9px] rounded px-1.5 py-0.5 border ${
                    disponivel
                      ? 'text-[#1f9d55] border-[#bce8ce] bg-[#f0fbf4]'
                      : 'text-[#9aa0b0] border-[#e0e3ee]'
                  }`}
                >
                  {disponivel ? 'disponível' : 'em breve'}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">{s.titulo}</h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">{s.descricao}</p>
            </div>
          )
          return disponivel ? (
            <Link key={s.slug} href={`/simuladores/${s.slug}`} className="block h-full">{card}</Link>
          ) : (
            <div key={s.slug} aria-disabled className="cursor-default">{card}</div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implementar a tela de bloqueio/upsell**

```tsx
// web/components/simuladores/SimuladoresLocked.tsx
import { Lock } from 'lucide-react'

export function SimuladoresLocked() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simuladores</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#FF9F40] text-[#1a1a1a] rounded px-1.5 py-0.5">PRO</span>
      </div>

      <div className="max-w-xl rounded-2xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3E6]">
          <Lock size={22} className="text-[#FF9F40]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--theme-text,#1a2340)]">Recurso do plano superior</h2>
        <p className="mt-2 text-sm text-[var(--theme-text-muted,#6b7280)]">
          As ferramentas de simulação estão disponíveis para empresas com o recurso liberado.
          Fale com a Integra Solar para habilitar os Simuladores na sua conta.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add web/components/simuladores/SimuladoresHub.tsx web/components/simuladores/SimuladoresLocked.tsx
git commit -m "feat(simuladores): componentes do hub (grade) e da tela de bloqueio"
```

---

## Task 5: Cabeçalho compartilhado dos simuladores

**Files:**
- Create: `web/components/simuladores/SimuladorHeader.tsx`

Componente reutilizável pelos simuladores futuros. Não persiste nada; expõe os valores ao pai.

- [ ] **Step 1: Implementar o componente**

```tsx
// web/components/simuladores/SimuladorHeader.tsx
'use client'

export type SimuladorHeaderValues = {
  titulo: string
  cliente: string
  descricao: string
}

export function SimuladorHeader({
  values,
  onChange,
}: {
  values: SimuladorHeaderValues
  onChange: (v: SimuladorHeaderValues) => void
}) {
  const set = (patch: Partial<SimuladorHeaderValues>) => onChange({ ...values, ...patch })
  const inputCls =
    'w-full rounded-lg border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] px-3 py-2 text-sm text-[var(--theme-text,#1a2340)] outline-none focus:border-[#FF9F40]'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-text-muted,#9aa0b0)] mb-1'

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className={labelCls}>Título da simulação</label>
          <input
            className={inputCls}
            value={values.titulo}
            onChange={(e) => set({ titulo: e.target.value })}
            placeholder="Ex.: Simulação João Silva"
          />
        </div>
        <div>
          <label className={labelCls}>Nome do cliente</label>
          <input
            className={inputCls}
            value={values.cliente}
            onChange={(e) => set({ cliente: e.target.value })}
            placeholder="Ex.: João Silva"
          />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input
            className={inputCls}
            value={values.descricao}
            onChange={(e) => set({ descricao: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add web/components/simuladores/SimuladorHeader.tsx
git commit -m "feat(simuladores): componente de cabeçalho compartilhado"
```

---

## Task 6: Rota do hub `/simuladores`

**Files:**
- Create: `web/app/(dashboard)/simuladores/page.tsx`

- [ ] **Step 1: Implementar a página (checa a flag no servidor)**

```tsx
// web/app/(dashboard)/simuladores/page.tsx
export const metadata = { title: 'Simuladores' }
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { SimuladoresHub } from '@/components/simuladores/SimuladoresHub'
import { SimuladoresLocked } from '@/components/simuladores/SimuladoresLocked'

export default async function SimuladoresPage() {
  const enabled = await isSimuladoresEnabled()
  return enabled ? <SimuladoresHub /> : <SimuladoresLocked />
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add "web/app/(dashboard)/simuladores/page.tsx"
git commit -m "feat(simuladores): rota /simuladores com gate de acesso no servidor"
```

---

## Task 7: Item de menu "Simuladores" (selo PRO)

**Files:**
- Modify: `web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Adicionar o ícone `Calculator` ao import do lucide**

Em `web/components/layout/Sidebar.tsx`, no bloco de import de `lucide-react` (linhas ~9-14), acrescentar `Calculator`:

```tsx
import {
  LayoutDashboard, Users, UserCheck, FileText, DollarSign,
  Ruler, ShoppingCart, Banknote, Package, Wrench,
  CheckSquare, Star, Settings, BarChart2, GraduationCap,
  Archive, LogOut, MessageCircle, Calculator,
} from 'lucide-react'
```

- [ ] **Step 2: Adicionar `pro?: boolean` ao tipo `NavItem` e o item Simuladores**

Em `web/components/layout/Sidebar.tsx`, alterar o tipo `NavItem` (linhas ~16-21) para incluir `pro`:

```tsx
type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  moduleKey?: string
  pro?: boolean
}
```

Logo após a constante `PIPELINE_ITEMS` (antes de `SUPPORT_ITEMS`), adicionar:

```tsx
// Sempre visível a todos; o acesso é controlado no servidor (flag da empresa).
const SIMULADORES_ITEM: NavItem = {
  label: 'Simuladores', href: '/simuladores', icon: Calculator, pro: true,
}
```

- [ ] **Step 3: Renderizar o selo PRO dentro de `renderItem`**

Em `renderItem` (dentro do `<Link>`, logo após o `<span>` do label — linha ~100), acrescentar o badge condicional:

```tsx
          <span style={{ color }}>{item.label}</span>
          {item.pro && (
            <span
              className="ml-auto text-[8px] font-extrabold tracking-wide rounded px-1 py-0.5"
              style={{ background: '#FF9F40', color: '#1A1A1A' }}
            >
              PRO
            </span>
          )}
```

- [ ] **Step 4: Renderizar o item entre o pipeline e o separador "OUTROS"**

Na `<nav>` (linha ~157), inserir o item logo após `{pipelineVisible.map(renderItem)}` e antes do bloco do separador:

```tsx
        {pipelineVisible.map(renderItem)}

        {renderItem(SIMULADORES_ITEM)}

        {/* Separador */}
```

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 6: Verificar no Preview do Vercel**

Após o push da branch, abrir a URL de Preview: o item "Simuladores" com selo PRO aparece no menu; clicar leva a `/simuladores`. Com a empresa SEM a flag → tela de bloqueio; com a flag ligada (Task 8) → hub com os 6 cards "em breve".

- [ ] **Step 7: Commit**

```bash
git add web/components/layout/Sidebar.tsx
git commit -m "feat(simuladores): item de menu Simuladores com selo PRO"
```

---

## Task 8: Toggle no backoffice (habilitar/desabilitar por empresa)

**Files:**
- Modify: `web/lib/backoffice/empresas/queries.ts`
- Modify: `web/lib/backoffice/empresas/actions.ts`
- Modify: `web/app/backoffice/(admin)/empresas/[id]/EmpresaActions.tsx`
- Modify: `web/app/backoffice/(admin)/empresas/[id]/page.tsx`

- [ ] **Step 1: Expor a flag na query e adicionar o setter**

Em `web/lib/backoffice/empresas/queries.ts`:

(a) Adicionar `simuladores_habilitado: boolean` ao tipo `EmpresaRow` (após `total_users`):

```ts
  total_users: number
  simuladores_habilitado: boolean
```

(b) Incluir a coluna no `select` de `buscarEmpresa` (o `.from('organizations').select(...)` dentro do `Promise.all`, ~linha 70):

```ts
    admin
      .from('organizations')
      .select('id, name, plan, status, created_at, blocked_at, blocked_reason, trial_ends_at, simuladores_habilitado')
      .eq('id', id)
      .single(),
```

(b2) Incluir a MESMA coluna no `select` de `listarEmpresas` (~linha 24), senão o tipo `EmpresaRow` (agora com o campo obrigatório) quebra o `map` dessa função:

```ts
  let query = admin
    .from('organizations')
    .select('id, name, plan, status, created_at, blocked_at, blocked_reason, trial_ends_at, simuladores_habilitado')
    .order('created_at', { ascending: false })
```

(c) Adicionar a função setter ao final do bloco de empresas (após `editarEmpresa`):

```ts
export async function setSimuladoresHabilitado(
  id: string,
  enabled: boolean
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ simuladores_habilitado: enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { error: error.message } : {}
}
```

- [ ] **Step 2: Criar a Server Action guardada**

Em `web/lib/backoffice/empresas/actions.ts`, adicionar `setSimuladoresHabilitado` ao import de `./queries`:

```ts
import { bloquearEmpresa, desbloquearEmpresa, editarEmpresa, excluirEmpresa, setSimuladoresHabilitado } from './queries'
```

E adicionar a action (mesmo padrão de guard + auditoria das demais):

```ts
export async function toggleSimuladoresAction(id: string, enabled: boolean): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const result = await setSimuladoresHabilitado(id, enabled)
  if (!result.error) {
    const adminName = await getAdminName()
    await registrarAuditoria({
      organization_id: id,
      user_name: adminName,
      action: 'toggle_simuladores',
      description: `Simuladores ${enabled ? 'habilitados' : 'desabilitados'}.`,
    })
    revalidatePath(`/backoffice/empresas/${id}`)
  }
  return result
}
```

- [ ] **Step 3: Criar o componente de toggle (UI)**

Em `web/app/backoffice/(admin)/empresas/[id]/EmpresaActions.tsx`, adicionar ao import de actions o `toggleSimuladoresAction`:

```ts
import {
  bloquearEmpresaAction,
  desbloquearEmpresaAction,
  editarEmpresaAction,
  excluirEmpresaAction,
  toggleSimuladoresAction,
} from '@/lib/backoffice/empresas/actions'
```

E acrescentar o componente ao final do arquivo:

```tsx
export function SimuladoresToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleSimuladoresAction(id, !enabled)
      if (!result.error) router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        enabled
          ? 'bg-[#EAF7EF] text-[#1f9d55] border border-[#bce8ce]'
          : 'bg-[#F0F4F8] text-[#45586E] border border-[#D0DCE8]'
      }`}
    >
      {isPending ? '...' : enabled ? 'Simuladores: ON' : 'Simuladores: OFF'}
    </button>
  )
}
```

- [ ] **Step 4: Renderizar o toggle na página da empresa**

Em `web/app/backoffice/(admin)/empresas/[id]/page.tsx`:

(a) Adicionar `SimuladoresToggle` ao import de `./EmpresaActions`:

```ts
import { BloquearEmpresaButton, DesbloquearEmpresaButton, EditarEmpresaButton, ExcluirEmpresaButton, SimuladoresToggle } from './EmpresaActions'
```

(b) No card "Dados da organização", após o último `<InfoRow>` (linha ~71), adicionar a linha do toggle:

```tsx
            <InfoRow label="Trial até" value={empresa.trial_ends_at ? new Date(empresa.trial_ends_at).toLocaleDateString('pt-BR') : null} />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C8D9E]">Simuladores</span>
              <SimuladoresToggle id={empresa.id} enabled={empresa.simuladores_habilitado} />
            </div>
```

- [ ] **Step 5: Typecheck + testes**

Run: `cd web && npx tsc --noEmit && npx vitest run`
Expected: sem erros novos; todos os testes passam (incluindo `simuladores-registry`).

- [ ] **Step 6: Verificar no Preview do Vercel**

Na tela da empresa (backoffice), o toggle "Simuladores: ON/OFF" liga/desliga; ao ligar, a empresa passa a ver o hub em `/simuladores` em vez da tela de bloqueio. Conferir que o evento aparece na auditoria.

- [ ] **Step 7: Commit**

```bash
git add web/lib/backoffice/empresas/queries.ts web/lib/backoffice/empresas/actions.ts "web/app/backoffice/(admin)/empresas/[id]/EmpresaActions.tsx" "web/app/backoffice/(admin)/empresas/[id]/page.tsx"
git commit -m "feat(simuladores): toggle de habilitação por empresa no backoffice"
```

---

## Encerramento da fundação

- [ ] Push da branch: `git push -u origin feat/simuladores`
- [ ] Validar tudo no Preview do Vercel (menu, bloqueio, toggle, hub).
- [ ] A fundação NÃO é mesclada na `main` sozinha se você preferir revelar só junto do 1º simulador — decidir no momento. Enquanto isso, cada simulador vira seu próprio spec/plano, plugando em: registry (vira `disponivel`), rota `/simuladores/<slug>`, `SimuladorHeader`, e (quando o 1º precisar) o mecanismo de Salvar + PDF.
