# Simulador de Parcelamento no Cartão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simulador que mostra, a partir de uma proposta e uma entrada, as opções de parcelamento no cartão (1x…Nx) com taxa, valor total e valor da parcela, em até 3 tabelas configuráveis por empresa, com geração de PDF.

**Architecture:** Um cálculo puro e testável (`calculo.ts`, golden contra a planilha do usuário) alimenta a tela. As tabelas de taxa são persistidas por org (`simulador_cartao_tabelas`, RLS, máx. 3) e configuradas numa tela de CRUD. A tela do simulador combina proposta+entrada+repasse com essas tabelas e renderiza lado a lado ao vivo; o PDF é client-side (jsPDF+autotable), reaproveitando o loader de empresa da Viabilidade.

**Tech Stack:** TypeScript, Vitest, Next.js App Router + Server Actions + Zod, Supabase/Postgres (migration + RLS), jsPDF + jspdf-autotable. Sem dependências novas.

**Branch:** `feat/simuladores`. Gate do núcleo: `cd web && npx tsc --noEmit && npx vitest run`. Telas/PDF/RLS validados no app rodando.

**Fonte da verdade:** planilha do usuário — `ValorTotal = ValorParcelar × (1 + taxa)` (`=$B$5*(1+D9)`), `Parcela = ValorTotal ÷ Nº parcelas` (`=E9/(LIN()-3)`).

---

## Referência do modelo (fiel — use isto)

- `valorAParcelar = max(0, valorProposta − entrada)`.
- Por opção de `parcelas = N` com `taxa` (fração, ex. 0.0669 = 6,69%):
  - **Repassa:** `valorTotal = valorAParcelar × (1 + taxa)` · `valorParcela = valorTotal ÷ N`.
  - **Não repassa:** `valorTotal = valorAParcelar` · `valorParcela = valorAParcelar ÷ N`.
- **Convenção de taxa:** guardada como **fração** no banco/jsonb e no cálculo; a UI de config exibe/edita em **porcentagem** (×100 ao mostrar, ÷100 ao salvar).
- **Golden:** `valorAParcelar = 1000`, `taxas = { 6: 0.0669 }`:
  - repassa → `valorTotal = 1066.90`, `valorParcela = 177.81666…`
  - não repassa → `valorTotal = 1000`, `valorParcela = 166.66666…`

---

## File Structure
- **Create** `web/lib/simuladores/cartao/calculo.ts` — `valorAParcelar`, `calcularTabelaCartao`, tipo `OpcaoParcelamento`. (Núcleo puro/testável.)
- **Create** `web/__tests__/cartao-calculo.test.ts` — golden.
- **Create** `web/supabase/migrations/20260717000001_simulador_cartao_tabelas.sql` — tabela + RLS. **[AÇÃO MANUAL]**.
- **Modify** `web/types/database.types.ts` — bloco `simulador_cartao_tabelas`.
- **Create** `web/lib/simuladores/cartao/tabelas-actions.ts` — CRUD (máx. 3) + tipo `CartaoTabela` + Zod.
- **Create** `web/lib/simuladores/cartao/proposta-cartao-pdf.ts` — `gerarPropostaCartaoPdf`.
- **Create** `web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx` + `web/components/simuladores/CartaoTabelasManager.tsx` — config.
- **Create** `web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx` + `web/components/simuladores/SimuladorCartao.tsx` — simulador.
- **Modify** `web/lib/simuladores/registry.ts` — `parcelamento-cartao` → `disponivel`.

---

## Task 1: Cálculo puro `calculo.ts` (TDD com golden)

**Files:** Create `web/lib/simuladores/cartao/calculo.ts`; Test `web/__tests__/cartao-calculo.test.ts`.

- [ ] **Step 1: Escrever o teste que falha** — `web/__tests__/cartao-calculo.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { valorAParcelar, calcularTabelaCartao } from '@/lib/simuladores/cartao/calculo'

describe('valorAParcelar', () => {
  it('proposta - entrada, nunca negativo', () => {
    expect(valorAParcelar(50000, 8000)).toBe(42000)
    expect(valorAParcelar(1000, 1500)).toBe(0)
  })
})

describe('calcularTabelaCartao (golden da planilha)', () => {
  it('repassando: total = V*(1+taxa), parcela = total/N', () => {
    const [op] = calcularTabelaCartao(1000, { 6: 0.0669 }, true)
    expect(op.parcelas).toBe(6)
    expect(op.taxa).toBe(0.0669)
    expect(op.valorTotal).toBeCloseTo(1066.9, 6)
    expect(op.valorParcela).toBeCloseTo(177.81666666666666, 6)
  })
  it('sem repassar: total = V, parcela = V/N', () => {
    const [op] = calcularTabelaCartao(1000, { 6: 0.0669 }, false)
    expect(op.valorTotal).toBe(1000)
    expect(op.valorParcela).toBeCloseTo(166.66666666666666, 6)
  })
  it('ordena por nº de parcelas crescente', () => {
    const ops = calcularTabelaCartao(1000, { 12: 0.12, 1: 0.03, 6: 0.0669 }, true)
    expect(ops.map((o) => o.parcelas)).toEqual([1, 6, 12])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run cartao-calculo` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `web/lib/simuladores/cartao/calculo.ts`**
```ts
// web/lib/simuladores/cartao/calculo.ts

// Uma linha da tabela de parcelamento.
export type OpcaoParcelamento = {
  parcelas: number
  taxa: number       // fração (0.0669 = 6,69%)
  valorTotal: number
  valorParcela: number
}

// Valor que vai para o cartão: proposta menos entrada, nunca negativo.
export function valorAParcelar(valorProposta: number, entrada: number): number {
  return Math.max(0, valorProposta - entrada)
}

// Porta a fórmula da planilha. `taxas`: { nº de parcelas -> taxa (fração) }.
// repassar=true  -> total = V*(1+taxa); repassar=false -> total = V.
export function calcularTabelaCartao(
  valor: number,
  taxas: Record<number | string, number>,
  repassar: boolean,
): OpcaoParcelamento[] {
  return Object.keys(taxas)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => {
      const taxa = taxas[n]
      const valorTotal = repassar ? valor * (1 + taxa) : valor
      return { parcelas: n, taxa, valorTotal, valorParcela: n > 0 ? valorTotal / n : valorTotal }
    })
}
```

- [ ] **Step 4: Rodar e ver passar** — `cd web && npx vitest run cartao-calculo` → PASS.

- [ ] **Step 5: Suite + typecheck** — `cd web && npx tsc --noEmit && npx vitest run` → verde.

- [ ] **Step 6: Commit**
```bash
git add web/lib/simuladores/cartao/calculo.ts web/__tests__/cartao-calculo.test.ts
git commit -m "feat(cartao): calculo puro do parcelamento (golden da planilha)"
```

---

## Task 2: Migration `simulador_cartao_tabelas` + RLS + tipos

**Files:** Create `web/supabase/migrations/20260717000001_simulador_cartao_tabelas.sql`; Modify `web/types/database.types.ts`.

- [ ] **Step 1: Escrever a migration**
```sql
-- Simulador de parcelamento no cartão: tabelas de taxa por empresa (máx. 3 — imposto na action).
CREATE TABLE IF NOT EXISTS simulador_cartao_tabelas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  max_parcelas     integer NOT NULL DEFAULT 12 CHECK (max_parcelas BETWEEN 1 AND 24),
  observacao       text,
  taxas            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "N": fração }
  ordem            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_cartao_tabelas_org
  ON simulador_cartao_tabelas(organization_id);

ALTER TABLE simulador_cartao_tabelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador cartao tabelas"
  ON simulador_cartao_tabelas FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Adicionar o bloco de tipos em `web/types/database.types.ts`**

Localize o bloco `simulador_concessionarias` (ou `simulador_viabilidade`) dentro de `Tables` e adicione, no mesmo padrão (aspas duplas, campos em ordem alfabética), uma entrada:
```ts
      simulador_cartao_tabelas: {
        Row: {
          created_at: string
          id: string
          max_parcelas: number
          nome: string
          observacao: string | null
          ordem: number
          organization_id: string
          taxas: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_parcelas?: number
          nome: string
          observacao?: string | null
          ordem?: number
          organization_id: string
          taxas?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_parcelas?: number
          nome?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string
          taxas?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_cartao_tabelas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros.

- [ ] **Step 4: [AÇÃO MANUAL]** rodar a migration no Supabase SQL Editor; depois regenerar `database.types.ts`.

- [ ] **Step 5: Commit**
```bash
git add web/supabase/migrations/20260717000001_simulador_cartao_tabelas.sql web/types/database.types.ts
git commit -m "feat(cartao): migration simulador_cartao_tabelas + RLS + tipos"
```

---

## Task 3: Server actions (CRUD, máx. 3)

**Files:** Create `web/lib/simuladores/cartao/tabelas-actions.ts`.

Referência: `web/lib/simuladores/viabilidade/concessionarias-actions.ts` (requireOrg, escopo de org, `ActionResult`, `logAction`, `revalidatePath`).

- [ ] **Step 1: Implementar**
```ts
// web/lib/simuladores/cartao/tabelas-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'

const ROUTE = '/simuladores/parcelamento-cartao'
const MAX_TABELAS = 3

export type CartaoTabela = {
  id: string
  nome: string
  maxParcelas: number
  observacao: string | null
  taxas: Record<string, number> // fração, chave = nº de parcelas
  ordem: number
}

const tabelaSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à tabela.'),
  maxParcelas: z.coerce.number().int().min(1).max(24, 'Máximo de 24 parcelas.'),
  observacao: z.string().nullish(),
  taxas: z.record(z.string(), z.coerce.number().min(0, 'Taxa não pode ser negativa.')),
  ordem: z.coerce.number().int().min(0).default(0),
})
export type CartaoTabelaData = z.infer<typeof tabelaSchema>

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

function rowToTabela(r: Record<string, unknown>): CartaoTabela {
  return {
    id: String(r.id),
    nome: String(r.nome),
    maxParcelas: Number(r.max_parcelas),
    observacao: r.observacao ? String(r.observacao) : null,
    taxas: (r.taxas ?? {}) as Record<string, number>,
    ordem: Number(r.ordem),
  }
}

function dataToRow(d: CartaoTabelaData) {
  return {
    nome: d.nome,
    max_parcelas: d.maxParcelas,
    observacao: d.observacao ?? null,
    taxas: d.taxas,
    ordem: d.ordem,
  }
}

export async function listCartaoTabelas(): Promise<CartaoTabela[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_cartao_tabelas')
    .select('id, nome, max_parcelas, observacao, taxas, ordem')
    .eq('organization_id', ctx.orgId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToTabela(r as Record<string, unknown>))
}

export async function createCartaoTabela(data: CartaoTabelaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = tabelaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_cartao_tabelas')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_TABELAS) return { error: `Máximo de ${MAX_TABELAS} tabelas por empresa.` }
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .insert({ organization_id: ctx.orgId, ...dataToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Tabela de cartão criada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela criada.' }
}

export async function updateCartaoTabela(id: string, data: CartaoTabelaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = tabelaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .update(dataToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Tabela de cartão atualizada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela atualizada.' }
}

export async function deleteCartaoTabela(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Tabela de cartão excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela excluída.' }
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit`. Se o insert do `taxas` reclamar do tipo `Json`, importar `Json` de `@/types/database.types` e usar `taxas: parsed.data.taxas as Json` no `dataToRow` (mesmo ajuste feito na Peça 3 da Viabilidade). Sem novos erros.

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/cartao/tabelas-actions.ts
git commit -m "feat(cartao): server actions das tabelas de taxa (CRUD, max 3)"
```

---

## Task 4: Tela de configuração das tabelas

**Files:** Create `web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx`; Create `web/components/simuladores/CartaoTabelasManager.tsx`.

- [ ] **Step 1: Página (Server Component)**
```tsx
// web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx
export const metadata = { title: 'Tabelas de cartão' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listCartaoTabelas } from '@/lib/simuladores/cartao/tabelas-actions'
import { CartaoTabelasManager } from '@/components/simuladores/CartaoTabelasManager'

export default async function CartaoTabelasPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const tabelas = await listCartaoTabelas()
  return <CartaoTabelasManager inicial={tabelas} />
}
```

- [ ] **Step 2: Client Component** — CRUD com grid de taxas (1x…máx, em %)
```tsx
// web/components/simuladores/CartaoTabelasManager.tsx
'use client'
import { useState, useTransition } from 'react'
import {
  createCartaoTabela, updateCartaoTabela, deleteCartaoTabela,
  type CartaoTabela,
} from '@/lib/simuladores/cartao/tabelas-actions'

type Form = { nome: string; maxParcelas: number; observacao: string; taxasPct: Record<string, string> }
const VAZIO: Form = { nome: '', maxParcelas: 12, observacao: '', taxasPct: {} }
const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

// fração (banco) <-> percent (UI)
const fracToPct = (f: number) => (f * 100).toString()
const pctToFrac = (p: string) => (p === '' ? 0 : Number(p) / 100)

export function CartaoTabelasManager({ inicial }: { inicial: CartaoTabela[] }) {
  const [lista, setLista] = useState<CartaoTabela[]>(inicial)
  const [form, setForm] = useState<Form>(VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  function editar(t: CartaoTabela) {
    setEditId(t.id)
    const taxasPct: Record<string, string> = {}
    for (const [k, v] of Object.entries(t.taxas)) taxasPct[k] = fracToPct(v)
    setForm({ nome: t.nome, maxParcelas: t.maxParcelas, observacao: t.observacao ?? '', taxasPct })
    setMsg(null)
  }

  function salvar() {
    const taxas: Record<string, number> = {}
    for (let n = 1; n <= form.maxParcelas; n++) taxas[String(n)] = pctToFrac(form.taxasPct[String(n)] ?? '')
    const payload = { nome: form.nome, maxParcelas: form.maxParcelas, observacao: form.observacao || null, taxas, ordem: 0 }
    start(async () => {
      const res = editId ? await updateCartaoTabela(editId, payload) : await createCartaoTabela(payload)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      window.location.reload()
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta tabela?')) return
    start(async () => {
      const res = await deleteCartaoTabela(id)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setLista((l) => l.filter((t) => t.id !== id))
    })
  }

  const cheio = lista.length >= 3 && !editId

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Tabelas de cartão</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">Configure até 3 tabelas de taxa (ex.: Visa/Amex, Master/Elo). As taxas são digitadas em %.</p>
      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      {cheio ? (
        <div className="mb-4 text-sm text-[#6b7280]">Limite de 3 tabelas atingido. Exclua uma para criar outra.</div>
      ) : (
        <div className="rounded-xl border p-4 mb-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">Nome<input className={N} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></label>
            <label className="text-xs">Máx. de parcelas
              <input type="number" min={1} max={24} step={1} className={N} value={String(form.maxParcelas)}
                onChange={(e) => setForm((f) => ({ ...f, maxParcelas: Math.max(1, Math.min(24, Number(e.target.value) || 1)) }))} />
            </label>
            <label className="text-xs">Observação<input className={N} value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} /></label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: form.maxParcelas }, (_, i) => i + 1).map((n) => (
              <label key={n} className="text-xs">{n}x — taxa %
                <input type="number" step="any" className={N} value={form.taxasPct[String(n)] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, taxasPct: { ...f.taxasPct, [String(n)]: e.target.value } }))} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
              {editId ? 'Salvar alterações' : 'Adicionar'}
            </button>
            {editId && <button disabled={pending} onClick={() => { setEditId(null); setForm(VAZIO) }} className="rounded border text-sm px-3 py-1.5">Cancelar</button>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lista.map((t) => (
          <div key={t.id} className="rounded-lg border p-3 flex items-center justify-between text-sm">
            <div>
              <b>{t.nome}</b> — até {t.maxParcelas}x {t.observacao ? <span className="text-[#6b7280]">· {t.observacao}</span> : null}
            </div>
            <div>
              <button className="text-[#3b6fd6] mr-3" onClick={() => editar(t)}>editar</button>
              <button className="text-[#c0392b]" onClick={() => excluir(t.id)}>excluir</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-[#6b7280]">Nenhuma tabela ainda. Crie a primeira acima.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros.

- [ ] **Step 4: Commit**
```bash
git add "web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx" web/components/simuladores/CartaoTabelasManager.tsx
git commit -m "feat(cartao): tela de configuracao das tabelas de taxa"
```

---

## Task 5: Gerador de PDF `proposta-cartao-pdf.ts`

**Files:** Create `web/lib/simuladores/cartao/proposta-cartao-pdf.ts`.

- [ ] **Step 1: Implementar** (jsPDF+autotable, cabeçalho no padrão do `receipt-pdf.ts`/Viabilidade)
```ts
// web/lib/simuladores/cartao/proposta-cartao-pdf.ts
import type { OpcaoParcelamento } from './calculo'
import type { EmpresaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'

export type TabelaPdf = { nome: string; observacao: string | null; opcoes: OpcaoParcelamento[] }
export type DadosCartaoPdf = {
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  valorProposta: number
  entrada: number
  valorParcelar: number
  repassar: boolean
  tabelas: TabelaPdf[]
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export async function gerarPropostaCartaoPdf(d: DadosCartaoPdf): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 34, 'F')
  if (d.empresa.logoBase64) {
    try { doc.addImage(d.empresa.logoBase64, 'PNG', margin, 8, 34, 16) } catch { /* ignore */ }
  }
  const hx = d.empresa.logoBase64 ? margin + 40 : margin
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(d.empresa.nome, hx, 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text([d.empresa.cnpj ? `CNPJ: ${d.empresa.cnpj}` : null, d.empresa.telefone, d.empresa.email].filter(Boolean).join('   |   '), hx, 20)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 200, 80)
  doc.text('PARCELAMENTO', W - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - margin, 20, { align: 'right' })

  let y = 40
  if (d.clienteNome) {
    doc.setTextColor(60, 60, 70); doc.setFontSize(9)
    doc.text(`Cliente: ${d.clienteNome}${d.clienteCidade ? ' — ' + d.clienteCidade : ''}`, margin, y); y += 6
  }
  doc.setTextColor(40, 40, 50); doc.setFontSize(9)
  doc.text(
    `Proposta: ${brl(d.valorProposta)}   |   Entrada: ${brl(d.entrada)}   |   A parcelar: ${brl(d.valorParcelar)}   |   Taxa repassada ao cliente: ${d.repassar ? 'Sim' : 'Não'}`,
    margin, y,
  )
  y += 4

  for (const t of d.tabelas) {
    autoTable(doc, {
      startY: y + 2, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.2 },
      headStyles: { fillColor: [15, 23, 42] },
      head: [[`${t.nome}${t.observacao ? '  —  ' + t.observacao : ''}`, '', '', '']],
      body: [
        ['Plano', 'Taxa', 'Valor total', 'Valor da parcela'],
        ...t.opcoes.map((o) => [`${o.parcelas}x`, pct(o.taxa), brl(o.valorTotal), brl(o.valorParcela)]),
      ],
      didParseCell: (data: any) => { if (data.row.index === 0) data.cell.styles.fontStyle = 'bold' },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  const fname = `parcelamento-${brl(d.valorProposta).replace(/[^0-9]/g, '')}.pdf`
  doc.save(fname)
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros. (Os `as any` acompanham o padrão de `receipt-pdf.ts`.)

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/cartao/proposta-cartao-pdf.ts
git commit -m "feat(cartao): PDF da proposta de parcelamento (jsPDF + autotable)"
```

---

## Task 6: Tela do simulador + registry

**Files:** Create `web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx`; Create `web/components/simuladores/SimuladorCartao.tsx`; Modify `web/lib/simuladores/registry.ts`.

- [ ] **Step 1: Registry — marcar disponível**

Em `web/lib/simuladores/registry.ts`, trocar só a linha do `parcelamento-cartao`:
```ts
  { slug: 'parcelamento-cartao',     titulo: 'Parcelamento no cartão', descricao: 'Simula parcelas no cartão',             icone: '💳', status: 'disponivel' },
```

- [ ] **Step 2: Página (Server Component)**
```tsx
// web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx
export const metadata = { title: 'Parcelamento no cartão' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listCartaoTabelas } from '@/lib/simuladores/cartao/tabelas-actions'
import { getEmpresaParaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'
import { SimuladorCartao } from '@/components/simuladores/SimuladorCartao'

export default async function ParcelamentoCartaoPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [tabelas, empresa] = await Promise.all([listCartaoTabelas(), getEmpresaParaProposta()])
  return <SimuladorCartao tabelas={tabelas} empresa={empresa} />
}
```

- [ ] **Step 3: Client Component** — inputs + tabelas lado a lado ao vivo + PDF
```tsx
// web/components/simuladores/SimuladorCartao.tsx
'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CartaoTabela } from '@/lib/simuladores/cartao/tabelas-actions'
import { valorAParcelar, calcularTabelaCartao } from '@/lib/simuladores/cartao/calculo'
import { gerarPropostaCartaoPdf } from '@/lib/simuladores/cartao/proposta-cartao-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'

type Props = { tabelas: CartaoTabela[]; empresa: EmpresaProposta }
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toFixed(2)}%`
const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

export function SimuladorCartao({ tabelas, empresa }: Props) {
  const [proposta, setProposta] = useState(0)
  const [entrada, setEntrada] = useState(0)
  const [repassar, setRepassar] = useState(true)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCidade, setClienteCidade] = useState('')

  const parcelar = valorAParcelar(proposta, entrada)
  const calculadas = useMemo(
    () => tabelas.map((t) => ({ tabela: t, opcoes: calcularTabelaCartao(parcelar, t.taxas, repassar) })),
    [tabelas, parcelar, repassar],
  )

  async function pdf() {
    await gerarPropostaCartaoPdf({
      empresa, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
      valorProposta: proposta, entrada, valorParcelar: parcelar, repassar,
      tabelas: calculadas.map((c) => ({ nome: c.tabela.nome, observacao: c.tabela.observacao, opcoes: c.opcoes })),
    })
  }

  if (tabelas.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2 text-[var(--theme-text,#1a2340)]">Parcelamento no cartão</h1>
        <p className="text-sm text-[#6b7280]">Nenhuma tabela de taxa configurada.{' '}
          <Link href="/simuladores/parcelamento-cartao/tabelas" className="text-[#3b6fd6] underline">Configurar tabelas</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Parcelamento no cartão</h1>
        <Link href="/simuladores/parcelamento-cartao/tabelas" className="text-xs text-[#3b6fd6] underline">Configurar tabelas</Link>
      </div>

      <div className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <label className="text-xs">Valor da proposta (R$)<input type="number" step="any" className={N} value={String(proposta)} onChange={(e) => setProposta(Number(e.target.value) || 0)} /></label>
        <label className="text-xs">Entrada (R$)<input type="number" step="any" className={N} value={String(entrada)} onChange={(e) => setEntrada(Number(e.target.value) || 0)} /></label>
        <div className="text-xs">Valor a parcelar
          <div className="mt-1 rounded border px-2 py-1 bg-[#F1F3F7] text-[#555] border-[#E0E3EE] font-mono">{brl(parcelar)}</div>
        </div>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={repassar} onChange={(e) => setRepassar(e.target.checked)} /> Repassar taxa ao cliente
        </label>
        <label className="text-xs">Cliente (opcional)<input className={N} value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></label>
        <label className="text-xs">Cidade/UF<input className={N} value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} /></label>
        <button onClick={pdf} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 h-fit">Gerar PDF</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
        {calculadas.map(({ tabela, opcoes }) => (
          <div key={tabela.id} className="rounded-xl border p-3">
            <div className="text-sm font-semibold">{tabela.nome}</div>
            {tabela.observacao && <div className="text-[11px] text-[#6b7280] mb-1">{tabela.observacao}</div>}
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left border-b"><th className="py-1 pr-2">Plano</th><th className="py-1 pr-2">Taxa</th><th className="py-1 pr-2">Total</th><th className="py-1 pr-2">Parcela</th></tr></thead>
              <tbody>
                {opcoes.map((o) => (
                  <tr key={o.parcelas} className="border-b">
                    <td className="py-1 pr-2">{o.parcelas}x</td>
                    <td className="py-1 pr-2 font-mono">{pct(o.taxa)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(o.valorTotal)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(o.valorParcela)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + suite** — `cd web && npx tsc --noEmit && npx vitest run` → verde.

- [ ] **Step 5: Verificar no app rodando** (dev server + login na Integra Solar Demonstração):
  1. Configurar 1–2 tabelas em `/simuladores/parcelamento-cartao/tabelas` (nome, máx. parcelas, taxas %). Confirmar limite de 3.
  2. Em `/simuladores/parcelamento-cartao`: proposta 50000, entrada 8000 → "A parcelar" = R$ 42.000; as tabelas recalculam ao vivo. Conferir uma linha na mão (ex.: 6x @ 6,69% repassando → total 44.809,80; parcela 7.468,30).
  3. Alternar "Repassar taxa" → total volta a R$ 42.000 e parcela = 42000/N.
  4. Gerar PDF e conferir cabeçalho, resumo e as tabelas.
  5. Card do hub "Parcelamento no cartão" agora "disponível"; empresa sem flag → redirect.

- [ ] **Step 6: Commit**
```bash
git add "web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx" web/components/simuladores/SimuladorCartao.tsx web/lib/simuladores/registry.ts
git commit -m "feat(cartao): tela do simulador (tabelas ao vivo) + PDF + registry"
```

---

## Encerramento
- [ ] Suite verde: `cd web && npx tsc --noEmit && npx vitest run`.
- [ ] Migration aplicada (AÇÃO MANUAL) + `database.types.ts` regenerado; telas/PDF/RLS validados no app.
- [ ] Push: `git push` (branch `feat/simuladores`).
- [ ] **Fidelidade comprovada:** golden do cálculo reproduz a fórmula da planilha (`V×(1+taxa)` e `÷N`).

---

## Self-Review (cobertura do spec)
- **Escopo 1 (cálculo + golden):** Task 1. ✅
- **Escopo 2 (tabela+migration+RLS+tipos):** Task 2. ✅
- **Escopo 3 (server actions CRUD máx. 3):** Task 3. ✅
- **Escopo 4 (tela de config com grid de taxas):** Task 4. ✅
- **Escopo 5 (tela do simulador lado a lado + PDF):** Task 6 + Task 5. ✅
- **Escopo 6 (PDF):** Task 5. ✅
- **Escopo 7 (registry disponível):** Task 6 Step 1. ✅
- **Decisões do spec:** markup `V×(1+taxa)` e não-repasse `V` (Task 1), taxa fração no banco / % na UI (Task 1 + Task 4 `pctToFrac`/`fracToPct`), máx. 24 parcelas (migration CHECK + Zod), máx. 3 tabelas (action), toggle único de repasse (Task 6), lado a lado (Task 6), reaproveita `getEmpresaParaProposta` (Task 6 Step 2 / Task 5), sem histórico (nenhuma tabela de simulação criada). ✅
- **Consistência de tipos:** `OpcaoParcelamento` (Task 1) usado no PDF (Task 5) e na tela (Task 6); `CartaoTabela`/`CartaoTabelaData` (Task 3) usados nas telas (Tasks 4/6); `EmpresaProposta` reaproveitado (Task 5/6). ✅
