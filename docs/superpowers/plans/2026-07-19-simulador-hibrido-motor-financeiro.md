# Simulador Híbrido / Off-grid — Fase 2b: Motor financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor financeiro puro — CAPEX, economia anual com a rampa do Fio B (Lei 14.300), fluxo de 25 anos e indicadores (VPL, TIR, payback, LCOE, ROI).

**Architecture:** Três módulos puros novos em `web/lib/simuladores/hibrido/` (`capex.ts`, `economia.ts`, `financeiro.ts`), mais um refactor que move `npv`/`irr` para `web/lib/simuladores/finance.ts` (compartilhado entre simuladores). `calcularFinanceiro()` recebe os números físicos como entrada simples — não chama `calcularHibrido()` — para manter os dois motores testáveis isoladamente.

**Tech Stack:** TypeScript, Vitest. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-motor-financeiro-design.md` — contém todas as fórmulas, os golden values e a estratégia de teste. Consulte-o em caso de dúvida.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (deve ficar em zero erros)
- Import alias `@/` → `web/`
- Commits em pt-BR, prefixo `feat(hibrido):` / `refactor(simuladores):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**Contexto de fases anteriores:** a Fase 2a entregou o motor físico em
`web/lib/simuladores/hibrido/` (`types.ts`, `premissas.ts`, `cargas.ts`,
`dimensionamento.ts`, `strings.ts`, `baterias.ts`, `inversor.ts`,
`alertas.ts`, `index.ts`) com a fixture `web/__tests__/fixtures/hibrido-fixture.ts`.
Esta fase acrescenta a eles, sem alterar nenhum cálculo físico existente.

**Nota importante sobre golden values:** a rampa do Fio B faz a economia ser
recomposta ano a ano, o que tira a planilha do papel de oráculo para o fluxo de
25 anos. Por isso: CAPEX e economia do ano 1 **sem** rampa usam golden da
planilha; economia dos anos 1 e 2 **com** rampa usa valores calculados à mão no
spec; VPL/TIR do caso real usam asserções de propriedade, **sem golden fixo**.
Não invente um golden de VPL/TIR rodando o código e travando o resultado.

---

## File Structure

- Move: `web/lib/simuladores/viabilidade/finance.ts` → `web/lib/simuladores/finance.ts` (compartilhado)
- Modify: `web/lib/simuladores/viabilidade/engine.ts` (import)
- Modify: `web/__tests__/viabilidade-finance.test.ts` (import)
- Modify: `web/lib/simuladores/hibrido/types.ts` (tipos financeiros)
- Modify: `web/lib/simuladores/hibrido/premissas.ts` (defaults financeiros)
- Modify: `web/__tests__/fixtures/hibrido-fixture.ts` (fixture financeira)
- Create: `web/lib/simuladores/hibrido/capex.ts`
- Create: `web/lib/simuladores/hibrido/economia.ts`
- Create: `web/lib/simuladores/hibrido/financeiro.ts`
- Create: `web/__tests__/hibrido-capex.test.ts`
- Create: `web/__tests__/hibrido-economia.test.ts`
- Create: `web/__tests__/hibrido-financeiro.test.ts`

---

## Task 1: Mover `npv`/`irr` para módulo compartilhado

**Files:**
- Move: `web/lib/simuladores/viabilidade/finance.ts` → `web/lib/simuladores/finance.ts`
- Modify: `web/lib/simuladores/viabilidade/engine.ts:2`
- Modify: `web/__tests__/viabilidade-finance.test.ts:2`

Refactor puro, sem mudança de comportamento. Os testes existentes
(`viabilidade-finance.test.ts` e `viabilidade-engine.test.ts`) são a rede de
segurança.

- [ ] **Step 1: Rodar os testes de viabilidade ANTES, para ter a linha de base**

Run: `cd web && npm run test -- viabilidade`
Expected: PASS. Anote a contagem de testes — ela deve ser idêntica no fim.

- [ ] **Step 2: Mover o arquivo preservando o histórico**

```bash
git mv web/lib/simuladores/viabilidade/finance.ts web/lib/simuladores/finance.ts
```

- [ ] **Step 3: Atualizar o comentário de caminho no topo do arquivo movido**

Em `web/lib/simuladores/finance.ts`, trocar a primeira linha:

```ts
// web/lib/simuladores/viabilidade/finance.ts
```

por:

```ts
// web/lib/simuladores/finance.ts
// Funções financeiras compartilhadas entre os simuladores (viabilidade, híbrido).
```

- [ ] **Step 4: Atualizar o import em `viabilidade/engine.ts`**

Em `web/lib/simuladores/viabilidade/engine.ts`, linha 2, trocar:

```ts
import { irr, npv } from './finance'
```

por:

```ts
import { irr, npv } from '../finance'
```

- [ ] **Step 5: Atualizar o import no teste**

Em `web/__tests__/viabilidade-finance.test.ts`, linha 2, trocar:

```ts
import { npv, irr } from '@/lib/simuladores/viabilidade/finance'
```

por:

```ts
import { npv, irr } from '@/lib/simuladores/finance'
```

- [ ] **Step 6: Verificar que nada mais importa o caminho antigo**

Run: `cd web && grep -rn "viabilidade/finance\|from './finance'" lib __tests__ --include=*.ts`
Expected: nenhum resultado. Se aparecer algum, atualize também.

- [ ] **Step 7: Rodar testes e type-check**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; a suíte inteira passa com a MESMA contagem de antes (o refactor não adiciona nem remove testes).

- [ ] **Step 8: Commit**

```bash
git add web/lib/simuladores/finance.ts web/lib/simuladores/viabilidade/engine.ts web/__tests__/viabilidade-finance.test.ts
git commit -m "refactor(simuladores): move npv/irr para modulo compartilhado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Tipos financeiros, defaults e fixture

**Files:**
- Modify: `web/lib/simuladores/hibrido/types.ts` (acrescentar ao final)
- Modify: `web/lib/simuladores/hibrido/premissas.ts` (acrescentar ao final)
- Modify: `web/__tests__/fixtures/hibrido-fixture.ts` (acrescentar ao final)

Sem teste próprio — validado pelo uso nas Tasks 3–5.

- [ ] **Step 1: Acrescentar os tipos financeiros ao final de `types.ts`**

```ts
// ---------- FINANCEIRO (Fase 2b) ----------

export type PrecosCapex = {
  moduloUnitario: number       // R$ por módulo
  inversorUnitario: number     // R$ por inversor
  bateriaUnitaria: number      // R$ por bateria
  estruturaPorModulo: number   // R$ por módulo
  cabeamentoPorKwp: number     // R$ por kWp
  projetoArt: number           // R$ valor único
  maoDeObraPorKwp: number      // R$ por kWp
  freteImprevistos: number     // R$ valor único
}

export type PremissasFinanceiras = {
  bdi: number                  // fração sobre o custo direto
  margemLucro: number          // fração sobre o PREÇO DE VENDA
  impostos: number             // fração sobre o PREÇO DE VENDA
  tma: number                  // taxa mínima de atratividade a.a.
  inflacaoTarifa: number       // reajuste anual da tarifa
  degradacaoAnual: number      // degradação dos módulos
  omAnual: number              // O&M como fração do investimento
  horizonteAnos: number
  fioBSchedule: number[]       // fração do TUSD Fio B cobrada por ano (Lei 14.300)
}

export type TarifasInput = {
  tarifaKwh: number
  tusdFioBKwh: number
  disponibilidadeKwhMes: number
}

/** Números do motor físico de que o financeiro precisa. */
export type FisicoParaFinanceiro = {
  numModulos: number
  numInversores: number
  numBaterias: number
  potenciaInstaladaKwp: number
  producaoAnualKwh: number
  consumoAnualKwh: number
}

export type ItemCapex = {
  descricao: string
  quantidade: number
  custoUnitario: number
  subtotal: number
}

export type ResultadoCapex = {
  itens: ItemCapex[]
  custoDireto: number
  valorBdi: number
  custoComBdi: number
  valorMargem: number
  valorImpostos: number
  investimentoTotal: number
  investimentoPorKwp: number
}

export type ResultadoEconomiaAno = {
  ano: number
  geracaoKwh: number
  autoconsumoKwh: number
  excedenteKwh: number
  tarifaAno: number
  tusdAno: number
  economiaAutoconsumo: number
  creditoExcedente: number
  custoDisponibilidade: number
  economiaLiquida: number
}

export type LinhaProjecaoFinanceira = {
  ano: number
  geracaoKwh: number
  economiaLiquida: number
  custoOm: number
  fluxoLiquido: number
  fluxoAcumulado: number
  fluxoDescontado: number
  vplAcumulado: number
}

export type IndicadoresFinanceiros = {
  vpl: number
  tir: number
  paybackSimplesAnos: number | null
  paybackDescontadoAnos: number | null
  lcoe: number
  economiaAcumulada: number
  roi: number
  indiceVplInvestimento: number
}

export type ResultadoFinanceiro = {
  capex: ResultadoCapex
  projecao: LinhaProjecaoFinanceira[]
  indicadores: IndicadoresFinanceiros
}
```

- [ ] **Step 2: Acrescentar os defaults ao final de `premissas.ts`**

Primeiro, estender o import de tipos no topo do arquivo para incluir os novos:

```ts
import type {
  Premissas, TecnologiaBateria, ParamsTecnologia,
  PrecosCapex, PremissasFinanceiras,
} from './types'
```

Depois, acrescentar ao final do arquivo:

```ts
// ---------- FINANCEIRO (Fase 2b) ----------

/** Preços de referência do CAPEX. Editáveis por simulação na tela. */
export const PRECOS_CAPEX_PADRAO: PrecosCapex = {
  moduloUnitario: 780,
  inversorUnitario: 11000,
  bateriaUnitaria: 9800,
  estruturaPorModulo: 180,
  cabeamentoPorKwp: 400,
  projetoArt: 2500,
  maoDeObraPorKwp: 250,
  freteImprevistos: 2800,
}

/**
 * Rampa do TUSD Fio B da Lei 14.300: 60% no 1º ano, 75% no 2º, 90% no 3º e
 * integral do 4º em diante. Mesma escala usada no simulador de viabilidade.
 */
export const FIO_B_SCHEDULE_14300: number[] = [0.6, 0.75, 0.9, ...Array<number>(22).fill(1)]

export const PREMISSAS_FINANCEIRAS_PADRAO: PremissasFinanceiras = {
  bdi: 0.15,              // aba Financeiro da planilha (a aba Premissas diz 25%)
  margemLucro: 0.2,       // sobre o preço de venda
  impostos: 0.06,         // Simples/ISS/PIS/COFINS, sobre o preço de venda
  tma: 0.08,
  inflacaoTarifa: 0.08,
  degradacaoAnual: 0.005,
  omAnual: 0.01,
  horizonteAnos: 25,
  fioBSchedule: FIO_B_SCHEDULE_14300,
}
```

- [ ] **Step 3: Acrescentar a fixture financeira ao final de `hibrido-fixture.ts`**

Estender o import de tipos no topo do arquivo:

```ts
import type {
  Carga, ProjetoInput, EquipPainel, EquipInversor, EquipBateria,
  FisicoParaFinanceiro, TarifasInput,
} from '@/lib/simuladores/hibrido/types'
```

E acrescentar ao final:

```ts
/**
 * Saída do motor físico para o projeto de teste (16 módulos, 1 inversor,
 * 2 baterias), usada como entrada do motor financeiro.
 */
export const FISICO: FisicoParaFinanceiro = {
  numModulos: 16,
  numInversores: 1,
  numBaterias: 2,
  potenciaInstaladaKwp: 9.92,
  producaoAnualKwh: 14149.415366185884,
  consumoAnualKwh: 2135.25,
}

/** Tarifas do projeto de teste (aba Projeto da planilha). */
export const TARIFAS: TarifasInput = {
  tarifaKwh: 1.22,
  tusdFioBKwh: 0.36,
  disponibilidadeKwhMes: 100,
}
```

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/types.ts web/lib/simuladores/hibrido/premissas.ts web/__tests__/fixtures/hibrido-fixture.ts
git commit -m "feat(hibrido): tipos, defaults e fixture do motor financeiro

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: CAPEX

**Files:**
- Create: `web/lib/simuladores/hibrido/capex.ts`
- Test: `web/__tests__/hibrido-capex.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-capex.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularCapex } from '@/lib/simuladores/hibrido/capex'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO } from './fixtures/hibrido-fixture'

const base = { fisico: FISICO, precos: PRECOS_CAPEX_PADRAO, premissas: PREMISSAS_FINANCEIRAS_PADRAO }

describe('calcularCapex (golden da planilha)', () => {
  const r = calcularCapex(base)

  it('tem os 8 itens na ordem da planilha', () => {
    expect(r.itens.map((i) => i.descricao)).toEqual([
      'Módulos fotovoltaicos',
      'Inversor / híbrido',
      'Banco de baterias',
      'Estrutura de fixação',
      'Cabeamento, conectores e proteções',
      'Projeto, ART e homologação',
      'Mão de obra / instalação',
      'Frete, deslocamento e imprevistos',
    ])
  })
  it('subtotais de cada item', () => {
    const sub = (d: string) => r.itens.find((i) => i.descricao === d)!.subtotal
    expect(sub('Módulos fotovoltaicos')).toBeCloseTo(12480, 6)
    expect(sub('Inversor / híbrido')).toBeCloseTo(11000, 6)
    expect(sub('Banco de baterias')).toBeCloseTo(19600, 6)
    expect(sub('Estrutura de fixação')).toBeCloseTo(2880, 6)
    expect(sub('Cabeamento, conectores e proteções')).toBeCloseTo(3968, 6)
    expect(sub('Projeto, ART e homologação')).toBeCloseTo(2500, 6)
    expect(sub('Mão de obra / instalação')).toBeCloseTo(2480, 6)
    expect(sub('Frete, deslocamento e imprevistos')).toBeCloseTo(2800, 6)
  })
  it('custo direto, BDI e custo com BDI', () => {
    expect(r.custoDireto).toBeCloseTo(57708, 6)
    expect(r.valorBdi).toBeCloseTo(8656.2, 6)
    expect(r.custoComBdi).toBeCloseTo(66364.2, 6)
  })
  it('investimento total com gross-up de margem e impostos', () => {
    expect(r.investimentoTotal).toBeCloseTo(89681.35135135135, 6)
    expect(r.valorMargem).toBeCloseTo(17936.27027027027, 6)
    expect(r.valorImpostos).toBeCloseTo(5380.881081081081, 6)
  })
  it('investimento específico por kWp', () => {
    expect(r.investimentoPorKwp).toBeCloseTo(9040.458805579772, 6)
  })
  it('margem + impostos somam o investimento menos o custo com BDI', () => {
    expect(r.valorMargem + r.valorImpostos + r.custoComBdi).toBeCloseTo(r.investimentoTotal, 6)
  })
})

describe('bordas', () => {
  it('margem + impostos >= 100% cai para o custo com BDI (guarda da planilha)', () => {
    const r = calcularCapex({ ...base, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, margemLucro: 0.7, impostos: 0.3 } })
    expect(r.investimentoTotal).toBeCloseTo(r.custoComBdi, 6)
  })
  it('potência instalada zero não gera divisão por zero', () => {
    const r = calcularCapex({ ...base, fisico: { ...FISICO, potenciaInstaladaKwp: 0 } })
    expect(r.investimentoPorKwp).toBe(0)
  })
  it('sem equipamentos, restam só os itens de valor fixo', () => {
    const r = calcularCapex({
      ...base,
      fisico: { numModulos: 0, numInversores: 0, numBaterias: 0, potenciaInstaladaKwp: 0, producaoAnualKwh: 0, consumoAnualKwh: 0 },
    })
    expect(r.custoDireto).toBeCloseTo(2500 + 2800, 6)
    expect(Number.isNaN(r.investimentoTotal)).toBe(false)
  })
  it('BDI zero mantém o custo direto', () => {
    const r = calcularCapex({ ...base, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, bdi: 0 } })
    expect(r.valorBdi).toBe(0)
    expect(r.custoComBdi).toBeCloseTo(r.custoDireto, 6)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-capex`
Expected: FAIL — módulo `capex` não existe.

- [ ] **Step 3: Implementar `capex.ts`**

Criar `web/lib/simuladores/hibrido/capex.ts`:

```ts
// web/lib/simuladores/hibrido/capex.ts
// Composição do investimento: itens diretos → BDI → gross-up de margem e
// impostos (que incidem sobre o preço de venda, não sobre o custo).
import type {
  FisicoParaFinanceiro, ItemCapex, PrecosCapex, PremissasFinanceiras, ResultadoCapex,
} from './types'

export type ParamsCapex = {
  fisico: FisicoParaFinanceiro
  precos: PrecosCapex
  premissas: PremissasFinanceiras
}

function item(descricao: string, quantidade: number, custoUnitario: number): ItemCapex {
  return { descricao, quantidade, custoUnitario, subtotal: quantidade * custoUnitario }
}

export function calcularCapex(params: ParamsCapex): ResultadoCapex {
  const { fisico, precos, premissas } = params

  const itens: ItemCapex[] = [
    item('Módulos fotovoltaicos', fisico.numModulos, precos.moduloUnitario),
    item('Inversor / híbrido', fisico.numInversores, precos.inversorUnitario),
    item('Banco de baterias', fisico.numBaterias, precos.bateriaUnitaria),
    item('Estrutura de fixação', fisico.numModulos, precos.estruturaPorModulo),
    item('Cabeamento, conectores e proteções', fisico.potenciaInstaladaKwp, precos.cabeamentoPorKwp),
    item('Projeto, ART e homologação', 1, precos.projetoArt),
    item('Mão de obra / instalação', fisico.potenciaInstaladaKwp, precos.maoDeObraPorKwp),
    item('Frete, deslocamento e imprevistos', 1, precos.freteImprevistos),
  ]

  const custoDireto = itens.reduce((acc, i) => acc + i.subtotal, 0)
  const valorBdi = custoDireto * premissas.bdi
  const custoComBdi = custoDireto + valorBdi

  // Margem e impostos incidem sobre o preço de venda: preço = custo / (1 - m - i).
  const denominador = 1 - premissas.margemLucro - premissas.impostos
  const investimentoTotal = denominador > 0 ? custoComBdi / denominador : custoComBdi

  return {
    itens,
    custoDireto,
    valorBdi,
    custoComBdi,
    valorMargem: investimentoTotal * premissas.margemLucro,
    valorImpostos: investimentoTotal * premissas.impostos,
    investimentoTotal,
    investimentoPorKwp:
      fisico.potenciaInstaladaKwp > 0 ? investimentoTotal / fisico.potenciaInstaladaKwp : 0,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-capex`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/capex.ts web/__tests__/hibrido-capex.test.ts
git commit -m "feat(hibrido): composicao do CAPEX com BDI, margem e impostos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Economia anual com a rampa do Fio B

**Files:**
- Create: `web/lib/simuladores/hibrido/economia.ts`
- Test: `web/__tests__/hibrido-economia.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-economia.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO, TARIFAS } from './fixtures/hibrido-fixture'

const comRampa = { fisico: FISICO, tarifas: TARIFAS, premissas: PREMISSAS_FINANCEIRAS_PADRAO }
const semRampa = {
  ...comRampa,
  premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, fioBSchedule: new Array(25).fill(1) },
}

describe('ano 1 SEM rampa — golden da planilha', () => {
  const r = calcularEconomiaAno(1, semRampa)

  it('separa autoconsumo de excedente', () => {
    expect(r.autoconsumoKwh).toBeCloseTo(2135.25, 6)
    expect(r.excedenteKwh).toBeCloseTo(12014.165366185884, 6)
  })
  it('tarifa e TUSD do ano 1 são os nominais', () => {
    expect(r.tarifaAno).toBeCloseTo(1.22, 9)
    expect(r.tusdAno).toBeCloseTo(0.36, 9)
  })
  it('componentes da economia', () => {
    expect(r.economiaAutoconsumo).toBeCloseTo(2605.005, 6)
    expect(r.creditoExcedente).toBeCloseTo(10332.18221491986, 6)
    expect(r.custoDisponibilidade).toBeCloseTo(1464, 6)
    expect(r.economiaLiquida).toBeCloseTo(11473.18721491986, 6)
  })
})

describe('COM a rampa da Lei 14.300 — valores calculados à mão no spec', () => {
  it('ano 1: Fio B a 60% → TUSD efetivo 0,216', () => {
    const r = calcularEconomiaAno(1, comRampa)
    expect(r.tusdAno).toBeCloseTo(0.216, 9)
    expect(r.creditoExcedente).toBeCloseTo(12062.222027650628, 6)
    expect(r.economiaLiquida).toBeCloseTo(13203.227027650628, 6)
  })
  it('ano 2: Fio B a 75%, tarifa inflacionada em 8%', () => {
    const r = calcularEconomiaAno(2, comRampa)
    expect(r.geracaoKwh).toBeCloseTo(14078.668289354954, 6)
    expect(r.excedenteKwh).toBeCloseTo(11943.418289354954, 6)
    expect(r.tarifaAno).toBeCloseTo(1.3176, 9)
    expect(r.tusdAno).toBeCloseTo(0.2916, 9)
    expect(r.economiaAutoconsumo).toBeCloseTo(2813.4054, 6)
    expect(r.creditoExcedente).toBeCloseTo(12253.947164878183, 6)
    expect(r.custoDisponibilidade).toBeCloseTo(1581.12, 6)
    expect(r.economiaLiquida).toBeCloseTo(13486.232564878183, 6)
  })
  it('ano 4 em diante o Fio B é integral', () => {
    const r = calcularEconomiaAno(4, comRampa)
    expect(r.tusdAno).toBeCloseTo(0.36 * Math.pow(1.08, 3), 9)
  })
  it('a rampa deixa a economia do ano 1 maior que sem rampa', () => {
    expect(calcularEconomiaAno(1, comRampa).economiaLiquida)
      .toBeGreaterThan(calcularEconomiaAno(1, semRampa).economiaLiquida)
  })
})

describe('bordas', () => {
  it('schedule mais curto que o ano usa fator 1', () => {
    const p = { ...comRampa, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, fioBSchedule: [0.6] } }
    const r = calcularEconomiaAno(5, p)
    expect(r.tusdAno).toBeCloseTo(0.36 * Math.pow(1.08, 4), 9)
  })
  it('geração menor que consumo: tudo é autoconsumo, sem excedente', () => {
    const p = { ...semRampa, fisico: { ...FISICO, producaoAnualKwh: 1000, consumoAnualKwh: 5000 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.autoconsumoKwh).toBeCloseTo(1000, 6)
    expect(r.excedenteKwh).toBe(0)
    expect(r.creditoExcedente).toBe(0)
  })
  it('TUSD acima da tarifa zera o crédito de excedente (não fica negativo)', () => {
    const p = { ...semRampa, tarifas: { ...TARIFAS, tusdFioBKwh: 5 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.creditoExcedente).toBe(0)
  })
  it('economia líquida nunca é negativa', () => {
    const p = { ...semRampa, tarifas: { ...TARIFAS, disponibilidadeKwhMes: 100000 } }
    expect(calcularEconomiaAno(1, p).economiaLiquida).toBe(0)
  })
  it('geração zero zera tudo sem NaN', () => {
    const p = { ...semRampa, fisico: { ...FISICO, producaoAnualKwh: 0 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.geracaoKwh).toBe(0)
    expect(r.economiaLiquida).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-economia`
Expected: FAIL — módulo `economia` não existe.

- [ ] **Step 3: Implementar `economia.ts`**

Criar `web/lib/simuladores/hibrido/economia.ts`:

```ts
// web/lib/simuladores/hibrido/economia.ts
// Economia de um ano: autoconsumo compensado, crédito do excedente injetado
// (descontado o TUSD Fio B com a rampa da Lei 14.300) e custo de
// disponibilidade. Recomposta ano a ano — a rampa impede escalar o ano 1.
import type {
  FisicoParaFinanceiro, PremissasFinanceiras, ResultadoEconomiaAno, TarifasInput,
} from './types'

export type ParamsEconomia = {
  fisico: FisicoParaFinanceiro
  tarifas: TarifasInput
  premissas: PremissasFinanceiras
}

/** `ano` é 1-indexado (ano 1 = primeiro ano de operação). */
export function calcularEconomiaAno(ano: number, params: ParamsEconomia): ResultadoEconomiaAno {
  const { fisico, tarifas, premissas } = params
  const expo = ano - 1

  const fatorInflacao = Math.pow(1 + premissas.inflacaoTarifa, expo)
  const geracaoKwh = fisico.producaoAnualKwh * Math.pow(1 - premissas.degradacaoAnual, expo)

  const autoconsumoKwh = Math.min(geracaoKwh, fisico.consumoAnualKwh)
  const excedenteKwh = Math.max(0, geracaoKwh - fisico.consumoAnualKwh)

  const tarifaAno = tarifas.tarifaKwh * fatorInflacao
  const fatorFioB = premissas.fioBSchedule[expo] ?? 1
  const tusdAno = tarifas.tusdFioBKwh * fatorInflacao * fatorFioB

  const economiaAutoconsumo = autoconsumoKwh * tarifaAno
  const creditoExcedente = excedenteKwh * Math.max(0, tarifaAno - tusdAno)
  const custoDisponibilidade = tarifas.disponibilidadeKwhMes * 12 * tarifaAno

  return {
    ano,
    geracaoKwh,
    autoconsumoKwh,
    excedenteKwh,
    tarifaAno,
    tusdAno,
    economiaAutoconsumo,
    creditoExcedente,
    custoDisponibilidade,
    economiaLiquida: Math.max(0, economiaAutoconsumo + creditoExcedente - custoDisponibilidade),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-economia`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/economia.ts web/__tests__/hibrido-economia.test.ts
git commit -m "feat(hibrido): economia anual com rampa do Fio B (Lei 14.300)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Projeção de 25 anos e indicadores

**Files:**
- Create: `web/lib/simuladores/hibrido/financeiro.ts`
- Test: `web/__tests__/hibrido-financeiro.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-financeiro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularFinanceiro, calcularPaybackAnos } from '@/lib/simuladores/hibrido/financeiro'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO, TARIFAS } from './fixtures/hibrido-fixture'
import type { PrecosCapex, PremissasFinanceiras } from '@/lib/simuladores/hibrido/types'

describe('calcularPaybackAnos (interpolação no cruzamento de zero)', () => {
  it('interpola entre o último ano negativo e o seguinte', () => {
    // acumulado: [-1000, -600, -200, 200] com fluxos [−1000, 400, 400, 400]
    expect(calcularPaybackAnos([-1000, -600, -200, 200], [-1000, 400, 400, 400])).toBeCloseTo(2.5, 9)
  })
  it('reproduz o número da planilha (ano 6 → 7)', () => {
    const acum = [-1, -13232.082599384767, 3011.880165328652]
    const fluxo = [-1, 0, 16243.962764713418]
    // cruzamento entre os índices 1 e 2 → 1 + 13232.08/16243.96
    expect(calcularPaybackAnos(acum, fluxo)).toBeCloseTo(1 + 13232.082599384767 / 16243.962764713418, 9)
  })
  it('se paga dentro do primeiro ano (n = 0)', () => {
    expect(calcularPaybackAnos([-100, 100], [-100, 200])).toBeCloseTo(0.5, 9)
  })
  it('nunca cruza zero → null', () => {
    expect(calcularPaybackAnos([-1000, -900, -800], [-1000, 100, 100])).toBeNull()
  })
  it('fluxo seguinte não positivo → null', () => {
    expect(calcularPaybackAnos([-1000, 0], [-1000, 0])).toBeNull()
  })
  it('investimento zero → 0', () => {
    expect(calcularPaybackAnos([0, 100], [0, 100])).toBe(0)
  })
})

describe('LCOE em caso trivial calculável à mão', () => {
  it('investimento 1000, sem O&M, 1000 kWh num ano, TMA 0 → 1,00 R$/kWh', () => {
    const precos: PrecosCapex = {
      moduloUnitario: 0, inversorUnitario: 0, bateriaUnitaria: 0, estruturaPorModulo: 0,
      cabeamentoPorKwp: 0, projetoArt: 1000, maoDeObraPorKwp: 0, freteImprevistos: 0,
    }
    const premissas: PremissasFinanceiras = {
      bdi: 0, margemLucro: 0, impostos: 0, tma: 0, inflacaoTarifa: 0,
      degradacaoAnual: 0, omAnual: 0, horizonteAnos: 1, fioBSchedule: [1],
    }
    const r = calcularFinanceiro({
      fisico: { numModulos: 0, numInversores: 0, numBaterias: 0, potenciaInstaladaKwp: 1, producaoAnualKwh: 1000, consumoAnualKwh: 0 },
      tarifas: TARIFAS, precos, premissas,
    })
    expect(r.capex.investimentoTotal).toBeCloseTo(1000, 6)
    expect(r.indicadores.lcoe).toBeCloseTo(1, 9)
  })
})

describe('projeção do projeto de teste (propriedades — sem golden fixo)', () => {
  const r = calcularFinanceiro({ fisico: FISICO, tarifas: TARIFAS })

  it('usa os defaults quando precos/premissas não são passados', () => {
    expect(r.capex.investimentoTotal).toBeCloseTo(89681.35135135135, 6)
  })
  it('tem horizonte + 1 linhas, começando no ano 0', () => {
    expect(r.projecao).toHaveLength(PREMISSAS_FINANCEIRAS_PADRAO.horizonteAnos + 1)
    expect(r.projecao[0].ano).toBe(0)
    expect(r.projecao[r.projecao.length - 1].ano).toBe(25)
  })
  it('ano 0 é o desembolso do investimento', () => {
    const a0 = r.projecao[0]
    expect(a0.fluxoLiquido).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.fluxoAcumulado).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.vplAcumulado).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.geracaoKwh).toBe(0)
  })
  it('geração cai ano a ano (degradação dos módulos)', () => {
    for (let t = 2; t <= 25; t++) {
      expect(r.projecao[t].geracaoKwh).toBeLessThan(r.projecao[t - 1].geracaoKwh)
    }
  })
  it('economia cresce nos primeiros anos (inflação supera degradação e rampa)', () => {
    expect(r.projecao[2].economiaLiquida).toBeGreaterThan(r.projecao[1].economiaLiquida)
    expect(r.projecao[3].economiaLiquida).toBeGreaterThan(r.projecao[2].economiaLiquida)
  })
  it('acumulados são coerentes com os fluxos', () => {
    for (let t = 1; t <= 25; t++) {
      expect(r.projecao[t].fluxoAcumulado)
        .toBeCloseTo(r.projecao[t - 1].fluxoAcumulado + r.projecao[t].fluxoLiquido, 6)
      expect(r.projecao[t].vplAcumulado)
        .toBeCloseTo(r.projecao[t - 1].vplAcumulado + r.projecao[t].fluxoDescontado, 6)
    }
  })
  it('projeto de teste é viável: VPL positivo e TIR plausível', () => {
    expect(r.indicadores.vpl).toBeGreaterThan(0)
    expect(r.indicadores.tir).toBeGreaterThan(0)
    expect(r.indicadores.tir).toBeLessThan(1)
  })
  it('payback simples é menor que o descontado, ambos dentro do horizonte', () => {
    const s = r.indicadores.paybackSimplesAnos!
    const d = r.indicadores.paybackDescontadoAnos!
    expect(s).toBeGreaterThan(1)
    expect(d).toBeLessThan(25)
    expect(s).toBeLessThan(d)
  })
  it('indicadores derivados são coerentes', () => {
    expect(r.indicadores.vpl).toBeCloseTo(r.projecao[25].vplAcumulado, 6)
    expect(r.indicadores.indiceVplInvestimento)
      .toBeCloseTo(r.indicadores.vpl / r.capex.investimentoTotal, 9)
    expect(r.indicadores.roi).toBeGreaterThan(0)
    expect(r.indicadores.economiaAcumulada)
      .toBeCloseTo(r.projecao.slice(1).reduce((a, l) => a + l.economiaLiquida, 0), 6)
  })
})

describe('bordas', () => {
  it('horizonte zero devolve só o ano 0 sem NaN', () => {
    const r = calcularFinanceiro({
      fisico: FISICO, tarifas: TARIFAS,
      premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, horizonteAnos: 0 },
    })
    expect(r.projecao).toHaveLength(1)
    expect(r.indicadores.paybackSimplesAnos).toBeNull()
    expect(Number.isNaN(r.indicadores.lcoe)).toBe(false)
    expect(r.indicadores.lcoe).toBe(0)
  })
  it('investimento zero não gera divisão por zero nos índices', () => {
    const precos: PrecosCapex = {
      moduloUnitario: 0, inversorUnitario: 0, bateriaUnitaria: 0, estruturaPorModulo: 0,
      cabeamentoPorKwp: 0, projetoArt: 0, maoDeObraPorKwp: 0, freteImprevistos: 0,
    }
    const r = calcularFinanceiro({ fisico: FISICO, tarifas: TARIFAS, precos })
    expect(r.capex.investimentoTotal).toBe(0)
    expect(r.indicadores.roi).toBe(0)
    expect(r.indicadores.indiceVplInvestimento).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-financeiro`
Expected: FAIL — módulo `financeiro` não existe.

- [ ] **Step 3: Implementar `financeiro.ts`**

Criar `web/lib/simuladores/hibrido/financeiro.ts`:

```ts
// web/lib/simuladores/hibrido/financeiro.ts
// Projeção de fluxo de caixa e indicadores de viabilidade.
// Não chama o motor físico: recebe os números físicos como entrada, para que
// os dois motores permaneçam testáveis isoladamente.
import { irr } from '../finance'
import { calcularCapex } from './capex'
import { calcularEconomiaAno } from './economia'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from './premissas'
import type {
  FisicoParaFinanceiro, IndicadoresFinanceiros, LinhaProjecaoFinanceira,
  PrecosCapex, PremissasFinanceiras, ResultadoFinanceiro, TarifasInput,
} from './types'

export type ParamsFinanceiro = {
  fisico: FisicoParaFinanceiro
  tarifas: TarifasInput
  precos?: PrecosCapex
  premissas?: PremissasFinanceiras
}

/**
 * Payback por interpolação no cruzamento de zero.
 * `acumulado[n]` e `fluxo[n]` são séries alinhadas por índice, onde o índice 0
 * é o ano 0 (desembolso). Retorna `null` quando não há cruzamento no horizonte
 * ou quando o fluxo do ano seguinte não é positivo.
 */
export function calcularPaybackAnos(acumulado: number[], fluxo: number[]): number | null {
  if (acumulado.length === 0) return null
  if (acumulado[0] >= 0) return 0
  for (let n = 0; n < acumulado.length - 1; n++) {
    if (acumulado[n] < 0 && acumulado[n + 1] >= 0) {
      const proximo = fluxo[n + 1]
      if (proximo <= 0) return null
      return n + Math.abs(acumulado[n]) / proximo
    }
  }
  return null
}

export function calcularFinanceiro(params: ParamsFinanceiro): ResultadoFinanceiro {
  const precos = params.precos ?? PRECOS_CAPEX_PADRAO
  const premissas = params.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO
  const capex = calcularCapex({ fisico: params.fisico, precos, premissas })
  const investimento = capex.investimentoTotal

  const projecao: LinhaProjecaoFinanceira[] = [{
    ano: 0,
    geracaoKwh: 0,
    economiaLiquida: 0,
    custoOm: 0,
    fluxoLiquido: -investimento,
    fluxoAcumulado: -investimento,
    fluxoDescontado: -investimento,
    vplAcumulado: -investimento,
  }]

  let acumulado = -investimento
  let vplAcumulado = -investimento
  let somaOmDescontado = 0
  let somaGeracaoDescontada = 0
  let economiaAcumulada = 0

  for (let t = 1; t <= premissas.horizonteAnos; t++) {
    const econ = calcularEconomiaAno(t, { fisico: params.fisico, tarifas: params.tarifas, premissas })
    const custoOm = premissas.omAnual * investimento * Math.pow(1 + premissas.inflacaoTarifa, t - 1)
    const fluxoLiquido = econ.economiaLiquida - custoOm
    const fatorDesconto = Math.pow(1 + premissas.tma, t)
    const fluxoDescontado = fluxoLiquido / fatorDesconto

    acumulado += fluxoLiquido
    vplAcumulado += fluxoDescontado
    somaOmDescontado += custoOm / fatorDesconto
    somaGeracaoDescontada += econ.geracaoKwh / fatorDesconto
    economiaAcumulada += econ.economiaLiquida

    projecao.push({
      ano: t,
      geracaoKwh: econ.geracaoKwh,
      economiaLiquida: econ.economiaLiquida,
      custoOm,
      fluxoLiquido,
      fluxoAcumulado: acumulado,
      fluxoDescontado,
      vplAcumulado,
    })
  }

  const fluxos = projecao.map((l) => l.fluxoLiquido)
  const acumulados = projecao.map((l) => l.fluxoAcumulado)
  const descontados = projecao.map((l) => l.fluxoDescontado)
  const vplAcumulados = projecao.map((l) => l.vplAcumulado)

  const indicadores: IndicadoresFinanceiros = {
    vpl: vplAcumulado,
    tir: fluxos.length > 1 ? irr(fluxos) : 0,
    paybackSimplesAnos: calcularPaybackAnos(acumulados, fluxos),
    paybackDescontadoAnos: calcularPaybackAnos(vplAcumulados, descontados),
    lcoe: somaGeracaoDescontada > 0 ? (investimento + somaOmDescontado) / somaGeracaoDescontada : 0,
    economiaAcumulada,
    roi: investimento > 0 ? fluxos.slice(1).reduce((a, b) => a + b, 0) / investimento : 0,
    indiceVplInvestimento: investimento > 0 ? vplAcumulado / investimento : 0,
  }

  return { capex, projecao, indicadores }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-financeiro`
Expected: PASS.

- [ ] **Step 5: Suíte completa e type-check**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; toda a suíte passa.

- [ ] **Step 6: Commit**

```bash
git add web/lib/simuladores/hibrido/financeiro.ts web/__tests__/hibrido-financeiro.test.ts
git commit -m "feat(hibrido): projecao de 25 anos e indicadores (VPL, TIR, payback, LCOE)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- Refactor `npv`/`irr` compartilhado → Task 1 ✔
- Tipos, `PRECOS_CAPEX_PADRAO`, `PREMISSAS_FINANCEIRAS_PADRAO`, `FIO_B_SCHEDULE_14300` → Task 2 ✔
- CAPEX (8 itens, BDI, gross-up, guarda do denominador) → Task 3 ✔
- Economia anual com rampa, todos os componentes → Task 4 ✔
- Projeção 25 anos, VPL/TIR/payback/LCOE/ROI/índice → Task 5 ✔
- Estratégia de teste do spec respeitada: golden da planilha só em CAPEX e ano 1 sem rampa (Tasks 3–4); valores calculados à mão para a rampa (Task 4); fluxo sintético para payback e LCOE (Task 5); propriedades para o caso real (Task 5). **Nenhum golden fixo de VPL/TIR** ✔
- "Nunca lança exceção" coberto pelos testes de borda em cada task ✔

**2. Placeholders:** nenhum; todo código está completo e executável.

**3. Consistência de tipos:** os nomes dos campos em `types.ts` (Task 2) são
exatamente os usados em `capex.ts`, `economia.ts`, `financeiro.ts` e nos testes.
`ParamsCapex`/`ParamsEconomia`/`ParamsFinanceiro` são definidos no módulo que os
consome. `calcularPaybackAnos` é exportado para ser testado diretamente.

**Notas de risco:**
- `FIO_B_SCHEDULE_14300` é um array exportado e compartilhado por referência via
  `PREMISSAS_FINANCEIRAS_PADRAO`. O motor só lê. Se a Fase 3 permitir editar o
  schedule na tela, copie o array antes (`[...schedule]`) — o simulador de
  viabilidade já faz isso em `montar-input.ts:67`.
- O teste "reproduz o número da planilha (ano 6 → 7)" usa índices 1 e 2 de um
  array reduzido, não os anos 6 e 7 reais; ele valida a **fórmula** de
  interpolação contra o número da planilha, não a projeção inteira. Isso é
  proposital — a projeção com rampa não tem oráculo externo.
- `calcularPaybackAnos` recebe séries alinhadas por índice; ao usá-la para o
  payback descontado, passe `vplAcumulados` **e** `descontados` (não os fluxos
  nominais), senão a interpolação mistura bases.
