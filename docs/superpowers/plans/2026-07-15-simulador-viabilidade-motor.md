# Simulador de Viabilidade — Peça 1 (Motor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar fielmente o cálculo de viabilidade da planilha para um motor puro em TypeScript (projeção de 25 anos → TIR/VPL/Payback, capital próprio × financiamento).

**Architecture:** Três arquivos puros em `web/lib/simuladores/viabilidade/`: funções financeiras (`irr`/`npv`), tipos, e o `engine` que monta a projeção ano a ano. Nenhuma UI/banco. Fidelidade garantida por golden tests ancorados no vetor de fluxo real da planilha.

**Tech Stack:** TypeScript, Vitest. Sem dependências novas.

**Branch:** `feat/simuladores`. Gate: `cd web && npx tsc --noEmit && npx vitest run`. 100% testável localmente (não depende do Preview).

---

## Referência do modelo (fiel ao Excel — use isto na implementação)

**Derivados:**
- `kWp = numPaineis*potenciaPainelWp/1000`
- `potenciaInversorTotalKw = numInversores*potenciaInversorKw`
- `tipoUsina = potenciaInversorTotalKw <= 75 ? 'Microusina' : 'Miniusina'` (a planilha classifica pela potência do inversor, não pelo kWp)
- `geracaoAnualBase = kWp*8760*fatorCapacidade*0.99`
- `opexBase = opexPct*valorInvestimento`
- `reinvestAno15 = (0.10*valorInvestimento)*(1+0.02)^15`  (C32: troca de inversor)

**Índice do ano:** linha 0 = ano de investimento (`anoInicial`, ex. 2025), sem operação. Linhas 1..25 = anos operacionais. `E` = índice (0,1,2,…).

**Recorrência anual (ano `t`, t≥1 salvo indicado):**
- `producao(t) = t===1 ? geracaoAnualBase*(1-degradacaoAnual) : producao(1)*0.993251254^(t-1)`
- `tarifaLocacao(t) = tarifaLocacaoBase*(1+reajusteTarifaAnual)^(t-1)`
- `fioBpct(t) = fioBSchedule[t-1]`  (vetor: `[0.6, 0.75, 0.9, 1, 1, …]` — 1.0 do ano 4 em diante)
- `tusdFioBAplicada(t) = modalidade==='GD1' ? 0 : tusdFioB*fioBpct(t)*tarifaLocacao(t)`
- `tusdGD3(t) = modalidade==='GD3' ? (fioA+peD+tfsee aplicados) : 0`  (0 nos cenários GD1/GD2)
- `tusdNaoCompensavel(t) = tusdFioBAplicada(t) + tusdGD3(t)`
- `tarifaLiquida(t) = (tarifaLocacao(t) - tusdNaoCompensavel(t)) * (1 - descontoLocacao)`
- `receita(t) = producao(t) * tarifaLiquida(t)`   (col O)
- `opex(t) = -opexBase*(1+reajusteTarifaAnual)^(t-1)`   (col Y)
- `imposto(t) = -impostoPct*receita(t)`   (col AA)
- `gestao(t)` (col Z):
  - `t===1`: `(-receita(1)/12)*2 - d23*receita(1) - (tipoUsina==='Microusina' ? 5000 : 10000)`
  - `t>=2`: `-d23*receita(t)`   (onde `d23 = 0.125`)
- `demandaMini(t) = tipoUsina==='Microusina' ? 0 : -potenciaInversorTotalKw*12*tarifaDemanda*(1+reajusteTarifaAnual)^(t-1)`   (col W; 0 no cenário micro)
- `arrendamento(t) = 0`   (col X; C28=0 no padrão)
- `reinvest(t) = t===15 ? -reinvestAno15 : 0`   (col Q anos operacionais)
- **Financiamento (col P–U, Price):** com `pctFinanciado=0` todas as parcelas são 0. Implementar assim mesmo (fiel):
  - `financiado = valorInvestimento*pctFinanciado`; saldo inicial = financiado.
  - `amortizacao(t) = saldo>0 ? financiado/prazoMeses*12 : 0` (aprox. anual da planilha; ver nota)
  - `juros(t) = saldoAnterior*jurosAnual`; `prestacao(t) = amortizacao(t)+juros(t)` (col S)
  - Com `pctFinanciado=0`, prestacao=0 e os fluxos próprio/financiado coincidem (é o golden).

**Fluxos e métricas:**
- `fluxoProprio(0) = -valorInvestimento` ; `fluxoProprio(t≥1) = receita+reinvest+demandaMini+opex+gestao+imposto+arrendamento`  (col AB = O+Q+W+Y+Z+AA+X; **não inclui disponibilidade V**)
- `fluxoFinanciado(t) = fluxoProprio(t) - prestacao(t)`  (col AD = AB + S; S≤0 já embutido)
- `TIR = irr(fluxo[0..25])` ; `VPL = npv(tma, fluxo[1..25]) + fluxo[0]` ; `Payback = contagem de anos com acumulado < 0`

### Golden — vetor de fluxo próprio (cenário RGE / GD2 / 90 kWp, financiamento 0%)
`anoInicial=2025`, investimento `154413.82`, tma `0.10`:
```
[-154413.82, 18018.435239867034, 30956.710616464185, 29356.702541229693,
 28698.431410173365, 30660.802146652914, 32755.913030802698, 34992.62005963194,
 37380.359504174136, 39929.185009396366, 42649.806984285067, 45553.634416037668,
 48652.81924941959, 51960.303479788265, 55489.869116039605, 38474.124044044613,
 63274.893899687246, 67562.610323837944, 72137.045471668796, 77017.043294330666,
 82222.657611738803, 87775.227259733627, 93697.455675370802, 100013.49516096816,
 106749.03607847019, 113931.40123688725]
```
Métricas esperadas: **TIR = 0.21410107123012923**, **VPL = 226670.96975404624**, **Payback = 5**.
Com `pctFinanciado=0`, o cenário financiado deve dar métricas idênticas.

---

## File Structure
- Create `web/lib/simuladores/viabilidade/finance.ts` — `npv`, `irr`.
- Create `web/lib/simuladores/viabilidade/types.ts` — tipos (conforme spec).
- Create `web/lib/simuladores/viabilidade/engine.ts` — `calcularViabilidade`.
- Create `web/__tests__/viabilidade-finance.test.ts`.
- Create `web/__tests__/viabilidade-engine.test.ts`.

---

## Task 1: Funções financeiras `npv` / `irr` (TDD)

**Files:** Create `web/lib/simuladores/viabilidade/finance.ts`; Test `web/__tests__/viabilidade-finance.test.ts`.

- [ ] **Step 1: Teste que falha** (usa o vetor golden como fixture)

```ts
import { describe, it, expect } from 'vitest'
import { npv, irr } from '@/lib/simuladores/viabilidade/finance'

const FLUXO = [-154413.82, 18018.435239867034, 30956.710616464185, 29356.702541229693,
 28698.431410173365, 30660.802146652914, 32755.913030802698, 34992.62005963194,
 37380.359504174136, 39929.185009396366, 42649.806984285067, 45553.634416037668,
 48652.81924941959, 51960.303479788265, 55489.869116039605, 38474.124044044613,
 63274.893899687246, 67562.610323837944, 72137.045471668796, 77017.043294330666,
 82222.657611738803, 87775.227259733627, 93697.455675370802, 100013.49516096816,
 106749.03607847019, 113931.40123688725]

describe('npv', () => {
  it('desconta um fluxo simples corretamente', () => {
    // 100 daqui a 1 ano a 10% = 90.909...
    expect(npv(0.1, [100])).toBeCloseTo(90.9090909, 6)
  })
})

describe('irr', () => {
  it('reproduz a TIR do Excel para o fluxo da planilha', () => {
    expect(irr(FLUXO)).toBeCloseTo(0.21410107123012923, 8)
  })
  it('VPL do fluxo (tma 10%) bate com o Excel', () => {
    // NPV(tma, fluxo[1..]) + fluxo[0]
    expect(npv(0.1, FLUXO.slice(1)) + FLUXO[0]).toBeCloseTo(226670.96975404624, 4)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run viabilidade-finance` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `finance.ts`**

```ts
// web/lib/simuladores/viabilidade/finance.ts

// VPL de um fluxo cujo primeiro elemento ocorre em t=1 (igual à função NPV do Excel).
export function npv(rate: number, cashflows: number[]): number {
  let acc = 0
  for (let i = 0; i < cashflows.length; i++) {
    acc += cashflows[i] / Math.pow(1 + rate, i + 1)
  }
  return acc
}

// VPL de um fluxo cujo primeiro elemento ocorre em t=0 (usado internamente pela TIR).
function npvAtZero(rate: number, cashflows: number[]): number {
  let acc = 0
  for (let i = 0; i < cashflows.length; i++) {
    acc += cashflows[i] / Math.pow(1 + rate, i)
  }
  return acc
}

// TIR: taxa que zera o VPL (fluxo começa em t=0). Bisseção robusta em [-0.9999, 10].
export function irr(cashflows: number[]): number {
  let lo = -0.9999
  let hi = 10
  let fLo = npvAtZero(lo, cashflows)
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2
    const fMid = npvAtZero(mid, cashflows)
    if (Math.abs(fMid) < 1e-9) return mid
    if (fLo * fMid < 0) { hi = mid } else { lo = mid; fLo = fMid }
  }
  return (lo + hi) / 2
}
```

- [ ] **Step 4: Rodar e ver passar** — `cd web && npx vitest run viabilidade-finance` → PASS.

- [ ] **Step 5: Commit**
```bash
git add web/lib/simuladores/viabilidade/finance.ts web/__tests__/viabilidade-finance.test.ts
git commit -m "feat(viabilidade): funcoes financeiras npv/irr com golden da planilha"
```

---

## Task 2: Tipos do motor

**Files:** Create `web/lib/simuladores/viabilidade/types.ts`.

- [ ] **Step 1: Implementar os tipos** (conforme o contrato do spec)

```ts
// web/lib/simuladores/viabilidade/types.ts
export type ModalidadeGD = 'GD1' | 'GD2' | 'GD3'

export type ViabilidadeInput = {
  numPaineis: number
  potenciaPainelWp: number
  numInversores: number
  potenciaInversorKw: number
  fatorCapacidade: number
  modalidade: ModalidadeGD
  tusdFioB: number
  tarifaDemanda: number            // usada só no cenário mini (col W)
  valorInvestimento: number
  tarifaLocacaoBase: number
  reajusteTarifaAnual: number
  degradacaoAnual: number
  tma: number
  descontoLocacao: number
  opexPct: number
  impostoPct: number
  d23: number                      // fator de gestão (0.125 no cenário)
  sunneSetupMicro: number          // 5000
  sunneSetupMini: number           // 10000
  pctFinanciado: number
  jurosAnual: number
  prazoMeses: number
  fioBSchedule: number[]           // [0.6,0.75,0.9,1,1,...]
  horizonteAnos: number            // 25
  anoInicial: number               // 2025
}

export type LinhaProjecao = {
  ano: number
  producaoKwh: number
  tarifaLiquida: number
  receitaBruta: number
  prestacao: number
  opex: number
  imposto: number
  fluxoProprio: number
  fluxoProprioAcum: number
  fluxoFinanciado: number
  fluxoFinanciadoAcum: number
}

export type MetricasCenario = { tir: number; vpl: number; paybackAnos: number }

export type ViabilidadeResultado = {
  kwp: number
  geracaoAnualKwh: number
  tipoUsina: 'Microusina' | 'Miniusina'
  projecao: LinhaProjecao[]
  capitalProprio: MetricasCenario
  comFinanciamento: MetricasCenario
}
```

- [ ] **Step 2: Typecheck** — `cd web && npx tsc --noEmit` (ignorar erro stale de `app/register/page`).

- [ ] **Step 3: Commit**
```bash
git add web/lib/simuladores/viabilidade/types.ts
git commit -m "feat(viabilidade): tipos de entrada/saida do motor"
```

---

## Task 3: Motor `calcularViabilidade` (TDD com golden)

**Files:** Create `web/lib/simuladores/viabilidade/engine.ts`; Test `web/__tests__/viabilidade-engine.test.ts`.

- [ ] **Step 1: Teste golden que falha** (cenário RGE/GD2)

```ts
import { describe, it, expect } from 'vitest'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const FLUXO_ESPERADO = [-154413.82, 18018.435239867034, 30956.710616464185, 29356.702541229693,
 28698.431410173365, 30660.802146652914, 32755.913030802698, 34992.62005963194,
 37380.359504174136, 39929.185009396366, 42649.806984285067, 45553.634416037668,
 48652.81924941959, 51960.303479788265, 55489.869116039605, 38474.124044044613,
 63274.893899687246, 67562.610323837944, 72137.045471668796, 77017.043294330666,
 82222.657611738803, 87775.227259733627, 93697.455675370802, 100013.49516096816,
 106749.03607847019, 113931.40123688725]

const INPUT: ViabilidadeInput = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2',
  tusdFioB: 0.36916808562393572, tarifaDemanda: 16.983311938382542,
  valorInvestimento: 154413.82, tarifaLocacaoBase: 0.8222, reajusteTarifaAnual: 0.08,
  degradacaoAnual: 0.015, tma: 0.10, descontoLocacao: 0.20,
  opexPct: 0.081199185409699712, impostoPct: 0.045, d23: 0.125,
  sunneSetupMicro: 5000, sunneSetupMini: 10000,
  pctFinanciado: 0, jurosAnual: 0.10, prazoMeses: 12,
  fioBSchedule: [0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  horizonteAnos: 25, anoInicial: 2025,
}

describe('calcularViabilidade (golden RGE)', () => {
  const r = calcularViabilidade(INPUT)
  it('deriva kWp, geracao e tipo', () => {
    expect(r.kwp).toBeCloseTo(90, 6)
    expect(r.geracaoAnualKwh).toBeCloseTo(109272.24, 2)
    expect(r.tipoUsina).toBe('Microusina')
  })
  it('projeta 26 linhas (ano 0..25) e o fluxo proprio bate ano a ano', () => {
    const fluxos = [r.projecao[0].fluxoProprio, ...r.projecao.slice(1).map(l => l.fluxoProprio)]
    expect(fluxos).toHaveLength(26)
    for (let i = 0; i < FLUXO_ESPERADO.length; i++) {
      expect(fluxos[i]).toBeCloseTo(FLUXO_ESPERADO[i], 2)
    }
  })
  it('métricas capital próprio batem com o Excel', () => {
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
    expect(r.capitalProprio.paybackAnos).toBe(5)
  })
  it('com financiamento 0% coincide com capital próprio', () => {
    expect(r.comFinanciamento.tir).toBeCloseTo(r.capitalProprio.tir, 8)
    expect(r.comFinanciamento.vpl).toBeCloseTo(r.capitalProprio.vpl, 2)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `cd web && npx vitest run viabilidade-engine` → FAIL.

- [ ] **Step 3: Implementar `engine.ts`** seguindo EXATAMENTE a "Referência do modelo" acima.

Estrutura obrigatória (montar a projeção primeiro, depois métricas):
```ts
// web/lib/simuladores/viabilidade/engine.ts
import { irr, npv } from './finance'
import type { ViabilidadeInput, ViabilidadeResultado, LinhaProjecao, MetricasCenario } from './types'

const DEGRAD_FATOR = 0.993251254 // constante da planilha (col F)

export function calcularViabilidade(input: ViabilidadeInput): ViabilidadeResultado {
  const kwp = (input.numPaineis * input.potenciaPainelWp) / 1000
  const invTotalKw = input.numInversores * input.potenciaInversorKw
  const tipoUsina = invTotalKw <= 75 ? 'Microusina' : 'Miniusina'
  const geracaoAnualBase = kwp * 8760 * input.fatorCapacidade * 0.99
  const opexBase = input.opexPct * input.valorInvestimento
  const producao1 = geracaoAnualBase * (1 - input.degradacaoAnual)
  const reinvestAno15 = (0.10 * input.valorInvestimento) * Math.pow(1 + 0.02, 15)

  const projecao: LinhaProjecao[] = []
  const fluxoProprioArr: number[] = []
  const fluxoFinanciadoArr: number[] = []

  // Ano 0 (investimento)
  projecao.push({
    ano: input.anoInicial, producaoKwh: 0, tarifaLiquida: 0, receitaBruta: 0,
    prestacao: 0, opex: 0, imposto: 0,
    fluxoProprio: -input.valorInvestimento, fluxoProprioAcum: -input.valorInvestimento,
    fluxoFinanciado: -input.valorInvestimento, fluxoFinanciadoAcum: -input.valorInvestimento,
  })
  fluxoProprioArr.push(-input.valorInvestimento)
  fluxoFinanciadoArr.push(-input.valorInvestimento)

  let acumProprio = -input.valorInvestimento
  let acumFinan = -input.valorInvestimento

  for (let t = 1; t <= input.horizonteAnos; t++) {
    const producao = t === 1 ? producao1 : producao1 * Math.pow(DEGRAD_FATOR, t - 1)
    const tarifaLoc = input.tarifaLocacaoBase * Math.pow(1 + input.reajusteTarifaAnual, t - 1)
    const fioBpct = input.fioBSchedule[t - 1] ?? 1
    const tusdFioBAplic = input.modalidade === 'GD1' ? 0 : input.tusdFioB * fioBpct * tarifaLoc
    // GD3 (fioA/peD/tfsee) fora do escopo dos cenários GD1/GD2 — 0 aqui
    const tusdNaoComp = tusdFioBAplic
    const tarifaLiquida = (tarifaLoc - tusdNaoComp) * (1 - input.descontoLocacao)
    const receita = producao * tarifaLiquida
    const opex = -opexBase * Math.pow(1 + input.reajusteTarifaAnual, t - 1)
    const imposto = -input.impostoPct * receita
    const gestao = t === 1
      ? (-receita / 12) * 2 - input.d23 * receita - (tipoUsina === 'Microusina' ? input.sunneSetupMicro : input.sunneSetupMini)
      : -input.d23 * receita
    const demandaMini = tipoUsina === 'Microusina'
      ? 0
      : -invTotalKw * 12 * input.tarifaDemanda * Math.pow(1 + input.reajusteTarifaAnual, t - 1)
    const arrendamento = 0
    const reinvest = t === 15 ? -reinvestAno15 : 0

    // Financiamento (Price). Com pctFinanciado=0, tudo 0.
    const prestacao = 0 // TODO-financiamento: implementar Price quando pctFinanciado>0 (ver nota)

    const fluxoProprio = receita + reinvest + demandaMini + opex + gestao + imposto + arrendamento
    const fluxoFinanciado = fluxoProprio - prestacao
    acumProprio += fluxoProprio
    acumFinan += fluxoFinanciado

    projecao.push({
      ano: input.anoInicial + t, producaoKwh: producao, tarifaLiquida, receitaBruta: receita,
      prestacao, opex, imposto,
      fluxoProprio, fluxoProprioAcum: acumProprio,
      fluxoFinanciado, fluxoFinanciadoAcum: acumFinan,
    })
    fluxoProprioArr.push(fluxoProprio)
    fluxoFinanciadoArr.push(fluxoFinanciado)
  }

  const metricas = (fluxo: number[]): MetricasCenario => ({
    tir: irr(fluxo),
    vpl: npv(input.tma, fluxo.slice(1)) + fluxo[0],
    paybackAnos: projecao.slice(1).filter((l, idx) =>
      (fluxo === fluxoProprioArr ? l.fluxoProprioAcum : l.fluxoFinanciadoAcum) < 0
    ).length,
  })

  return {
    kwp, geracaoAnualKwh: geracaoAnualBase, tipoUsina,
    projecao,
    capitalProprio: metricas(fluxoProprioArr),
    comFinanciamento: metricas(fluxoFinanciadoArr),
  }
}
```

**Nota sobre financiamento:** o cenário golden usa `pctFinanciado=0`, então `prestacao=0` e os dois cenários coincidem — é o que o golden exige. A tabela Price completa (amortização/juros/saldo das colunas P–U) só é exercida com `pctFinanciado>0`, para o qual NÃO há gabarito do Excel no cenário atual. Marcar como `TODO-financiamento` e implementar a Price real numa iteração posterior, quando houver um cenário da planilha com financiamento>0 para servir de golden. Não inventar números sem gabarito.

- [ ] **Step 4: Rodar e iterar até passar** — `cd web && npx vitest run viabilidade-engine`. Se algum ano divergir, revisar a fórmula daquela coluna na "Referência do modelo". Expected: PASS (todos os anos + métricas).

- [ ] **Step 5: Suite completa + typecheck** — `cd web && npx tsc --noEmit && npx vitest run` → tudo verde.

- [ ] **Step 6: Commit**
```bash
git add web/lib/simuladores/viabilidade/engine.ts web/__tests__/viabilidade-engine.test.ts
git commit -m "feat(viabilidade): motor calcularViabilidade fiel a planilha (golden RGE)"
```

---

## Encerramento da Peça 1
- [ ] Push: `git push` (branch `feat/simuladores`).
- [ ] Motor validado por golden test = fidelidade comprovada ao Excel.
- [ ] Próximo: **Peça 2** (tabela de concessionárias — CRUD por empresa + seed com os valores da planilha), que passará a alimentar `tusdFioB`, `tarifaLocacaoBase`, `tarifaDemanda` etc. Depois **Peça 3** (tela + Salvar + PDF).
- [ ] Pendência registrada: tabela Price completa do financiamento (`TODO-financiamento`) quando houver cenário-gabarito com `pctFinanciado>0`.
