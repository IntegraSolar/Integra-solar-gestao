# Simulador Híbrido / Off-grid — Fase 3b2: Tela financeira — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acrescentar à tela do simulador as entradas e os resultados financeiros — CAPEX, economia, indicadores e projeção de 25 anos — e corrigir a ancoragem da rampa do Fio B nos dois simuladores.

**Architecture:** Um módulo puro compartilhado (`fio-b.ts`) deriva a rampa da Lei 14.300 do ano de conexão, substituindo o array fixo. Uma segunda ponte pura (`montar-financeiro.ts`) traduz os campos da tela para o input do motor financeiro e extrai do resultado físico os seis números de que ele depende. Cinco componentes de exibição, todos controlados, sem cálculo na UI.

**Tech Stack:** Next.js (App Router), React, recharts, TypeScript, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-tela-financeira-design.md`.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (zero erros)
- Import alias `@/` → `web/`
- Testes de componente: docblock `// @vitest-environment jsdom` + `import '@testing-library/jest-dom/vitest'` no próprio arquivo. **`vitest.config.ts` não muda.**
- Commits em pt-BR, prefixo `feat(hibrido):` / `fix(simuladores):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**Contexto das fases anteriores:**
- Motor financeiro (2b): `calcularFinanceiro(params)` em `web/lib/simuladores/hibrido/financeiro.ts`; tipos `ParamsFinanceiro`, `ResultadoFinanceiro`, `ResultadoCapex`, `IndicadoresFinanceiros`, `LinhaProjecaoFinanceira`, `FisicoParaFinanceiro`, `PrecosCapex`, `PremissasFinanceiras`, `TarifasInput` em `types.ts`; defaults `PRECOS_CAPEX_PADRAO`, `PREMISSAS_FINANCEIRAS_PADRAO`, `FIO_B_SCHEDULE_14300` em `premissas.ts`. Nunca lança.
- Tela física (3b): `SimuladorHibrido` é dono de `campos`, `cargas` e `biblioteca`; `montar-input.ts` é a ponte física.

**Sem migration nesta fase.**

---

## File Structure

**Lógica pura:**
- Create `web/lib/simuladores/fio-b.ts` — tabela da Lei 14.300 e derivação da rampa (compartilhado)
- Create `web/lib/simuladores/hibrido/montar-financeiro.ts` — `CamposFinanceiro`, `camposFinanceiroIniciais()`, `fisicoParaFinanceiro()`, `montarFinanceiroInput()`
- Modify `web/lib/simuladores/viabilidade/montar-input.ts` — default derivado
- Modify `web/lib/simuladores/hibrido/premissas.ts` — `FIO_B_SCHEDULE_14300` passa a usar o módulo compartilhado

**Componentes** (`web/components/simuladores/`):
- `HibridoInputsFinanceiro.tsx`, `HibridoResultadosCapex.tsx`, `HibridoResultadosEconomia.tsx`, `HibridoIndicadores.tsx`, `HibridoProjecao.tsx`
- Modify `SimuladorHibrido.tsx`

**Registry:**
- Modify `web/lib/simuladores/registry.ts` e `web/__tests__/simuladores-registry.test.ts`

**Testes:**
- `web/__tests__/fio-b.test.ts`, `web/__tests__/hibrido-montar-financeiro.test.ts` (puros)
- `web/__tests__/hibrido-financeiro-ui.test.tsx` (jsdom)
- Modify `web/__tests__/viabilidade-montar-input.test.ts`

---

## Task 1: Módulo compartilhado da rampa do Fio B

**Files:**
- Create: `web/lib/simuladores/fio-b.ts`
- Test: `web/__tests__/fio-b.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/fio-b.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { percentualFioB, fioBSchedule } from '@/lib/simuladores/fio-b'

describe('percentualFioB (Lei 14.300, por ano-calendário)', () => {
  it('antes de 2023 não havia cobrança de Fio B sobre a injeção', () => {
    expect(percentualFioB(2022)).toBe(0)
    expect(percentualFioB(2010)).toBe(0)
  })
  it('segue a escala legal de 2023 a 2028', () => {
    expect(percentualFioB(2023)).toBeCloseTo(0.15, 9)
    expect(percentualFioB(2024)).toBeCloseTo(0.30, 9)
    expect(percentualFioB(2025)).toBeCloseTo(0.45, 9)
    expect(percentualFioB(2026)).toBeCloseTo(0.60, 9)
    expect(percentualFioB(2027)).toBeCloseTo(0.75, 9)
    expect(percentualFioB(2028)).toBeCloseTo(0.90, 9)
  })
  it('é integral de 2029 em diante', () => {
    expect(percentualFioB(2029)).toBe(1)
    expect(percentualFioB(2040)).toBe(1)
  })
})

describe('fioBSchedule', () => {
  it('conexão em 2026 reproduz exatamente a escala fixa que existia antes', () => {
    // Esta é a prova de que a correção NÃO muda nada em 2026 — só a partir de 2027.
    expect(fioBSchedule(2026, 25)).toEqual([0.6, 0.75, 0.9, ...Array<number>(22).fill(1)])
  })
  it('conexão em 2027 começa em 75%', () => {
    expect(fioBSchedule(2027, 25).slice(0, 3)).toEqual([0.75, 0.9, 1])
  })
  it('conexão em 2025 começa em 45%', () => {
    expect(fioBSchedule(2025, 25).slice(0, 4)).toEqual([0.45, 0.6, 0.75, 0.9])
  })
  it('conexão de 2030 em diante é integral o tempo todo', () => {
    expect(fioBSchedule(2030, 25).every((v) => v === 1)).toBe(true)
  })
  it('devolve exatamente horizonteAnos elementos', () => {
    expect(fioBSchedule(2026, 25)).toHaveLength(25)
    expect(fioBSchedule(2026, 2)).toEqual([0.6, 0.75])
    expect(fioBSchedule(2026, 1)).toEqual([0.6])
  })
  it('horizonte zero ou negativo devolve lista vazia', () => {
    expect(fioBSchedule(2026, 0)).toEqual([])
    expect(fioBSchedule(2026, -3)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- fio-b`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/fio-b.ts`:

```ts
// web/lib/simuladores/fio-b.ts
// Escalonamento do TUSD Fio B sobre a energia injetada (Lei 14.300/2022).
// Compartilhado entre os simuladores de viabilidade e híbrido/off-grid.
//
// A cobrança é escalonada por ANO-CALENDÁRIO, não por ano de projeto. Fixar a
// escala como [0,6; 0,75; 0,9; 1; …] equivale a assumir conexão em 2026 — o que
// fica silenciosamente errado a partir de 2027, superestimando a economia dos
// primeiros anos. Por isso a escala é derivada do ano de conexão.
//
// FORA DE ESCOPO: sistemas conectados antes de 2023 têm direito adquirido à
// compensação integral até 2045. Este simulador vende sistemas novos e não
// modela esse caso; a tela restringe o ano de conexão a 2023 ou posterior.

export const PERCENTUAIS_FIO_B_14300: Record<number, number> = {
  2023: 0.15,
  2024: 0.30,
  2025: 0.45,
  2026: 0.60,
  2027: 0.75,
  2028: 0.90,
}

export const PRIMEIRO_ANO_FIO_B = 2023
export const ANO_FIO_B_INTEGRAL = 2029

/** Fração do TUSD Fio B cobrada num dado ano-calendário. */
export function percentualFioB(ano: number): number {
  if (ano < PRIMEIRO_ANO_FIO_B) return 0
  if (ano >= ANO_FIO_B_INTEGRAL) return 1
  return PERCENTUAIS_FIO_B_14300[ano] ?? 1
}

/** Escala por ano de projeto (índice 0 = primeiro ano de operação). */
export function fioBSchedule(anoConexao: number, horizonteAnos: number): number[] {
  if (horizonteAnos <= 0) return []
  return Array.from({ length: horizonteAnos }, (_, i) => percentualFioB(anoConexao + i))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- fio-b`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/fio-b.ts web/__tests__/fio-b.test.ts
git commit -m "feat(simuladores): rampa do Fio B derivada do ano de conexao (Lei 14.300)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Ligar os dois simuladores ao módulo compartilhado

**Files:**
- Modify: `web/lib/simuladores/hibrido/premissas.ts`
- Modify: `web/lib/simuladores/viabilidade/montar-input.ts`
- Modify: `web/__tests__/viabilidade-montar-input.test.ts`

Correção de comportamento com efeito nulo hoje (2026) e correto a partir de 2027.

- [ ] **Step 1: Atualizar o teste da viabilidade**

Em `web/__tests__/viabilidade-montar-input.test.ts`, acrescentar o import:

```ts
import { fioBSchedule } from '@/lib/simuladores/fio-b'
```

E substituir o teste que afirma o array literal (`it('fioBSchedule tem 25 elementos começando em 0.6/0.75/0.9', …)`) por:

```ts
  it('fioBSchedule tem 25 elementos derivados do ano corrente (Lei 14.300)', () => {
    // Derivado, não fixo: em 2026 dá [0.6, 0.75, 0.9, 1…]; em 2027 começa em 0.75.
    expect(PREMISSAS_DEFAULT.fioBSchedule).toHaveLength(25)
    expect(PREMISSAS_DEFAULT.fioBSchedule).toEqual(fioBSchedule(new Date().getFullYear(), 25))
  })
```

O teste da cópia defensiva (`'não compartilha a ref do fioBSchedule default'`) fica como está.

- [ ] **Step 2: Rodar e ver o teste antigo falhar**

Run: `cd web && npm run test -- viabilidade-montar-input`
Expected: FAIL — o default ainda é o array fixo e `fioBSchedule` não está sendo usado. (Em 2026 os dois arrays são iguais, então o teste pode passar; nesse caso confirme apenas que o import resolve e siga.)

- [ ] **Step 3: Derivar o default na viabilidade**

Em `web/lib/simuladores/viabilidade/montar-input.ts`, acrescentar o import no topo:

```ts
import { fioBSchedule } from '../fio-b'
```

E substituir a linha do default:

```ts
  fioBSchedule: [0.6, 0.75, 0.9, ...Array<number>(22).fill(1)],
```

por:

```ts
  // Derivada do ano corrente: a escala da Lei 14.300 é por ano-calendário.
  fioBSchedule: fioBSchedule(new Date().getFullYear(), 25),
```

- [ ] **Step 4: Derivar também a constante do híbrido**

Em `web/lib/simuladores/hibrido/premissas.ts`, acrescentar o import:

```ts
import { fioBSchedule } from '../fio-b'
```

E substituir a definição de `FIO_B_SCHEDULE_14300` por:

```ts
/**
 * Rampa do TUSD Fio B da Lei 14.300 para conexão no ano corrente.
 * A tela permite escolher outro ano de conexão; esta constante é só o default.
 */
export const FIO_B_SCHEDULE_14300: number[] = fioBSchedule(new Date().getFullYear(), 25)
```

- [ ] **Step 5: Desarmar a bomba-relógio em `hibrido-economia.test.ts`**

Esse teste (Fase 2b) monta `comRampa` a partir de `PREMISSAS_FINANCEIRAS_PADRAO`
e afirma valores que dependem da rampa começar em 60% — por exemplo
`tusdAno` de 0,216 no ano 1 e 0,2916 no ano 2.

Com o default virando derivado, esses testes **passam em 2026 e quebram em
janeiro de 2027**, por um motivo que ninguém vai lembrar. Como eles existem
justamente para verificar o comportamento da rampa, a correção é fixar a escala
explicitamente em vez de herdá-la do default.

Em `web/__tests__/hibrido-economia.test.ts`, acrescentar o import:

```ts
import { fioBSchedule } from '@/lib/simuladores/fio-b'
```

E trocar a definição de `comRampa`:

```ts
const comRampa = { fisico: FISICO, tarifas: TARIFAS, premissas: PREMISSAS_FINANCEIRAS_PADRAO }
```

por:

```ts
// Escala fixada em 2026 de propósito: estes testes verificam o comportamento da
// rampa, então não podem depender do ano em que a suíte roda.
const comRampa = {
  fisico: FISICO,
  tarifas: TARIFAS,
  premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, fioBSchedule: fioBSchedule(2026, 25) },
}
```

`semRampa` já sobrescreve o schedule com `new Array(25).fill(1)`, então não muda.

- [ ] **Step 6: Rodar tudo**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo e suíte inteira verde.

`hibrido-financeiro.test.ts` usa do default apenas `horizonteAnos`, e suas
asserções sobre o caso real são de propriedade (VPL positivo, TIR numa faixa),
então não depende da rampa — não precisa de ajuste.

**Se algum golden financeiro falhar, pare e reporte** em vez de ajustar o valor
esperado: significaria que `fioBSchedule(2026, 25)` não reproduz a escala fixa
antiga, o que invalidaria a premissa desta correção.

- [ ] **Step 7: Commit**

```bash
git add web/lib/simuladores/hibrido/premissas.ts web/lib/simuladores/viabilidade/montar-input.ts web/__tests__/viabilidade-montar-input.test.ts web/__tests__/hibrido-economia.test.ts
git commit -m "fix(simuladores): deriva rampa do Fio B do ano corrente nos dois simuladores

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Ponte pura financeira

**Files:**
- Create: `web/lib/simuladores/hibrido/montar-financeiro.ts`
- Test: `web/__tests__/hibrido-montar-financeiro.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-montar-financeiro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
  type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import {
  PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO,
} from '@/lib/simuladores/hibrido/premissas'
import { fioBSchedule } from '@/lib/simuladores/fio-b'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { PAINEL, INVERSOR, BATERIA, CARGAS, PROJETO } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

const RESULTADO = calcularHibrido(
  montarHibridoInput(
    {
      ...CAMPOS_INICIAIS,
      tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
      hspMensal: PROJETO.hspMensal,
      painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
      numModulos: '16',
    },
    EQUIP,
    CARGAS
  )
)

const BASE: CamposFinanceiro = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' }

describe('fisicoParaFinanceiro', () => {
  const f = fisicoParaFinanceiro(RESULTADO)

  it('extrai os seis campos das origens certas', () => {
    expect(f.numModulos).toBe(RESULTADO.dimensionamento.numModulos)
    expect(f.numInversores).toBe(RESULTADO.inversor.numInversoresParalelo)
    expect(f.numBaterias).toBe(RESULTADO.baterias.numBaterias)
    expect(f.potenciaInstaladaKwp).toBe(RESULTADO.dimensionamento.potenciaInstaladaKwp)
    expect(f.producaoAnualKwh).toBe(RESULTADO.dimensionamento.producaoAnualKwh)
    expect(f.consumoAnualKwh).toBe(RESULTADO.cargas.consumoAnualKwh)
  })
  it('os valores do projeto de teste chegam com sentido físico', () => {
    expect(f.numModulos).toBe(16)
    expect(f.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
    expect(f.numBaterias).toBeGreaterThan(0)
  })
})

describe('camposFinanceiroIniciais', () => {
  const c = camposFinanceiroIniciais(2026)

  it('tarifas começam vazias (não há padrão razoável)', () => {
    expect(c.tarifaKwh).toBe('')
    expect(c.tusdFioBKwh).toBe('')
    expect(c.disponibilidadeKwhMes).toBe('')
  })
  it('preços vêm pré-preenchidos com os padrões', () => {
    expect(c.moduloUnitario).toBe(String(PRECOS_CAPEX_PADRAO.moduloUnitario))
    expect(c.bateriaUnitaria).toBe(String(PRECOS_CAPEX_PADRAO.bateriaUnitaria))
  })
  it('premissas vêm pré-preenchidas e o ano de conexão vem do parâmetro', () => {
    expect(c.bdi).toBe(String(PREMISSAS_FINANCEIRAS_PADRAO.bdi))
    expect(c.horizonteAnos).toBe(String(PREMISSAS_FINANCEIRAS_PADRAO.horizonteAnos))
    expect(c.anoConexao).toBe('2026')
  })
})

describe('montarFinanceiroInput', () => {
  const fisico = fisicoParaFinanceiro(RESULTADO)

  it('repassa as tarifas digitadas', () => {
    const p = montarFinanceiroInput({ ...BASE, tusdFioBKwh: '0.36', disponibilidadeKwhMes: '100' }, fisico)
    expect(p.tarifas.tarifaKwh).toBe(1.22)
    expect(p.tarifas.tusdFioBKwh).toBe(0.36)
    expect(p.tarifas.disponibilidadeKwhMes).toBe(100)
  })
  it('tarifa em branco vira 0 (sem padrão possível)', () => {
    const p = montarFinanceiroInput({ ...BASE, tarifaKwh: '' }, fisico)
    expect(p.tarifas.tarifaKwh).toBe(0)
  })
  it('preço em branco cai no padrão do motor', () => {
    const p = montarFinanceiroInput({ ...BASE, moduloUnitario: '' }, fisico)
    expect(p.precos?.moduloUnitario).toBe(PRECOS_CAPEX_PADRAO.moduloUnitario)
  })
  it('preço preenchido sobrepõe o padrão', () => {
    const p = montarFinanceiroInput({ ...BASE, moduloUnitario: '900' }, fisico)
    expect(p.precos?.moduloUnitario).toBe(900)
  })
  it('texto inválido cai no padrão', () => {
    const p = montarFinanceiroInput({ ...BASE, bdi: 'abc' }, fisico)
    expect(p.premissas?.bdi).toBe(PREMISSAS_FINANCEIRAS_PADRAO.bdi)
  })
  it('zero digitado é respeitado', () => {
    const p = montarFinanceiroInput({ ...BASE, bdi: '0' }, fisico)
    expect(p.premissas?.bdi).toBe(0)
  })

  it('deriva o fioBSchedule do ano de conexão e do horizonte', () => {
    const p = montarFinanceiroInput({ ...BASE, anoConexao: '2027', horizonteAnos: '25' }, fisico)
    expect(p.premissas?.fioBSchedule).toEqual(fioBSchedule(2027, 25))
    expect(p.premissas?.fioBSchedule[0]).toBeCloseTo(0.75, 9)
  })
  it('horizonte customizado muda o tamanho do schedule', () => {
    const p = montarFinanceiroInput({ ...BASE, anoConexao: '2026', horizonteAnos: '10' }, fisico)
    expect(p.premissas?.horizonteAnos).toBe(10)
    expect(p.premissas?.fioBSchedule).toHaveLength(10)
  })
  it('repassa o físico sem alterar', () => {
    const p = montarFinanceiroInput(BASE, fisico)
    expect(p.fisico).toEqual(fisico)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-montar-financeiro`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/hibrido/montar-financeiro.ts`:

```ts
// web/lib/simuladores/hibrido/montar-financeiro.ts
// Ponte pura entre os campos financeiros da tela e o input do motor financeiro.
import { fioBSchedule } from '../fio-b'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from './premissas'
import type { FisicoParaFinanceiro, ResultadoHibrido } from './types'
import type { ParamsFinanceiro } from './financeiro'

/** Campos financeiros da tela. Todos `string`: em branco = usar o padrão. */
export type CamposFinanceiro = {
  // Tarifas — sem padrão possível, variam por concessionária
  tarifaKwh: string
  tusdFioBKwh: string
  disponibilidadeKwhMes: string
  // Preços do CAPEX
  moduloUnitario: string
  inversorUnitario: string
  bateriaUnitaria: string
  estruturaPorModulo: string
  cabeamentoPorKwp: string
  projetoArt: string
  maoDeObraPorKwp: string
  freteImprevistos: string
  // Formação de preço
  bdi: string
  margemLucro: string
  impostos: string
  // Modelo
  tma: string
  inflacaoTarifa: string
  degradacaoAnual: string
  omAnual: string
  horizonteAnos: string
  anoConexao: string
}

/**
 * Estado inicial. É função, não constante: o ano de conexão vem de fora, para
 * o módulo não depender do relógio no momento do import (o que tornaria os
 * testes dependentes da data).
 */
export function camposFinanceiroIniciais(anoConexao: number): CamposFinanceiro {
  const p = PRECOS_CAPEX_PADRAO
  const f = PREMISSAS_FINANCEIRAS_PADRAO
  return {
    tarifaKwh: '',
    tusdFioBKwh: '',
    disponibilidadeKwhMes: '',
    moduloUnitario: String(p.moduloUnitario),
    inversorUnitario: String(p.inversorUnitario),
    bateriaUnitaria: String(p.bateriaUnitaria),
    estruturaPorModulo: String(p.estruturaPorModulo),
    cabeamentoPorKwp: String(p.cabeamentoPorKwp),
    projetoArt: String(p.projetoArt),
    maoDeObraPorKwp: String(p.maoDeObraPorKwp),
    freteImprevistos: String(p.freteImprevistos),
    bdi: String(f.bdi),
    margemLucro: String(f.margemLucro),
    impostos: String(f.impostos),
    tma: String(f.tma),
    inflacaoTarifa: String(f.inflacaoTarifa),
    degradacaoAnual: String(f.degradacaoAnual),
    omAnual: String(f.omAnual),
    horizonteAnos: String(f.horizonteAnos),
    anoConexao: String(anoConexao),
  }
}

/**
 * Extrai do resultado físico os seis números que o motor financeiro consome.
 * Isolado e testado porque um campo trocado aqui não quebra nada visível —
 * apenas produz um CAPEX errado em silêncio.
 */
export function fisicoParaFinanceiro(r: ResultadoHibrido): FisicoParaFinanceiro {
  return {
    numModulos: r.dimensionamento.numModulos,
    numInversores: r.inversor.numInversoresParalelo,
    numBaterias: r.baterias.numBaterias,
    potenciaInstaladaKwp: r.dimensionamento.potenciaInstaladaKwp,
    producaoAnualKwh: r.dimensionamento.producaoAnualKwh,
    consumoAnualKwh: r.cargas.consumoAnualKwh,
  }
}

/** Campo em branco ou inválido usa o padrão; `'0'` digitado é respeitado. */
function numOu(v: string, padrao: number): number {
  const t = v.trim()
  if (t === '') return padrao
  const n = Number(t)
  return Number.isFinite(n) ? n : padrao
}

export function montarFinanceiroInput(
  campos: CamposFinanceiro,
  fisico: FisicoParaFinanceiro
): ParamsFinanceiro {
  const p = PRECOS_CAPEX_PADRAO
  const f = PREMISSAS_FINANCEIRAS_PADRAO
  const horizonteAnos = numOu(campos.horizonteAnos, f.horizonteAnos)
  const anoConexao = numOu(campos.anoConexao, new Date().getFullYear())

  return {
    fisico,
    tarifas: {
      // Sem padrão: tarifa varia por concessionária. Vazio vira 0, e a tela
      // suprime os resultados financeiros nesse caso.
      tarifaKwh: numOu(campos.tarifaKwh, 0),
      tusdFioBKwh: numOu(campos.tusdFioBKwh, 0),
      disponibilidadeKwhMes: numOu(campos.disponibilidadeKwhMes, 0),
    },
    precos: {
      moduloUnitario: numOu(campos.moduloUnitario, p.moduloUnitario),
      inversorUnitario: numOu(campos.inversorUnitario, p.inversorUnitario),
      bateriaUnitaria: numOu(campos.bateriaUnitaria, p.bateriaUnitaria),
      estruturaPorModulo: numOu(campos.estruturaPorModulo, p.estruturaPorModulo),
      cabeamentoPorKwp: numOu(campos.cabeamentoPorKwp, p.cabeamentoPorKwp),
      projetoArt: numOu(campos.projetoArt, p.projetoArt),
      maoDeObraPorKwp: numOu(campos.maoDeObraPorKwp, p.maoDeObraPorKwp),
      freteImprevistos: numOu(campos.freteImprevistos, p.freteImprevistos),
    },
    premissas: {
      bdi: numOu(campos.bdi, f.bdi),
      margemLucro: numOu(campos.margemLucro, f.margemLucro),
      impostos: numOu(campos.impostos, f.impostos),
      tma: numOu(campos.tma, f.tma),
      inflacaoTarifa: numOu(campos.inflacaoTarifa, f.inflacaoTarifa),
      degradacaoAnual: numOu(campos.degradacaoAnual, f.degradacaoAnual),
      omAnual: numOu(campos.omAnual, f.omAnual),
      horizonteAnos,
      fioBSchedule: fioBSchedule(anoConexao, horizonteAnos),
    },
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-montar-financeiro`
Expected: PASS.

Depois: `cd web && npx tsc --noEmit` → zero erros.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/montar-financeiro.ts web/__tests__/hibrido-montar-financeiro.test.ts
git commit -m "feat(hibrido): ponte pura entre campos financeiros e o motor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `HibridoInputsFinanceiro`

**Files:**
- Create: `web/components/simuladores/HibridoInputsFinanceiro.tsx`
- Create: `web/__tests__/hibrido-financeiro-ui.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-financeiro-ui.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HibridoInputsFinanceiro } from '@/components/simuladores/HibridoInputsFinanceiro'
import {
  camposFinanceiroIniciais, type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { PRECOS_CAPEX_PADRAO } from '@/lib/simuladores/hibrido/premissas'

function FinanceiroComEstado() {
  const [campos, setCampos] = useState<CamposFinanceiro>(camposFinanceiroIniciais(2026))
  return <HibridoInputsFinanceiro campos={campos} onChange={setCampos} />
}

describe('HibridoInputsFinanceiro', () => {
  it('tarifas começam vazias', () => {
    render(<FinanceiroComEstado />)
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('')
    expect(screen.getByTestId('fin-tusdFioBKwh')).toHaveValue('')
  })

  it('preços vêm pré-preenchidos com os padrões', () => {
    render(<FinanceiroComEstado />)
    expect(screen.getByTestId('fin-moduloUnitario')).toHaveValue(String(PRECOS_CAPEX_PADRAO.moduloUnitario))
    expect(screen.getByTestId('fin-bateriaUnitaria')).toHaveValue(String(PRECOS_CAPEX_PADRAO.bateriaUnitaria))
  })

  it('editar a tarifa propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<FinanceiroComEstado />)
    await user.type(screen.getByTestId('fin-tarifaKwh'), '1.22')
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('1.22')
  })

  it('editar um preço propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<FinanceiroComEstado />)
    await user.clear(screen.getByTestId('fin-moduloUnitario'))
    await user.type(screen.getByTestId('fin-moduloUnitario'), '900')
    expect(screen.getByTestId('fin-moduloUnitario')).toHaveValue('900')
  })

  it('ano de conexão vem preenchido e não aceita antes de 2023', () => {
    render(<FinanceiroComEstado />)
    const ano = screen.getByTestId('fin-anoConexao')
    expect(ano).toHaveValue('2026')
    expect(ano).toHaveAttribute('min', '2023')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `web/components/simuladores/HibridoInputsFinanceiro.tsx`:

```tsx
'use client'
import type { CamposFinanceiro } from '@/lib/simuladores/hibrido/montar-financeiro'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Campo = { key: keyof CamposFinanceiro; label: string; placeholder?: string }

const TARIFAS: Campo[] = [
  { key: 'tarifaKwh', label: 'Tarifa cheia (R$/kWh)', placeholder: 'ex.: 1,22' },
  { key: 'tusdFioBKwh', label: 'TUSD Fio B (R$/kWh)', placeholder: 'ex.: 0,36' },
  { key: 'disponibilidadeKwhMes', label: 'Disponibilidade (kWh/mês)', placeholder: 'ex.: 100' },
]

const PRECOS: Campo[] = [
  { key: 'moduloUnitario', label: 'Módulo (R$/un.)' },
  { key: 'inversorUnitario', label: 'Inversor (R$/un.)' },
  { key: 'bateriaUnitaria', label: 'Bateria (R$/un.)' },
  { key: 'estruturaPorModulo', label: 'Estrutura (R$/módulo)' },
  { key: 'cabeamentoPorKwp', label: 'Cabeamento (R$/kWp)' },
  { key: 'projetoArt', label: 'Projeto e ART (R$)' },
  { key: 'maoDeObraPorKwp', label: 'Mão de obra (R$/kWp)' },
  { key: 'freteImprevistos', label: 'Frete e imprevistos (R$)' },
]

const PRECO_VENDA: Campo[] = [
  { key: 'bdi', label: 'BDI (fração)' },
  { key: 'margemLucro', label: 'Margem de lucro (fração)' },
  { key: 'impostos', label: 'Impostos (fração)' },
]

const MODELO: Campo[] = [
  { key: 'tma', label: 'TMA (fração a.a.)' },
  { key: 'inflacaoTarifa', label: 'Inflação da tarifa (fração a.a.)' },
  { key: 'degradacaoAnual', label: 'Degradação anual (fração)' },
  { key: 'omAnual', label: 'O&M anual (fração do CAPEX)' },
  { key: 'horizonteAnos', label: 'Horizonte (anos)' },
]

type Props = { campos: CamposFinanceiro; onChange: (c: CamposFinanceiro) => void }

export function HibridoInputsFinanceiro({ campos, onChange }: Props) {
  const set = (key: keyof CamposFinanceiro, valor: string) => onChange({ ...campos, [key]: valor })

  const grupo = (titulo: string, lista: Campo[], cols: string) => (
    <div className="mt-4 first:mt-0">
      <h3 className="text-xs font-semibold text-[var(--theme-text,#1a2340)]">{titulo}</h3>
      <div className={`mt-2 grid gap-3 ${cols}`}>
        {lista.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input
              className={IN}
              data-testid={`fin-${c.key}`}
              placeholder={c.placeholder}
              value={campos[c.key]}
              onChange={(e) => set(c.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Financeiro</h2>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Campos em branco usam o valor padrão. As tarifas não têm padrão — informe as da concessionária do cliente.
      </p>

      {grupo('Tarifas', TARIFAS, 'sm:grid-cols-3')}
      {grupo('Preços do CAPEX', PRECOS, 'sm:grid-cols-3 lg:grid-cols-4')}
      {grupo('Formação de preço', PRECO_VENDA, 'sm:grid-cols-3')}
      {grupo('Modelo financeiro', MODELO, 'sm:grid-cols-3 lg:grid-cols-5')}

      <div className="mt-4 max-w-40">
        <label className="text-[11px]">Ano de conexão
          <input
            type="number"
            min="2023"
            className={IN}
            data-testid="fin-anoConexao"
            value={campos.anoConexao}
            onChange={(e) => set('anoConexao', e.target.value)}
          />
        </label>
        <p className="mt-1 text-[10px] text-[var(--theme-text-muted,#9aa0b0)]">
          Define a rampa do Fio B (Lei 14.300).
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoInputsFinanceiro.tsx web/__tests__/hibrido-financeiro-ui.test.tsx
git commit -m "feat(hibrido): entradas financeiras (tarifas, precos, premissas)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: CAPEX e economia

**Files:**
- Create: `web/components/simuladores/HibridoResultadosCapex.tsx`
- Create: `web/components/simuladores/HibridoResultadosEconomia.tsx`
- Modify: `web/__tests__/hibrido-financeiro-ui.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

Acrescentar ao fim de `web/__tests__/hibrido-financeiro-ui.test.tsx`:

```tsx
import { HibridoResultadosCapex } from '@/components/simuladores/HibridoResultadosCapex'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import type { FisicoParaFinanceiro } from '@/lib/simuladores/hibrido/types'

const FISICO_TESTE: FisicoParaFinanceiro = {
  numModulos: 16, numInversores: 1, numBaterias: 2,
  potenciaInstaladaKwp: 9.92, producaoAnualKwh: 14149.415366185884, consumoAnualKwh: 2135.25,
}

const TARIFAS_TESTE = { tarifaKwh: 1.22, tusdFioBKwh: 0.36, disponibilidadeKwhMes: 100 }

describe('HibridoResultadosCapex', () => {
  const r = calcularFinanceiro({ fisico: FISICO_TESTE, tarifas: TARIFAS_TESTE })

  it('lista os 8 itens do CAPEX', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    expect(screen.getAllByTestId(/^capex-item-/)).toHaveLength(8)
  })

  it('a soma dos subtotais exibidos confere com o custo direto', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    const soma = r.capex.itens.reduce((a, i) => a + i.subtotal, 0)
    expect(soma).toBeCloseTo(r.capex.custoDireto, 6)
    expect(screen.getByTestId('capex-custo-direto')).toHaveTextContent(
      r.capex.custoDireto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  })

  it('mostra o investimento total do motor', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    expect(screen.getByTestId('capex-investimento-total')).toHaveTextContent(
      r.capex.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar `HibridoResultadosCapex.tsx`**

```tsx
'use client'
import type { ResultadoCapex } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const qtd = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function HibridoResultadosCapex({ capex }: { capex: ResultadoCapex }) {
  const totais: { id: string; label: string; valor: number; forte?: boolean }[] = [
    { id: 'capex-custo-direto', label: 'Custo direto', valor: capex.custoDireto },
    { id: 'capex-bdi', label: 'BDI', valor: capex.valorBdi },
    { id: 'capex-com-bdi', label: 'Custo com BDI', valor: capex.custoComBdi },
    { id: 'capex-margem', label: 'Margem de lucro', valor: capex.valorMargem },
    { id: 'capex-impostos', label: 'Impostos', valor: capex.valorImpostos },
    { id: 'capex-investimento-total', label: 'Investimento total', valor: capex.investimentoTotal, forte: true },
    { id: 'capex-por-kwp', label: 'Investimento por kWp', valor: capex.investimentoPorKwp },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Investimento (CAPEX)</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
              <th className="p-1">Item</th>
              <th className="p-1 text-right">Qtd</th>
              <th className="p-1 text-right">Custo unit. (R$)</th>
              <th className="p-1 text-right">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            {capex.itens.map((i) => (
              <tr key={i.descricao} data-testid={`capex-item-${i.descricao}`}
                className="border-t border-[var(--theme-border,#f1f2f7)]">
                <td className="p-1">{i.descricao}</td>
                <td className="p-1 text-right tabular-nums">{qtd(i.quantidade)}</td>
                <td className="p-1 text-right tabular-nums">{brl(i.custoUnitario)}</td>
                <td className="p-1 text-right tabular-nums">{brl(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {totais.map((t) => (
          <div key={t.id}
            className={`flex justify-between border-b border-[var(--theme-border,#f1f2f7)] py-1 text-xs ${t.forte ? 'font-bold' : ''}`}>
            <dt className={t.forte ? 'text-[var(--theme-text,#1a2340)]' : 'text-[var(--theme-text-muted,#7b8194)]'}>{t.label}</dt>
            <dd className="tabular-nums text-[var(--theme-text,#1a2340)]" data-testid={t.id}>R$ {brl(t.valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
```

- [ ] **Step 4: Implementar `HibridoResultadosEconomia.tsx`**

```tsx
'use client'
import type { ResultadoEconomiaAno } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function HibridoResultadosEconomia({ economia }: { economia: ResultadoEconomiaAno }) {
  const linhas: { id: string; label: string; valor: string }[] = [
    { id: 'eco-autoconsumo', label: 'Energia compensada (autoconsumo)', valor: `${n(economia.autoconsumoKwh, 0)} kWh` },
    { id: 'eco-excedente', label: 'Excedente injetado', valor: `${n(economia.excedenteKwh, 0)} kWh` },
    { id: 'eco-tarifa', label: 'Tarifa no ano 1', valor: `R$ ${n(economia.tarifaAno, 4)}/kWh` },
    { id: 'eco-tusd', label: 'TUSD Fio B no ano 1', valor: `R$ ${n(economia.tusdAno, 4)}/kWh` },
    { id: 'eco-autoconsumo-rs', label: 'Economia por autoconsumo', valor: `R$ ${n(economia.economiaAutoconsumo)}` },
    { id: 'eco-credito', label: 'Crédito do excedente', valor: `R$ ${n(economia.creditoExcedente)}` },
    { id: 'eco-disponibilidade', label: '(−) Custo de disponibilidade', valor: `R$ ${n(economia.custoDisponibilidade)}` },
    { id: 'eco-liquida', label: 'Economia líquida (ano 1)', valor: `R$ ${n(economia.economiaLiquida)}` },
    { id: 'eco-mensal', label: 'Economia mensal média', valor: `R$ ${n(economia.economiaLiquida / 12)}` },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Economia no primeiro ano</h3>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {linhas.map((l) => (
          <div key={l.id} className="flex justify-between border-b border-[var(--theme-border,#f1f2f7)] py-1 text-xs">
            <dt className="text-[var(--theme-text-muted,#7b8194)]">{l.label}</dt>
            <dd className="font-medium tabular-nums text-[var(--theme-text,#1a2340)]" data-testid={l.id}>{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
```

**Nota:** a economia mensal é `economiaLiquida / 12` — divisão de apresentação,
não recálculo de domínio. É a única aritmética permitida aqui.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: PASS (8 testes).

Depois: `cd web && npx tsc --noEmit` → zero erros.

- [ ] **Step 6: Commit**

```bash
git add web/components/simuladores/HibridoResultadosCapex.tsx web/components/simuladores/HibridoResultadosEconomia.tsx web/__tests__/hibrido-financeiro-ui.test.tsx
git commit -m "feat(hibrido): blocos de CAPEX e economia do primeiro ano

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `HibridoIndicadores`

**Files:**
- Create: `web/components/simuladores/HibridoIndicadores.tsx`
- Modify: `web/__tests__/hibrido-financeiro-ui.test.tsx`

- [ ] **Step 1: Escrever os testes falhando**

Acrescentar ao fim de `web/__tests__/hibrido-financeiro-ui.test.tsx`:

```tsx
import { HibridoIndicadores } from '@/components/simuladores/HibridoIndicadores'
import type { IndicadoresFinanceiros } from '@/lib/simuladores/hibrido/types'

describe('HibridoIndicadores', () => {
  const r = calcularFinanceiro({ fisico: FISICO_TESTE, tarifas: TARIFAS_TESTE })

  it('exibe o VPL e a TIR que o motor devolveu', () => {
    render(<HibridoIndicadores indicadores={r.indicadores} />)
    expect(screen.getByTestId('ind-vpl')).toHaveTextContent(
      r.indicadores.vpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
    expect(screen.getByTestId('ind-tir')).toHaveTextContent(
      (r.indicadores.tir * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    )
  })

  it('payback null aparece como "não se paga no horizonte"', () => {
    const semPayback: IndicadoresFinanceiros = {
      ...r.indicadores, paybackSimplesAnos: null, paybackDescontadoAnos: null,
    }
    render(<HibridoIndicadores indicadores={semPayback} />)
    expect(screen.getByTestId('ind-payback-simples')).toHaveTextContent('não se paga no horizonte')
    expect(screen.getByTestId('ind-payback-descontado')).toHaveTextContent('não se paga no horizonte')
  })

  it('payback preenchido aparece em anos', () => {
    render(<HibridoIndicadores indicadores={r.indicadores} />)
    expect(screen.getByTestId('ind-payback-simples')).toHaveTextContent('anos')
  })

  it('exibe LCOE, ROI e economia acumulada', () => {
    render(<HibridoIndicadores indicadores={r.indicadores} />)
    expect(screen.getByTestId('ind-lcoe')).toBeInTheDocument()
    expect(screen.getByTestId('ind-roi')).toBeInTheDocument()
    expect(screen.getByTestId('ind-economia-acumulada')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `web/components/simuladores/HibridoIndicadores.tsx`:

```tsx
'use client'
import type { IndicadoresFinanceiros } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** Payback pode não existir dentro do horizonte — dizer isso é melhor que um traço. */
const payback = (v: number | null) => (v === null ? 'não se paga no horizonte' : `${n(v, 1)} anos`)

export function HibridoIndicadores({ indicadores }: { indicadores: IndicadoresFinanceiros }) {
  const blocos: { id: string; label: string; valor: string; destaque?: boolean }[] = [
    { id: 'ind-vpl', label: 'VPL (@ TMA)', valor: `R$ ${n(indicadores.vpl)}`, destaque: true },
    { id: 'ind-tir', label: 'TIR (a.a.)', valor: `${n(indicadores.tir * 100, 1)}%`, destaque: true },
    { id: 'ind-payback-simples', label: 'Payback simples', valor: payback(indicadores.paybackSimplesAnos), destaque: true },
    { id: 'ind-payback-descontado', label: 'Payback descontado', valor: payback(indicadores.paybackDescontadoAnos) },
    { id: 'ind-lcoe', label: 'LCOE', valor: `R$ ${n(indicadores.lcoe, 4)}/kWh` },
    { id: 'ind-economia-acumulada', label: 'Economia em 25 anos', valor: `R$ ${n(indicadores.economiaAcumulada, 0)}` },
    { id: 'ind-roi', label: 'ROI', valor: `${n(indicadores.roi, 2)}×` },
    { id: 'ind-vpl-investimento', label: 'VPL / investimento', valor: `${n(indicadores.indiceVplInvestimento, 2)}×` },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Indicadores de viabilidade</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {blocos.map((b) => (
          <div key={b.id}
            className={`rounded-lg border p-3 ${b.destaque ? 'border-[#f0d9a8] bg-[#fff9ef]' : 'border-[var(--theme-border,#e7e9f2)]'}`}>
            <p className="text-[11px] text-[var(--theme-text-muted,#7b8194)]">{b.label}</p>
            <p className="mt-0.5 text-sm font-bold text-[var(--theme-text,#1a2340)]" data-testid={b.id}>{b.valor}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoIndicadores.tsx web/__tests__/hibrido-financeiro-ui.test.tsx
git commit -m "feat(hibrido): indicadores de viabilidade (VPL, TIR, payback, LCOE)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `HibridoProjecao`

**Files:**
- Create: `web/components/simuladores/HibridoProjecao.tsx`

- [ ] **Step 1: Implementar**

Criar `web/components/simuladores/HibridoProjecao.tsx`:

```tsx
'use client'
import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { LinhaProjecaoFinanceira } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function HibridoProjecao({ projecao }: { projecao: LinhaProjecaoFinanceira[] }) {
  const [tabelaAberta, setTabelaAberta] = useState(false)

  const data = projecao.map((l) => ({
    ano: l.ano,
    acumulado: l.fluxoAcumulado,
    vplAcumulado: l.vplAcumulado,
  }))

  return (
    <div className={CARD} data-testid="projecao">
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        Projeção de fluxo de caixa
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
          <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={80}
            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} />
          <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#9aa0b0" />
          <Line type="monotone" dataKey="acumulado" name="Fluxo acumulado" stroke="#FF9F40" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="vplAcumulado" name="VPL acumulado" stroke="#3b6fd6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <button type="button" data-testid="btn-toggle-tabela-projecao"
        onClick={() => setTabelaAberta((a) => !a)}
        className="mt-3 text-xs font-semibold text-[#3b6fd6]">
        {tabelaAberta ? '▾' : '▸'} Tabela ano a ano
      </button>

      {tabelaAberta && (
        <div className="mt-2 overflow-x-auto" data-testid="tabela-projecao">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
                <th className="p-1">Ano</th>
                <th className="p-1 text-right">Geração (kWh)</th>
                <th className="p-1 text-right">Economia (R$)</th>
                <th className="p-1 text-right">O&amp;M (R$)</th>
                <th className="p-1 text-right">Fluxo líq. (R$)</th>
                <th className="p-1 text-right">Acumulado (R$)</th>
                <th className="p-1 text-right">Descontado (R$)</th>
                <th className="p-1 text-right">VPL acum. (R$)</th>
              </tr>
            </thead>
            <tbody>
              {projecao.map((l) => (
                <tr key={l.ano} className="border-t border-[var(--theme-border,#f1f2f7)] tabular-nums">
                  <td className="p-1">{l.ano}</td>
                  <td className="p-1 text-right">{n(l.geracaoKwh, 0)}</td>
                  <td className="p-1 text-right">{n(l.economiaLiquida)}</td>
                  <td className="p-1 text-right">{n(l.custoOm)}</td>
                  <td className="p-1 text-right">{n(l.fluxoLiquido)}</td>
                  <td className="p-1 text-right">{n(l.fluxoAcumulado)}</td>
                  <td className="p-1 text-right">{n(l.fluxoDescontado)}</td>
                  <td className="p-1 text-right">{n(l.vplAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Nota:** os `formatter` e `tickFormatter` do recharts ficam **sem anotação de
tipo** no parâmetro — os tipos da biblioteca entregam `ValueType | undefined`, e
anotar como `number` quebra o `tsc` (aconteceu na Fase 3a).

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add web/components/simuladores/HibridoProjecao.tsx
git commit -m "feat(hibrido): projecao de fluxo de caixa com tabela ano a ano

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Integrar no `SimuladorHibrido`

**Files:**
- Modify: `web/components/simuladores/SimuladorHibrido.tsx`
- Modify: `web/__tests__/hibrido-financeiro-ui.test.tsx`

- [ ] **Step 1: Escrever os testes de integração falhando**

Acrescentar ao fim de `web/__tests__/hibrido-financeiro-ui.test.tsx`:

```tsx
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'
import { montarFinanceiroInput, fisicoParaFinanceiro } from '@/lib/simuladores/hibrido/montar-financeiro'
import { montarHibridoInput, montarPremissas, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { PAINEL, INVERSOR, BATERIA } from './fixtures/hibrido-fixture'

const EQUIP_UI = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

describe('SimuladorHibrido — integração financeira', () => {
  it('sem tarifa, suprime os resultados financeiros e mostra o aviso', () => {
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} />)
    expect(screen.getByTestId('aviso-sem-tarifa')).toBeInTheDocument()
    expect(screen.queryByTestId('ind-vpl')).not.toBeInTheDocument()
    expect(screen.queryByTestId('projecao')).not.toBeInTheDocument()
  })

  it('o CAPEX aparece mesmo sem tarifa (não depende dela)', () => {
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} />)
    expect(screen.getByTestId('capex-investimento-total')).toBeInTheDocument()
  })

  it('com tarifa informada, o VPL exibido bate com o que o motor devolve', async () => {
    const user = userEvent.setup()
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} />)

    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    await user.selectOptions(screen.getByTestId('sel-inversor'), INVERSOR.id)
    await user.click(screen.getByTestId('btn-toggle-avancado'))
    await user.type(screen.getByTestId('av-numModulos'), '16')
    await user.type(screen.getByTestId('fin-tarifaKwh'), '1.22')

    // Esperado calculado pelos MESMOS caminhos que a tela usa.
    const campos = { ...CAMPOS_INICIAIS, painelId: PAINEL.id, inversorId: INVERSOR.id, numModulos: '16' }
    const fisicoRes = calcularHibrido(montarHibridoInput(campos, EQUIP_UI, []), montarPremissas(campos))
    const camposFin = { ...camposFinanceiroIniciais(new Date().getFullYear()), tarifaKwh: '1.22' }
    const esperado = calcularFinanceiro(montarFinanceiroInput(camposFin, fisicoParaFinanceiro(fisicoRes)))

    expect(screen.getByTestId('ind-vpl')).toHaveTextContent(
      esperado.indicadores.vpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
    expect(screen.queryByTestId('aviso-sem-tarifa')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: FAIL — o simulador ainda não tem a parte financeira.

- [ ] **Step 3: Integrar no `SimuladorHibrido.tsx`**

Acrescentar aos imports:

```tsx
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
  type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { HibridoInputsFinanceiro } from './HibridoInputsFinanceiro'
import { HibridoResultadosCapex } from './HibridoResultadosCapex'
import { HibridoResultadosEconomia } from './HibridoResultadosEconomia'
import { HibridoIndicadores } from './HibridoIndicadores'
import { HibridoProjecao } from './HibridoProjecao'
```

Dentro do componente, logo após o `useState` de `biblioteca`, acrescentar:

```tsx
  const [camposFin, setCamposFin] = useState<CamposFinanceiro>(() =>
    camposFinanceiroIniciais(new Date().getFullYear())
  )
```

E, após o `useMemo` de `resultado`, acrescentar:

```tsx
  // Financeiro: deriva do resultado físico, sem recalcular nada na UI.
  const paramsFin = useMemo(
    () => montarFinanceiroInput(camposFin, fisicoParaFinanceiro(resultado)),
    [camposFin, resultado]
  )
  const financeiro = useMemo(() => calcularFinanceiro(paramsFin), [paramsFin])
  const economiaAno1 = useMemo(
    () => calcularEconomiaAno(1, {
      fisico: paramsFin.fisico,
      tarifas: paramsFin.tarifas,
      premissas: paramsFin.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO,
    }),
    [paramsFin]
  )
  const temTarifa = paramsFin.tarifas.tarifaKwh > 0
```

Acrescentar o import de `PREMISSAS_FINANCEIRAS_PADRAO`:

```tsx
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
```

Trocar o texto do subtítulo, que hoje diz que o financeiro vem depois:

```tsx
      <p className="mb-4 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Dimensionamento fotovoltaico, banco de baterias, inversor e análise financeira completa.
      </p>
```

E, ao final da `<div className="space-y-4">`, depois de
`<HibridoResultadosArmazenamento … />`, acrescentar:

```tsx
        <HibridoInputsFinanceiro campos={camposFin} onChange={setCamposFin} />
        <HibridoResultadosCapex capex={financeiro.capex} />

        {!temTarifa ? (
          <div
            className="rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]"
            data-testid="aviso-sem-tarifa"
          >
            Informe a tarifa de energia acima para ver a economia, os indicadores de viabilidade
            e a projeção. Sem tarifa não há economia a calcular.
          </div>
        ) : (
          <>
            <HibridoResultadosEconomia economia={economiaAno1} />
            <HibridoIndicadores indicadores={financeiro.indicadores} />
            <HibridoProjecao projecao={financeiro.projecao} />
          </>
        )}
```

Remover também o selo "EM CONSTRUÇÃO" do cabeçalho (o `<span>` com esse texto),
já que a Task 9 torna o simulador disponível.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: PASS (15 testes).

Depois: `cd web && npx tsc --noEmit && npm run test` → tudo verde.

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/SimuladorHibrido.tsx web/__tests__/hibrido-financeiro-ui.test.tsx
git commit -m "feat(hibrido): integra resultados financeiros na tela do simulador

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Simulador disponível no hub

**Files:**
- Modify: `web/lib/simuladores/registry.ts`
- Modify: `web/__tests__/simuladores-registry.test.ts`

- [ ] **Step 1: Atualizar o teste do registry**

Em `web/__tests__/simuladores-registry.test.ts`, substituir o teste de status
(hoje `it('viabilidade-usina e parcelamento-cartao disponíveis; hibrido-offgrid em construção; demais em_breve', …)`) por:

```ts
  it('viabilidade-usina, parcelamento-cartao e hibrido-offgrid disponíveis; demais em_breve', () => {
    expect(getSimulador('viabilidade-usina')?.status).toBe('disponivel')
    expect(getSimulador('parcelamento-cartao')?.status).toBe('disponivel')
    expect(getSimulador('hibrido-offgrid')?.status).toBe('disponivel')
    const disponiveis = ['viabilidade-usina', 'parcelamento-cartao', 'hibrido-offgrid']
    expect(SIMULADORES.filter(s => !disponiveis.includes(s.slug)).every(s => s.status === 'em_breve')).toBe(true)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- simuladores-registry`
Expected: FAIL — `hibrido-offgrid` ainda é `em_construcao`.

- [ ] **Step 3: Virar o status**

Em `web/lib/simuladores/registry.ts`, na constante `SIMULADORES`, trocar o
`status` do item `hibrido-offgrid` de `'em_construcao'` para `'disponivel'`.

**Não remova** o valor `'em_construcao'` do tipo `SimuladorStatus` nem o
tratamento dele no `SimuladoresHub`: nenhum simulador o usa agora, mas ele volta
a ser útil na próxima feature que nascer incompleta.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- simuladores-registry`
Expected: PASS.

- [ ] **Step 5: Suíte completa e type-check**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: tudo verde.

- [ ] **Step 6: Verificação no navegador**

Sem migration nesta fase. Subir o dev server pela ferramenta de preview e conferir:
- `/simuladores` mostra "Híbrido / Off-grid" como **disponível**
- Sem tarifa: o CAPEX aparece, e no lugar dos indicadores há o aviso
- Informando tarifa 1,22, TUSD 0,36 e disponibilidade 100: economia, indicadores e projeção aparecem
- Mudar o ano de conexão para 2027 reduz a economia do ano 1 (Fio B sobe de 60% para 75%)
- A tabela ano a ano abre e fecha

Se não for possível autenticar, reporte o que ficou pendente em vez de pular.

- [ ] **Step 7: Commit**

```bash
git add web/lib/simuladores/registry.ts web/__tests__/simuladores-registry.test.ts
git commit -m "feat(hibrido): simulador hibrido/offgrid disponivel no hub

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- Módulo `fio-b.ts` com a tabela legal e a derivação → Task 1 ✔
- Ligação dos dois simuladores + teste da viabilidade reescrito → Task 2 ✔
- `CamposFinanceiro`, `camposFinanceiroIniciais` (função), `fisicoParaFinanceiro`, `montarFinanceiroInput` → Task 3 ✔
- Entradas visíveis nos quatro grupos + ano de conexão com mínimo 2023 → Task 4 ✔
- CAPEX e economia do ano 1 → Task 5 ✔
- Indicadores com payback `null` tratado → Task 6 ✔
- Projeção com gráfico + tabela recolhível → Task 7 ✔
- Supressão sem tarifa (CAPEX permanece) + integração → Task 8 ✔
- Registry `disponivel` → Task 9 ✔

**2. Placeholders:** nenhum; todo código está completo.

**3. Consistência de tipos:** `CamposFinanceiro` é definido na Task 3 e usado
nas Tasks 4 e 8. `ParamsFinanceiro` vem de `financeiro.ts` (Fase 2b).
`fisicoParaFinanceiro` devolve `FisicoParaFinanceiro`, que é o que
`calcularFinanceiro` consome. Os `data-testid` dos testes das Tasks 4–8 são
exatamente os emitidos pelos componentes.

**Notas de risco:**
- **Task 2 é a mais delicada:** mexe no default de um simulador em produção. A
  proteção é que os golden values da viabilidade passam o `fioBSchedule`
  explicitamente, e que em 2026 o derivado é idêntico ao fixo. O passo instrui a
  **parar e reportar** se algum golden financeiro falhar, em vez de ajustar o
  esperado — uma falha ali significaria que a derivação não reproduz 2026.
- **Bomba-relógio identificada e desarmada na Task 2 Step 5:**
  `hibrido-economia.test.ts` herdava a rampa do default e afirmava valores que
  dependem dela começar em 60%. Sem a correção, a suíte passaria hoje e quebraria
  em janeiro de 2027, sem ninguém lembrar o porquê. Passa a fixar
  `fioBSchedule(2026, 25)` explicitamente — os testes continuam verificando a
  rampa, mas deixam de depender da data em que rodam.
- `montarFinanceiroInput` usa `new Date().getFullYear()` como fallback do ano de
  conexão em branco. Na prática o campo nunca fica vazio (vem preenchido de
  `camposFinanceiroIniciais`), e os testes sempre passam um ano explícito.
- O teste de integração da Task 8 usa `camposFinanceiroIniciais(new Date().getFullYear())`
  para montar o esperado, igual ao componente — então os dois acompanham a
  virada do ano juntos e o teste não fica falsamente verde nem falso vermelho.
- A economia mensal exibida é `economiaLiquida / 12`: divisão de apresentação,
  não recálculo de domínio.
