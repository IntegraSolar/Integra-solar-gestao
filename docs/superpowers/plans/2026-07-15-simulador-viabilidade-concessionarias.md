# Simulador de Viabilidade — Peça 2 (Concessionárias) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, por empresa, a tabela de concessionárias que alimenta o motor de viabilidade (Peça 1) — motor de derivação puro (campos brutos da planilha → valores que o `ViabilidadeInput` consome), seed com as 28 concessionárias da planilha, tabela+RLS por org, e CRUD (rota+tela) dentro de `/simuladores`, seguindo a convenção **amarelo = editável / cinza = calculado**.

**Architecture:** O coração é uma função pura `derivarConcessionaria(bruto)` que porta as colunas calculadas (cinza) da aba "Premissas Básicas", validada por golden test na linha **RGE** (linha 20 da planilha). Sobre ela: `concessionariaParaInputs(bruto)` devolve os campos que o motor da Peça 1 espera. Persistência multi-tenant em `simulador_concessionarias` (RLS por `organization_id`), seed idempotente a partir de uma constante TS, e CRUD via Server Actions (Zod + escopo de org) com tela que recalcula os campos cinza ao vivo.

**Tech Stack:** TypeScript, Vitest (motor/derivação), Next.js App Router + Server Actions + Zod (CRUD/UI), Supabase/Postgres (migration + RLS). Sem dependências novas.

**Branch:** `feat/simuladores`. Gate local do motor: `cd web && npx tsc --noEmit && npx vitest run`. UI/seed/RLS validados no Preview do Vercel. Nada em produção.

**Fonte da verdade:** aba "Premissas Básicas" de `Tabela de viabilidade usinas de investimento.xlsx`. Golden = linha **RGE** (linha 20).

---

## Referência do modelo (fiel ao Excel — use isto na implementação)

### Colunas da aba "Premissas Básicas" (linha 3 = cabeçalho; linha 4+ = dados)

**Brutas (amarelo, editáveis pelo usuário — SEM fórmula):**

| Col | Campo (bruto) | Nome TS | Unidade |
|-----|---------------|---------|---------|
| B | Concessionária | `nome` | texto |
| D | Tipo de Processo | `tipoProcesso` | texto ("Reajuste 2025"/"Revisão 2025") |
| E | TUSD | `tusd` | R$/MWh |
| F | TE | `te` | R$/MWh |
| H | TUSD Fio B | `tusdFioB` | R$/MWh |
| J | TUSD Fio A | `tusdFioA` | R$/MWh |
| L | TUSD P&D | `tusdPeD` | R$/MWh |
| N | TUSD TFSEE | `tusdTfsee` | R$/MWh |
| Q | ICMS | `icms` | fração (0.18 = 18%) |
| R | Pis/Cofins | `pisCofins` | fração (0.05 = 5%) |
| V | Demanda Contratada s/ Impostos | `demandaContratadaSemImp` | R$/kW |
| X | Demanda Geração s/ Impostos | `demandaGeracaoSemImp` | R$/kW |
| AA | Reajuste após Lei 14.300 (Sim/Não) | `aplicaReajuste1430` | booleano |

> **Nota sobre J (TUSD Fio A):** na planilha a célula é digitada como uma soma de componentes (ex.: RGE `=0.36+8.7+12.17+43.24`). O que interessa é o **total** (RGE = 64.47). Armazenamos o total como número bruto.

**Calculadas (cinza, derivadas — recalculadas pela plataforma, NÃO gravadas):**

| Col | Campo derivado | Nome TS | Fórmula (Excel → TS) |
|-----|----------------|---------|----------------------|
| G | Tarifa Total s/ Impostos | `tarifaTotalSemImp` | `E+F` |
| I | Fio B / Tarifa (%) | `fracFioB` | `H/G` |
| K | Fio A / Tarifa (%) | `fracFioA` | `J/G` |
| M | P&D / Tarifa (%) | `fracPeD` | `L/G` |
| O | TFSEE / Tarifa (%) | `fracTfsee` | `N/G` |
| P | Total GD3 / Tarifa (%) | `fracGD3Total` | `(H+J+L+N)/G` |
| S | Tarifa Total c/ Impostos | `tarifaTotalComImp` | `G/((1-Q)*(1-R))` |
| T | Tarifa Compensável Autoconsumo | `tarifaCompensavelAutoconsumo` | `S` (= igual a S) |
| U | Tarifa Compensável Compartilhada | `tarifaCompensavelCompartilhada` | `G` (= igual a G) |
| W | Demanda Contratada c/ Imposto | `demandaContratadaComImp` | `V/((1-0)*(1-R))` **(ICMS = 0; só Pis/Cofins)** |
| Y | Demanda Geração c/ Impostos | `demandaGeracaoComImp` | `X/((1-Q)*(1-R))` |
| Z | Redução Dc/Dg (%) | `reducaoDcDg` | `1 - Y/W` |

> **Cuidado com nomes:** a coluna bruta **H** ("TUSD Fio B", R$/MWh) tem nome parecido com o campo do motor `tusdFioB` da Peça 1, que é a **fração** (coluna **I**). No tipo bruto, `tusdFioB` = valor em R$/MWh (col H). O motor consome a **fração** `fracFioB` (col I). Ver mapeamento abaixo.

### Ponte para o motor da Peça 1 (`concessionariaParaInputs`)

O `ViabilidadeInput` (Peça 1) espera três campos vindos da concessionária. Mapeamento **fiel** (confirmado contra o golden test da Peça 1 em `web/__tests__/viabilidade-engine.test.ts`):

| Campo de `ViabilidadeInput` | Deriva de | Fórmula | Unidade / conversão |
|-----------------------------|-----------|---------|---------------------|
| `tusdFioB` (fração) | col I | `fracFioB = H/G` | fração, sem conversão |
| `tarifaLocacaoBase` | col U | `tarifaCompensavelCompartilhada / 1000 = G/1000` | R$/MWh → **R$/kWh** (÷1000) |
| `tarifaDemanda` | col Y (ou W) | `aplicaReajuste1430 ? Y : W` | R$/kW, **sem** conversão |

> **`tarifaLocacaoBase` usa U (compartilhada = G), não T (autoconsumo = S).** Confirmado: golden Peça 1 = `0.8222` = `822.2/1000` = `G/1000`, e não `1055.46/1000`.
>
> **`tarifaDemanda`:** a planilha separa "Demanda Contratada" (V/W, rótulo "Reajuste após Lei 14.300 = Não") de "Demanda Geração" (X/Y, rótulo "= Sim"). A flag `aplicaReajuste1430` (col AA) seleciona o par. Golden RGE tem `AA = Sim` → usa **Y** (`demandaGeracaoComImp`) = `16.983311938382542`. **Todas as 28 linhas da planilha têm AA = Sim**, então o ramo `W` (Contratada) não tem golden — implementar mesmo assim pela fórmula da planilha e marcar como `TODO-demanda-nao-reajuste` (análogo ao `TODO-financiamento` da Peça 1).

### Golden — linha RGE (linha 20 da planilha)

**Entrada bruta:**
```
nome="RGE", tipoProcesso="Reajuste 2025",
tusd=517.75, te=304.45, tusdFioB=303.53, tusdFioA=64.47, tusdPeD=4.7, tusdTfsee=1.25,
icms=0.18, pisCofins=0.05, demandaContratadaSemImp=25.53, demandaGeracaoSemImp=13.23,
aplicaReajuste1430=true
```

**`derivarConcessionaria` deve produzir (valores I20..Z20 do Excel):**
```
tarifaTotalSemImp            = 822.2
fracFioB                     = 0.36916808562393572   (I20)
fracFioA                     = 0.07841157869131597   (K20)
fracPeD                      = 0.005716370712721966  (M20)
fracTfsee                    = 0.0015203113597664802 (O20)
fracGD3Total                 = 0.45481634638774016   (P20)
tarifaTotalComImp            = 1055.4557124518615     (S20)
tarifaCompensavelAutoconsumo = 1055.4557124518615     (T20)
tarifaCompensavelCompartilhada = 822.2                (U20)
demandaContratadaComImp      = 26.873684210526317     (W20)
demandaGeracaoComImp         = 16.983311938382542     (Y20)
reducaoDcDg                  = 0.36803187068298415    (Z20)
```

**`concessionariaParaInputs` deve produzir (bate com o INPUT do golden da Peça 1):**
```
tusdFioB          = 0.36916808562393572
tarifaLocacaoBase = 0.8222
tarifaDemanda     = 16.983311938382542
```

---

## File Structure

- **Create** `web/lib/simuladores/viabilidade/concessionaria.ts` — tipos `ConcessionariaBruta` / `ConcessionariaDerivada`, funções puras `derivarConcessionaria` e `concessionariaParaInputs`, e o schema Zod `concessionariaBrutaSchema`. (Uma responsabilidade: derivação + validação da concessionária.)
- **Create** `web/lib/simuladores/viabilidade/concessionarias-seed.ts` — constante `CONCESSIONARIAS_SEED: ConcessionariaBruta[]` com as 28 concessionárias da planilha.
- **Create** `web/__tests__/viabilidade-concessionaria.test.ts` — golden RGE da derivação + teste de integração com o motor da Peça 1 + sanidade do seed.
- **Create** `web/supabase/migrations/20260715000002_simulador_concessionarias.sql` — tabela `simulador_concessionarias` + índice + RLS por org. **[AÇÃO MANUAL]** rodar no SQL Editor.
- **Create** `web/lib/simuladores/viabilidade/concessionarias-actions.ts` (`'use server'`) — CRUD (`listConcessionarias`, `createConcessionaria`, `updateConcessionaria`, `deleteConcessionaria`) + `seedConcessionarias` (idempotente), todos com escopo de org.
- **Create** `web/app/(dashboard)/simuladores/viabilidade-usina/concessionarias/page.tsx` — Server Component (gate `isSimuladoresEnabled()` + carrega lista + seed-on-first-access).
- **Create** `web/components/simuladores/ConcessionariasManager.tsx` — Client Component: lista + formulário com campos brutos (amarelo) editáveis e derivados (cinza) read-only recalculados ao vivo por `derivarConcessionaria`.

---

## Task 1: Motor de derivação `concessionaria.ts` (TDD com golden RGE)

**Files:**
- Create: `web/lib/simuladores/viabilidade/concessionaria.ts`
- Test: `web/__tests__/viabilidade-concessionaria.test.ts`

- [ ] **Step 1: Escrever o teste golden que falha**

Arquivo `web/__tests__/viabilidade-concessionaria.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  derivarConcessionaria,
  concessionariaParaInputs,
  type ConcessionariaBruta,
} from '@/lib/simuladores/viabilidade/concessionaria'

// Linha RGE (linha 20 da aba "Premissas Básicas") — golden.
const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025',
  tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25,
  icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23,
  aplicaReajuste1430: true,
}

describe('derivarConcessionaria (golden RGE)', () => {
  const d = derivarConcessionaria(RGE)
  it('deriva tarifa total e frações (I,K,M,O,P)', () => {
    expect(d.tarifaTotalSemImp).toBeCloseTo(822.2, 6)
    expect(d.fracFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(d.fracFioA).toBeCloseTo(0.07841157869131597, 12)
    expect(d.fracPeD).toBeCloseTo(0.005716370712721966, 12)
    expect(d.fracTfsee).toBeCloseTo(0.0015203113597664802, 12)
    expect(d.fracGD3Total).toBeCloseTo(0.45481634638774016, 12)
  })
  it('deriva tarifas com impostos e compensáveis (S,T,U)', () => {
    expect(d.tarifaTotalComImp).toBeCloseTo(1055.4557124518615, 8)
    expect(d.tarifaCompensavelAutoconsumo).toBeCloseTo(1055.4557124518615, 8)
    expect(d.tarifaCompensavelCompartilhada).toBeCloseTo(822.2, 6)
  })
  it('deriva demanda com impostos e redução (W,Y,Z)', () => {
    expect(d.demandaContratadaComImp).toBeCloseTo(26.873684210526317, 8)
    expect(d.demandaGeracaoComImp).toBeCloseTo(16.983311938382542, 8)
    expect(d.reducaoDcDg).toBeCloseTo(0.36803187068298415, 8)
  })
})

describe('concessionariaParaInputs (ponte p/ o motor da Peça 1)', () => {
  const i = concessionariaParaInputs(RGE)
  it('bate com o INPUT do golden da Peça 1', () => {
    expect(i.tusdFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(i.tarifaLocacaoBase).toBeCloseTo(0.8222, 6)   // U/1000 (R$/MWh -> R$/kWh)
    expect(i.tarifaDemanda).toBeCloseTo(16.983311938382542, 8) // Y (aplicaReajuste=Sim)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run viabilidade-concessionaria`
Expected: FAIL ("Cannot find module '@/lib/simuladores/viabilidade/concessionaria'").

- [ ] **Step 3: Implementar `concessionaria.ts`**

```ts
// web/lib/simuladores/viabilidade/concessionaria.ts
import { z } from 'zod'
import type { ViabilidadeInput } from './types'

// Campos BRUTOS (amarelo) — digitados pelo usuário. Espelham as colunas
// B,D,E,F,H,J,L,N,Q,R,V,X,AA da aba "Premissas Básicas".
export type ConcessionariaBruta = {
  nome: string
  tipoProcesso: string
  tusd: number                    // E  (R$/MWh)
  te: number                      // F  (R$/MWh)
  tusdFioB: number                // H  (R$/MWh) — valor, não a fração
  tusdFioA: number                // J  (R$/MWh) — total dos componentes
  tusdPeD: number                 // L  (R$/MWh)
  tusdTfsee: number               // N  (R$/MWh)
  icms: number                    // Q  (fração)
  pisCofins: number               // R  (fração)
  demandaContratadaSemImp: number // V  (R$/kW)
  demandaGeracaoSemImp: number    // X  (R$/kW)
  aplicaReajuste1430: boolean     // AA ("Sim"/"Não")
}

// Campos DERIVADOS (cinza) — recalculados, nunca gravados.
export type ConcessionariaDerivada = {
  tarifaTotalSemImp: number             // G = E+F
  fracFioB: number                      // I = H/G
  fracFioA: number                      // K = J/G
  fracPeD: number                       // M = L/G
  fracTfsee: number                     // O = N/G
  fracGD3Total: number                  // P = (H+J+L+N)/G
  tarifaTotalComImp: number             // S = G/((1-Q)(1-R))
  tarifaCompensavelAutoconsumo: number  // T = S
  tarifaCompensavelCompartilhada: number// U = G
  demandaContratadaComImp: number       // W = V/((1-0)(1-R))  — ICMS=0
  demandaGeracaoComImp: number          // Y = X/((1-Q)(1-R))
  reducaoDcDg: number                   // Z = 1 - Y/W
}

// Porta as colunas calculadas (cinza) da planilha. Pura, sem I/O.
export function derivarConcessionaria(b: ConcessionariaBruta): ConcessionariaDerivada {
  const G = b.tusd + b.te
  const comImposto = (semImposto: number, icms: number) =>
    semImposto / ((1 - icms) * (1 - b.pisCofins))
  const tarifaTotalComImp = comImposto(G, b.icms)                  // S
  const demandaContratadaComImp = comImposto(b.demandaContratadaSemImp, 0) // W (ICMS=0)
  const demandaGeracaoComImp = comImposto(b.demandaGeracaoSemImp, b.icms)  // Y
  return {
    tarifaTotalSemImp: G,
    fracFioB: b.tusdFioB / G,
    fracFioA: b.tusdFioA / G,
    fracPeD: b.tusdPeD / G,
    fracTfsee: b.tusdTfsee / G,
    fracGD3Total: (b.tusdFioB + b.tusdFioA + b.tusdPeD + b.tusdTfsee) / G,
    tarifaTotalComImp,
    tarifaCompensavelAutoconsumo: tarifaTotalComImp,               // T = S
    tarifaCompensavelCompartilhada: G,                             // U = G
    demandaContratadaComImp,
    demandaGeracaoComImp,
    reducaoDcDg: 1 - demandaGeracaoComImp / demandaContratadaComImp,
  }
}

// Campos que a concessionária fornece ao motor de viabilidade (Peça 1).
// reajusteTarifaAnual/descontoLocacao/etc. NÃO vêm daqui — são do cenário.
export type ConcessionariaInputs = Pick<
  ViabilidadeInput,
  'tusdFioB' | 'tarifaLocacaoBase' | 'tarifaDemanda'
>

export function concessionariaParaInputs(b: ConcessionariaBruta): ConcessionariaInputs {
  const d = derivarConcessionaria(b)
  return {
    tusdFioB: d.fracFioB,                                  // fração (col I)
    tarifaLocacaoBase: d.tarifaCompensavelCompartilhada / 1000, // U em R$/MWh -> R$/kWh
    // TODO-demanda-nao-reajuste: ramo `false` (Demanda Contratada) sem golden na planilha.
    tarifaDemanda: b.aplicaReajuste1430 ? d.demandaGeracaoComImp : d.demandaContratadaComImp,
  }
}

// Validação dos campos brutos (amarelo). Numéricos >= 0; frações em [0,1].
export const concessionariaBrutaSchema = z.object({
  nome: z.string().min(1, 'Nome da concessionária é obrigatório.'),
  tipoProcesso: z.string().min(1, 'Tipo de processo é obrigatório.'),
  tusd: z.coerce.number().nonnegative(),
  te: z.coerce.number().nonnegative(),
  tusdFioB: z.coerce.number().nonnegative(),
  tusdFioA: z.coerce.number().nonnegative(),
  tusdPeD: z.coerce.number().nonnegative(),
  tusdTfsee: z.coerce.number().nonnegative(),
  icms: z.coerce.number().min(0).max(1, 'ICMS deve ser fração (0.18 = 18%).'),
  pisCofins: z.coerce.number().min(0).max(1, 'Pis/Cofins deve ser fração.'),
  demandaContratadaSemImp: z.coerce.number().nonnegative(),
  demandaGeracaoSemImp: z.coerce.number().nonnegative(),
  aplicaReajuste1430: z.boolean(),
})
```

- [ ] **Step 4: Rodar e ver passar** — `cd web && npx vitest run viabilidade-concessionaria`
Expected: PASS (derivação + ponte). Se `fracFioB`/`tarifaLocacaoBase` divergirem, revisar as fórmulas G/I/U acima.

- [ ] **Step 5: Commit**
```bash
git add web/lib/simuladores/viabilidade/concessionaria.ts web/__tests__/viabilidade-concessionaria.test.ts
git commit -m "feat(viabilidade): derivacao de concessionaria (golden RGE) + ponte p/ motor"
```

---

## Task 2: Seed das 28 concessionárias + integração com o motor (TDD)

**Files:**
- Create: `web/lib/simuladores/viabilidade/concessionarias-seed.ts`
- Modify (append tests): `web/__tests__/viabilidade-concessionaria.test.ts`

- [ ] **Step 1: Escrever os testes que falham** (acrescentar ao arquivo de teste)

Acrescentar no fim de `web/__tests__/viabilidade-concessionaria.test.ts`:
```ts
import { CONCESSIONARIAS_SEED } from '@/lib/simuladores/viabilidade/concessionarias-seed'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

describe('CONCESSIONARIAS_SEED', () => {
  it('tem as 28 concessionárias da planilha, RGE incluída', () => {
    expect(CONCESSIONARIAS_SEED).toHaveLength(28)
    const rge = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')
    expect(rge).toBeDefined()
    expect(rge!.tusdFioB).toBe(303.53)
    expect(rge!.demandaGeracaoSemImp).toBe(13.23)
  })
  it('todos os nomes são únicos', () => {
    const nomes = CONCESSIONARIAS_SEED.map((c) => c.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })
  it('cada linha do seed é válida pelo schema bruto', () => {
    for (const c of CONCESSIONARIAS_SEED)
      expect(() => concessionariaBrutaSchema.parse(c)).not.toThrow()
  })
})

// Integração ponta-a-ponta: seed RGE -> derivação -> motor da Peça 1 reproduz o golden.
describe('integração seed RGE -> concessionariaParaInputs -> motor', () => {
  it('reproduz TIR/VPL do golden da Peça 1', () => {
    const rge = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')!
    const derivados = concessionariaParaInputs(rge)
    const input: ViabilidadeInput = {
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD2',
      valorInvestimento: 154413.82, reajusteTarifaAnual: 0.08,
      degradacaoAnual: 0.015, tma: 0.10, descontoLocacao: 0.20,
      opexPct: 0.081199185409699712, impostoPct: 0.045, d23: 0.125,
      sunneSetupMicro: 5000, sunneSetupMini: 10000,
      pctFinanciado: 0, jurosAnual: 0.10, prazoMeses: 12,
      fioBSchedule: [0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      horizonteAnos: 25, anoInicial: 2025,
      ...derivados, // tusdFioB, tarifaLocacaoBase, tarifaDemanda vêm da concessionária
    }
    const r = calcularViabilidade(input)
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run viabilidade-concessionaria`
Expected: FAIL ("Cannot find module '.../concessionarias-seed'").

- [ ] **Step 3: Implementar `concessionarias-seed.ts`** (dados extraídos da planilha, linhas 4–31)

```ts
// web/lib/simuladores/viabilidade/concessionarias-seed.ts
// Seed das concessionárias da aba "Premissas Básicas" (linhas 4-31 da planilha).
// Valores BRUTOS (amarelo). Colunas derivadas (cinza) são recalculadas por derivarConcessionaria.
import type { ConcessionariaBruta } from './concessionaria'

export const CONCESSIONARIAS_SEED: ConcessionariaBruta[] = [
  { nome: "Energisa RO", tipoProcesso: "Reajuste 2025", tusd: 622.26, te: 219.13, tusdFioB: 321.81, tusdFioA: 76.81, tusdPeD: 5.03, tusdTfsee: 1.11, icms: 0.175, pisCofins: 0.05, demandaContratadaSemImp: 22.42, demandaGeracaoSemImp: 36.4, aplicaReajuste1430: true },
  { nome: "Equatorial PI", tipoProcesso: "Reajuste 2025", tusd: 647.22, te: 299.47, tusdFioB: 364.88, tusdFioA: 72.21, tusdPeD: 5.84, tusdTfsee: 1.09, icms: 0.21, pisCofins: 0.05, demandaContratadaSemImp: 22.58, demandaGeracaoSemImp: 32.5, aplicaReajuste1430: true },
  { nome: "CPFL Piratininga", tipoProcesso: "Reajuste 2025", tusd: 395.64, te: 344.05, tusdFioB: 189.01, tusdFioA: 40.89, tusdPeD: 3.07, tusdTfsee: 0.94, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 12.01, demandaGeracaoSemImp: 3.41, aplicaReajuste1430: true },
  { nome: "EDP SP", tipoProcesso: "Reajuste 2025", tusd: 456.67, te: 330.03, tusdFioB: 198.77, tusdFioA: 53.85, tusdPeD: 3.93, tusdTfsee: 0.93, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 12.02, demandaGeracaoSemImp: 4.11, aplicaReajuste1430: true },
  { nome: "Equatorial GO", tipoProcesso: "Reajuste 2025", tusd: 567.67, te: 324.14, tusdFioB: 291.86, tusdFioA: 74.85, tusdPeD: 4.52, tusdTfsee: 1.16, icms: 0.19, pisCofins: 0.05, demandaContratadaSemImp: 26.08, demandaGeracaoSemImp: 13.01, aplicaReajuste1430: true },
  { nome: "Neoenergia Brasília", tipoProcesso: "Reajuste 2025", tusd: 432.92, te: 402.8, tusdFioB: 133.27, tusdFioA: 53.85, tusdPeD: 3.14, tusdTfsee: 0.55, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 13.1, demandaGeracaoSemImp: 3.84, aplicaReajuste1430: true },
  { nome: "Equatorial Maranhão", tipoProcesso: "Revisão 2025", tusd: 559.86, te: 283.32, tusdFioB: 333.25, tusdFioA: 59.83, tusdPeD: 5.2, tusdTfsee: 1.12, icms: 0.23, pisCofins: 0.05, demandaContratadaSemImp: 31.98, demandaGeracaoSemImp: 26.51, aplicaReajuste1430: true },
  { nome: "Energisa PB", tipoProcesso: "Revisão 2025", tusd: 419.33, te: 256.32, tusdFioB: 236.03, tusdFioA: 50.16, tusdPeD: 3.64, tusdTfsee: 0.8, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 24.42, demandaGeracaoSemImp: 11.78, aplicaReajuste1430: true },
  { nome: "Elektro SP", tipoProcesso: "Reajuste 2025", tusd: 477.85, te: 318.2, tusdFioB: 204.83, tusdFioA: 73.93, tusdPeD: 4.18, tusdTfsee: 0.79, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 28.61, demandaGeracaoSemImp: 14.06, aplicaReajuste1430: true },
  { nome: "Celesc-DIS", tipoProcesso: "Reajuste 2025", tusd: 373.75, te: 321.93, tusdFioB: 132.75, tusdFioA: 48.32, tusdPeD: 2.97, tusdTfsee: 0.51, icms: 0.19, pisCofins: 0.05, demandaContratadaSemImp: 18.09, demandaGeracaoSemImp: 4.14, aplicaReajuste1430: true },
  { nome: "EDP ES", tipoProcesso: "Revisão 2025", tusd: 468.63, te: 320.68, tusdFioB: 203.83, tusdFioA: 39.7, tusdPeD: 4.04, tusdTfsee: 0.76, icms: 0.17, pisCofins: 0.05, demandaContratadaSemImp: 31.93, demandaGeracaoSemImp: 12.31, aplicaReajuste1430: true },
  { nome: "Equatorial PA", tipoProcesso: "Reajuste 2025", tusd: 692.08, te: 286.22, tusdFioB: 385.82, tusdFioA: 71.85, tusdPeD: 6.84, tusdTfsee: 1.15, icms: 0.19, pisCofins: 0.05, demandaContratadaSemImp: 44.81, demandaGeracaoSemImp: 29.88, aplicaReajuste1430: true },
  { nome: "Enel SP", tipoProcesso: "Reajuste 2025", tusd: 432.44, te: 292.74, tusdFioB: 212.46, tusdFioA: 39.81, tusdPeD: 3.41, tusdTfsee: 0.91, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 17.04, demandaGeracaoSemImp: 7.07, aplicaReajuste1430: true },
  { nome: "Energisa TO", tipoProcesso: "Revisão 2025", tusd: 640.42, te: 289.8, tusdFioB: 427.55, tusdFioA: 55.72, tusdPeD: 6.31, tusdTfsee: 1.55, icms: 0.2, pisCofins: 0.05, demandaContratadaSemImp: 52.73, demandaGeracaoSemImp: 36.9, aplicaReajuste1430: true },
  { nome: "Copel-DIS", tipoProcesso: "Reajuste 2025", tusd: 366.67, te: 275.75, tusdFioB: 159.14, tusdFioA: 52.62, tusdPeD: 2.82, tusdTfsee: 0.63, icms: 0.19, pisCofins: 0.05, demandaContratadaSemImp: 20.78, demandaGeracaoSemImp: 7.75, aplicaReajuste1430: true },
  { nome: "Light RJ", tipoProcesso: "Reajuste 2025", tusd: 513.3, te: 310.26, tusdFioB: 210.38, tusdFioA: 52.34, tusdPeD: 4.18, tusdTfsee: 0.46, icms: 0.24, pisCofins: 0.05, demandaContratadaSemImp: 28.05, demandaGeracaoSemImp: 9.02, aplicaReajuste1430: true },
  { nome: "RGE", tipoProcesso: "Reajuste 2025", tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23, aplicaReajuste1430: true },
  { nome: "CEMIG-D", tipoProcesso: "Reajuste 2025", tusd: 541.3, te: 317.28, tusdFioB: 257.21, tusdFioA: 67.17, tusdPeD: 4.23, tusdTfsee: 0.66, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 22.81, demandaGeracaoSemImp: 13.01, aplicaReajuste1430: true },
  { nome: "Amazonas Energia", tipoProcesso: "Reajuste 2025", tusd: 493.86, te: 349.18, tusdFioB: 171.84, tusdFioA: 47.72, tusdPeD: 4.89, tusdTfsee: 0.59, icms: 0.2, pisCofins: 0.05, demandaContratadaSemImp: 22.96, demandaGeracaoSemImp: 13.74, aplicaReajuste1430: true },
  { nome: "Equatorial AL", tipoProcesso: "Reajuste 2025", tusd: 569.27, te: 238.8, tusdFioB: 300.14, tusdFioA: 75.16, tusdPeD: 5.35, tusdTfsee: 1.0, icms: 0.2, pisCofins: 0.05, demandaContratadaSemImp: 25.2, demandaGeracaoSemImp: 13.56, aplicaReajuste1430: true },
  { nome: "Neoenergia PE", tipoProcesso: "Revisão 2025", tusd: 487.78, te: 281.4, tusdFioB: 270.84, tusdFioA: 46.41, tusdPeD: 4.6, tusdTfsee: 0.85, icms: 0.205, pisCofins: 0.05, demandaContratadaSemImp: 21.39, demandaGeracaoSemImp: 9.18, aplicaReajuste1430: true },
  { nome: "ENEL CE", tipoProcesso: "Reajuste 2025", tusd: 464.88, te: 245.19, tusdFioB: 291.7, tusdFioA: 38.7, tusdPeD: 4.33, tusdTfsee: 1.04, icms: 0.2, pisCofins: 0.05, demandaContratadaSemImp: 22.1, demandaGeracaoSemImp: 16.37, aplicaReajuste1430: true },
  { nome: "Neoenergia Cosern (RN)", tipoProcesso: "Reajuste 2025", tusd: 432.6, te: 311.64, tusdFioB: 262.26, tusdFioA: 40.99, tusdPeD: 4.23, tusdTfsee: 0.95, icms: 0.2, pisCofins: 0.05, demandaContratadaSemImp: 28.73, demandaGeracaoSemImp: 15.28, aplicaReajuste1430: true },
  { nome: "Neoenergia Coelba", tipoProcesso: "Reajuste 2025", tusd: 560.48, te: 277.24, tusdFioB: 350.53, tusdFioA: 61.13, tusdPeD: 5.68, tusdTfsee: 1.34, icms: 0.205, pisCofins: 0.05, demandaContratadaSemImp: 38.61, demandaGeracaoSemImp: 24.52, aplicaReajuste1430: true },
  { nome: "Energisa SE", tipoProcesso: "Reajuste 2025", tusd: 439.83, te: 272.64, tusdFioB: 266.3, tusdFioA: 45.64, tusdPeD: 4.31, tusdTfsee: 0.93, icms: 0.22, pisCofins: 0.05, demandaContratadaSemImp: 23.81, demandaGeracaoSemImp: 11.87, aplicaReajuste1430: true },
  { nome: "CPFL Paulista", tipoProcesso: "Reajuste 2025", tusd: 388.15, te: 287.38, tusdFioB: 206.65, tusdFioA: 38.96, tusdPeD: 3.08, tusdTfsee: 0.78, icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 15.93, demandaGeracaoSemImp: 7.08, aplicaReajuste1430: true },
  { nome: "Energisa MS", tipoProcesso: "Reajuste 2025", tusd: 592.08, te: 286.02, tusdFioB: 348.62, tusdFioA: 56.76, tusdPeD: 5.15, tusdTfsee: 1.22, icms: 0.17, pisCofins: 0.05, demandaContratadaSemImp: 34.69, demandaGeracaoSemImp: 13.61, aplicaReajuste1430: true },
  { nome: "Energisa MT", tipoProcesso: "Reajuste 2025", tusd: 549.47, te: 302.66, tusdFioB: 319.94, tusdFioA: 48.72, tusdPeD: 4.76, tusdTfsee: 1.01, icms: 0.17, pisCofins: 0.05, demandaContratadaSemImp: 32.74, demandaGeracaoSemImp: 17.24, aplicaReajuste1430: true },
]
```

- [ ] **Step 4: Rodar e ver passar** — `cd web && npx vitest run viabilidade-concessionaria`
Expected: PASS (28 linhas, RGE presente, nomes únicos, integração TIR/VPL bate).

- [ ] **Step 5: Suite completa + typecheck** — `cd web && npx tsc --noEmit && npx vitest run`
Expected: tudo verde (ignorar erro stale pré-existente de `app/register/page`, se aparecer).

- [ ] **Step 6: Commit**
```bash
git add web/lib/simuladores/viabilidade/concessionarias-seed.ts web/__tests__/viabilidade-concessionaria.test.ts
git commit -m "feat(viabilidade): seed das 28 concessionarias + integracao seed->motor"
```

---

## Task 3: Migration `simulador_concessionarias` + RLS

**Files:**
- Create: `web/supabase/migrations/20260715000002_simulador_concessionarias.sql`

- [ ] **Step 1: Escrever a migration** (padrão RLS do projeto — igual a `kit_catalog`: `organization_id IN (SELECT ... FROM organization_members WHERE user_id = auth.uid())`)

```sql
-- Peça 2 do Simulador de Viabilidade: tabela de concessionárias por empresa.
-- Aditiva. Guarda apenas os campos BRUTOS (amarelo); os derivados (cinza) são
-- recalculados na plataforma por derivarConcessionaria() e NUNCA gravados.
CREATE TABLE IF NOT EXISTS simulador_concessionarias (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                        text NOT NULL,
  tipo_processo               text NOT NULL DEFAULT 'Reajuste 2025',
  tusd                        numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh
  te                          numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh
  tusd_fio_b                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col H)
  tusd_fio_a                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col J)
  tusd_ped                    numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col L)
  tusd_tfsee                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col N)
  icms                        numeric(6, 4)  NOT NULL DEFAULT 0,  -- fração
  pis_cofins                  numeric(6, 4)  NOT NULL DEFAULT 0,  -- fração
  demanda_contratada_sem_imp  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/kW (col V)
  demanda_geracao_sem_imp     numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/kW (col X)
  aplica_reajuste_1430        boolean NOT NULL DEFAULT true,      -- col AA
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_concessionarias_org
  ON simulador_concessionarias(organization_id);

-- Evita duplicar a mesma concessionária por empresa (seed idempotente por nome).
CREATE UNIQUE INDEX IF NOT EXISTS uq_simulador_concessionarias_org_nome
  ON simulador_concessionarias(organization_id, nome);

ALTER TABLE simulador_concessionarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador concessionarias"
  ON simulador_concessionarias FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: [AÇÃO MANUAL] rodar a migration** no Supabase SQL Editor (mesmo fluxo das migrations anteriores desta branch). Confirmar que a tabela e a policy foram criadas.

- [ ] **Step 3: Commit**
```bash
git add web/supabase/migrations/20260715000002_simulador_concessionarias.sql
git commit -m "feat(viabilidade): migration simulador_concessionarias + RLS por org"
```

---

## Task 4: Server Actions (CRUD + seed idempotente)

**Files:**
- Create: `web/lib/simuladores/viabilidade/concessionarias-actions.ts`

Referência de padrão: `web/lib/estoque/actions.ts` (Zod + `getCurrentUserData` → `orgId` → escopo explícito + `ActionResult` de `@/lib/crm/types`).

- [ ] **Step 1: Implementar as actions**

```ts
// web/lib/simuladores/viabilidade/concessionarias-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import {
  concessionariaBrutaSchema,
  type ConcessionariaBruta,
} from './concessionaria'
import { CONCESSIONARIAS_SEED } from './concessionarias-seed'

const ROUTE = '/simuladores/viabilidade-usina/concessionarias'

// Linha do banco (snake_case) com id.
export type ConcessionariaRow = ConcessionariaBruta & { id: string }

// Mapeia coluna do banco -> tipo bruto (camelCase).
function rowToBruta(r: Record<string, unknown>): ConcessionariaRow {
  return {
    id: String(r.id),
    nome: String(r.nome),
    tipoProcesso: String(r.tipo_processo),
    tusd: Number(r.tusd), te: Number(r.te),
    tusdFioB: Number(r.tusd_fio_b), tusdFioA: Number(r.tusd_fio_a),
    tusdPeD: Number(r.tusd_ped), tusdTfsee: Number(r.tusd_tfsee),
    icms: Number(r.icms), pisCofins: Number(r.pis_cofins),
    demandaContratadaSemImp: Number(r.demanda_contratada_sem_imp),
    demandaGeracaoSemImp: Number(r.demanda_geracao_sem_imp),
    aplicaReajuste1430: Boolean(r.aplica_reajuste_1430),
  }
}

// Converte tipo bruto (camelCase) -> colunas do banco (snake_case).
function brutaToRow(b: ConcessionariaBruta) {
  return {
    nome: b.nome, tipo_processo: b.tipoProcesso,
    tusd: b.tusd, te: b.te,
    tusd_fio_b: b.tusdFioB, tusd_fio_a: b.tusdFioA,
    tusd_ped: b.tusdPeD, tusd_tfsee: b.tusdTfsee,
    icms: b.icms, pis_cofins: b.pisCofins,
    demanda_contratada_sem_imp: b.demandaContratadaSemImp,
    demanda_geracao_sem_imp: b.demandaGeracaoSemImp,
    aplica_reajuste_1430: b.aplicaReajuste1430,
  }
}

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function listConcessionarias(): Promise<ConcessionariaRow[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_concessionarias')
    .select('*')
    .eq('organization_id', ctx.orgId)
    .order('nome', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToBruta(r as Record<string, unknown>))
}

export async function createConcessionaria(data: ConcessionariaBruta): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = concessionariaBrutaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_concessionarias')
    .insert({ organization_id: ctx.orgId, ...brutaToRow(parsed.data) })
  if (error) return { error: error.message }
  revalidatePath(ROUTE)
  return { success: 'Concessionária criada.' }
}

export async function updateConcessionaria(id: string, data: ConcessionariaBruta): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = concessionariaBrutaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  // Escopo de org explícito (defesa em profundidade além da RLS).
  const { error } = await supabase
    .from('simulador_concessionarias')
    .update(brutaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  revalidatePath(ROUTE)
  return { success: 'Concessionária atualizada.' }
}

export async function deleteConcessionaria(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_concessionarias')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  revalidatePath(ROUTE)
  return { success: 'Concessionária excluída.' }
}

// Popula as concessionárias-padrão para a empresa. Idempotente: usa upsert por
// (organization_id, nome) com ignoreDuplicates para só inserir as que faltam.
export async function seedConcessionarias(): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const rows = CONCESSIONARIAS_SEED.map((b) => ({ organization_id: ctx.orgId, ...brutaToRow(b) }))
  const { error } = await supabase
    .from('simulador_concessionarias')
    .upsert(rows, { onConflict: 'organization_id,nome', ignoreDuplicates: true })
  if (error) return { error: error.message }
  revalidatePath(ROUTE)
  return { success: 'Concessionárias padrão carregadas.' }
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit`
Expected: sem erros novos (ignorar erro stale pré-existente de `app/register/page`, se aparecer).

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/viabilidade/concessionarias-actions.ts
git commit -m "feat(viabilidade): server actions CRUD + seed de concessionarias"
```

---

## Task 5: Rota + tela de CRUD (amarelo/cinza, recálculo ao vivo)

**Files:**
- Create: `web/app/(dashboard)/simuladores/viabilidade-usina/concessionarias/page.tsx`
- Create: `web/components/simuladores/ConcessionariasManager.tsx`

- [ ] **Step 1: Implementar a page (Server Component)** — gate + seed-on-first-access + carga da lista

```tsx
// web/app/(dashboard)/simuladores/viabilidade-usina/concessionarias/page.tsx
export const metadata = { title: 'Concessionárias — Viabilidade' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listConcessionarias, seedConcessionarias } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { ConcessionariasManager } from '@/components/simuladores/ConcessionariasManager'

export default async function ConcessionariasPage() {
  const enabled = await isSimuladoresEnabled()
  if (!enabled) redirect('/simuladores')

  // Seed no primeiro acesso: se a empresa ainda não tem nenhuma, popula do padrão.
  let lista = await listConcessionarias()
  if (lista.length === 0) {
    await seedConcessionarias()
    lista = await listConcessionarias()
  }
  return <ConcessionariasManager inicial={lista} />
}
```

- [ ] **Step 2: Implementar o Client Component** — lista + form com brutos (amarelo) editáveis e derivados (cinza) recalculados ao vivo

```tsx
// web/components/simuladores/ConcessionariasManager.tsx
'use client'
import { useMemo, useState, useTransition } from 'react'
import {
  createConcessionaria, updateConcessionaria, deleteConcessionaria,
  type ConcessionariaRow,
} from '@/lib/simuladores/viabilidade/concessionarias-actions'
import {
  derivarConcessionaria, type ConcessionariaBruta,
} from '@/lib/simuladores/viabilidade/concessionaria'

const VAZIA: ConcessionariaBruta = {
  nome: '', tipoProcesso: 'Reajuste 2025',
  tusd: 0, te: 0, tusdFioB: 0, tusdFioA: 0, tusdPeD: 0, tusdTfsee: 0,
  icms: 0, pisCofins: 0, demandaContratadaSemImp: 0, demandaGeracaoSemImp: 0,
  aplicaReajuste1430: true,
}

// Campos brutos numéricos (amarelo) e seus rótulos.
const CAMPOS_NUM: { key: keyof ConcessionariaBruta; label: string }[] = [
  { key: 'tusd', label: 'TUSD (R$/MWh)' },
  { key: 'te', label: 'TE (R$/MWh)' },
  { key: 'tusdFioB', label: 'TUSD Fio B (R$/MWh)' },
  { key: 'tusdFioA', label: 'TUSD Fio A (R$/MWh)' },
  { key: 'tusdPeD', label: 'TUSD P&D (R$/MWh)' },
  { key: 'tusdTfsee', label: 'TUSD TFSEE (R$/MWh)' },
  { key: 'icms', label: 'ICMS (fração)' },
  { key: 'pisCofins', label: 'Pis/Cofins (fração)' },
  { key: 'demandaContratadaSemImp', label: 'Demanda Contratada s/ imp. (R$/kW)' },
  { key: 'demandaGeracaoSemImp', label: 'Demanda Geração s/ imp. (R$/kW)' },
]

const AMARELO = 'bg-[#FFF7DC] border-[#E7CE7A]'
const CINZA = 'bg-[#F1F3F7] text-[#555] border-[#E0E3EE]'

export function ConcessionariasManager({ inicial }: { inicial: ConcessionariaRow[] }) {
  const [lista, setLista] = useState<ConcessionariaRow[]>(inicial)
  const [form, setForm] = useState<ConcessionariaBruta>(VAZIA)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const derivada = useMemo(() => derivarConcessionaria(form), [form])
  const fmt = (n: number, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : '—')

  function setNum(key: keyof ConcessionariaBruta, v: string) {
    setForm((f) => ({ ...f, [key]: v === '' ? 0 : Number(v) }))
  }

  function editar(row: ConcessionariaRow) {
    setEditId(row.id)
    const { id: _id, ...bruta } = row
    setForm(bruta)
    setMsg(null)
  }

  function salvar() {
    start(async () => {
      const res = editId
        ? await updateConcessionaria(editId, form)
        : await createConcessionaria(form)
      if ('error' in res) { setMsg(res.error); return }
      setMsg(res.success)
      // Recarrega a lista via reload leve (a page revalida a rota).
      window.location.reload()
    })
  }

  function excluir(id: string) {
    start(async () => {
      const res = await deleteConcessionaria(id)
      if ('error' in res) { setMsg(res.error); return }
      setLista((l) => l.filter((c) => c.id !== id))
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">Concessionárias — Viabilidade</h1>
      <p className="text-sm text-[#6b7280] mb-4">
        Campos <span className="px-1 rounded bg-[#FFF7DC] border border-[#E7CE7A]">amarelos</span> são editáveis;
        os <span className="px-1 rounded bg-[#F1F3F7] border border-[#E0E3EE]">cinza</span> são calculados automaticamente.
      </p>
      {msg && <div className="mb-3 text-sm text-[#1f9d55]">{msg}</div>}

      {/* Formulário */}
      <div className="rounded-xl border p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs">Nome
            <input className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
              value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </label>
          <label className="text-xs">Tipo de processo
            <input className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
              value={form.tipoProcesso} onChange={(e) => setForm((f) => ({ ...f, tipoProcesso: e.target.value }))} />
          </label>
          <label className="text-xs flex items-center gap-2 mt-5">
            <input type="checkbox" checked={form.aplicaReajuste1430}
              onChange={(e) => setForm((f) => ({ ...f, aplicaReajuste1430: e.target.checked }))} />
            Reajuste após Lei 14.300
          </label>
          {CAMPOS_NUM.map(({ key, label }) => (
            <label key={key} className="text-xs">{label}
              <input type="number" step="any" className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
                value={String(form[key] as number)} onChange={(e) => setNum(key, e.target.value)} />
            </label>
          ))}
        </div>

        {/* Derivados (cinza, read-only) */}
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 mt-4 text-xs">
          {([
            ['Tarifa Total s/ imp.', derivada.tarifaTotalSemImp, 2],
            ['Fio B / Tarifa', derivada.fracFioB, 5],
            ['Fio A / Tarifa', derivada.fracFioA, 5],
            ['P&D / Tarifa', derivada.fracPeD, 5],
            ['TFSEE / Tarifa', derivada.fracTfsee, 5],
            ['Total GD3 / Tarifa', derivada.fracGD3Total, 5],
            ['Tarifa Total c/ imp.', derivada.tarifaTotalComImp, 2],
            ['Compensável compartilhada', derivada.tarifaCompensavelCompartilhada, 2],
            ['Demanda Geração c/ imp.', derivada.demandaGeracaoComImp, 4],
            ['Redução Dc/Dg', derivada.reducaoDcDg, 5],
          ] as [string, number, number][]).map(([label, val, dec]) => (
            <div key={label} className={`rounded border px-2 py-1 ${CINZA}`}>
              <div className="text-[10px] opacity-70">{label}</div>
              <div className="font-mono">{fmt(val, dec)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button disabled={pending} onClick={salvar}
            className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
            {editId ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editId && (
            <button disabled={pending} onClick={() => { setEditId(null); setForm(VAZIA) }}
              className="rounded border text-sm px-3 py-1.5">Cancelar</button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-2">Concessionária</th>
              <th className="py-1 pr-2">Fio B / Tarifa</th>
              <th className="py-1 pr-2">Tarifa loc. (R$/kWh)</th>
              <th className="py-1 pr-2">Demanda Ger. c/ imp.</th>
              <th className="py-1 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const d = derivarConcessionaria(c)
              return (
                <tr key={c.id} className="border-b">
                  <td className="py-1 pr-2 font-medium">{c.nome}</td>
                  <td className="py-1 pr-2 font-mono">{d.fracFioB.toFixed(5)}</td>
                  <td className="py-1 pr-2 font-mono">{(d.tarifaCompensavelCompartilhada / 1000).toFixed(4)}</td>
                  <td className="py-1 pr-2 font-mono">{d.demandaGeracaoComImp.toFixed(4)}</td>
                  <td className="py-1 pr-2">
                    <button className="text-[#3b6fd6] mr-3" onClick={() => editar(c)}>editar</button>
                    <button className="text-[#c0392b]" onClick={() => excluir(c.id)}>excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + build local** — `cd web && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Verificar no Preview do Vercel** (a UI/RLS/seed não são testáveis por vitest):
  1. Abrir `/simuladores/viabilidade-usina/concessionarias` numa empresa com `simuladores_habilitado = true`.
  2. Confirmar seed no primeiro acesso (28 linhas listadas, RGE presente).
  3. Editar RGE: `TUSD Fio B` amarelo; verificar que `Fio B / Tarifa` cinza recalcula ao vivo (≈ 0.36917) e `Tarifa loc.` ≈ 0.8222.
  4. Criar/excluir uma concessionária de teste; recarregar e confirmar persistência por empresa.
  5. Confirmar que empresa sem flag é redirecionada para `/simuladores`.

- [ ] **Step 5: Commit**
```bash
git add web/app/\(dashboard\)/simuladores/viabilidade-usina/concessionarias/page.tsx web/components/simuladores/ConcessionariasManager.tsx
git commit -m "feat(viabilidade): tela CRUD de concessionarias (amarelo/cinza) + seed on-access"
```

---

## Encerramento da Peça 2
- [ ] Suite verde: `cd web && npx tsc --noEmit && npx vitest run`.
- [ ] Migration aplicada (AÇÃO MANUAL) e tela validada no Preview.
- [ ] Push: `git push` (branch `feat/simuladores`).
- [ ] **Fidelidade comprovada:** golden RGE da derivação + integração seed→motor reproduzindo TIR/VPL da Peça 1.
- [ ] Pendência registrada: `TODO-demanda-nao-reajuste` (ramo Demanda Contratada, `aplicaReajuste1430=false`) sem golden na planilha — todas as 28 linhas são "Sim".
- [ ] Próximo: **Peça 3** (tela do simulador + Salvar + PDF) — escolhe uma concessionária desta tabela → `concessionariaParaInputs` → `calcularViabilidade`.

---

## Self-Review (cobertura do spec)

- **Escopo 1 (tabela+migration+RLS):** Task 3. ✅
- **Escopo 2 (motor de derivação + golden RGE):** Task 1 (derivação) + Task 2 (integração). Golden RGE `tusdFioB≈0.36917`, `tarifaLocacaoBase≈0.8222`, `tarifaDemanda≈16.9833` cobertos. ✅
- **Escopo 3 (seed ~30 concessionárias):** Task 2 (28 reais da planilha) + `seedConcessionarias` idempotente na Task 4. ✅
- **Escopo 4 (rota+tela CRUD amarelo/cinza):** Task 5 (page + manager) + Task 4 (actions CRUD). ✅
- **Pendências do spec:** lista exata de campos brutos + fórmulas de derivação → resolvidas na "Referência do modelo". Estratégia de seed → seed-on-first-access (Task 5 Step 1) + `seedConcessionarias` reutilizável para um futuro botão "restaurar padrão". ✅
- **Consistência de tipos:** `ConcessionariaBruta`/`ConcessionariaDerivada`/`ConcessionariaInputs` definidos na Task 1 e usados igualmente nas Tasks 2/4/5; colunas snake_case da Task 3 mapeadas em `rowToBruta`/`brutaToRow` (Task 4). ✅
