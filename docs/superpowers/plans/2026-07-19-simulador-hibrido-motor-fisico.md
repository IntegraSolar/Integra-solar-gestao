# Simulador Híbrido / Off-grid — Fase 2a: Motor de cálculo físico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor de cálculo puro que replica a engenharia da planilha (cargas, dimensionamento FV, strings, baterias, inversor, alertas), validado por golden values.

**Architecture:** Funções puras em `web/lib/simuladores/hibrido/`, sem I/O e sem `'use server'`, espelhando `web/lib/simuladores/viabilidade/engine.ts`. Cada módulo tem uma responsabilidade e é testável isoladamente; `index.ts` orquestra. Premissas são constantes passadas como parâmetro com default, permitindo override por simulação na Fase 3.

**Tech Stack:** TypeScript, Vitest. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-motor-fisico-design.md` — contém todas as fórmulas e os golden values. Consulte-o em caso de dúvida.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (deve ficar em zero erros)
- Import alias `@/` → `web/`
- Commits em pt-BR, prefixo `feat(hibrido):` / `test(hibrido):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**Refinamento em relação ao spec:** o spec cita um único arquivo de teste
`web/__tests__/hibrido-motor.test.ts`. Este plano usa **um arquivo de teste por
módulo** (arquivos focados, mais fáceis de manter), reservando
`hibrido-motor.test.ts` para o teste de integração do orquestrador. A cobertura
exigida pelo spec é idêntica.

---

## File Structure

Todos os caminhos abaixo são relativos à raiz do repositório.

**Motor** (`web/lib/simuladores/hibrido/`):
- `types.ts` — todos os tipos compartilhados (Premissas, Carga, ProjetoInput, HibridoInput, Alerta, resultados)
- `premissas.ts` — `PREMISSAS_PADRAO` e `TECNOLOGIAS_BATERIA_PARAMS`
- `cargas.ts` — agregação da lista de cargas + curva 24h
- `dimensionamento.ts` — PR, fator térmico, produção, oversizing
- `strings.ts` — tensões extremas e limites do arranjo
- `baterias.ts` — dimensionamento do banco
- `inversor.ts` — requisitos e compatibilidade
- `alertas.ts` — verificações normativas
- `index.ts` — `calcularHibrido()`

**Testes** (`web/__tests__/`):
- `fixtures/hibrido-fixture.ts` — projeto de teste da planilha (compartilhado)
- `hibrido-premissas.test.ts`, `hibrido-cargas.test.ts`, `hibrido-dimensionamento.test.ts`, `hibrido-strings.test.ts`, `hibrido-baterias.test.ts`, `hibrido-inversor.test.ts`, `hibrido-alertas.test.ts`, `hibrido-motor.test.ts`

---

## Task 1: Tipos e premissas

**Files:**
- Create: `web/lib/simuladores/hibrido/types.ts`
- Create: `web/lib/simuladores/hibrido/premissas.ts`
- Test: `web/__tests__/hibrido-premissas.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-premissas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PREMISSAS_PADRAO, TECNOLOGIAS_BATERIA_PARAMS } from '@/lib/simuladores/hibrido/premissas'

describe('PREMISSAS_PADRAO', () => {
  it('traz os fatores de perda da planilha', () => {
    expect(PREMISSAS_PADRAO.soiling).toBe(0.03)
    expect(PREMISSAS_PADRAO.mismatch).toBe(0.02)
    expect(PREMISSAS_PADRAO.cabeamentoCC).toBe(0.015)
    expect(PREMISSAS_PADRAO.cabeamentoCA).toBe(0.01)
    expect(PREMISSAS_PADRAO.lid).toBe(0.015)
    expect(PREMISSAS_PADRAO.tolerancia).toBe(0.01)
    expect(PREMISSAS_PADRAO.indisponibilidade).toBe(0.02)
    expect(PREMISSAS_PADRAO.eficienciaInversor).toBe(0.975)
  })
  it('traz os parâmetros térmicos e operacionais', () => {
    expect(PREMISSAS_PADRAO.noctPadrao).toBe(45)
    expect(PREMISSAS_PADRAO.coefPmpPadrao).toBe(-0.0035)
    expect(PREMISSAS_PADRAO.coefVocPadrao).toBe(-0.003)
    expect(PREMISSAS_PADRAO.tempRef).toBe(25)
    expect(PREMISSAS_PADRAO.gNoct).toBe(800)
    expect(PREMISSAS_PADRAO.gProjeto).toBe(1000)
    expect(PREMISSAS_PADRAO.diasAutonomia).toBe(2)
    expect(PREMISSAS_PADRAO.socMin).toBe(0.2)
    expect(PREMISSAS_PADRAO.socMax).toBe(1)
    expect(PREMISSAS_PADRAO.eficienciaCarregador).toBe(0.98)
  })
  it('traz os parâmetros de arranjo e inversor', () => {
    expect(PREMISSAS_PADRAO.dcAcAlvo).toBe(1.15)
    expect(PREMISSAS_PADRAO.dcAcMax).toBe(1.35)
    expect(PREMISSAS_PADRAO.dcAcMin).toBe(1)
    expect(PREMISSAS_PADRAO.simultaneidade).toBe(0.7)
    expect(PREMISSAS_PADRAO.margemInversor).toBe(0.25)
    expect(PREMISSAS_PADRAO.fatorCorrenteIsc).toBe(1.25)
  })
})

describe('TECNOLOGIAS_BATERIA_PARAMS', () => {
  it('cobre as 5 tecnologias com DOD/eficiência/ciclos da planilha', () => {
    expect(TECNOLOGIAS_BATERIA_PARAMS['LiFePO4']).toEqual({ dod: 0.9, eficiencia: 0.95, ciclos: 6000, cRate: 1 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Lítio NMC']).toEqual({ dod: 0.85, eficiencia: 0.94, ciclos: 4000, cRate: 1 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Chumbo-ácido']).toEqual({ dod: 0.5, eficiencia: 0.8, ciclos: 800, cRate: 0.2 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Gel']).toEqual({ dod: 0.5, eficiencia: 0.8, ciclos: 1200, cRate: 0.2 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['AGM']).toEqual({ dod: 0.5, eficiencia: 0.85, ciclos: 1000, cRate: 0.3 })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-premissas`
Expected: FAIL — módulo `@/lib/simuladores/hibrido/premissas` não existe.

- [ ] **Step 3: Criar `types.ts`**

Criar `web/lib/simuladores/hibrido/types.ts`:

```ts
// web/lib/simuladores/hibrido/types.ts
// Tipos compartilhados do motor de cálculo do simulador Híbrido / Off-grid.
import type { EquipPainel, EquipInversor, EquipBateria } from '@/lib/simuladores/equipamentos/schemas'

export type { EquipPainel, EquipInversor, EquipBateria }

export type TecnologiaBateria = 'LiFePO4' | 'Lítio NMC' | 'Chumbo-ácido' | 'Gel' | 'AGM'

export type ParamsTecnologia = {
  dod: number          // fração (0.9 = 90%)
  eficiencia: number   // fração round-trip
  ciclos: number
  cRate: number
}

export type Premissas = {
  // Fatores de perda (frações)
  soiling: number
  mismatch: number
  cabeamentoCC: number
  cabeamentoCA: number
  lid: number
  tolerancia: number
  indisponibilidade: number
  eficienciaInversor: number
  // Parâmetros térmicos
  noctPadrao: number       // °C
  coefPmpPadrao: number    // fração por °C
  coefVocPadrao: number    // fração por °C
  tempRef: number          // °C (STC)
  gNoct: number            // W/m²
  gProjeto: number         // W/m²
  // Operacionais
  diasAutonomia: number
  socMin: number           // fração
  socMax: number           // fração
  eficienciaCarregador: number
  reservaTecnica: number
  // Arranjo / inversor
  dcAcAlvo: number
  dcAcMax: number
  dcAcMin: number
  simultaneidade: number
  margemInversor: number
  fatorCorrenteIsc: number
}

/** Horários em horas decimais: 19.5 = 19:30. */
export type Carga = {
  nome: string
  categoria?: string
  quantidade: number
  potenciaUnitW: number
  potenciaPartidaW: number
  tensaoV: number
  fatorPotencia: number
  horasDia: number
  diasSemana: number
  horaInicio: number
  horaFim: number
  prioridade?: string
  critica: boolean
}

export type ProjetoInput = {
  hspMensal: number[]   // 12 valores, kWh/m²·dia
  diasMes: number[]     // 12 valores
  tempMediaC: number
  tempMaxC: number
  tempMinC: number
  perdaSombreamento: number
  perdaOrientacao: number
  criterioGeracao: 'mes_critico' | 'media_anual'
}

export type HibridoInput = {
  projeto: ProjetoInput
  cargas: Carga[]
  painel: EquipPainel | null
  inversor: EquipInversor | null
  bateria: EquipBateria | null
  numModulos?: number
  modulosPorString?: number
  numStrings?: number
  tensaoBancoV?: number
  diasAutonomia?: number
  baseEnergia?: 'total' | 'criticas'
  tipoSistema?: 'Híbrido' | 'Off-grid' | 'On-grid'
}

export type SeveridadeAlerta = 'erro' | 'aviso' | 'ok'

export type CodigoAlerta =
  | 'SOBRETENSAO' | 'SUBTENSAO_MPPT' | 'CORRENTE_MPPT'
  | 'OVERSIZING_ALTO' | 'SUBDIMENSIONADO_FV' | 'POT_FV_EXCEDE'
  | 'CONFIG_DIVERGE' | 'GERACAO_INSUFICIENTE'
  | 'POTENCIA_CONTINUA' | 'SURGE_INSUFICIENTE'
  | 'TENSAO_BANCO' | 'CRATE_EXCEDIDO' | 'AUTONOMIA_ABAIXO'
  | 'TIPO_INVERSOR' | 'DADOS_INSUFICIENTES'

export type Alerta = {
  codigo: CodigoAlerta
  severidade: SeveridadeAlerta
  mensagem: string
  valor?: number
  limite?: number
}

export type ResultadoCargas = {
  consumoDiarioWh: number
  consumoDiarioKwh: number
  consumoMensalKwh: number
  consumoAnualKwh: number
  consumoDiarioCriticoWh: number
  consumoDiarioCriticoKwh: number
  potenciaConectadaW: number
  potenciaSimultaneaW: number
  potenciaPartidaW: number
  curva24h: number[]
  picoDemandaW: number
}

export type ResultadoDimensionamento = {
  prBase: number
  prEfetivo: number
  tempCelulaC: number
  fatorTemperatura: number
  prTotal: number
  hspMediaAnual: number
  hspMesCritico: number
  mesCriticoIndice: number
  hspDimensionamento: number
  energiaPorModuloKwhDia: number
  numModulosRecomendado: number
  numModulos: number
  potenciaInstaladaKwp: number
  areaTotalM2: number
  producaoDiariaKwh: number
  producaoMensalKwh: number[]
  producaoAnualKwh: number
  oversizingDcAc: number
}

export type ResultadoStrings = {
  vocTminV: number
  vmpTmaxV: number
  maxModulosPorString: number
  minModulosPorString: number
  modulosPorString: number
  numStrings: number
  tensaoStringVocTminV: number
  tensaoStringVmpTmaxV: number
  correnteStringIscA: number
  correnteProjetoA: number
  correntePorMpptA: number
  modulosConfigurados: number
}

export type ResultadoBaterias = {
  tensaoBancoV: number
  dodNominal: number
  socMin: number
  eficienciaRoundTrip: number
  energiaBateriaKwh: number
  dodUtil: number
  etaSistema: number
  energiaDiariaConsideradaKwh: number
  energiaUtilNecessariaKwh: number
  energiaNominalBancoKwh: number
  capacidadeNominalAh: number
  bateriasSerie: number
  stringsParalelo: number
  numBaterias: number
  energiaInstaladaKwh: number
  capacidadeBancoAh: number
  energiaUtilRealKwh: number
  autonomiaRealDias: number
  correnteMaxDescargaA: number
  correnteContinuaA: number
  potenciaMaxDescargaKw: number
  cRateDescarga: number
  tempoRecargaH: number
  vidaUtilAnos: number
}

export type ResultadoInversor = {
  potenciaCaMinimaW: number
  folgaPotenciaW: number
  utilizacaoContinua: number
  relacaoSurgePartida: number
  usoEntradaFv: number
  numInversoresParalelo: number
  potenciaCaTotalW: number
}

export type ResultadoHibrido = {
  cargas: ResultadoCargas
  dimensionamento: ResultadoDimensionamento
  strings: ResultadoStrings
  baterias: ResultadoBaterias
  inversor: ResultadoInversor
  alertas: Alerta[]
}
```

- [ ] **Step 4: Criar `premissas.ts`**

Criar `web/lib/simuladores/hibrido/premissas.ts`:

```ts
// web/lib/simuladores/hibrido/premissas.ts
// Constantes de engenharia da aba "Premissas" da planilha de referência.
// Refs.: ABNT NBR 16690 / 16274 / 5410, PRODIST Mód.3, IEC 61724, NREL PVWatts.
import type { Premissas, TecnologiaBateria, ParamsTecnologia } from './types'

export const PREMISSAS_PADRAO: Premissas = {
  // Fatores de perda do sistema (Performance Ratio)
  soiling: 0.03,             // poeira/acúmulo; típico 2–5% (IEC 61724)
  mismatch: 0.02,            // descasamento entre módulos de uma string
  cabeamentoCC: 0.015,       // queda ôhmica no lado CC (dimensionar ≤1,5%)
  cabeamentoCA: 0.01,        // queda ôhmica no lado CA (NBR 5410)
  lid: 0.015,                // Light Induced Degradation (1º ano)
  tolerancia: 0.01,          // tolerância de fabricação do módulo
  indisponibilidade: 0.02,   // manutenção/falhas do sistema
  eficienciaInversor: 0.975, // sobrescrito pelo inversor selecionado, se houver

  // Parâmetros térmicos (modelo NOCT)
  noctPadrao: 45,            // °C, usado se o modelo não informar NOCT (40–48 °C)
  coefPmpPadrao: -0.0035,    // fração/°C; monocristalino ≈ -0,30 a -0,40 %/°C
  coefVocPadrao: -0.003,     // fração/°C
  tempRef: 25,               // °C — Standard Test Conditions
  gNoct: 800,                // W/m² — condição de ensaio NOCT
  gProjeto: 1000,            // W/m² — irradiância de referência

  // Operacionais (bateria/sistema)
  diasAutonomia: 2,          // off-grid típico 2–3 dias
  socMin: 0.2,
  socMax: 1,
  eficienciaCarregador: 0.98, // controlador de carga solar / MPPT
  reservaTecnica: 0.1,

  // Dimensionamento do inversor / oversizing
  dcAcAlvo: 1.15,            // típico 1,10–1,30 (clima BR)
  dcAcMax: 1.35,
  dcAcMin: 1,
  simultaneidade: 0.7,       // fração das cargas ligadas ao mesmo tempo
  margemInversor: 0.25,      // folga sobre potência contínua
  fatorCorrenteIsc: 1.25,    // 1,25×Isc p/ proteções (NBR 16690 / NEC 690.8)
}

/** Fallbacks por tecnologia quando a bateria cadastrada não informa o campo. */
export const TECNOLOGIAS_BATERIA_PARAMS: Record<TecnologiaBateria, ParamsTecnologia> = {
  'LiFePO4':      { dod: 0.9,  eficiencia: 0.95, ciclos: 6000, cRate: 1 },
  'Lítio NMC':    { dod: 0.85, eficiencia: 0.94, ciclos: 4000, cRate: 1 },
  'Chumbo-ácido': { dod: 0.5,  eficiencia: 0.8,  ciclos: 800,  cRate: 0.2 },
  'Gel':          { dod: 0.5,  eficiencia: 0.8,  ciclos: 1200, cRate: 0.2 },
  'AGM':          { dod: 0.5,  eficiencia: 0.85, ciclos: 1000, cRate: 0.3 },
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-premissas`
Expected: PASS (3 + 1 testes).

Depois: `cd web && npx tsc --noEmit` → zero erros.

- [ ] **Step 6: Commit**

```bash
git add web/lib/simuladores/hibrido/types.ts web/lib/simuladores/hibrido/premissas.ts web/__tests__/hibrido-premissas.test.ts
git commit -m "feat(hibrido): tipos e premissas de engenharia do motor de calculo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Fixture de teste compartilhada

**Files:**
- Create: `web/__tests__/fixtures/hibrido-fixture.ts`

Esta fixture reproduz o projeto de teste da planilha e é usada por todos os testes seguintes. Não tem teste próprio — é validada pelo uso nas Tasks 3–9.

- [ ] **Step 1: Criar a fixture**

Criar `web/__tests__/fixtures/hibrido-fixture.ts`:

```ts
// Projeto de teste da planilha de referência (Palmas/TO).
// Fonte dos golden values dos testes do motor híbrido/off-grid.
import type { Carga, ProjetoInput, EquipPainel, EquipInversor, EquipBateria } from '@/lib/simuladores/hibrido/types'

export const PROJETO: ProjetoInput = {
  hspMensal: [4.75, 4.71, 4.70, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78],
  diasMes: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  tempMediaC: 27,
  tempMaxC: 38,
  tempMinC: 22,
  perdaSombreamento: 0.03,
  perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
}

export const PAINEL: EquipPainel = {
  id: 'painel-teste',
  fabricante: 'OSDA',
  modelo: 'MHDRZ',
  potenciaWp: 620,
  voc: 49.08,
  vmp: 40.74,
  isc: 16.08,
  imp: 15.22,
  areaM2: 2.7,
  coefPmp: -0.0029,
  coefVoc: -0.0025,
  noct: 45,
  eficiencia: 23,
  pesoKg: 32.4,
  garantiaAnos: 15,
}

export const INVERSOR: EquipInversor = {
  id: 'inversor-teste',
  fabricante: 'DEYE',
  modelo: 'SUN 8K (EU)',
  tipo: 'Híbrido',
  potCaNomW: 8000,
  mpptMinV: 125,
  mpptMaxV: 425,
  tensaoCcMaxV: 500,
  numMppt: 2,
  corrMaxMpptA: 22,
  potFvMaxWp: 10400,
  potSurgeW: 16000,
  tensaoCcBatV: 48,
  eficiencia: 97,
  backup: true,
  paralelismo: 1,
}

export const BATERIA: EquipBateria = {
  id: 'bateria-teste',
  fabricante: 'ZTRON',
  modelo: 'ZTS48150P',
  tecnologia: 'Lítio NMC',
  tensaoV: 48,
  capacidadeAh: 150,
  energiaKwh: 7.2,
  corrMaxA: 100,
  corrRecomA: 75,
  dod: 90,
  socMin: 10,
  ciclos: 6000,
  eficiencia: 94,
  garantiaAnos: 5,
}

/** TV 18–22h, chuveiro 19:00–19:30, 20 lâmpadas 18h–06h (atravessa a meia-noite). */
export const CARGAS: Carga[] = [
  {
    nome: 'tv 42"', categoria: 'Eletrônico', quantidade: 1,
    potenciaUnitW: 55, potenciaPartidaW: 55, tensaoV: 220, fatorPotencia: 0.9,
    horasDia: 4, diasSemana: 7, horaInicio: 18, horaFim: 22,
    prioridade: 'Média', critica: false,
  },
  {
    nome: 'Chuveiro Elétrico', categoria: 'Aquecimento', quantidade: 1,
    potenciaUnitW: 5500, potenciaPartidaW: 5500, tensaoV: 220, fatorPotencia: 1,
    horasDia: 0.5, diasSemana: 7, horaInicio: 19, horaFim: 19.5,
    prioridade: 'Média', critica: false,
  },
  {
    nome: 'Lampada de LED', categoria: 'Iluminação', quantidade: 20,
    potenciaUnitW: 12, potenciaPartidaW: 12, tensaoV: 220, fatorPotencia: 0.92,
    horasDia: 12, diasSemana: 7, horaInicio: 18, horaFim: 6,
    prioridade: 'Alta', critica: true,
  },
]
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/fixtures/hibrido-fixture.ts
git commit -m "test(hibrido): fixture do projeto de teste da planilha

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Módulo de cargas (com curva 24h corrigida)

**Files:**
- Create: `web/lib/simuladores/hibrido/cargas.ts`
- Test: `web/__tests__/hibrido-cargas.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-cargas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularCargas, correnteDaCarga } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { CARGAS } from './fixtures/hibrido-fixture'
import type { Carga } from '@/lib/simuladores/hibrido/types'

describe('calcularCargas (golden da planilha)', () => {
  const r = calcularCargas(CARGAS, PREMISSAS_PADRAO)

  it('consumo diário/mensal/anual', () => {
    expect(r.consumoDiarioWh).toBeCloseTo(5850, 6)
    expect(r.consumoDiarioKwh).toBeCloseTo(5.85, 6)
    expect(r.consumoMensalKwh).toBeCloseTo(175.5, 6)
    expect(r.consumoAnualKwh).toBeCloseTo(2135.25, 6)
  })
  it('consumo das cargas críticas (só as lâmpadas)', () => {
    expect(r.consumoDiarioCriticoWh).toBeCloseTo(2880, 6)
    expect(r.consumoDiarioCriticoKwh).toBeCloseTo(2.88, 6)
  })
  it('potências conectada, simultânea e de partida', () => {
    expect(r.potenciaConectadaW).toBeCloseTo(5795, 6)
    expect(r.potenciaSimultaneaW).toBeCloseTo(4056.4999999999995, 6)
    expect(r.potenciaPartidaW).toBeCloseTo(5795, 6)
  })
})

describe('curva 24h (corrige defeito da planilha)', () => {
  // A planilha tinha 240 W fixos nas 24 horas (sem fórmula). Aqui a curva é
  // calculada de verdade: às 19h coincidem lâmpadas (240) + TV (55) + chuveiro (5500).
  const r = calcularCargas(CARGAS, PREMISSAS_PADRAO)

  it('tem 24 posições', () => {
    expect(r.curva24h).toHaveLength(24)
  })
  it('pico real é 5795 W às 19h, não os 240 W da planilha', () => {
    expect(r.curva24h[19]).toBeCloseTo(5795, 6)
    expect(r.picoDemandaW).toBeCloseTo(5795, 6)
  })
  it('às 18h: lâmpadas + TV, sem chuveiro', () => {
    expect(r.curva24h[18]).toBeCloseTo(295, 6)
  })
  it('lâmpadas atravessam a meia-noite: ativas às 23h e às 0h', () => {
    expect(r.curva24h[23]).toBeCloseTo(240, 6)
    expect(r.curva24h[0]).toBeCloseTo(240, 6)
  })
  it('às 6h as lâmpadas já desligaram (intervalo é fechado no fim)', () => {
    expect(r.curva24h[6]).toBeCloseTo(0, 6)
  })
  it('às 12h não há carga ativa', () => {
    expect(r.curva24h[12]).toBeCloseTo(0, 6)
  })
})

describe('robustez', () => {
  it('lista vazia zera tudo e devolve curva de 24 zeros', () => {
    const r = calcularCargas([], PREMISSAS_PADRAO)
    expect(r.consumoDiarioWh).toBe(0)
    expect(r.potenciaConectadaW).toBe(0)
    expect(r.picoDemandaW).toBe(0)
    expect(r.curva24h).toEqual(new Array(24).fill(0))
  })
  it('carga com horaFim igual a horaInicio é inativa (intervalo nulo)', () => {
    const c: Carga = { ...CARGAS[0], horaInicio: 10, horaFim: 10 }
    const r = calcularCargas([c], PREMISSAS_PADRAO)
    expect(r.picoDemandaW).toBe(0)
  })
})

describe('correnteDaCarga', () => {
  it('I = qtd × P / (V × FP)', () => {
    expect(correnteDaCarga(CARGAS[0])).toBeCloseTo(0.2777777777777778, 9)
    expect(correnteDaCarga(CARGAS[1])).toBeCloseTo(25, 9)
    expect(correnteDaCarga(CARGAS[2])).toBeCloseTo(1.1857707509881423, 9)
  })
  it('guarda divisão por zero', () => {
    expect(correnteDaCarga({ ...CARGAS[0], tensaoV: 0 })).toBe(0)
    expect(correnteDaCarga({ ...CARGAS[0], fatorPotencia: 0 })).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas`
Expected: FAIL — módulo `cargas` não existe.

- [ ] **Step 3: Implementar `cargas.ts`**

Criar `web/lib/simuladores/hibrido/cargas.ts`:

```ts
// web/lib/simuladores/hibrido/cargas.ts
// Agregação da lista de cargas e curva de demanda de 24 horas.
import type { Carga, Premissas, ResultadoCargas } from './types'

/** Corrente da carga: I = qtd × P / (V × FP). Retorna 0 se o denominador for 0. */
export function correnteDaCarga(c: Carga): number {
  const den = c.tensaoV * c.fatorPotencia
  if (den === 0) return 0
  return (c.quantidade * c.potenciaUnitW) / den
}

/** Há sobreposição entre os intervalos [a1,a2) e [b1,b2)? */
function sobrepoe(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2
}

/**
 * A carga está ativa durante a hora cheia [h, h+1)?
 * Intervalos com fim <= início atravessam a meia-noite (ex.: 18h→06h).
 * Um intervalo nulo (fim === início) é considerado inativo.
 */
export function ativaNaHora(horaInicio: number, horaFim: number, h: number): boolean {
  if (horaFim === horaInicio) return false
  if (horaFim > horaInicio) return sobrepoe(horaInicio, horaFim, h, h + 1)
  return sobrepoe(horaInicio, 24, h, h + 1) || sobrepoe(0, horaFim, h, h + 1)
}

export function calcularCargas(cargas: Carga[], premissas: Premissas): ResultadoCargas {
  let consumoDiarioWh = 0
  let consumoDiarioCriticoWh = 0
  let potenciaConectadaW = 0
  let potenciaPartidaW = 0

  for (const c of cargas) {
    const consumo = c.quantidade * c.potenciaUnitW * c.horasDia * (c.diasSemana / 7)
    consumoDiarioWh += consumo
    if (c.critica) consumoDiarioCriticoWh += consumo
    potenciaConectadaW += c.quantidade * c.potenciaUnitW
    potenciaPartidaW += c.quantidade * c.potenciaPartidaW
  }

  const curva24h = new Array(24).fill(0)
  for (let h = 0; h < 24; h++) {
    let somaW = 0
    for (const c of cargas) {
      if (ativaNaHora(c.horaInicio, c.horaFim, h)) somaW += c.quantidade * c.potenciaUnitW
    }
    curva24h[h] = somaW
  }

  return {
    consumoDiarioWh,
    consumoDiarioKwh: consumoDiarioWh / 1000,
    consumoMensalKwh: (consumoDiarioWh * 30) / 1000,
    consumoAnualKwh: (consumoDiarioWh * 365) / 1000,
    consumoDiarioCriticoWh,
    consumoDiarioCriticoKwh: consumoDiarioCriticoWh / 1000,
    potenciaConectadaW,
    potenciaSimultaneaW: potenciaConectadaW * premissas.simultaneidade,
    potenciaPartidaW,
    curva24h,
    picoDemandaW: Math.max(0, ...curva24h),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas`
Expected: PASS (todos). Se `consumoMensalKwh` falhar por precisão, confira que a fórmula é `diário × 30 / 1000` (a planilha usa 30 dias, não 30,4).

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/cargas.ts web/__tests__/hibrido-cargas.test.ts
git commit -m "feat(hibrido): agregacao de cargas e curva de demanda 24h calculada

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Dimensionamento fotovoltaico

**Files:**
- Create: `web/lib/simuladores/hibrido/dimensionamento.ts`
- Test: `web/__tests__/hibrido-dimensionamento.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-dimensionamento.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularPrBase, calcularDimensionamento } from '@/lib/simuladores/hibrido/dimensionamento'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL } from './fixtures/hibrido-fixture'

const base = { projeto: PROJETO, painel: PAINEL, consumoDiarioKwh: 5.85, potCaNomW: 8000, premissas: PREMISSAS_PADRAO }

describe('calcularPrBase', () => {
  it('produtório dos fatores de perda × eficiência do inversor', () => {
    expect(calcularPrBase(PREMISSAS_PADRAO)).toBeCloseTo(0.8637167691269617, 12)
  })
})

describe('calcularDimensionamento (golden da planilha)', () => {
  const r = calcularDimensionamento({ ...base, numModulos: 16 })

  it('performance ratio e temperatura', () => {
    expect(r.prBase).toBeCloseTo(0.8637167691269617, 12)
    expect(r.prEfetivo).toBeCloseTo(0.8210491607320898, 12)
    expect(r.tempCelulaC).toBeCloseTo(58.25, 9)
    expect(r.fatorTemperatura).toBeCloseTo(0.903575, 9)
    expect(r.prTotal).toBeCloseTo(0.7418794954084981, 12)
  })
  it('HSP média, mês crítico e critério', () => {
    expect(r.hspMediaAnual).toBeCloseTo(5.264166666666667, 9)
    expect(r.hspMesCritico).toBeCloseTo(4.7, 9)
    expect(r.mesCriticoIndice).toBe(2) // março
    expect(r.hspDimensionamento).toBeCloseTo(4.7, 9)
  })
  it('energia por módulo e nº recomendado', () => {
    expect(r.energiaPorModuloKwhDia).toBeCloseTo(2.1618368496203635, 12)
    expect(r.numModulosRecomendado).toBe(3)
  })
  it('potência, área e produção com 16 módulos', () => {
    expect(r.numModulos).toBe(16)
    expect(r.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
    expect(r.areaTotalM2).toBeCloseTo(43.2, 9)
    expect(r.producaoDiariaKwh).toBeCloseTo(34.589389593925816, 9)
    expect(r.producaoAnualKwh).toBeCloseTo(14149.415366185884, 6)
    expect(r.oversizingDcAc).toBeCloseTo(1.24, 9)
  })
  it('produção mensal bate mês a mês', () => {
    expect(r.producaoMensalKwh).toHaveLength(12)
    expect(r.producaoMensalKwh[0]).toBeCloseTo(1083.6782165331012, 6)   // Jan
    expect(r.producaoMensalKwh[1]).toBeCloseTo(970.5635531163693, 6)    // Fev
    expect(r.producaoMensalKwh[7]).toBeCloseTo(1348.3238441496062, 6)   // Ago
    expect(r.producaoMensalKwh[11]).toBeCloseTo(1090.522500005942, 6)   // Dez
  })
})

describe('critério média anual', () => {
  it('usa a HSP média em vez da do mês crítico', () => {
    const r = calcularDimensionamento({ ...base, projeto: { ...PROJETO, criterioGeracao: 'media_anual' }, numModulos: 16 })
    expect(r.hspDimensionamento).toBeCloseTo(5.264166666666667, 9)
  })
})

describe('fallbacks e robustez', () => {
  it('painel sem coefPmp usa a premissa padrão (-0.0035)', () => {
    const r = calcularDimensionamento({ ...base, painel: { ...PAINEL, coefPmp: null }, numModulos: 16 })
    expect(r.fatorTemperatura).toBeCloseTo(1 + (-0.0035) * (58.25 - 25), 9)
  })
  it('painel sem noct usa a premissa padrão (45)', () => {
    const r = calcularDimensionamento({ ...base, painel: { ...PAINEL, noct: null }, numModulos: 16 })
    expect(r.tempCelulaC).toBeCloseTo(58.25, 9)
  })
  it('sem painel zera tudo sem lançar', () => {
    const r = calcularDimensionamento({ ...base, painel: null })
    expect(r.potenciaInstaladaKwp).toBe(0)
    expect(r.producaoAnualKwh).toBe(0)
    expect(r.numModulosRecomendado).toBe(0)
    expect(r.oversizingDcAc).toBe(0)
  })
  it('consumo zero não gera divisão por zero no nº recomendado', () => {
    const r = calcularDimensionamento({ ...base, consumoDiarioKwh: 0, numModulos: 16 })
    expect(r.numModulosRecomendado).toBe(0)
  })
  it('HSP toda zero zera a produção sem lançar', () => {
    const r = calcularDimensionamento({ ...base, projeto: { ...PROJETO, hspMensal: new Array(12).fill(0) }, numModulos: 16 })
    expect(r.producaoDiariaKwh).toBe(0)
    expect(r.producaoAnualKwh).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-dimensionamento`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `dimensionamento.ts`**

Criar `web/lib/simuladores/hibrido/dimensionamento.ts`:

```ts
// web/lib/simuladores/hibrido/dimensionamento.ts
// Dimensionamento fotovoltaico: Performance Ratio, modelo térmico NOCT,
// número de módulos e estimativa de geração (método NREL/PVWatts).
import type { EquipPainel, Premissas, ProjetoInput, ResultadoDimensionamento } from './types'

/** PR base = produtório dos fatores de perda × eficiência do inversor. */
export function calcularPrBase(p: Premissas): number {
  return (
    (1 - p.soiling) *
    (1 - p.mismatch) *
    (1 - p.cabeamentoCC) *
    (1 - p.cabeamentoCA) *
    (1 - p.lid) *
    (1 - p.tolerancia) *
    (1 - p.indisponibilidade) *
    p.eficienciaInversor
  )
}

export type ParamsDimensionamento = {
  projeto: ProjetoInput
  painel: EquipPainel | null
  consumoDiarioKwh: number
  potCaNomW: number | null
  premissas: Premissas
  numModulos?: number
}

export function calcularDimensionamento(params: ParamsDimensionamento): ResultadoDimensionamento {
  const { projeto, painel, consumoDiarioKwh, potCaNomW, premissas, numModulos: numModulosOverride } = params

  const prBase = calcularPrBase(premissas)
  const prEfetivo = prBase * (1 - projeto.perdaSombreamento) * (1 - projeto.perdaOrientacao)

  const noct = painel?.noct ?? premissas.noctPadrao
  const coefPmp = painel?.coefPmp ?? premissas.coefPmpPadrao
  const tempCelulaC =
    projeto.tempMediaC + ((noct - 20) / premissas.gNoct) * premissas.gProjeto
  const fatorTemperatura = 1 + coefPmp * (tempCelulaC - premissas.tempRef)
  const prTotal = prEfetivo * fatorTemperatura

  const hsp = projeto.hspMensal
  const hspMediaAnual = hsp.length > 0 ? hsp.reduce((a, b) => a + b, 0) / hsp.length : 0
  const hspMesCritico = hsp.length > 0 ? Math.min(...hsp) : 0
  const mesCriticoIndice = hsp.length > 0 ? hsp.indexOf(hspMesCritico) : -1
  const hspDimensionamento =
    projeto.criterioGeracao === 'media_anual' ? hspMediaAnual : hspMesCritico

  const potenciaWp = painel?.potenciaWp ?? 0
  const energiaPorModuloKwhDia = (potenciaWp / 1000) * hspDimensionamento * prTotal
  const numModulosRecomendado =
    energiaPorModuloKwhDia > 0 && consumoDiarioKwh > 0
      ? Math.ceil(consumoDiarioKwh / energiaPorModuloKwhDia)
      : 0

  const numModulos = numModulosOverride ?? numModulosRecomendado
  const potenciaInstaladaKwp = (numModulos * potenciaWp) / 1000
  const areaTotalM2 = numModulos * (painel?.areaM2 ?? 0)

  const producaoDiariaKwh = potenciaInstaladaKwp * hspDimensionamento * prTotal
  const producaoMensalKwh = hsp.map(
    (h, i) => potenciaInstaladaKwp * h * (projeto.diasMes[i] ?? 0) * prTotal
  )
  const producaoAnualKwh = producaoMensalKwh.reduce((a, b) => a + b, 0)

  const oversizingDcAc =
    potCaNomW && potCaNomW > 0 ? (potenciaInstaladaKwp * 1000) / potCaNomW : 0

  return {
    prBase, prEfetivo, tempCelulaC, fatorTemperatura, prTotal,
    hspMediaAnual, hspMesCritico, mesCriticoIndice, hspDimensionamento,
    energiaPorModuloKwhDia, numModulosRecomendado, numModulos,
    potenciaInstaladaKwp, areaTotalM2,
    producaoDiariaKwh, producaoMensalKwh, producaoAnualKwh,
    oversizingDcAc,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-dimensionamento`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/dimensionamento.ts web/__tests__/hibrido-dimensionamento.test.ts
git commit -m "feat(hibrido): dimensionamento FV com PR termico (modelo NOCT) e producao mensal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Strings e verificação elétrica

**Files:**
- Create: `web/lib/simuladores/hibrido/strings.ts`
- Test: `web/__tests__/hibrido-strings.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-strings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularStrings } from '@/lib/simuladores/hibrido/strings'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL, INVERSOR } from './fixtures/hibrido-fixture'

const base = { projeto: PROJETO, painel: PAINEL, inversor: INVERSOR, numModulos: 16, premissas: PREMISSAS_PADRAO }

describe('calcularStrings (golden da planilha)', () => {
  const r = calcularStrings({ ...base, modulosPorString: 8 })

  it('tensões extremas por módulo', () => {
    expect(r.vocTminV).toBeCloseTo(49.448100000000004, 9)
    expect(r.vmpTmaxV).toBeCloseTo(36.233137500000005, 9)
  })
  it('limites de módulos por string', () => {
    expect(r.maxModulosPorString).toBe(10)
    expect(r.minModulosPorString).toBe(4)
  })
  it('arranjo definido: 8 módulos × 2 strings', () => {
    expect(r.modulosPorString).toBe(8)
    expect(r.numStrings).toBe(2)
    expect(r.modulosConfigurados).toBe(16)
  })
  it('tensões e correntes da string', () => {
    expect(r.tensaoStringVocTminV).toBeCloseTo(395.58480000000003, 9)
    expect(r.tensaoStringVmpTmaxV).toBeCloseTo(289.86510000000004, 9)
    expect(r.correnteStringIscA).toBeCloseTo(16.08, 9)
    expect(r.correnteProjetoA).toBeCloseTo(20.099999999999998, 9)
    expect(r.correntePorMpptA).toBeCloseTo(16.08, 9)
  })
})

describe('defaults e fallbacks', () => {
  it('sem override, módulos por string = máximo permitido pela tensão', () => {
    const r = calcularStrings(base)
    expect(r.modulosPorString).toBe(10)
    expect(r.numStrings).toBe(2) // ceil(16/10)
  })
  it('painel sem coefVoc usa a premissa padrão (-0.003)', () => {
    const r = calcularStrings({ ...base, painel: { ...PAINEL, coefVoc: null }, modulosPorString: 8 })
    expect(r.vocTminV).toBeCloseTo(49.08 * (1 + -0.003 * (22 - 25)), 9)
  })
  it('sem painel ou sem inversor zera sem lançar', () => {
    expect(calcularStrings({ ...base, painel: null }).maxModulosPorString).toBe(0)
    expect(calcularStrings({ ...base, inversor: null }).maxModulosPorString).toBe(0)
  })
  it('numStrings pode ser sobrescrito', () => {
    const r = calcularStrings({ ...base, modulosPorString: 8, numStrings: 3 })
    expect(r.numStrings).toBe(3)
    expect(r.modulosConfigurados).toBe(24)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-strings`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `strings.ts`**

Criar `web/lib/simuladores/hibrido/strings.ts`:

```ts
// web/lib/simuladores/hibrido/strings.ts
// Arranjo série/paralelo e verificação elétrica (NBR 16690):
// Voc no frio (pior caso de sobretensão) e Vmp no calor (pior caso de MPPT mínimo).
import type { EquipPainel, EquipInversor, Premissas, ProjetoInput, ResultadoStrings } from './types'

export type ParamsStrings = {
  projeto: ProjetoInput
  painel: EquipPainel | null
  inversor: EquipInversor | null
  numModulos: number
  premissas: Premissas
  modulosPorString?: number
  numStrings?: number
}

const VAZIO: ResultadoStrings = {
  vocTminV: 0, vmpTmaxV: 0, maxModulosPorString: 0, minModulosPorString: 0,
  modulosPorString: 0, numStrings: 0, tensaoStringVocTminV: 0, tensaoStringVmpTmaxV: 0,
  correnteStringIscA: 0, correnteProjetoA: 0, correntePorMpptA: 0, modulosConfigurados: 0,
}

export function calcularStrings(params: ParamsStrings): ResultadoStrings {
  const { projeto, painel, inversor, numModulos, premissas } = params
  if (!painel || !inversor) return { ...VAZIO }

  const coefVoc = painel.coefVoc ?? premissas.coefVocPadrao
  const noct = painel.noct ?? premissas.noctPadrao

  const vocTminV = painel.voc * (1 + coefVoc * (projeto.tempMinC - premissas.tempRef))
  const tempCelulaMaxC =
    projeto.tempMaxC + ((noct - 20) / premissas.gNoct) * premissas.gProjeto
  const vmpTmaxV = painel.vmp * (1 + coefVoc * (tempCelulaMaxC - premissas.tempRef))

  const maxModulosPorString = vocTminV > 0 ? Math.floor(inversor.tensaoCcMaxV / vocTminV) : 0
  const minModulosPorString = vmpTmaxV > 0 ? Math.ceil(inversor.mpptMinV / vmpTmaxV) : 0

  const modulosPorString = params.modulosPorString ?? maxModulosPorString
  const numStrings =
    params.numStrings ?? (modulosPorString > 0 ? Math.ceil(numModulos / modulosPorString) : 0)

  const correntePorMpptA =
    inversor.numMppt > 0 ? Math.ceil(numStrings / inversor.numMppt) * painel.isc : 0

  return {
    vocTminV,
    vmpTmaxV,
    maxModulosPorString,
    minModulosPorString,
    modulosPorString,
    numStrings,
    tensaoStringVocTminV: vocTminV * modulosPorString,
    tensaoStringVmpTmaxV: vmpTmaxV * modulosPorString,
    correnteStringIscA: painel.isc,
    correnteProjetoA: painel.isc * premissas.fatorCorrenteIsc,
    correntePorMpptA,
    modulosConfigurados: modulosPorString * numStrings,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-strings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/strings.ts web/__tests__/hibrido-strings.test.ts
git commit -m "feat(hibrido): arranjo de strings e verificacao eletrica (Voc@Tmin, Vmp@Tmax)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Banco de baterias

**Files:**
- Create: `web/lib/simuladores/hibrido/baterias.ts`
- Test: `web/__tests__/hibrido-baterias.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-baterias.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularBaterias } from '@/lib/simuladores/hibrido/baterias'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { BATERIA, INVERSOR } from './fixtures/hibrido-fixture'

const base = {
  bateria: BATERIA,
  inversor: INVERSOR,
  consumoDiarioKwh: 5.85,
  consumoDiarioCriticoKwh: 2.88,
  potenciaSimultaneaW: 4056.4999999999995,
  premissas: PREMISSAS_PADRAO,
}

describe('calcularBaterias (golden da planilha)', () => {
  const r = calcularBaterias(base)

  it('parâmetros da bateria (percentuais convertidos em fração)', () => {
    expect(r.tensaoBancoV).toBe(48)
    expect(r.dodNominal).toBeCloseTo(0.9, 9)
    expect(r.socMin).toBeCloseTo(0.1, 9)
    expect(r.eficienciaRoundTrip).toBeCloseTo(0.94, 9)
    expect(r.energiaBateriaKwh).toBeCloseTo(7.2, 9)
  })
  it('janela útil e eficiência do sistema', () => {
    expect(r.dodUtil).toBeCloseTo(0.9, 9)
    expect(r.etaSistema).toBeCloseTo(0.9211999999999999, 12)
  })
  it('dimensionamento do banco', () => {
    expect(r.energiaDiariaConsideradaKwh).toBeCloseTo(5.85, 9)
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(11.7, 9)
    expect(r.energiaNominalBancoKwh).toBeCloseTo(14.11202778983934, 9)
    expect(r.capacidadeNominalAh).toBeCloseTo(294.0005789549862, 6)
    expect(r.bateriasSerie).toBe(1)
    expect(r.stringsParalelo).toBe(2)
    expect(r.numBaterias).toBe(2)
    expect(r.energiaInstaladaKwh).toBeCloseTo(14.4, 9)
    expect(r.capacidadeBancoAh).toBeCloseTo(300, 9)
  })
  it('resultados operacionais', () => {
    expect(r.energiaUtilRealKwh).toBeCloseTo(11.938752, 9)
    expect(r.autonomiaRealDias).toBeCloseTo(2.0408123076923075, 9)
    expect(r.correnteMaxDescargaA).toBeCloseTo(200, 9)
    expect(r.correnteContinuaA).toBeCloseTo(150, 9)
    expect(r.potenciaMaxDescargaKw).toBeCloseTo(9.6, 9)
    expect(r.cRateDescarga).toBeCloseTo(0.2817013888888889, 12)
    expect(r.tempoRecargaH).toBeCloseTo(1.6581599999999999, 9)
    expect(r.vidaUtilAnos).toBeCloseTo(16.438356164383563, 9)
  })
})

describe('opções e fallbacks', () => {
  it('base "criticas" usa o consumo das cargas críticas', () => {
    const r = calcularBaterias({ ...base, baseEnergia: 'criticas' })
    expect(r.energiaDiariaConsideradaKwh).toBeCloseTo(2.88, 9)
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(5.76, 9)
  })
  it('diasAutonomia pode ser sobrescrito', () => {
    const r = calcularBaterias({ ...base, diasAutonomia: 3 })
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(17.55, 9)
  })
  it('tensão do banco pode ser sobrescrita', () => {
    const r = calcularBaterias({ ...base, tensaoBancoV: 96 })
    expect(r.tensaoBancoV).toBe(96)
    expect(r.bateriasSerie).toBe(2)
  })
  it('bateria sem energiaKwh calcula V×Ah/1000', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, energiaKwh: null } })
    expect(r.energiaBateriaKwh).toBeCloseTo(7.2, 9)
  })
  it('bateria sem dod/eficiencia usa o fallback da tecnologia (Lítio NMC)', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, dod: null, eficiencia: null } })
    expect(r.dodNominal).toBeCloseTo(0.85, 9)
    expect(r.eficienciaRoundTrip).toBeCloseTo(0.94, 9)
  })
  it('bateria sem socMin usa a premissa padrão (0.2)', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, socMin: null } })
    expect(r.socMin).toBeCloseTo(0.2, 9)
    expect(r.dodUtil).toBeCloseTo(0.8, 9) // min(0.9, 1-0.2)
  })
  it('sem bateria zera tudo sem lançar', () => {
    const r = calcularBaterias({ ...base, bateria: null })
    expect(r.numBaterias).toBe(0)
    expect(r.energiaInstaladaKwh).toBe(0)
    expect(r.autonomiaRealDias).toBe(0)
  })
  it('consumo zero não gera divisão por zero na autonomia', () => {
    const r = calcularBaterias({ ...base, consumoDiarioKwh: 0 })
    expect(r.autonomiaRealDias).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-baterias`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `baterias.ts`**

Criar `web/lib/simuladores/hibrido/baterias.ts`:

```ts
// web/lib/simuladores/hibrido/baterias.ts
// Dimensionamento do banco por energia:
// Cn = (E_diária × Autonomia) / (DOD_útil × η_bateria × η_carregador),
// com verificação cruzada por corrente (C-rate).
import { TECNOLOGIAS_BATERIA_PARAMS } from './premissas'
import type { EquipBateria, EquipInversor, Premissas, ResultadoBaterias, TecnologiaBateria } from './types'

export type ParamsBaterias = {
  bateria: EquipBateria | null
  inversor: EquipInversor | null
  consumoDiarioKwh: number
  consumoDiarioCriticoKwh: number
  potenciaSimultaneaW: number
  premissas: Premissas
  tensaoBancoV?: number
  diasAutonomia?: number
  baseEnergia?: 'total' | 'criticas'
}

const VAZIO: ResultadoBaterias = {
  tensaoBancoV: 0, dodNominal: 0, socMin: 0, eficienciaRoundTrip: 0, energiaBateriaKwh: 0,
  dodUtil: 0, etaSistema: 0, energiaDiariaConsideradaKwh: 0, energiaUtilNecessariaKwh: 0,
  energiaNominalBancoKwh: 0, capacidadeNominalAh: 0, bateriasSerie: 0, stringsParalelo: 0,
  numBaterias: 0, energiaInstaladaKwh: 0, capacidadeBancoAh: 0, energiaUtilRealKwh: 0,
  autonomiaRealDias: 0, correnteMaxDescargaA: 0, correnteContinuaA: 0,
  potenciaMaxDescargaKw: 0, cRateDescarga: 0, tempoRecargaH: 0, vidaUtilAnos: 0,
}

export function calcularBaterias(params: ParamsBaterias): ResultadoBaterias {
  const { bateria, inversor, premissas, potenciaSimultaneaW } = params
  if (!bateria) return { ...VAZIO }

  const tec = TECNOLOGIAS_BATERIA_PARAMS[bateria.tecnologia as TecnologiaBateria]
  const tensaoBancoV = params.tensaoBancoV ?? inversor?.tensaoCcBatV ?? 48
  const diasAutonomia = params.diasAutonomia ?? premissas.diasAutonomia
  const baseEnergia = params.baseEnergia ?? 'total'

  const dodNominal = bateria.dod != null ? bateria.dod / 100 : (tec?.dod ?? 0.8)
  const socMin = bateria.socMin != null ? bateria.socMin / 100 : premissas.socMin
  const eficienciaRoundTrip =
    bateria.eficiencia != null ? bateria.eficiencia / 100 : (tec?.eficiencia ?? 0.9)
  const ciclos = bateria.ciclos ?? tec?.ciclos ?? 3000
  const energiaBateriaKwh =
    bateria.energiaKwh ?? (bateria.tensaoV * bateria.capacidadeAh) / 1000

  const dodUtil = Math.min(dodNominal, premissas.socMax - socMin)
  const etaSistema = eficienciaRoundTrip * premissas.eficienciaCarregador

  const energiaDiariaConsideradaKwh =
    baseEnergia === 'criticas' ? params.consumoDiarioCriticoKwh : params.consumoDiarioKwh
  const energiaUtilNecessariaKwh = energiaDiariaConsideradaKwh * diasAutonomia

  const denom = dodUtil * etaSistema
  const energiaNominalBancoKwh = denom > 0 ? energiaUtilNecessariaKwh / denom : 0
  const capacidadeNominalAh =
    tensaoBancoV > 0 ? (energiaNominalBancoKwh * 1000) / tensaoBancoV : 0

  const bateriasSerie = bateria.tensaoV > 0 ? Math.round(tensaoBancoV / bateria.tensaoV) : 0
  const capacidadeStringKwh = energiaBateriaKwh * bateriasSerie
  const stringsParalelo =
    capacidadeStringKwh > 0 ? Math.ceil(energiaNominalBancoKwh / capacidadeStringKwh) : 0
  const numBaterias = bateriasSerie * stringsParalelo

  const energiaInstaladaKwh = numBaterias * energiaBateriaKwh
  const capacidadeBancoAh = stringsParalelo * bateria.capacidadeAh
  const energiaUtilRealKwh = energiaInstaladaKwh * dodUtil * etaSistema
  const autonomiaRealDias =
    energiaDiariaConsideradaKwh > 0 ? energiaUtilRealKwh / energiaDiariaConsideradaKwh : 0

  const correnteMaxDescargaA = (bateria.corrMaxA ?? 0) * stringsParalelo
  const correnteContinuaA = (bateria.corrRecomA ?? 0) * stringsParalelo
  const potenciaMaxDescargaKw = (tensaoBancoV * correnteMaxDescargaA) / 1000
  const cRateDescarga =
    tensaoBancoV > 0 && capacidadeBancoAh > 0
      ? (potenciaSimultaneaW / tensaoBancoV) / capacidadeBancoAh
      : 0
  const potenciaRecargaKw = (correnteContinuaA * tensaoBancoV) / 1000
  const tempoRecargaH = potenciaRecargaKw > 0 ? energiaUtilRealKwh / potenciaRecargaKw : 0

  return {
    tensaoBancoV, dodNominal, socMin, eficienciaRoundTrip, energiaBateriaKwh,
    dodUtil, etaSistema, energiaDiariaConsideradaKwh, energiaUtilNecessariaKwh,
    energiaNominalBancoKwh, capacidadeNominalAh, bateriasSerie, stringsParalelo,
    numBaterias, energiaInstaladaKwh, capacidadeBancoAh, energiaUtilRealKwh,
    autonomiaRealDias, correnteMaxDescargaA, correnteContinuaA,
    potenciaMaxDescargaKw, cRateDescarga, tempoRecargaH,
    vidaUtilAnos: ciclos / 365,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-baterias`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/baterias.ts web/__tests__/hibrido-baterias.test.ts
git commit -m "feat(hibrido): dimensionamento do banco de baterias (energia + C-rate)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Inversor

**Files:**
- Create: `web/lib/simuladores/hibrido/inversor.ts`
- Test: `web/__tests__/hibrido-inversor.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-inversor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularInversor } from '@/lib/simuladores/hibrido/inversor'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { INVERSOR } from './fixtures/hibrido-fixture'

const base = {
  inversor: INVERSOR,
  potenciaSimultaneaW: 4056.4999999999995,
  potenciaPartidaW: 5795,
  potenciaInstaladaKwp: 9.92,
  premissas: PREMISSAS_PADRAO,
}

describe('calcularInversor (golden da planilha)', () => {
  const r = calcularInversor(base)

  it('requisitos de potência', () => {
    expect(r.potenciaCaMinimaW).toBeCloseTo(5070.624999999999, 9)
    expect(r.folgaPotenciaW).toBeCloseTo(2929.375000000001, 9)
    expect(r.utilizacaoContinua).toBeCloseTo(0.5070625, 9)
  })
  it('surge, uso da entrada FV e paralelismo', () => {
    expect(r.relacaoSurgePartida).toBeCloseTo(2.76100086281277, 9)
    expect(r.usoEntradaFv).toBeCloseTo(0.9538461538461539, 9)
    expect(r.numInversoresParalelo).toBe(1)
    expect(r.potenciaCaTotalW).toBeCloseTo(8000, 9)
  })
})

describe('robustez', () => {
  it('carga maior que um inversor exige dois em paralelo', () => {
    const r = calcularInversor({ ...base, potenciaSimultaneaW: 9000 })
    expect(r.numInversoresParalelo).toBe(2)
    expect(r.potenciaCaTotalW).toBeCloseTo(16000, 9)
  })
  it('inversor sem potSurgeW zera a relação de surge', () => {
    const r = calcularInversor({ ...base, inversor: { ...INVERSOR, potSurgeW: null } })
    expect(r.relacaoSurgePartida).toBe(0)
  })
  it('potência de partida zero não gera divisão por zero', () => {
    const r = calcularInversor({ ...base, potenciaPartidaW: 0 })
    expect(r.relacaoSurgePartida).toBe(0)
  })
  it('sem inversor zera tudo sem lançar', () => {
    const r = calcularInversor({ ...base, inversor: null })
    expect(r.potenciaCaTotalW).toBe(0)
    expect(r.numInversoresParalelo).toBe(0)
    expect(r.usoEntradaFv).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-inversor`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `inversor.ts`**

Criar `web/lib/simuladores/hibrido/inversor.ts`:

```ts
// web/lib/simuladores/hibrido/inversor.ts
// Requisitos e compatibilidade do inversor: potência contínua com margem,
// surge de partida, uso da entrada FV e paralelismo necessário.
import type { EquipInversor, Premissas, ResultadoInversor } from './types'

export type ParamsInversor = {
  inversor: EquipInversor | null
  potenciaSimultaneaW: number
  potenciaPartidaW: number
  potenciaInstaladaKwp: number
  premissas: Premissas
}

const VAZIO: ResultadoInversor = {
  potenciaCaMinimaW: 0, folgaPotenciaW: 0, utilizacaoContinua: 0,
  relacaoSurgePartida: 0, usoEntradaFv: 0, numInversoresParalelo: 0, potenciaCaTotalW: 0,
}

export function calcularInversor(params: ParamsInversor): ResultadoInversor {
  const { inversor, potenciaSimultaneaW, potenciaPartidaW, potenciaInstaladaKwp, premissas } = params

  const potenciaCaMinimaW = potenciaSimultaneaW * (1 + premissas.margemInversor)
  if (!inversor) return { ...VAZIO, potenciaCaMinimaW }

  const potCaNomW = inversor.potCaNomW
  const potenciaInstaladaW = potenciaInstaladaKwp * 1000

  const numInversoresParalelo =
    potCaNomW > 0 ? Math.ceil(potenciaCaMinimaW / potCaNomW) : 0

  return {
    potenciaCaMinimaW,
    folgaPotenciaW: potCaNomW - potenciaCaMinimaW,
    utilizacaoContinua: potCaNomW > 0 ? potenciaSimultaneaW / potCaNomW : 0,
    relacaoSurgePartida:
      inversor.potSurgeW != null && potenciaPartidaW > 0
        ? inversor.potSurgeW / potenciaPartidaW
        : 0,
    usoEntradaFv: inversor.potFvMaxWp > 0 ? potenciaInstaladaW / inversor.potFvMaxWp : 0,
    numInversoresParalelo,
    potenciaCaTotalW: numInversoresParalelo * potCaNomW,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-inversor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/inversor.ts web/__tests__/hibrido-inversor.test.ts
git commit -m "feat(hibrido): requisitos e compatibilidade do inversor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Alertas normativos

**Files:**
- Create: `web/lib/simuladores/hibrido/alertas.ts`
- Test: `web/__tests__/hibrido-alertas.test.ts`

Regra de emissão (do spec): condição satisfeita → severidade da tabela; condição não satisfeita com entradas presentes → `ok`; entradas ausentes para avaliar → alerta **não emitido**.

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-alertas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularAlertas } from '@/lib/simuladores/hibrido/alertas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Alerta, CodigoAlerta } from '@/lib/simuladores/hibrido/types'

// Cenário nominal: tudo dentro dos limites.
const OK = {
  temPainel: true, temInversor: true, temBateria: true,
  tensaoStringVocTminV: 395.58, tensaoCcMaxV: 500,
  tensaoStringVmpTmaxV: 289.87, mpptMinV: 125,
  correntePorMpptA: 16.08, corrMaxMpptA: 22,
  oversizingDcAc: 1.24, dcAcMax: 1.35, dcAcMin: 1,
  potenciaInstaladaW: 9920, potFvMaxWp: 10400,
  modulosConfigurados: 16, numModulos: 16,
  producaoDiariaKwh: 34.59, consumoDiarioKwh: 5.85,
  potenciaSimultaneaW: 4056.5, potCaNomW: 8000,
  potSurgeW: 16000, potenciaPartidaW: 5795,
  tensaoBancoV: 48, tensaoCcBatV: 48,
  correnteDescargaA: 84.51, correnteContinuaA: 150,
  autonomiaRealDias: 2.04, diasAutonomia: 2,
  tipoInversor: 'Híbrido' as const, tipoSistema: 'Híbrido' as const,
  premissas: PREMISSAS_PADRAO,
}

const acha = (as: Alerta[], c: CodigoAlerta) => as.find((a) => a.codigo === c)

describe('cenário nominal', () => {
  const alertas = calcularAlertas(OK)
  it('todas as verificações saem como ok', () => {
    expect(alertas.every((a) => a.severidade === 'ok')).toBe(true)
  })
  it('não emite DADOS_INSUFICIENTES', () => {
    expect(acha(alertas, 'DADOS_INSUFICIENTES')).toBeUndefined()
  })
})

describe('cada verificação dispara na sua condição', () => {
  it('SOBRETENSAO quando Voc@Tmin da string passa a tensão CC máx', () => {
    const a = acha(calcularAlertas({ ...OK, tensaoStringVocTminV: 520 }), 'SOBRETENSAO')
    expect(a?.severidade).toBe('erro')
    expect(a?.valor).toBeCloseTo(520, 6)
    expect(a?.limite).toBeCloseTo(500, 6)
  })
  it('SUBTENSAO_MPPT quando Vmp@Tmax da string fica abaixo do MPPT mínimo', () => {
    expect(acha(calcularAlertas({ ...OK, tensaoStringVmpTmaxV: 100 }), 'SUBTENSAO_MPPT')?.severidade).toBe('erro')
  })
  it('CORRENTE_MPPT quando a corrente por MPPT passa o limite', () => {
    expect(acha(calcularAlertas({ ...OK, correntePorMpptA: 30 }), 'CORRENTE_MPPT')?.severidade).toBe('erro')
  })
  it('OVERSIZING_ALTO acima do DC/AC máximo', () => {
    expect(acha(calcularAlertas({ ...OK, oversizingDcAc: 1.5 }), 'OVERSIZING_ALTO')?.severidade).toBe('aviso')
  })
  it('SUBDIMENSIONADO_FV abaixo do DC/AC mínimo', () => {
    expect(acha(calcularAlertas({ ...OK, oversizingDcAc: 0.8 }), 'SUBDIMENSIONADO_FV')?.severidade).toBe('aviso')
  })
  it('POT_FV_EXCEDE quando a potência FV passa a máxima do inversor', () => {
    expect(acha(calcularAlertas({ ...OK, potenciaInstaladaW: 12000 }), 'POT_FV_EXCEDE')?.severidade).toBe('erro')
  })
  it('CONFIG_DIVERGE quando módulos configurados ≠ definidos', () => {
    expect(acha(calcularAlertas({ ...OK, modulosConfigurados: 20 }), 'CONFIG_DIVERGE')?.severidade).toBe('aviso')
  })
  it('GERACAO_INSUFICIENTE quando a produção não cobre o consumo', () => {
    expect(acha(calcularAlertas({ ...OK, producaoDiariaKwh: 3 }), 'GERACAO_INSUFICIENTE')?.severidade).toBe('aviso')
  })
  it('POTENCIA_CONTINUA quando a carga simultânea passa a nominal CA', () => {
    expect(acha(calcularAlertas({ ...OK, potenciaSimultaneaW: 9000 }), 'POTENCIA_CONTINUA')?.severidade).toBe('erro')
  })
  it('SURGE_INSUFICIENTE quando o surge não cobre a partida', () => {
    expect(acha(calcularAlertas({ ...OK, potSurgeW: 3000 }), 'SURGE_INSUFICIENTE')?.severidade).toBe('erro')
  })
  it('TENSAO_BANCO quando a tensão do banco difere da do inversor', () => {
    expect(acha(calcularAlertas({ ...OK, tensaoBancoV: 96 }), 'TENSAO_BANCO')?.severidade).toBe('aviso')
  })
  it('CRATE_EXCEDIDO quando a corrente de descarga passa a recomendada', () => {
    expect(acha(calcularAlertas({ ...OK, correnteDescargaA: 200 }), 'CRATE_EXCEDIDO')?.severidade).toBe('aviso')
  })
  it('AUTONOMIA_ABAIXO quando a autonomia real fica abaixo do alvo', () => {
    expect(acha(calcularAlertas({ ...OK, autonomiaRealDias: 1.2 }), 'AUTONOMIA_ABAIXO')?.severidade).toBe('aviso')
  })
  it('TIPO_INVERSOR quando o tipo não casa com o sistema', () => {
    expect(acha(calcularAlertas({ ...OK, tipoInversor: 'On-grid' }), 'TIPO_INVERSOR')?.severidade).toBe('aviso')
  })
})

describe('dados ausentes', () => {
  it('sem inversor: emite DADOS_INSUFICIENTES e omite as checagens do inversor', () => {
    const alertas = calcularAlertas({ ...OK, temInversor: false })
    expect(acha(alertas, 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
    expect(acha(alertas, 'SOBRETENSAO')).toBeUndefined()
    expect(acha(alertas, 'POTENCIA_CONTINUA')).toBeUndefined()
  })
  it('sem bateria: omite as checagens de bateria', () => {
    const alertas = calcularAlertas({ ...OK, temBateria: false })
    expect(acha(alertas, 'CRATE_EXCEDIDO')).toBeUndefined()
    expect(acha(alertas, 'AUTONOMIA_ABAIXO')).toBeUndefined()
  })
  it('sem painel: emite DADOS_INSUFICIENTES', () => {
    expect(acha(calcularAlertas({ ...OK, temPainel: false }), 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
  })
  it('consumo zero emite DADOS_INSUFICIENTES', () => {
    expect(acha(calcularAlertas({ ...OK, consumoDiarioKwh: 0 }), 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-alertas`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `alertas.ts`**

Criar `web/lib/simuladores/hibrido/alertas.ts`:

```ts
// web/lib/simuladores/hibrido/alertas.ts
// Verificações normativas do dimensionamento (NBR 16690 / 16274 / 5410).
// Emite um alerta por verificação: severidade da tabela quando a condição de
// erro ocorre, 'ok' quando não ocorre, e nada quando faltam dados para avaliar.
import type { Alerta, CodigoAlerta, Premissas, SeveridadeAlerta } from './types'

export type ParamsAlertas = {
  temPainel: boolean
  temInversor: boolean
  temBateria: boolean
  tensaoStringVocTminV: number
  tensaoCcMaxV: number
  tensaoStringVmpTmaxV: number
  mpptMinV: number
  correntePorMpptA: number
  corrMaxMpptA: number
  oversizingDcAc: number
  dcAcMax: number
  dcAcMin: number
  potenciaInstaladaW: number
  potFvMaxWp: number
  modulosConfigurados: number
  numModulos: number
  producaoDiariaKwh: number
  consumoDiarioKwh: number
  potenciaSimultaneaW: number
  potCaNomW: number
  potSurgeW: number | null
  potenciaPartidaW: number
  tensaoBancoV: number
  tensaoCcBatV: number | null
  correnteDescargaA: number
  correnteContinuaA: number
  autonomiaRealDias: number
  diasAutonomia: number
  tipoInversor: 'Híbrido' | 'Off-grid' | 'On-grid' | null
  tipoSistema: 'Híbrido' | 'Off-grid' | 'On-grid' | null
  premissas: Premissas
}

function alerta(
  codigo: CodigoAlerta,
  condicaoErro: boolean,
  severidadeErro: SeveridadeAlerta,
  mensagemErro: string,
  mensagemOk: string,
  valor?: number,
  limite?: number
): Alerta {
  return condicaoErro
    ? { codigo, severidade: severidadeErro, mensagem: mensagemErro, valor, limite }
    : { codigo, severidade: 'ok', mensagem: mensagemOk, valor, limite }
}

export function calcularAlertas(p: ParamsAlertas): Alerta[] {
  const alertas: Alerta[] = []

  const faltaDado =
    !p.temPainel || !p.temInversor || p.consumoDiarioKwh <= 0
  if (faltaDado) {
    alertas.push({
      codigo: 'DADOS_INSUFICIENTES',
      severidade: 'erro',
      mensagem: 'Selecione painel e inversor e cadastre ao menos uma carga para dimensionar.',
    })
  }

  if (p.temPainel && p.temInversor) {
    alertas.push(alerta('SOBRETENSAO',
      p.tensaoStringVocTminV > p.tensaoCcMaxV, 'erro',
      'Tensão da string no frio excede a tensão CC máxima do inversor.',
      'Tensão da string dentro do limite CC do inversor.',
      p.tensaoStringVocTminV, p.tensaoCcMaxV))

    alertas.push(alerta('SUBTENSAO_MPPT',
      p.tensaoStringVmpTmaxV < p.mpptMinV, 'erro',
      'Tensão da string no calor fica abaixo do MPPT mínimo.',
      'Tensão da string acima do MPPT mínimo.',
      p.tensaoStringVmpTmaxV, p.mpptMinV))

    alertas.push(alerta('CORRENTE_MPPT',
      p.correntePorMpptA > p.corrMaxMpptA, 'erro',
      'Corrente por MPPT excede o limite do inversor.',
      'Corrente por MPPT dentro do limite.',
      p.correntePorMpptA, p.corrMaxMpptA))

    alertas.push(alerta('OVERSIZING_ALTO',
      p.oversizingDcAc > p.dcAcMax, 'aviso',
      'Relação DC/AC acima do máximo recomendado.',
      'Relação DC/AC dentro do recomendado.',
      p.oversizingDcAc, p.dcAcMax))

    alertas.push(alerta('SUBDIMENSIONADO_FV',
      p.oversizingDcAc < p.dcAcMin, 'aviso',
      'Relação DC/AC abaixo do mínimo: gerador FV subdimensionado.',
      'Gerador FV não está subdimensionado.',
      p.oversizingDcAc, p.dcAcMin))

    alertas.push(alerta('POT_FV_EXCEDE',
      p.potenciaInstaladaW > p.potFvMaxWp, 'erro',
      'Potência FV instalada excede a máxima suportada pelo inversor.',
      'Potência FV dentro do máximo do inversor.',
      p.potenciaInstaladaW, p.potFvMaxWp))

    alertas.push(alerta('CONFIG_DIVERGE',
      p.modulosConfigurados !== p.numModulos, 'aviso',
      'Arranjo configurado (strings × módulos) difere do número de módulos definido.',
      'Arranjo configurado bate com o número de módulos.',
      p.modulosConfigurados, p.numModulos))

    alertas.push(alerta('GERACAO_INSUFICIENTE',
      p.producaoDiariaKwh < p.consumoDiarioKwh, 'aviso',
      'Geração diária estimada não cobre o consumo diário.',
      'Geração diária cobre o consumo.',
      p.producaoDiariaKwh, p.consumoDiarioKwh))

    alertas.push(alerta('POTENCIA_CONTINUA',
      p.potenciaSimultaneaW > p.potCaNomW, 'erro',
      'Potência simultânea das cargas excede a potência nominal CA do inversor.',
      'Potência contínua dentro da nominal do inversor.',
      p.potenciaSimultaneaW, p.potCaNomW))

    if (p.potSurgeW != null) {
      alertas.push(alerta('SURGE_INSUFICIENTE',
        p.potSurgeW < p.potenciaPartidaW, 'erro',
        'Potência de surge do inversor não cobre a partida das cargas.',
        'Surge do inversor cobre a partida das cargas.',
        p.potSurgeW, p.potenciaPartidaW))
    }

    if (p.tipoInversor && p.tipoSistema) {
      alertas.push(alerta('TIPO_INVERSOR',
        p.tipoInversor !== p.tipoSistema, 'aviso',
        'Tipo do inversor não corresponde ao tipo de sistema selecionado.',
        'Tipo do inversor compatível com o sistema.'))
    }
  }

  if (p.temBateria) {
    if (p.tensaoCcBatV != null) {
      alertas.push(alerta('TENSAO_BANCO',
        p.tensaoBancoV !== p.tensaoCcBatV, 'aviso',
        'Tensão do banco difere da tensão CC de bateria do inversor.',
        'Tensão do banco compatível com o inversor.',
        p.tensaoBancoV, p.tensaoCcBatV))
    }

    alertas.push(alerta('CRATE_EXCEDIDO',
      p.correnteDescargaA > p.correnteContinuaA, 'aviso',
      'Corrente de descarga acima da recomendada para o banco.',
      'Corrente de descarga dentro da recomendada.',
      p.correnteDescargaA, p.correnteContinuaA))

    alertas.push(alerta('AUTONOMIA_ABAIXO',
      p.autonomiaRealDias < p.diasAutonomia, 'aviso',
      'Autonomia real do banco abaixo do alvo de dias.',
      'Autonomia real atende o alvo.',
      p.autonomiaRealDias, p.diasAutonomia))
  }

  return alertas
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-alertas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/alertas.ts web/__tests__/hibrido-alertas.test.ts
git commit -m "feat(hibrido): alertas normativos estruturados do dimensionamento

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Orquestrador `calcularHibrido`

**Files:**
- Create: `web/lib/simuladores/hibrido/index.ts`
- Test: `web/__tests__/hibrido-motor.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-motor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'
import type { HibridoInput } from '@/lib/simuladores/hibrido/types'

const INPUT: HibridoInput = {
  projeto: PROJETO,
  cargas: CARGAS,
  painel: PAINEL,
  inversor: INVERSOR,
  bateria: BATERIA,
  numModulos: 16,
  modulosPorString: 8,
  tipoSistema: 'Híbrido',
}

describe('calcularHibrido (integração, golden da planilha)', () => {
  const r = calcularHibrido(INPUT)

  it('encadeia cargas → dimensionamento', () => {
    expect(r.cargas.consumoDiarioKwh).toBeCloseTo(5.85, 9)
    expect(r.dimensionamento.prTotal).toBeCloseTo(0.7418794954084981, 12)
    expect(r.dimensionamento.producaoAnualKwh).toBeCloseTo(14149.415366185884, 6)
    expect(r.dimensionamento.oversizingDcAc).toBeCloseTo(1.24, 9)
  })
  it('encadeia dimensionamento → strings', () => {
    expect(r.strings.modulosConfigurados).toBe(16)
    expect(r.strings.tensaoStringVocTminV).toBeCloseTo(395.58480000000003, 9)
  })
  it('encadeia cargas → baterias', () => {
    expect(r.baterias.numBaterias).toBe(2)
    expect(r.baterias.autonomiaRealDias).toBeCloseTo(2.0408123076923075, 9)
  })
  it('encadeia cargas → inversor', () => {
    expect(r.inversor.potenciaCaMinimaW).toBeCloseTo(5070.624999999999, 9)
    expect(r.inversor.numInversoresParalelo).toBe(1)
  })
  it('não gera nenhum alerta de erro no cenário nominal', () => {
    expect(r.alertas.filter((a) => a.severidade === 'erro')).toHaveLength(0)
  })
})

describe('overrides de premissas', () => {
  it('simultaneidade menor reduz a potência simultânea e o inversor mínimo', () => {
    const r = calcularHibrido(INPUT, { ...PREMISSAS_PADRAO, simultaneidade: 0.5 })
    expect(r.cargas.potenciaSimultaneaW).toBeCloseTo(2897.5, 9)
    expect(r.inversor.potenciaCaMinimaW).toBeCloseTo(3621.875, 9)
  })
  it('mais dias de autonomia aumentam o banco', () => {
    const r = calcularHibrido({ ...INPUT, diasAutonomia: 4 })
    expect(r.baterias.energiaUtilNecessariaKwh).toBeCloseTo(23.4, 9)
    expect(r.baterias.numBaterias).toBe(4)
  })
})

describe('robustez do orquestrador', () => {
  it('input vazio não lança e devolve DADOS_INSUFICIENTES', () => {
    const r = calcularHibrido({
      projeto: PROJETO, cargas: [], painel: null, inversor: null, bateria: null,
    })
    expect(r.dimensionamento.potenciaInstaladaKwp).toBe(0)
    expect(r.baterias.numBaterias).toBe(0)
    expect(r.inversor.potenciaCaTotalW).toBe(0)
    expect(r.alertas.some((a) => a.codigo === 'DADOS_INSUFICIENTES')).toBe(true)
  })
  it('sem numModulos usa o recomendado', () => {
    const r = calcularHibrido({ ...INPUT, numModulos: undefined, modulosPorString: undefined })
    expect(r.dimensionamento.numModulos).toBe(3)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-motor`
Expected: FAIL — módulo `index` não existe.

- [ ] **Step 3: Implementar `index.ts`**

Criar `web/lib/simuladores/hibrido/index.ts`:

```ts
// web/lib/simuladores/hibrido/index.ts
// Orquestrador do motor de cálculo do simulador Híbrido / Off-grid.
// Funções puras; nunca lança — entradas faltantes viram alertas.
import { calcularCargas } from './cargas'
import { calcularDimensionamento } from './dimensionamento'
import { calcularStrings } from './strings'
import { calcularBaterias } from './baterias'
import { calcularInversor } from './inversor'
import { calcularAlertas } from './alertas'
import { PREMISSAS_PADRAO } from './premissas'
import type { HibridoInput, Premissas, ResultadoHibrido } from './types'

export * from './types'
export { PREMISSAS_PADRAO, TECNOLOGIAS_BATERIA_PARAMS } from './premissas'

export function calcularHibrido(
  input: HibridoInput,
  premissas: Premissas = PREMISSAS_PADRAO
): ResultadoHibrido {
  const cargas = calcularCargas(input.cargas, premissas)

  const dimensionamento = calcularDimensionamento({
    projeto: input.projeto,
    painel: input.painel,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    potCaNomW: input.inversor?.potCaNomW ?? null,
    premissas,
    numModulos: input.numModulos,
  })

  const strings = calcularStrings({
    projeto: input.projeto,
    painel: input.painel,
    inversor: input.inversor,
    numModulos: dimensionamento.numModulos,
    premissas,
    modulosPorString: input.modulosPorString,
    numStrings: input.numStrings,
  })

  const baterias = calcularBaterias({
    bateria: input.bateria,
    inversor: input.inversor,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    consumoDiarioCriticoKwh: cargas.consumoDiarioCriticoKwh,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    premissas,
    tensaoBancoV: input.tensaoBancoV,
    diasAutonomia: input.diasAutonomia,
    baseEnergia: input.baseEnergia,
  })

  const inversor = calcularInversor({
    inversor: input.inversor,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    potenciaPartidaW: cargas.potenciaPartidaW,
    potenciaInstaladaKwp: dimensionamento.potenciaInstaladaKwp,
    premissas,
  })

  const correnteDescargaA =
    baterias.tensaoBancoV > 0 ? cargas.potenciaSimultaneaW / baterias.tensaoBancoV : 0

  const alertas = calcularAlertas({
    temPainel: input.painel != null,
    temInversor: input.inversor != null,
    temBateria: input.bateria != null,
    tensaoStringVocTminV: strings.tensaoStringVocTminV,
    tensaoCcMaxV: input.inversor?.tensaoCcMaxV ?? 0,
    tensaoStringVmpTmaxV: strings.tensaoStringVmpTmaxV,
    mpptMinV: input.inversor?.mpptMinV ?? 0,
    correntePorMpptA: strings.correntePorMpptA,
    corrMaxMpptA: input.inversor?.corrMaxMpptA ?? 0,
    oversizingDcAc: dimensionamento.oversizingDcAc,
    dcAcMax: premissas.dcAcMax,
    dcAcMin: premissas.dcAcMin,
    potenciaInstaladaW: dimensionamento.potenciaInstaladaKwp * 1000,
    potFvMaxWp: input.inversor?.potFvMaxWp ?? 0,
    modulosConfigurados: strings.modulosConfigurados,
    numModulos: dimensionamento.numModulos,
    producaoDiariaKwh: dimensionamento.producaoDiariaKwh,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    potCaNomW: input.inversor?.potCaNomW ?? 0,
    potSurgeW: input.inversor?.potSurgeW ?? null,
    potenciaPartidaW: cargas.potenciaPartidaW,
    tensaoBancoV: baterias.tensaoBancoV,
    tensaoCcBatV: input.inversor?.tensaoCcBatV ?? null,
    correnteDescargaA,
    correnteContinuaA: baterias.correnteContinuaA,
    autonomiaRealDias: baterias.autonomiaRealDias,
    diasAutonomia: input.diasAutonomia ?? premissas.diasAutonomia,
    tipoInversor: input.inversor?.tipo ?? null,
    tipoSistema: input.tipoSistema ?? null,
    premissas,
  })

  return { cargas, dimensionamento, strings, baterias, inversor, alertas }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-motor`
Expected: PASS.

- [ ] **Step 5: Suíte completa e type-check**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; todos os testes passam (194 anteriores + os novos do motor).

- [ ] **Step 6: Commit**

```bash
git add web/lib/simuladores/hibrido/index.ts web/__tests__/hibrido-motor.test.ts
git commit -m "feat(hibrido): orquestrador calcularHibrido do motor fisico

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- premissas.ts + tabela de tecnologias → Task 1 ✔
- cargas + curva 24h corrigida + pico 5795 W → Task 3 ✔
- dimensionamento (PR, térmico, produção, oversizing) → Task 4 ✔
- strings (Voc@Tmin, Vmp@Tmax, limites, correntes) → Task 5 ✔
- baterias (banco, autonomia, C-rate, recarga, vida) → Task 6 ✔
- inversor (potência mínima, folga, surge, paralelismo) → Task 7 ✔
- alertas (15 códigos, três estados de emissão) → Task 8 ✔
- orquestrador + overrides de premissas → Task 9 ✔
- Todos os golden values da tabela do spec aparecem em algum teste ✔
- "Nunca lança exceção" coberto por testes de robustez em cada task ✔

**2. Placeholders:** nenhum; todo código está completo e executável.

**3. Consistência de tipos:** os nomes de campo dos `Resultado*` em `types.ts`
(Task 1) são exatamente os usados nos módulos (Tasks 3–7), nos testes e no
orquestrador (Task 9). As assinaturas usam objetos de parâmetros
(`ParamsDimensionamento`, `ParamsStrings`, `ParamsBaterias`, `ParamsInversor`,
`ParamsAlertas`), todas definidas no módulo que as consome e importadas apenas
pelo `index.ts`.

**Notas de risco:**
- `PREMISSAS_PADRAO.eficienciaInversor` (0,975) é usado no PR base mesmo quando
  o inversor selecionado informa eficiência (97%). Isso **reproduz a planilha**,
  onde `PR_base` vem das Premissas e a eficiência do inversor cadastrado não o
  sobrescreve. Os golden values dependem disso — não "corrigir" sem alinhar
  antes.
- `Math.max(0, ...curva24h)` garante 0 para lista vazia (sem o `0` inicial,
  `Math.max()` retorna `-Infinity`).
