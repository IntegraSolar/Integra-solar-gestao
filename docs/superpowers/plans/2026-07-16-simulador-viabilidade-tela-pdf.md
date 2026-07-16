# Simulador de Viabilidade — Peça 3 (Tela + Salvar + PDF) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o Simulador de Viabilidade: tela em `/simuladores/viabilidade-usina` que coleta inputs, escolhe uma concessionária (Peça 2), roda o motor (Peça 1) ao vivo, mostra TIR/VPL/Payback + gráfico, permite **Salvar** (histórico standalone por empresa) e **gerar um PDF** de proposta comercial fiel à aba "Proposta" do Excel.

**Architecture:** Um montador de input puro e testável (`montar-input.ts`) une os campos da tela + os 3 campos derivados da concessionária + defaults do cenário num `ViabilidadeInput`, validado por golden test que reproduz a TIR/VPL da Peça 1. Persistência multi-tenant em `simulador_viabilidade` (RLS por org, snapshot `jsonb` do input + resumo). Tela client-side (layout de duas colunas com resultados sticky) que importa o motor puro e recalcula ao vivo. PDF client-side com `jsPDF` + `jspdf-autotable` (padrão de `lib/financeiro/receipt-pdf.ts`), incluindo um gráfico de fluxo acumulado desenhado com primitivas vetoriais.

**Tech Stack:** TypeScript, Vitest (montador/golden), Next.js App Router + Server Actions + Zod, Supabase/Postgres (migration + RLS), jsPDF + jspdf-autotable. Sem dependências novas.

**Branch:** `feat/simuladores`. Gate do núcleo: `cd web && npx tsc --noEmit && npx vitest run`. Tela/PDF/RLS/Salvar validados no Preview do Vercel.

**Fonte da verdade:** aba "Proposta" da planilha; golden = cenário RGE / GD2 / 90 kWp (o mesmo da Peça 1).

---

## Referência do modelo (fiel — use isto)

### Campos da tela (por-negócio, editáveis)
`numPaineis`, `potenciaPainelWp` (Wp), `numInversores`, `potenciaInversorKw` (kW),
`fatorCapacidade`, `modalidade` (`'GD1' | 'GD2'`), `valorInvestimento` (CAPEX, R$),
`descontoLocacao` (fração), `pctFinanciado` (fração). Mais texto: `modeloPainel`,
`modeloInversor`, `clienteNome`, `clienteCidade` (só p/ o PDF; **não** entram no motor).

### Premissas avançadas (defaults do cenário; editáveis; valores EXATOS do golden da Peça 1)
`reajusteTarifaAnual 0.08`, `degradacaoAnual 0.015`, `tma 0.10`,
`opexPct 0.081199185409699712`, `impostoPct 0.045`, `d23 0.125`,
`sunneSetupMicro 5000`, `sunneSetupMini 10000`, `jurosAnual 0.10`, `prazoMeses 12`,
`horizonteAnos 25`, `anoInicial 2025`,
`fioBSchedule [0.6, 0.75, 0.9, 1×22]` (25 elementos).

### Da concessionária (Peça 2, via `concessionariaParaInputs`)
`tusdFioB` (fração), `tarifaLocacaoBase` (R$/kWh), `tarifaDemanda` (R$/kW).

### Golden do montador
Concessionária **RGE** (do seed) + campos `{numPaineis 150, potenciaPainelWp 600,
numInversores 1, potenciaInversorKw 75, fatorCapacidade 0.14, modalidade 'GD2',
valorInvestimento 154413.82, descontoLocacao 0.20, pctFinanciado 0}` + defaults →
`calcularViabilidade` = **TIR 0.21410107123012923 / VPL 226670.96975404624 / Payback 5**.

### Custos totais do PDF (decisão de honestidade)
- **CAPEX** = `valorInvestimento` (input).
- **Reestruturação do inversor** = `reinvestAno15 = 0.10 * CAPEX * (1+0.02)^15` (constante do motor).
- **Vida útil** = `horizonteAnos` (25).
- **"O&M Acumulado (VP)"**: **OMITIDO** — não é reproduzível a partir do output atual do motor
  (`LinhaProjecao` expõe `opex` e `imposto`, mas não os componentes de gestão/demanda/seguro que
  compõem o -959.820 do Excel). Não inventar; fica de fora até o motor expor o agregado. Marcar
  `TODO-oem-vp` no código do PDF.

---

## File Structure

- **Create** `web/lib/simuladores/viabilidade/montar-input.ts` — `PREMISSAS_DEFAULT`, tipo `CamposSimulador`, `montarViabilidadeInput`. (Núcleo puro/testável.)
- **Create** `web/__tests__/viabilidade-montar-input.test.ts` — golden RGE+defaults → motor.
- **Create** `web/supabase/migrations/20260716000001_simulador_viabilidade.sql` — tabela + RLS. **[AÇÃO MANUAL]**.
- **Modify** `web/types/database.types.ts` — adicionar o bloco da tabela `simulador_viabilidade`.
- **Create** `web/lib/simuladores/viabilidade/simulacoes-actions.ts` — `salvarSimulacao`, `listSimulacoes`, `deleteSimulacao` + Zod.
- **Create** `web/lib/simuladores/viabilidade/proposta-empresa.ts` — `getEmpresaParaProposta()` (org_config + logo base64), tipo `EmpresaProposta`.
- **Create** `web/lib/simuladores/viabilidade/proposta-pdf.ts` — `gerarPropostaPdf(dados)` client-side.
- **Create** `web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx` — gate + loaders + render.
- **Create** `web/components/simuladores/SimuladorViabilidade.tsx` — tela (layout A).
- **Modify** `web/lib/simuladores/registry.ts` — `viabilidade-usina` → `status: 'disponivel'`.

---

## Task 1: Montador de input `montar-input.ts` (TDD com golden)

**Files:**
- Create: `web/lib/simuladores/viabilidade/montar-input.ts`
- Test: `web/__tests__/viabilidade-montar-input.test.ts`

- [ ] **Step 1: Teste golden que falha** — `web/__tests__/viabilidade-montar-input.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { montarViabilidadeInput, PREMISSAS_DEFAULT, type CamposSimulador } from '@/lib/simuladores/viabilidade/montar-input'
import { CONCESSIONARIAS_SEED } from '@/lib/simuladores/viabilidade/concessionarias-seed'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'

const RGE = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')!
const CAMPOS: CamposSimulador = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2',
  valorInvestimento: 154413.82, descontoLocacao: 0.20, pctFinanciado: 0,
}

describe('PREMISSAS_DEFAULT', () => {
  it('fioBSchedule tem 25 elementos começando em 0.6/0.75/0.9', () => {
    expect(PREMISSAS_DEFAULT.fioBSchedule).toHaveLength(25)
    expect(PREMISSAS_DEFAULT.fioBSchedule.slice(0, 4)).toEqual([0.6, 0.75, 0.9, 1])
  })
})

describe('montarViabilidadeInput (golden RGE)', () => {
  const input = montarViabilidadeInput(CAMPOS, RGE)
  it('injeta os 3 campos derivados da concessionária', () => {
    expect(input.tusdFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(input.tarifaLocacaoBase).toBeCloseTo(0.8222, 6)
    expect(input.tarifaDemanda).toBeCloseTo(16.983311938382542, 8)
  })
  it('reproduz TIR/VPL/Payback do Excel via motor', () => {
    const r = calcularViabilidade(input)
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
    expect(r.capitalProprio.paybackAnos).toBe(5)
  })
  it('permite sobrescrever uma premissa avançada', () => {
    const alt = montarViabilidadeInput({ ...CAMPOS, premissas: { tma: 0.12 } }, RGE)
    expect(alt.tma).toBe(0.12)
    expect(alt.reajusteTarifaAnual).toBe(0.08) // demais mantêm o default
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run viabilidade-montar-input` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `montar-input.ts`**
```ts
// web/lib/simuladores/viabilidade/montar-input.ts
import type { ViabilidadeInput, ModalidadeGD } from './types'
import { concessionariaParaInputs, type ConcessionariaBruta } from './concessionaria'

// Premissas do cenário (defaults). Valores EXATOS do golden da Peça 1.
export type Premissas = {
  reajusteTarifaAnual: number
  degradacaoAnual: number
  tma: number
  opexPct: number
  impostoPct: number
  d23: number
  sunneSetupMicro: number
  sunneSetupMini: number
  jurosAnual: number
  prazoMeses: number
  horizonteAnos: number
  anoInicial: number
  fioBSchedule: number[]
}

export const PREMISSAS_DEFAULT: Premissas = {
  reajusteTarifaAnual: 0.08,
  degradacaoAnual: 0.015,
  tma: 0.1,
  opexPct: 0.081199185409699712,
  impostoPct: 0.045,
  d23: 0.125,
  sunneSetupMicro: 5000,
  sunneSetupMini: 10000,
  jurosAnual: 0.1,
  prazoMeses: 12,
  horizonteAnos: 25,
  anoInicial: 2025,
  fioBSchedule: [0.6, 0.75, 0.9, ...Array<number>(22).fill(1)],
}

// Campos coletados na tela (por-negócio). A modalidade é só GD1/GD2 (motor não faz GD3 ainda).
export type CamposSimulador = {
  numPaineis: number
  potenciaPainelWp: number
  numInversores: number
  potenciaInversorKw: number
  fatorCapacidade: number
  modalidade: Extract<ModalidadeGD, 'GD1' | 'GD2'>
  valorInvestimento: number
  descontoLocacao: number
  pctFinanciado: number
  premissas?: Partial<Premissas> // sobrescreve os defaults (seção "avançadas")
}

// Une campos da tela + derivados da concessionária + premissas -> input do motor.
export function montarViabilidadeInput(campos: CamposSimulador, conc: ConcessionariaBruta): ViabilidadeInput {
  const p: Premissas = { ...PREMISSAS_DEFAULT, ...(campos.premissas ?? {}) }
  const derivados = concessionariaParaInputs(conc)
  return {
    numPaineis: campos.numPaineis,
    potenciaPainelWp: campos.potenciaPainelWp,
    numInversores: campos.numInversores,
    potenciaInversorKw: campos.potenciaInversorKw,
    fatorCapacidade: campos.fatorCapacidade,
    modalidade: campos.modalidade,
    valorInvestimento: campos.valorInvestimento,
    descontoLocacao: campos.descontoLocacao,
    pctFinanciado: campos.pctFinanciado,
    ...derivados, // tusdFioB, tarifaLocacaoBase, tarifaDemanda
    reajusteTarifaAnual: p.reajusteTarifaAnual,
    degradacaoAnual: p.degradacaoAnual,
    tma: p.tma,
    opexPct: p.opexPct,
    impostoPct: p.impostoPct,
    d23: p.d23,
    sunneSetupMicro: p.sunneSetupMicro,
    sunneSetupMini: p.sunneSetupMini,
    jurosAnual: p.jurosAnual,
    prazoMeses: p.prazoMeses,
    fioBSchedule: [...p.fioBSchedule],
    horizonteAnos: p.horizonteAnos,
    anoInicial: p.anoInicial,
  }
}
```

- [ ] **Step 4: Rodar e ver passar** — `cd web && npx vitest run viabilidade-montar-input` → PASS.

- [ ] **Step 5: Suite + typecheck** — `cd web && npx tsc --noEmit && npx vitest run` → verde.

- [ ] **Step 6: Commit**
```bash
git add web/lib/simuladores/viabilidade/montar-input.ts web/__tests__/viabilidade-montar-input.test.ts
git commit -m "feat(viabilidade): montador de input da tela (golden RGE+defaults)"
```

---

## Task 2: Migration `simulador_viabilidade` + RLS + tipos

**Files:**
- Create: `web/supabase/migrations/20260716000001_simulador_viabilidade.sql`
- Modify: `web/types/database.types.ts`

- [ ] **Step 1: Escrever a migration** (RLS igual à Peça 2)
```sql
-- Peça 3: histórico de simulações de viabilidade por empresa (standalone, sem vínculo CRM).
CREATE TABLE IF NOT EXISTS simulador_viabilidade (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome              text NOT NULL,
  concessionaria_id uuid REFERENCES simulador_concessionarias(id) ON DELETE SET NULL,
  input             jsonb NOT NULL,            -- snapshot do ViabilidadeInput
  cliente_nome      text,                      -- texto livre, só p/ o PDF
  cliente_cidade    text,
  tir               numeric(10, 6) NOT NULL DEFAULT 0,  -- resumo p/ listagem
  vpl               numeric(16, 2) NOT NULL DEFAULT 0,
  payback_anos      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_viabilidade_org
  ON simulador_viabilidade(organization_id);

ALTER TABLE simulador_viabilidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador viabilidade"
  ON simulador_viabilidade FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Adicionar o bloco de tipos em `web/types/database.types.ts`**

Localize o bloco de outra tabela recente (ex.: `simulador_concessionarias`) e adicione, no mesmo padrão, uma entrada `simulador_viabilidade` dentro de `Tables`:
```ts
      simulador_viabilidade: {
        Row: {
          id: string
          organization_id: string
          nome: string
          concessionaria_id: string | null
          input: Json
          cliente_nome: string | null
          cliente_cidade: string | null
          tir: number
          vpl: number
          payback_anos: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          nome: string
          concessionaria_id?: string | null
          input: Json
          cliente_nome?: string | null
          cliente_cidade?: string | null
          tir?: number
          vpl?: number
          payback_anos?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          nome?: string
          concessionaria_id?: string | null
          input?: Json
          cliente_nome?: string | null
          cliente_cidade?: string | null
          tir?: number
          vpl?: number
          payback_anos?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'simulador_viabilidade_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'simulador_viabilidade_concessionaria_id_fkey'
            columns: ['concessionaria_id']
            isOneToOne: false
            referencedRelation: 'simulador_concessionarias'
            referencedColumns: ['id']
          },
        ]
      }
```
> Use o tipo `Json` já definido no topo do arquivo. Verifique a vírgula/fechamento para não quebrar o objeto `Tables`.

- [ ] **Step 3: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros.

- [ ] **Step 4: [AÇÃO MANUAL]** rodar a migration no Supabase SQL Editor; depois, idealmente, regenerar `database.types.ts` (`supabase gen types` / MCP `generate_typescript_types`) para o gerado voltar a ser a fonte da verdade.

- [ ] **Step 5: Commit**
```bash
git add web/supabase/migrations/20260716000001_simulador_viabilidade.sql web/types/database.types.ts
git commit -m "feat(viabilidade): migration simulador_viabilidade + RLS + tipos"
```

---

## Task 3: Server actions (Salvar/Listar/Excluir)

**Files:**
- Create: `web/lib/simuladores/viabilidade/simulacoes-actions.ts`

Referência de padrão: `web/lib/simuladores/viabilidade/concessionarias-actions.ts` (Peça 2) — `requireOrg`, escopo `.eq('organization_id', orgId)`, `ActionResult`, `logAction`, `revalidatePath`.

- [ ] **Step 1: Implementar**
```ts
// web/lib/simuladores/viabilidade/simulacoes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'

const ROUTE = '/simuladores/viabilidade-usina'

export type SimulacaoResumo = {
  id: string
  nome: string
  tir: number
  vpl: number
  paybackAnos: number
  input: unknown
  concessionariaId: string | null
  clienteNome: string | null
  clienteCidade: string | null
  createdAt: string
}

const salvarSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à simulação.'),
  concessionariaId: z.string().uuid().nullable(),
  clienteNome: z.string().nullish(),
  clienteCidade: z.string().nullish(),
  tir: z.coerce.number(),
  vpl: z.coerce.number(),
  paybackAnos: z.coerce.number().int(),
  input: z.record(z.string(), z.unknown()), // snapshot do ViabilidadeInput
})
export type SalvarSimulacaoData = z.infer<typeof salvarSchema>

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function salvarSimulacao(data: SalvarSimulacaoData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = salvarSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.from('simulador_viabilidade').insert({
    organization_id: ctx.orgId,
    nome: parsed.data.nome,
    concessionaria_id: parsed.data.concessionariaId,
    input: parsed.data.input,
    cliente_nome: parsed.data.clienteNome ?? null,
    cliente_cidade: parsed.data.clienteCidade ?? null,
    tir: parsed.data.tir,
    vpl: parsed.data.vpl,
    payback_anos: parsed.data.paybackAnos,
  })
  if (error) return { error: error.message }
  await logAction('Simulação de viabilidade salva', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação salva.' }
}

export async function listSimulacoes(): Promise<SimulacaoResumo[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_viabilidade')
    .select('id, nome, tir, vpl, payback_anos, input, concessionaria_id, cliente_nome, cliente_cidade, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      nome: String(row.nome),
      tir: Number(row.tir),
      vpl: Number(row.vpl),
      paybackAnos: Number(row.payback_anos),
      input: row.input,
      concessionariaId: row.concessionaria_id ? String(row.concessionaria_id) : null,
      clienteNome: row.cliente_nome ? String(row.cliente_nome) : null,
      clienteCidade: row.cliente_cidade ? String(row.cliente_cidade) : null,
      createdAt: String(row.created_at),
    }
  })
}

export async function deleteSimulacao(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_viabilidade')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Simulação de viabilidade excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação excluída.' }
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros.

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/viabilidade/simulacoes-actions.ts
git commit -m "feat(viabilidade): server actions de simulacoes (salvar/listar/excluir)"
```

---

## Task 4: Loader dos dados da empresa p/ o PDF

**Files:**
- Create: `web/lib/simuladores/viabilidade/proposta-empresa.ts`

Referência: `web/lib/financeiro/receipt-actions.ts` (lê `org_config` e converte o logo p/ base64).

- [ ] **Step 1: Implementar**
```ts
// web/lib/simuladores/viabilidade/proposta-empresa.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type EmpresaProposta = {
  nome: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  logoBase64: string | null
}

async function fetchLogoBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    return `data:image/png;base64,${b64}`
  } catch {
    return null
  }
}

// Dados da empresa para o cabeçalho da proposta (mesma fonte do recibo).
export async function getEmpresaParaProposta(): Promise<EmpresaProposta> {
  const fallback: EmpresaProposta = { nome: 'Empresa', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return fallback
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_config')
    .select('razao_social, cnpj, endereco, telefone, email, logo_url, numero, cidade, estado')
    .eq('organization_id', orgId)
    .maybeSingle()
  const cfg = data as Record<string, unknown> | null
  if (!cfg) return fallback
  const endereco = [cfg.endereco, cfg.numero, cfg.cidade, cfg.estado].filter(Boolean).join(', ') || null
  return {
    nome: (cfg.razao_social as string) ?? 'Empresa',
    cnpj: (cfg.cnpj as string) ?? null,
    endereco,
    telefone: (cfg.telefone as string) ?? null,
    email: (cfg.email as string) ?? null,
    logoBase64: await fetchLogoBase64((cfg.logo_url as string) ?? null),
  }
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros.

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/viabilidade/proposta-empresa.ts
git commit -m "feat(viabilidade): loader de dados da empresa para a proposta"
```

---

## Task 5: Gerador de PDF `proposta-pdf.ts` (client-side)

**Files:**
- Create: `web/lib/simuladores/viabilidade/proposta-pdf.ts`

- [ ] **Step 1: Implementar** (jsPDF + autotable, com gráfico vetorial; padrão de `receipt-pdf.ts`)
```ts
// web/lib/simuladores/viabilidade/proposta-pdf.ts
import type { ViabilidadeInput, ViabilidadeResultado } from './types'
import type { EmpresaProposta } from './proposta-empresa'

export type DadosProposta = {
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const num = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

export async function gerarPropostaPdf(d: DadosProposta): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15

  // ── Cabeçalho ──
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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 200, 80)
  doc.text('PROPOSTA', W - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}  ·  validade 10 dias`, W - margin, 20, { align: 'right' })

  let y = 40
  if (d.clienteNome) {
    doc.setTextColor(60, 60, 70); doc.setFontSize(9)
    doc.text(`Cliente: ${d.clienteNome}${d.clienteCidade ? ' — ' + d.clienteCidade : ''}`, margin, y)
    y += 6
  }

  const i = d.input, r = d.resultado
  const regraGD = i.modalidade === 'GD1' ? 'GD 1' : 'GD 2'
  const geracaoMensal = r.geracaoAnualKwh / 12

  // ── UFV ──
  autoTable(doc, {
    startY: y, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Usina Fotovoltaica (UFV)', '']],
    body: [
      ['Modelo de compensação', 'Compartilhada'],
      ['Regra de transição', regraGD],
      ['Concessionária', d.concessionariaNome],
      ['Potência pico (kWp)', num(r.kwp, 2)],
      ['Potência nominal (kW)', num(i.numInversores * i.potenciaInversorKw, 0)],
      ['Painel FV', `${num(i.potenciaPainelWp)} Wp × ${i.numPaineis} un — ${d.modeloPainel}`],
      ['Inversor(es)', `${num(i.potenciaInversorKw)} kW × ${i.numInversores} un — ${d.modeloInversor}`],
      ['Fator de capacidade', num(i.fatorCapacidade, 2)],
      ['Geração anual (kWh)', num(r.geracaoAnualKwh, 0)],
      ['Geração mensal (kWh)', num(geracaoMensal, 0)],
      ['Tipo de usina', r.tipoUsina],
    ],
  })

  // ── Premissas ──
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Premissas do projeto', '']],
    body: [
      ['Desconto do consumidor', pct(i.descontoLocacao)],
      ['Tarifa compensável (R$/kWh)', num(i.tarifaLocacaoBase, 4)],
      ['Reajuste de energia / IPCA', pct(i.reajusteTarifaAnual)],
      ['Fator de indisponibilidade', pct(i.degradacaoAnual)],
      ['TMA', pct(i.tma)],
      ['Percentual de imposto', pct(i.impostoPct)],
    ],
  })

  // ── Custos totais (O&M VP omitido — ver TODO-oem-vp) ──
  const reinvestAno15 = 0.1 * i.valorInvestimento * Math.pow(1.02, 15)
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Custos totais do projeto', '']],
    body: [
      ['Investimento inicial (CAPEX)', brl(-i.valorInvestimento)],
      ['Reestruturação do inversor (ano 15)', brl(-reinvestAno15)],
      ['Vida útil do projeto (anos)', String(i.horizonteAnos)],
    ],
  })

  // ── Resultados ──
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [31, 157, 85] },
    head: [['Resultados', 'Capital próprio', 'Com financiamento']],
    body: [
      ['TIR', pct(r.capitalProprio.tir), pct(r.comFinanciamento.tir)],
      ['VPL', brl(r.capitalProprio.vpl), brl(r.comFinanciamento.vpl)],
      ['Payback (anos)', String(r.capitalProprio.paybackAnos), String(r.comFinanciamento.paybackAnos)],
    ],
  })

  // ── Gráfico: fluxo próprio acumulado (vetorial) ──
  const gy = (doc as any).lastAutoTable.finalY + 6
  desenharGraficoAcumulado(doc, r, margin, gy, W - margin * 2, 45)

  // ── Página 2: projeção 25 anos ──
  doc.addPage()
  autoTable(doc, {
    startY: margin, theme: 'striped', styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Ano', 'Produção (kWh)', 'Receita', 'OPEX', 'Fluxo próprio', 'Acumulado']],
    body: r.projecao.map((l) => [
      String(l.ano), num(l.producaoKwh, 0), brl(l.receitaBruta), brl(l.opex),
      brl(l.fluxoProprio), brl(l.fluxoProprioAcum),
    ]),
  })

  const fname = `proposta-viabilidade-${d.concessionariaNome}-${num(r.kwp, 0)}kwp.pdf`.replace(/\s+/g, '-')
  doc.save(fname)
}

// Desenha o fluxo próprio acumulado como linha, com eixos, usando primitivas do jsPDF.
function desenharGraficoAcumulado(
  doc: any, r: ViabilidadeResultado, x: number, y: number, w: number, h: number,
): void {
  const acum = r.projecao.map((l) => l.fluxoProprioAcum)
  const min = Math.min(...acum, 0)
  const max = Math.max(...acum, 0)
  const range = max - min || 1
  const sx = (idx: number) => x + (idx / (acum.length - 1)) * w
  const sy = (v: number) => y + h - ((v - min) / range) * h

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2)
  doc.rect(x, y, w, h) // moldura
  // linha do zero
  doc.setDrawColor(150, 150, 150)
  doc.line(x, sy(0), x + w, sy(0))
  // curva
  doc.setDrawColor(31, 157, 85); doc.setLineWidth(0.5)
  for (let k = 1; k < acum.length; k++) doc.line(sx(k - 1), sy(acum[k - 1]), sx(k), sy(acum[k]))
  // rótulos
  doc.setFontSize(7); doc.setTextColor(90, 90, 90)
  doc.text('Fluxo de caixa acumulado (25 anos)', x, y - 1.5)
  doc.text(brl(max), x + w, y + 3, { align: 'right' })
  doc.text(brl(min), x + w, y + h, { align: 'right' })
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit` → sem novos erros. (Os `as any` em `lastAutoTable`/`doc` acompanham o padrão do `receipt-pdf.ts`; jspdf-autotable não tipa `lastAutoTable`.)

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/viabilidade/proposta-pdf.ts
git commit -m "feat(viabilidade): PDF da proposta (jsPDF + grafico vetorial + projecao)"
```

---

## Task 6: Rota + tela `SimuladorViabilidade` + registry

**Files:**
- Create: `web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx`
- Create: `web/components/simuladores/SimuladorViabilidade.tsx`
- Modify: `web/lib/simuladores/registry.ts`

- [ ] **Step 1: Registry — marcar disponível**

Em `web/lib/simuladores/registry.ts`, trocar apenas a linha do `viabilidade-usina`:
```ts
  { slug: 'viabilidade-usina',       titulo: 'Viabilidade de usina', descricao: 'ROI de usina de investimento',            icone: '📊', status: 'disponivel' },
```

- [ ] **Step 2: Página (Server Component)** — gate + loaders
```tsx
// web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx
export const metadata = { title: 'Viabilidade de usina' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listConcessionarias } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { listSimulacoes } from '@/lib/simuladores/viabilidade/simulacoes-actions'
import { getEmpresaParaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'
import { SimuladorViabilidade } from '@/components/simuladores/SimuladorViabilidade'

export default async function ViabilidadePage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [concessionarias, simulacoes, empresa] = await Promise.all([
    listConcessionarias(),
    listSimulacoes(),
    getEmpresaParaProposta(),
  ])
  return <SimuladorViabilidade concessionarias={concessionarias} simulacoes={simulacoes} empresa={empresa} />
}
```

- [ ] **Step 3: Client Component** — layout A (inputs à esquerda, resultados sticky à direita)
```tsx
// web/components/simuladores/SimuladorViabilidade.tsx
'use client'
import { useMemo, useState, useTransition } from 'react'
import type { ConcessionariaRow } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { salvarSimulacao, deleteSimulacao, type SimulacaoResumo } from '@/lib/simuladores/viabilidade/simulacoes-actions'
import { montarViabilidadeInput, PREMISSAS_DEFAULT, type CamposSimulador } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import { gerarPropostaPdf } from '@/lib/simuladores/viabilidade/proposta-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'

type Props = { concessionarias: ConcessionariaRow[]; simulacoes: SimulacaoResumo[]; empresa: EmpresaProposta }

const CAMPOS_INICIAIS: CamposSimulador = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2', valorInvestimento: 154413.82,
  descontoLocacao: 0.2, pctFinanciado: 0,
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

export function SimuladorViabilidade({ concessionarias, simulacoes, empresa }: Props) {
  const [concId, setConcId] = useState<string>(concessionarias[0]?.id ?? '')
  const [campos, setCampos] = useState<CamposSimulador>(CAMPOS_INICIAIS)
  const [avancadas, setAvancadas] = useState(false)
  const [modeloPainel, setModeloPainel] = useState('')
  const [modeloInversor, setModeloInversor] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCidade, setClienteCidade] = useState('')
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  const conc = concessionarias.find((c) => c.id === concId)
  const resultado = useMemo(() => (conc ? calcularViabilidade(montarViabilidadeInput(campos, conc)) : null), [campos, conc])

  const setNum = (k: keyof CamposSimulador, v: string) =>
    setCampos((c) => ({ ...c, [k]: v === '' ? 0 : Number(v) }))
  const setPrem = (k: keyof typeof PREMISSAS_DEFAULT, v: string) =>
    setCampos((c) => ({ ...c, premissas: { ...c.premissas, [k]: v === '' ? 0 : Number(v) } }))
  const premVal = (k: keyof typeof PREMISSAS_DEFAULT) =>
    (campos.premissas?.[k] as number | undefined) ?? (PREMISSAS_DEFAULT[k] as number)

  function salvar() {
    if (!conc || !resultado) return
    start(async () => {
      const res = await salvarSimulacao({
        nome: nome || `${conc.nome} ${Math.round((resultado.kwp))}kWp`,
        concessionariaId: conc.id, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
        tir: resultado.capitalProprio.tir, vpl: resultado.capitalProprio.vpl,
        paybackAnos: resultado.capitalProprio.paybackAnos,
        input: montarViabilidadeInput(campos, conc) as unknown as Record<string, unknown>,
      })
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setMsg({ text: res.success ?? '', erro: false })
      window.location.reload()
    })
  }

  async function pdf() {
    if (!conc || !resultado) return
    await gerarPropostaPdf({
      empresa, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
      concessionariaNome: conc.nome, modeloPainel, modeloInversor,
      input: montarViabilidadeInput(campos, conc), resultado,
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta simulação?')) return
    start(async () => { await deleteSimulacao(id); window.location.reload() })
  }

  const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Viabilidade de usina</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">Escolha a concessionária, ajuste os dados e veja o retorno ao vivo.</p>
      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* ── INPUTS ── */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <label className="text-xs block">Concessionária
              <select className="mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]"
                value={concId} onChange={(e) => setConcId(e.target.value)}>
                {concessionarias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
              <label className="text-xs">Nº de painéis<input type="number" step="any" className={N} value={String(campos.numPaineis)} onChange={(e) => setNum('numPaineis', e.target.value)} /></label>
              <label className="text-xs">Potência do painel (Wp)<input type="number" step="any" className={N} value={String(campos.potenciaPainelWp)} onChange={(e) => setNum('potenciaPainelWp', e.target.value)} /></label>
              <label className="text-xs">Nº de inversores<input type="number" step="any" className={N} value={String(campos.numInversores)} onChange={(e) => setNum('numInversores', e.target.value)} /></label>
              <label className="text-xs">Potência do inversor (kW)<input type="number" step="any" className={N} value={String(campos.potenciaInversorKw)} onChange={(e) => setNum('potenciaInversorKw', e.target.value)} /></label>
              <label className="text-xs">Fator de capacidade<input type="number" step="any" className={N} value={String(campos.fatorCapacidade)} onChange={(e) => setNum('fatorCapacidade', e.target.value)} /></label>
              <label className="text-xs">Modalidade
                <select className={N} value={campos.modalidade} onChange={(e) => setCampos((c) => ({ ...c, modalidade: e.target.value as 'GD1' | 'GD2' }))}>
                  <option value="GD1">GD1</option><option value="GD2">GD2</option>
                </select>
              </label>
              <label className="text-xs">CAPEX (R$)<input type="number" step="any" className={N} value={String(campos.valorInvestimento)} onChange={(e) => setNum('valorInvestimento', e.target.value)} /></label>
              <label className="text-xs">Desconto do consumidor<input type="number" step="any" className={N} value={String(campos.descontoLocacao)} onChange={(e) => setNum('descontoLocacao', e.target.value)} /></label>
              <label className="text-xs">Financiamento (%)<input type="number" step="any" className={N} value={String(campos.pctFinanciado)} onChange={(e) => setNum('pctFinanciado', e.target.value)} /></label>
              <label className="text-xs">Modelo do painel<input className={N} value={modeloPainel} onChange={(e) => setModeloPainel(e.target.value)} /></label>
              <label className="text-xs">Modelo do inversor<input className={N} value={modeloInversor} onChange={(e) => setModeloInversor(e.target.value)} /></label>
            </div>
          </div>

          {/* Premissas avançadas */}
          <div className="rounded-xl border p-4">
            <button type="button" className="text-sm font-semibold" onClick={() => setAvancadas((v) => !v)}>
              {avancadas ? '▾' : '▸'} Premissas avançadas
            </button>
            {avancadas && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {(['reajusteTarifaAnual', 'tma', 'impostoPct', 'opexPct', 'degradacaoAnual', 'd23', 'jurosAnual', 'prazoMeses', 'horizonteAnos', 'anoInicial'] as const).map((k) => (
                  <label key={k} className="text-xs">{k}
                    <input type="number" step="any" className={N} value={String(premVal(k))} onChange={(e) => setPrem(k, e.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Cliente + salvar */}
          <div className="rounded-xl border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">Cliente (opcional)<input className={N} value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></label>
            <label className="text-xs">Cidade/UF<input className={N} value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} /></label>
            <label className="text-xs">Nome da simulação<input className={N} value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          </div>
        </div>

        {/* ── RESULTADOS (sticky) ── */}
        <div className="lg:sticky lg:top-4 rounded-xl border p-4 bg-[var(--theme-card,#fff)]">
          {resultado ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">TIR</div><div className="font-bold">{pct(resultado.capitalProprio.tir)}</div></div>
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">VPL</div><div className="font-bold text-xs">{brl(resultado.capitalProprio.vpl)}</div></div>
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">Payback</div><div className="font-bold">{resultado.capitalProprio.paybackAnos}a</div></div>
              </div>
              <div className="mt-3 text-xs text-[#555] space-y-1">
                <div>Potência: <b>{resultado.kwp.toFixed(2)} kWp</b> ({resultado.tipoUsina})</div>
                <div>Geração anual: <b>{resultado.geracaoAnualKwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh</b></div>
                <div>Com financiamento — TIR {pct(resultado.comFinanciamento.tir)} · VPL {brl(resultado.comFinanciamento.vpl)}</div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">Salvar simulação</button>
                <button onClick={pdf} className="rounded border text-sm px-3 py-1.5">Gerar PDF</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6b7280]">Cadastre uma concessionária primeiro (aba Concessionárias).</p>
          )}
        </div>
      </div>

      {/* Simulações salvas */}
      {simulacoes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-2">Simulações salvas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left border-b"><th className="py-1 pr-2">Nome</th><th className="py-1 pr-2">TIR</th><th className="py-1 pr-2">VPL</th><th className="py-1 pr-2">Payback</th><th></th></tr></thead>
              <tbody>
                {simulacoes.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-1 pr-2 font-medium">{s.nome}</td>
                    <td className="py-1 pr-2 font-mono">{pct(s.tir)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(s.vpl)}</td>
                    <td className="py-1 pr-2 font-mono">{s.paybackAnos}a</td>
                    <td className="py-1 pr-2"><button className="text-[#c0392b]" onClick={() => excluir(s.id)}>excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + suite** — `cd web && npx tsc --noEmit && npx vitest run` → verde.

- [ ] **Step 5: Verificar no Preview do Vercel:**
  1. `/simuladores/viabilidade-usina` numa empresa com `simuladores_habilitado` e com concessionárias já semeadas (Peça 2).
  2. Concessionária RGE + valores iniciais → painel mostra **TIR ≈ 21,4% · VPL ≈ R$ 226 mil · Payback 5a**.
  3. Mudar nº de painéis / desconto → resultados recalculam ao vivo.
  4. **Salvar** → aparece em "Simulações salvas".
  5. **Gerar PDF** → baixa a proposta (cabeçalho com logo da empresa, blocos UFV/premissas/custos/resultados, gráfico, pág. 2 com projeção).
  6. Empresa sem flag → redirect para `/simuladores`. Card do hub "Viabilidade de usina" agora "disponível".

- [ ] **Step 6: Commit**
```bash
git add "web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx" web/components/simuladores/SimuladorViabilidade.tsx web/lib/simuladores/registry.ts
git commit -m "feat(viabilidade): tela do simulador (resultados ao vivo) + Salvar + PDF + registry"
```

---

## Encerramento da Peça 3 (e do Simulador)
- [ ] Suite verde: `cd web && npx tsc --noEmit && npx vitest run`.
- [ ] Migration aplicada (AÇÃO MANUAL) + `database.types.ts` regenerado; tela/PDF/Salvar validados no Preview.
- [ ] Push: `git push` (branch `feat/simuladores`).
- [ ] **Fidelidade comprovada:** golden do montador (RGE+defaults → TIR/VPL/Payback do Excel).
- [ ] Pendências registradas: `TODO-oem-vp` (linha O&M Acumulado VP no PDF, quando o motor expor o agregado); GD3 na tela (quando o motor implementar Fio A/P&D/TFSEE).
- [ ] Simulador completo: motor (Peça 1) → concessionárias (Peça 2) → tela/Salvar/PDF (Peça 3).

---

## Self-Review (cobertura do spec)
- **Escopo 1 (tabela+migration+RLS):** Task 2. ✅
- **Escopo 2 (server actions salvar/list/delete):** Task 3. ✅
- **Escopo 3 (rota+tela ao vivo):** Task 6 (+ montador na Task 1). ✅
- **Escopo 4 (PDF proposta+gráfico):** Task 5 (+ loader empresa na Task 4). ✅
- **Escopo 5 (registry disponível):** Task 6 Step 1. ✅
- **Escopo 6 (golden de montagem de input):** Task 1. ✅
- **Decisões do spec:** layout A (Task 6), campos curados + avançadas (Task 6 Step 3), Salvar standalone (Task 2/3, sem CRM), PDF fiel + gráfico (Task 5), GD3 só GD1/GD2 (`CamposSimulador.modalidade` na Task 1 + select na Task 6), O&M VP omitido com `TODO-oem-vp` (Task 5). ✅
- **Consistência de tipos:** `CamposSimulador`/`PREMISSAS_DEFAULT` (Task 1) usados na Task 6; `SimulacaoResumo`/`SalvarSimulacaoData` (Task 3) na Task 6; `EmpresaProposta` (Task 4) em `DadosProposta` (Task 5) e na página (Task 6); `ConcessionariaRow` (Peça 2) reutilizado. ✅
