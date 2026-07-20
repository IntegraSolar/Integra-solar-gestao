# Simulador Híbrido / Off-grid — Fase 3b: Tela do simulador (parte física) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela em `/simuladores/hibrido-offgrid` que coleta projeto, equipamentos e cargas, e mostra dimensionamento, strings, baterias, inversor e alertas ao vivo.

**Architecture:** Uma ponte pura (`montar-input.ts`) traduz os campos do formulário para o input do motor da Fase 2a — é onde mora a cobertura de teste. A tela é só coleta e exibição: nenhum cálculo vive na UI. Oito componentes focados mais o orquestrador, todos controlados, com o estado no topo.

**Tech Stack:** Next.js (App Router), React, recharts, TypeScript, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-tela-fisica-design.md`.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (zero erros)
- Import alias `@/` → `web/`
- Testes de componente: docblock `// @vitest-environment jsdom` + `import '@testing-library/jest-dom/vitest'` no próprio arquivo. **`vitest.config.ts` não muda.**
- Commits em pt-BR, prefixo `feat(hibrido):` / `refactor(hibrido):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**Contexto das fases anteriores:**
- Motor físico: `calcularHibrido(input, premissas?)` em `web/lib/simuladores/hibrido/index.ts`; tipos em `types.ts`; `PREMISSAS_PADRAO` em `premissas.ts`. Nunca lança — entradas faltantes viram zeros + alerta `DADOS_INSUFICIENTES`.
- Equipamentos (Fase 1): `listPaineis/listInversores/listBaterias` em `equipamentos-actions.ts`.
- Cargas (Fase 3a): `CargasBuilder`, `CargasTabela`, `CargasResumo`, `CargasCurva24h`, `BibliotecaCargasPanel`; biblioteca em `cargas-biblioteca-actions.ts`.
- Fixture de teste: `web/__tests__/fixtures/hibrido-fixture.ts` exporta `PROJETO`, `PAINEL`, `INVERSOR`, `BATERIA`, `CARGAS`.

**Sem migration nesta fase.**

---

## File Structure

**Lógica pura** (`web/lib/simuladores/hibrido/`):
- `montar-input.ts` — `CamposHibrido`, `CAMPOS_INICIAIS`, `DIAS_MES`, `montarHibridoInput()`, `montarPremissas()`, `parseHspColado()`

**Componentes** (`web/components/simuladores/`):
- `HibridoInputsProjeto.tsx`, `HibridoSelecaoEquipamentos.tsx`, `HibridoAvancado.tsx`
- `HibridoResultadosFV.tsx`, `HibridoResultadosArmazenamento.tsx`
- `HibridoAlertas.tsx`, `HibridoProducaoMensal.tsx`
- `SimuladorHibrido.tsx` (orquestrador)
- `CargasBuilder.tsx` — **modificado** para ser controlado

**Rotas:**
- `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` — vira o simulador
- `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx` — passa a ser dona do estado

**Testes** (`web/__tests__/`):
- `hibrido-parse-hsp.test.ts`, `hibrido-montar-input.test.ts` (puros)
- `hibrido-simulador-ui.test.tsx` (jsdom)

---

## Task 1: `parseHspColado`

**Files:**
- Create: `web/lib/simuladores/hibrido/montar-input.ts` (só esta função por ora)
- Test: `web/__tests__/hibrido-parse-hsp.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-parse-hsp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseHspColado } from '@/lib/simuladores/hibrido/montar-input'

const ESPERADO = [4.75, 4.71, 4.7, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78]

describe('parseHspColado', () => {
  it('vírgula decimal, separado por espaço', () => {
    expect(parseHspColado('4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78')).toEqual(ESPERADO)
  })
  it('ponto decimal, separado por espaço', () => {
    expect(parseHspColado('4.75 4.71 4.70 5.16 5.56 5.69 5.82 5.91 5.71 5.42 4.96 4.78')).toEqual(ESPERADO)
  })
  it('ponto decimal com vírgula separando a lista', () => {
    expect(parseHspColado('4.75, 4.71, 4.70, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78')).toEqual(ESPERADO)
  })
  it('separado por quebra de linha', () => {
    expect(parseHspColado('4,75\n4,71\n4,70\n5,16\n5,56\n5,69\n5,82\n5,91\n5,71\n5,42\n4,96\n4,78')).toEqual(ESPERADO)
  })
  it('separado por tabulação (colagem de planilha)', () => {
    expect(parseHspColado('4,75\t4,71\t4,70\t5,16\t5,56\t5,69\t5,82\t5,91\t5,71\t5,42\t4,96\t4,78')).toEqual(ESPERADO)
  })
  it('separado por ponto-e-vírgula', () => {
    expect(parseHspColado('4,75;4,71;4,70;5,16;5,56;5,69;5,82;5,91;5,71;5,42;4,96;4,78')).toEqual(ESPERADO)
  })
  it('ignora espaços nas pontas', () => {
    expect(parseHspColado('   4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78   ')).toEqual(ESPERADO)
  })
  it('aceita inteiros sem separador decimal', () => {
    expect(parseHspColado('5 5 5 5 5 5 5 5 5 5 5 5')).toEqual(new Array(12).fill(5))
  })

  it('rejeita menos de 12 números', () => {
    expect(parseHspColado('4,75 4,71 4,70')).toBeNull()
  })
  it('rejeita mais de 12 números', () => {
    expect(parseHspColado('1 2 3 4 5 6 7 8 9 10 11 12 13')).toBeNull()
  })
  it('rejeita texto não numérico', () => {
    expect(parseHspColado('jan fev mar abr mai jun jul ago set out nov dez')).toBeNull()
  })
  it('rejeita string vazia', () => {
    expect(parseHspColado('')).toBeNull()
    expect(parseHspColado('    ')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-parse-hsp`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/hibrido/montar-input.ts`:

```ts
// web/lib/simuladores/hibrido/montar-input.ts
// Ponte pura entre os campos da tela e o input do motor de cálculo.
// Nenhuma fórmula vive aqui — só tradução de formulário para domínio.

/**
 * Interpreta a linha de 12 valores de HSP colada do CRESESB/PVGIS.
 * Devolve `null` se não encontrar exatamente 12 números válidos.
 *
 * A ambiguidade da vírgula (decimal ou separador de lista) é resolvida pela
 * composição do texto, sem tentativa e erro. Isso funciona porque HSP no Brasil
 * fica entre ~3 e ~7 kWh/m²·dia: sempre um dígito antes do decimal, nunca com
 * separador de milhar.
 */
export function parseHspColado(texto: string): number[] | null {
  const t = texto.trim()
  if (t === '') return null

  const temPonto = t.includes('.')
  const temVirgula = t.includes(',')

  let normalizado: string
  if (temPonto && temVirgula) {
    // Ponto é o decimal e a vírgula separa a lista: "4.75, 4.71, …"
    normalizado = t.replace(/,/g, ' ')
  } else if (temVirgula) {
    // Só vírgula: é o decimal. "4,75 4,71 …"
    normalizado = t.replace(/,/g, '.')
  } else {
    normalizado = t
  }

  const tokens = normalizado.split(/[\s;]+/).filter((s) => s !== '')
  if (tokens.length !== 12) return null

  const numeros = tokens.map(Number)
  if (numeros.some((n) => !Number.isFinite(n))) return null
  return numeros
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-parse-hsp`
Expected: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/montar-input.ts web/__tests__/hibrido-parse-hsp.test.ts
git commit -m "feat(hibrido): parser da colagem de HSP mensal do CRESESB

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `montarHibridoInput` e `montarPremissas`

**Files:**
- Modify: `web/lib/simuladores/hibrido/montar-input.ts` (acrescenta ao final)
- Test: `web/__tests__/hibrido-montar-input.test.ts`

O ponto central desta task é a regra **"vazio ≠ zero"**: um override em branco é
omitido do input para o motor aplicar seu próprio default. Mandar `0` no lugar
produziria dimensionamento absurdo.

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-montar-input.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  CAMPOS_INICIAIS, DIAS_MES, montarHibridoInput, montarPremissas,
  type CamposHibrido, type EquipamentosDisponiveis,
} from '@/lib/simuladores/hibrido/montar-input'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { PAINEL, INVERSOR, BATERIA, CARGAS, PROJETO } from './fixtures/hibrido-fixture'

const EQUIP: EquipamentosDisponiveis = {
  paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA],
}

const COMPLETO: CamposHibrido = {
  ...CAMPOS_INICIAIS,
  tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  perdaSombreamento: 0.03, perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
}

describe('montarHibridoInput — mapeamento', () => {
  const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)

  it('monta o projeto com os campos da tela e os dias do calendário', () => {
    expect(input.projeto.hspMensal).toEqual(PROJETO.hspMensal)
    expect(input.projeto.diasMes).toEqual(DIAS_MES)
    expect(input.projeto.tempMediaC).toBe(27)
    expect(input.projeto.tempMaxC).toBe(38)
    expect(input.projeto.tempMinC).toBe(22)
    expect(input.projeto.criterioGeracao).toBe('mes_critico')
  })
  it('resolve os equipamentos pelos ids', () => {
    expect(input.painel?.modelo).toBe('MHDRZ')
    expect(input.inversor?.modelo).toBe('SUN 8K (EU)')
    expect(input.bateria?.modelo).toBe('ZTS48150P')
  })
  it('id inexistente vira null (motor trata)', () => {
    const i = montarHibridoInput({ ...COMPLETO, painelId: 'nao-existe' }, EQUIP, CARGAS)
    expect(i.painel).toBeNull()
  })
  it('repassa as cargas sem alterar', () => {
    expect(input.cargas).toEqual(CARGAS)
  })
})

describe('montarHibridoInput — regra "vazio ≠ zero"', () => {
  it('overrides em branco são OMITIDOS do input', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    expect(input.numModulos).toBeUndefined()
    expect(input.modulosPorString).toBeUndefined()
    expect(input.numStrings).toBeUndefined()
    expect(input.tensaoBancoV).toBeUndefined()
    expect(input.diasAutonomia).toBeUndefined()
  })

  it('omitir faz o motor usar o nº de módulos RECOMENDADO, não zero', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    const r = calcularHibrido(input)
    expect(r.dimensionamento.numModulos).toBe(r.dimensionamento.numModulosRecomendado)
    expect(r.dimensionamento.numModulos).toBeGreaterThan(0)
  })

  it('override preenchido chega ao motor e muda o resultado', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: '16' }, EQUIP, CARGAS)
    expect(input.numModulos).toBe(16)
    const r = calcularHibrido(input)
    expect(r.dimensionamento.numModulos).toBe(16)
    expect(r.dimensionamento.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
  })

  it('override com texto inválido é tratado como vazio', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: 'abc' }, EQUIP, CARGAS)
    expect(input.numModulos).toBeUndefined()
  })

  it('override zero explícito é respeitado (o usuário digitou 0)', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: '0' }, EQUIP, CARGAS)
    expect(input.numModulos).toBe(0)
  })

  it('baseEnergia e tipoSistema são sempre enviados (têm valor sempre)', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    expect(input.baseEnergia).toBe('total')
    expect(input.tipoSistema).toBe('Híbrido')
  })
})

describe('montarPremissas', () => {
  it('sem customização devolve exatamente as premissas padrão', () => {
    expect(montarPremissas(COMPLETO)).toEqual(PREMISSAS_PADRAO)
  })
  it('customização sobrepõe só o campo informado', () => {
    const p = montarPremissas({ ...COMPLETO, simultaneidade: '0.5' })
    expect(p.simultaneidade).toBe(0.5)
    expect(p.margemInversor).toBe(PREMISSAS_PADRAO.margemInversor)
    expect(p.soiling).toBe(PREMISSAS_PADRAO.soiling)
  })
  it('aceita margem, DC/AC máx e mín', () => {
    const p = montarPremissas({ ...COMPLETO, margemInversor: '0.3', dcAcMax: '1.5', dcAcMin: '0.9' })
    expect(p.margemInversor).toBe(0.3)
    expect(p.dcAcMax).toBe(1.5)
    expect(p.dcAcMin).toBe(0.9)
  })
  it('texto inválido não sobrepõe o padrão', () => {
    const p = montarPremissas({ ...COMPLETO, simultaneidade: 'xyz' })
    expect(p.simultaneidade).toBe(PREMISSAS_PADRAO.simultaneidade)
  })
})

describe('CAMPOS_INICIAIS', () => {
  it('tem 12 HSP e nenhum equipamento pré-selecionado', () => {
    expect(CAMPOS_INICIAIS.hspMensal).toHaveLength(12)
    expect(CAMPOS_INICIAIS.painelId).toBe('')
  })
  it('todos os overrides começam vazios', () => {
    expect(CAMPOS_INICIAIS.numModulos).toBe('')
    expect(CAMPOS_INICIAIS.modulosPorString).toBe('')
    expect(CAMPOS_INICIAIS.simultaneidade).toBe('')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-montar-input`
Expected: FAIL — funções não existem.

- [ ] **Step 3: Implementar (acrescentar ao final de `montar-input.ts`)**

```ts
import { PREMISSAS_PADRAO } from './premissas'
import type {
  Carga, EquipPainel, EquipInversor, EquipBateria, HibridoInput, Premissas,
} from './types'

/** Dias de cada mês. Calendário, não entrada do usuário. */
export const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * Campos coletados na tela. Os overrides são `string` de propósito: é o que o
 * input do formulário produz, e permite distinguir "em branco" (usar o default
 * do motor) de "zero" (o usuário digitou 0).
 */
export type CamposHibrido = {
  // Clima
  tempMediaC: number
  tempMaxC: number
  tempMinC: number
  hspMensal: number[]
  // Arranjo
  perdaSombreamento: number
  perdaOrientacao: number
  criterioGeracao: 'mes_critico' | 'media_anual'
  // Equipamentos selecionados
  painelId: string
  inversorId: string
  bateriaId: string
  // Avançado — arranjo e banco
  numModulos: string
  modulosPorString: string
  numStrings: string
  tensaoBancoV: string
  diasAutonomia: string
  baseEnergia: 'total' | 'criticas'
  tipoSistema: 'Híbrido' | 'Off-grid' | 'On-grid'
  // Avançado — premissas
  simultaneidade: string
  margemInversor: string
  dcAcMax: string
  dcAcMin: string
}

export const CAMPOS_INICIAIS: CamposHibrido = {
  tempMediaC: 25,
  tempMaxC: 35,
  tempMinC: 15,
  hspMensal: new Array(12).fill(5),
  perdaSombreamento: 0.03,
  perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
  painelId: '',
  inversorId: '',
  bateriaId: '',
  numModulos: '',
  modulosPorString: '',
  numStrings: '',
  tensaoBancoV: '',
  diasAutonomia: '',
  baseEnergia: 'total',
  tipoSistema: 'Híbrido',
  simultaneidade: '',
  margemInversor: '',
  dcAcMax: '',
  dcAcMin: '',
}

export type EquipamentosDisponiveis = {
  paineis: EquipPainel[]
  inversores: EquipInversor[]
  baterias: EquipBateria[]
}

/**
 * Campo opcional: em branco (ou inválido) devolve `undefined`, para a chave ser
 * omitida do input e o motor aplicar seu próprio default. `'0'` devolve `0` —
 * o usuário digitou zero de propósito.
 */
function opcionalNum(v: string): number | undefined {
  const t = v.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function montarHibridoInput(
  campos: CamposHibrido,
  equipamentos: EquipamentosDisponiveis,
  cargas: Carga[]
): HibridoInput {
  return {
    projeto: {
      hspMensal: campos.hspMensal,
      diasMes: DIAS_MES,
      tempMediaC: campos.tempMediaC,
      tempMaxC: campos.tempMaxC,
      tempMinC: campos.tempMinC,
      perdaSombreamento: campos.perdaSombreamento,
      perdaOrientacao: campos.perdaOrientacao,
      criterioGeracao: campos.criterioGeracao,
    },
    cargas,
    painel: equipamentos.paineis.find((p) => p.id === campos.painelId) ?? null,
    inversor: equipamentos.inversores.find((i) => i.id === campos.inversorId) ?? null,
    bateria: equipamentos.baterias.find((b) => b.id === campos.bateriaId) ?? null,
    numModulos: opcionalNum(campos.numModulos),
    modulosPorString: opcionalNum(campos.modulosPorString),
    numStrings: opcionalNum(campos.numStrings),
    tensaoBancoV: opcionalNum(campos.tensaoBancoV),
    diasAutonomia: opcionalNum(campos.diasAutonomia),
    baseEnergia: campos.baseEnergia,
    tipoSistema: campos.tipoSistema,
  }
}

/** Premissas padrão com as customizações da tela sobrepostas, quando preenchidas. */
export function montarPremissas(campos: CamposHibrido): Premissas {
  const simultaneidade = opcionalNum(campos.simultaneidade)
  const margemInversor = opcionalNum(campos.margemInversor)
  const dcAcMax = opcionalNum(campos.dcAcMax)
  const dcAcMin = opcionalNum(campos.dcAcMin)
  return {
    ...PREMISSAS_PADRAO,
    ...(simultaneidade !== undefined ? { simultaneidade } : {}),
    ...(margemInversor !== undefined ? { margemInversor } : {}),
    ...(dcAcMax !== undefined ? { dcAcMax } : {}),
    ...(dcAcMin !== undefined ? { dcAcMin } : {}),
  }
}
```

Mover o `import` do topo do arquivo para junto dos demais imports, mantendo
`parseHspColado` onde está.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-montar-input`
Expected: PASS.

Depois: `cd web && npx tsc --noEmit` → zero erros.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/montar-input.ts web/__tests__/hibrido-montar-input.test.ts
git commit -m "feat(hibrido): ponte pura entre campos da tela e input do motor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Tornar `CargasBuilder` controlado

**Files:**
- Modify: `web/components/simuladores/CargasBuilder.tsx`
- Modify: `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx`
- Create: `web/components/simuladores/CargasPageClient.tsx`

`CargasBuilder` hoje é dono do estado e traz título e aviso próprios. Para ser
embutido no simulador, vira controlado. A página `/cargas` continua existindo e
passa a ser a dona do estado, via um pequeno wrapper client.

- [ ] **Step 1: Reescrever `CargasBuilder.tsx` como controlado**

```tsx
'use client'
import { useMemo } from 'react'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga, Premissas } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { CargasTabela } from './CargasTabela'
import { CargasResumo } from './CargasResumo'
import { CargasCurva24h } from './CargasCurva24h'
import { BibliotecaCargasPanel } from './BibliotecaCargasPanel'

type Props = {
  cargas: Carga[]
  onCargasChange: (c: Carga[]) => void
  biblioteca: CargaBiblioteca[]
  onBibliotecaChange: (b: CargaBiblioteca[]) => void
  /** Título e aviso de não-persistência. Ligados na página autônoma, desligados quando embutido. */
  mostrarCabecalho?: boolean
  /** Premissas do simulador; a página autônoma usa as padrão. */
  premissas?: Premissas
}

export function CargasBuilder({
  cargas, onCargasChange, biblioteca, onBibliotecaChange,
  mostrarCabecalho = false, premissas = PREMISSAS_PADRAO,
}: Props) {
  // Os cálculos vêm do motor da Fase 2a — nenhuma fórmula vive na UI.
  const resumo = useMemo(() => calcularCargas(cargas, premissas), [cargas, premissas])

  return (
    <div className={mostrarCabecalho ? 'p-6' : ''}>
      {mostrarCabecalho && (
        <>
          <h1 className="mb-1 text-xl font-bold text-[var(--theme-text,#1a2340)]">Levantamento de cargas</h1>
          <p className="mb-3 text-sm text-[var(--theme-text-muted,#6b7280)]">
            Monte a lista de cargas da instalação. O consumo e a curva de demanda são calculados automaticamente.
          </p>
          <div className="mb-5 rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]">
            Este levantamento ainda não é salvo: ao recarregar a página, a lista é perdida.
            A persistência chega junto com o simulador completo.
          </div>
        </>
      )}

      <div className="space-y-4">
        <CargasTabela cargas={cargas} biblioteca={biblioteca} onChange={onCargasChange} />
        <CargasResumo resumo={resumo} />
        <CargasCurva24h curva={resumo.curva24h} />
        <BibliotecaCargasPanel biblioteca={biblioteca} onBibliotecaChange={onBibliotecaChange} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar o wrapper com estado da página autônoma**

Criar `web/components/simuladores/CargasPageClient.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { CargasBuilder } from './CargasBuilder'

/** Dono do estado da tela autônoma de levantamento. */
export function CargasPageClient({ biblioteca: inicial }: { biblioteca: CargaBiblioteca[] }) {
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(inicial)
  return (
    <CargasBuilder
      cargas={cargas}
      onCargasChange={setCargas}
      biblioteca={biblioteca}
      onBibliotecaChange={setBiblioteca}
      mostrarCabecalho
    />
  )
}
```

- [ ] **Step 3: Apontar a página para o wrapper**

Em `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx`, trocar o
import e o render:

```tsx
import { CargasPageClient } from '@/components/simuladores/CargasPageClient'
```

```tsx
  return <CargasPageClient biblioteca={biblioteca} />
```

- [ ] **Step 4: Verificar que nada quebrou**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo e a suíte inteira passando. Os testes existentes de
`CargasTabela` e `BibliotecaCargasPanel` não tocam `CargasBuilder`, então devem
seguir verdes sem alteração.

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/CargasBuilder.tsx web/components/simuladores/CargasPageClient.tsx "web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx"
git commit -m "refactor(hibrido): CargasBuilder controlado para poder ser embutido

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `HibridoInputsProjeto`

**Files:**
- Create: `web/components/simuladores/HibridoInputsProjeto.tsx`
- Create: `web/__tests__/hibrido-simulador-ui.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-simulador-ui.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HibridoInputsProjeto } from '@/components/simuladores/HibridoInputsProjeto'
import { CAMPOS_INICIAIS, type CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const LINHA_HSP = '4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78'

function ProjetoComEstado({ inicial = CAMPOS_INICIAIS }: { inicial?: CamposHibrido }) {
  const [campos, setCampos] = useState<CamposHibrido>(inicial)
  return <HibridoInputsProjeto campos={campos} onChange={setCampos} />
}

describe('HibridoInputsProjeto', () => {
  it('renderiza os 12 campos de HSP', () => {
    render(<ProjetoComEstado />)
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`hsp-${i}`)).toBeInTheDocument()
    }
  })

  it('colar 12 valores preenche todos os campos', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.type(screen.getByTestId('hsp-colar'), LINHA_HSP)
    await user.click(screen.getByTestId('btn-aplicar-hsp'))
    expect(screen.getByTestId('hsp-0')).toHaveValue(4.75)
    expect(screen.getByTestId('hsp-2')).toHaveValue(4.7)
    expect(screen.getByTestId('hsp-11')).toHaveValue(4.78)
  })

  it('colagem inválida avisa e NÃO altera os valores existentes', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    const antes = (screen.getByTestId('hsp-0') as HTMLInputElement).value
    await user.type(screen.getByTestId('hsp-colar'), '1 2 3')
    await user.click(screen.getByTestId('btn-aplicar-hsp'))
    expect(screen.getByTestId('erro-hsp')).toBeInTheDocument()
    expect((screen.getByTestId('hsp-0') as HTMLInputElement).value).toBe(antes)
  })

  it('editar uma temperatura propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.clear(screen.getByTestId('temp-media'))
    await user.type(screen.getByTestId('temp-media'), '27')
    expect(screen.getByTestId('temp-media')).toHaveValue(27)
  })

  it('permite trocar o critério de geração', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.selectOptions(screen.getByTestId('criterio-geracao'), 'media_anual')
    expect(screen.getByTestId('criterio-geracao')).toHaveValue('media_anual')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar `HibridoInputsProjeto.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { parseHspColado, type CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Props = { campos: CamposHibrido; onChange: (c: CamposHibrido) => void }

export function HibridoInputsProjeto({ campos, onChange }: Props) {
  const [colado, setColado] = useState('')
  const [erroColagem, setErroColagem] = useState(false)

  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })
  const num = (v: string) => (v === '' ? 0 : Number(v))

  function aplicarColagem() {
    const valores = parseHspColado(colado)
    if (!valores) { setErroColagem(true); return }
    setErroColagem(false)
    setColado('')
    set({ hspMensal: valores })
  }

  function setHsp(i: number, v: string) {
    const novo = [...campos.hspMensal]
    novo[i] = num(v)
    set({ hspMensal: novo })
  }

  return (
    <div className={CARD}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Projeto e clima</h2>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label className="text-[11px]">Temp. média (°C)
          <input type="number" step="any" className={IN} data-testid="temp-media"
            value={campos.tempMediaC} onChange={(e) => set({ tempMediaC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Temp. máxima (°C)
          <input type="number" step="any" className={IN} data-testid="temp-max"
            value={campos.tempMaxC} onChange={(e) => set({ tempMaxC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Temp. mínima (°C)
          <input type="number" step="any" className={IN} data-testid="temp-min"
            value={campos.tempMinC} onChange={(e) => set({ tempMinC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Perda por sombreamento
          <input type="number" step="any" className={IN} data-testid="perda-sombra"
            value={campos.perdaSombreamento} onChange={(e) => set({ perdaSombreamento: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Perda por orientação
          <input type="number" step="any" className={IN} data-testid="perda-orientacao"
            value={campos.perdaOrientacao} onChange={(e) => set({ perdaOrientacao: num(e.target.value) })} />
        </label>
      </div>

      <div className="mt-3 max-w-xs">
        <label className="text-[11px]">Critério de geração
          <select className={IN} data-testid="criterio-geracao" value={campos.criterioGeracao}
            onChange={(e) => set({ criterioGeracao: e.target.value as CamposHibrido['criterioGeracao'] })}>
            <option value="mes_critico">Mês crítico (conservador)</option>
            <option value="media_anual">Média anual</option>
          </select>
        </label>
      </div>

      <h3 className="mt-5 text-xs font-semibold text-[var(--theme-text,#1a2340)]">
        Irradiação mensal — HSP (kWh/m²·dia)
      </h3>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Consulte no CRESESB ou PVGIS e cole a linha dos 12 meses abaixo, ou preencha campo a campo.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-[11px] flex-1 min-w-64">Colar os 12 valores
          <input className={IN} data-testid="hsp-colar" value={colado}
            placeholder="4,75 4,71 4,70 …"
            onChange={(e) => { setColado(e.target.value); setErroColagem(false) }} />
        </label>
        <button type="button" data-testid="btn-aplicar-hsp" onClick={aplicarColagem}
          className="rounded border px-3 py-1.5 text-sm">Aplicar</button>
      </div>
      {erroColagem && (
        <p className="mb-3 text-[11px] text-[#c0392b]" data-testid="erro-hsp">
          Não encontrei exatamente 12 números. Confira a colagem — os valores atuais não foram alterados.
        </p>
      )}

      <div className="grid gap-2 grid-cols-3 sm:grid-cols-6 lg:grid-cols-12">
        {MESES.map((m, i) => (
          <label key={m} className="text-[11px]">{m}
            <input type="number" step="any" className={IN} data-testid={`hsp-${i}`}
              value={campos.hspMensal[i] ?? 0} onChange={(e) => setHsp(i, e.target.value)} />
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoInputsProjeto.tsx web/__tests__/hibrido-simulador-ui.test.tsx
git commit -m "feat(hibrido): inputs de projeto e clima com colagem de HSP

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `HibridoSelecaoEquipamentos`

**Files:**
- Create: `web/components/simuladores/HibridoSelecaoEquipamentos.tsx`
- Modify: `web/__tests__/hibrido-simulador-ui.test.tsx`

- [ ] **Step 1: Escrever os testes falhando**

Acrescentar ao fim de `web/__tests__/hibrido-simulador-ui.test.tsx`:

```tsx
import { HibridoSelecaoEquipamentos } from '@/components/simuladores/HibridoSelecaoEquipamentos'
import type { EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'
import { PAINEL, INVERSOR, BATERIA } from './fixtures/hibrido-fixture'

const EQUIP: EquipamentosDisponiveis = {
  paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA],
}
const VAZIO: EquipamentosDisponiveis = { paineis: [], inversores: [], baterias: [] }

function SelecaoComEstado({ equipamentos = EQUIP }: { equipamentos?: EquipamentosDisponiveis }) {
  const [campos, setCampos] = useState<CamposHibrido>(CAMPOS_INICIAIS)
  return <HibridoSelecaoEquipamentos campos={campos} equipamentos={equipamentos} onChange={setCampos} />
}

describe('HibridoSelecaoEquipamentos', () => {
  it('lista os equipamentos cadastrados', () => {
    render(<SelecaoComEstado />)
    expect(screen.getByTestId('sel-painel')).toBeInTheDocument()
    expect(screen.getByText(/OSDA MHDRZ/)).toBeInTheDocument()
  })

  it('escolher um painel guarda o id', async () => {
    const user = userEvent.setup()
    render(<SelecaoComEstado />)
    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    expect(screen.getByTestId('sel-painel')).toHaveValue(PAINEL.id)
  })

  it('começa sem nada selecionado', () => {
    render(<SelecaoComEstado />)
    expect(screen.getByTestId('sel-painel')).toHaveValue('')
  })

  it('sem equipamentos cadastrados mostra aviso com link para o cadastro', () => {
    render(<SelecaoComEstado equipamentos={VAZIO} />)
    const aviso = screen.getByTestId('aviso-sem-equipamentos')
    expect(aviso).toBeInTheDocument()
    expect(aviso.querySelector('a')).toHaveAttribute('href', '/simuladores/hibrido-offgrid/equipamentos')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar `HibridoSelecaoEquipamentos.tsx`**

```tsx
'use client'
import Link from 'next/link'
import type { CamposHibrido, EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Props = {
  campos: CamposHibrido
  equipamentos: EquipamentosDisponiveis
  onChange: (c: CamposHibrido) => void
}

export function HibridoSelecaoEquipamentos({ campos, equipamentos, onChange }: Props) {
  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })
  const nada =
    equipamentos.paineis.length === 0 &&
    equipamentos.inversores.length === 0 &&
    equipamentos.baterias.length === 0

  return (
    <div className={CARD}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Equipamentos</h2>

      {nada && (
        <div
          className="mb-3 rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]"
          data-testid="aviso-sem-equipamentos"
        >
          Nenhum equipamento cadastrado ainda. Cadastre painéis, inversores e baterias em{' '}
          <Link href="/simuladores/hibrido-offgrid/equipamentos" className="underline">
            Cadastro de equipamentos
          </Link>{' '}
          para o dimensionamento funcionar.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[11px]">Painel
          <select className={IN} data-testid="sel-painel" value={campos.painelId}
            onChange={(e) => set({ painelId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.paineis.map((p) => (
              <option key={p.id} value={p.id}>{p.fabricante} {p.modelo} · {p.potenciaWp} Wp</option>
            ))}
          </select>
        </label>
        <label className="text-[11px]">Inversor
          <select className={IN} data-testid="sel-inversor" value={campos.inversorId}
            onChange={(e) => set({ inversorId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.inversores.map((i) => (
              <option key={i.id} value={i.id}>{i.fabricante} {i.modelo} · {i.potCaNomW} W</option>
            ))}
          </select>
        </label>
        <label className="text-[11px]">Bateria
          <select className={IN} data-testid="sel-bateria" value={campos.bateriaId}
            onChange={(e) => set({ bateriaId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.baterias.map((b) => (
              <option key={b.id} value={b.id}>{b.fabricante} {b.modelo} · {b.tensaoV} V/{b.capacidadeAh} Ah</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoSelecaoEquipamentos.tsx web/__tests__/hibrido-simulador-ui.test.tsx
git commit -m "feat(hibrido): selecao de equipamentos com estado vazio orientado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `HibridoAvancado`

**Files:**
- Create: `web/components/simuladores/HibridoAvancado.tsx`

Painel recolhível de overrides. **Todo campo numérico aqui é `string`** para
preservar a distinção entre vazio (usar default do motor) e zero.

- [ ] **Step 1: Implementar**

Criar `web/components/simuladores/HibridoAvancado.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type CampoTexto = {
  key: 'numModulos' | 'modulosPorString' | 'numStrings' | 'tensaoBancoV' | 'diasAutonomia'
    | 'simultaneidade' | 'margemInversor' | 'dcAcMax' | 'dcAcMin'
  label: string
  placeholder: string
}

const ARRANJO: CampoTexto[] = [
  { key: 'numModulos', label: 'Nº de módulos', placeholder: 'recomendado' },
  { key: 'modulosPorString', label: 'Módulos por string', placeholder: 'máximo' },
  { key: 'numStrings', label: 'Nº de strings', placeholder: 'automático' },
  { key: 'tensaoBancoV', label: 'Tensão do banco (V)', placeholder: 'do inversor' },
  { key: 'diasAutonomia', label: 'Dias de autonomia', placeholder: '2' },
]

const PREMISSAS: CampoTexto[] = [
  { key: 'simultaneidade', label: 'Fator de simultaneidade', placeholder: '0,7' },
  { key: 'margemInversor', label: 'Margem do inversor', placeholder: '0,25' },
  { key: 'dcAcMax', label: 'DC/AC máximo', placeholder: '1,35' },
  { key: 'dcAcMin', label: 'DC/AC mínimo', placeholder: '1' },
]

type Props = { campos: CamposHibrido; onChange: (c: CamposHibrido) => void }

export function HibridoAvancado({ campos, onChange }: Props) {
  const [aberto, setAberto] = useState(false)
  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })

  return (
    <div className={CARD}>
      <button type="button" data-testid="btn-toggle-avancado" onClick={() => setAberto((a) => !a)}
        className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        {aberto ? '▾' : '▸'} Ajustes avançados
      </button>

      {aberto && (
        <div className="mt-3">
          <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
            Campos em branco usam o valor calculado ou padrão. Preencha só o que quiser forçar.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ARRANJO.map((c) => (
              <label key={c.key} className="text-[11px]">{c.label}
                <input className={IN} data-testid={`av-${c.key}`} placeholder={c.placeholder}
                  value={campos[c.key]} onChange={(e) => set({ [c.key]: e.target.value } as Partial<CamposHibrido>)} />
              </label>
            ))}
            <label className="text-[11px]">Base da energia
              <select className={IN} data-testid="av-baseEnergia" value={campos.baseEnergia}
                onChange={(e) => set({ baseEnergia: e.target.value as CamposHibrido['baseEnergia'] })}>
                <option value="total">Consumo total</option>
                <option value="criticas">Só cargas críticas</option>
              </select>
            </label>
            <label className="text-[11px]">Tipo de sistema
              <select className={IN} data-testid="av-tipoSistema" value={campos.tipoSistema}
                onChange={(e) => set({ tipoSistema: e.target.value as CamposHibrido['tipoSistema'] })}>
                <option value="Híbrido">Híbrido</option>
                <option value="Off-grid">Off-grid</option>
                <option value="On-grid">On-grid</option>
              </select>
            </label>
          </div>

          <h3 className="mt-4 text-xs font-semibold text-[var(--theme-text,#1a2340)]">Premissas</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PREMISSAS.map((c) => (
              <label key={c.key} className="text-[11px]">{c.label}
                <input className={IN} data-testid={`av-${c.key}`} placeholder={c.placeholder}
                  value={campos[c.key]} onChange={(e) => set({ [c.key]: e.target.value } as Partial<CamposHibrido>)} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add web/components/simuladores/HibridoAvancado.tsx
git commit -m "feat(hibrido): painel de ajustes avancados com overrides opcionais

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Componentes de resultado

**Files:**
- Create: `web/components/simuladores/HibridoResultadosFV.tsx`
- Create: `web/components/simuladores/HibridoResultadosArmazenamento.tsx`
- Create: `web/components/simuladores/HibridoProducaoMensal.tsx`

Componentes de exibição pura: recebem o resultado do motor e formatam.

- [ ] **Step 1: Criar um bloco de exibição reutilizável e `HibridoResultadosFV.tsx`**

Criar `web/components/simuladores/HibridoResultadosFV.tsx`:

```tsx
'use client'
import type { ResultadoDimensionamento, ResultadoStrings } from '@/lib/simuladores/hibrido/types'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number) => `${n(v * 100, 1)}%`

export type Linha = { id: string; label: string; valor: string }

export function BlocoValores({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">{titulo}</h3>
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

export function HibridoResultadosFV({
  dim, strings,
}: { dim: ResultadoDimensionamento; strings: ResultadoStrings }) {
  const mesCritico = dim.mesCriticoIndice >= 0 ? MESES[dim.mesCriticoIndice] : '—'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BlocoValores titulo="Dimensionamento fotovoltaico" linhas={[
        { id: 'r-pr-base', label: 'PR base', valor: pct(dim.prBase) },
        { id: 'r-pr-efetivo', label: 'PR efetivo (sombra + orientação)', valor: pct(dim.prEfetivo) },
        { id: 'r-temp-celula', label: 'Temperatura de célula', valor: `${n(dim.tempCelulaC, 1)} °C` },
        { id: 'r-fator-temp', label: 'Fator de temperatura', valor: pct(dim.fatorTemperatura) },
        { id: 'r-pr-total', label: 'PR total', valor: pct(dim.prTotal) },
        { id: 'r-hsp-dim', label: 'HSP de dimensionamento', valor: n(dim.hspDimensionamento) },
        { id: 'r-mes-critico', label: 'Mês crítico', valor: mesCritico },
        { id: 'r-energia-modulo', label: 'Energia por módulo', valor: `${n(dim.energiaPorModuloKwhDia)} kWh/dia` },
        { id: 'r-num-recomendado', label: 'Nº de módulos recomendado', valor: n(dim.numModulosRecomendado, 0) },
        { id: 'r-num-modulos', label: 'Nº de módulos adotado', valor: n(dim.numModulos, 0) },
        { id: 'r-kwp', label: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { id: 'r-area', label: 'Área necessária', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { id: 'r-prod-diaria', label: 'Produção diária', valor: `${n(dim.producaoDiariaKwh)} kWh` },
        { id: 'r-prod-anual', label: 'Produção anual', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { id: 'r-oversizing', label: 'Oversizing DC/AC', valor: n(dim.oversizingDcAc) },
      ]} />

      <BlocoValores titulo="Arranjo e verificação elétrica" linhas={[
        { id: 'r-voc-tmin', label: 'Voc @ Tmin (por módulo)', valor: `${n(strings.vocTminV)} V` },
        { id: 'r-vmp-tmax', label: 'Vmp @ Tmax (por módulo)', valor: `${n(strings.vmpTmaxV)} V` },
        { id: 'r-max-mod-string', label: 'Máx. módulos por string', valor: n(strings.maxModulosPorString, 0) },
        { id: 'r-min-mod-string', label: 'Mín. módulos por string', valor: n(strings.minModulosPorString, 0) },
        { id: 'r-mod-string', label: 'Módulos por string (adotado)', valor: n(strings.modulosPorString, 0) },
        { id: 'r-num-strings', label: 'Nº de strings', valor: n(strings.numStrings, 0) },
        { id: 'r-tensao-voc', label: 'Tensão da string @ Tmin', valor: `${n(strings.tensaoStringVocTminV)} V` },
        { id: 'r-tensao-vmp', label: 'Tensão da string @ Tmax', valor: `${n(strings.tensaoStringVmpTmaxV)} V` },
        { id: 'r-corrente-projeto', label: 'Corrente de projeto (1,25×Isc)', valor: `${n(strings.correnteProjetoA)} A` },
        { id: 'r-corrente-mppt', label: 'Corrente por MPPT', valor: `${n(strings.correntePorMpptA)} A` },
        { id: 'r-mod-configurados', label: 'Módulos configurados', valor: n(strings.modulosConfigurados, 0) },
      ]} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `HibridoResultadosArmazenamento.tsx`**

```tsx
'use client'
import type { ResultadoBaterias, ResultadoInversor } from '@/lib/simuladores/hibrido/types'
import { BlocoValores } from './HibridoResultadosFV'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number) => `${n(v * 100, 1)}%`

export function HibridoResultadosArmazenamento({
  bat, inv,
}: { bat: ResultadoBaterias; inv: ResultadoInversor }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BlocoValores titulo="Banco de baterias" linhas={[
        { id: 'r-bat-tensao', label: 'Tensão do banco', valor: `${n(bat.tensaoBancoV, 0)} V` },
        { id: 'r-bat-dod-util', label: 'DOD útil', valor: pct(bat.dodUtil) },
        { id: 'r-bat-eta', label: 'η do sistema', valor: pct(bat.etaSistema) },
        { id: 'r-bat-energia-necessaria', label: 'Energia útil necessária', valor: `${n(bat.energiaUtilNecessariaKwh)} kWh` },
        { id: 'r-bat-energia-nominal', label: 'Energia nominal do banco', valor: `${n(bat.energiaNominalBancoKwh)} kWh` },
        { id: 'r-bat-serie-paralelo', label: 'Série × paralelo', valor: `${n(bat.bateriasSerie, 0)} × ${n(bat.stringsParalelo, 0)}` },
        { id: 'r-bat-num', label: 'Nº de baterias', valor: n(bat.numBaterias, 0) },
        { id: 'r-bat-energia-instalada', label: 'Energia instalada', valor: `${n(bat.energiaInstaladaKwh)} kWh` },
        { id: 'r-bat-capacidade', label: 'Capacidade do banco', valor: `${n(bat.capacidadeBancoAh, 0)} Ah` },
        { id: 'r-bat-energia-util', label: 'Energia útil real', valor: `${n(bat.energiaUtilRealKwh)} kWh` },
        { id: 'r-bat-autonomia', label: 'Autonomia real', valor: `${n(bat.autonomiaRealDias)} dias` },
        { id: 'r-bat-crate', label: 'C-rate de descarga', valor: n(bat.cRateDescarga) },
        { id: 'r-bat-recarga', label: 'Tempo de recarga', valor: `${n(bat.tempoRecargaH)} h` },
        { id: 'r-bat-vida', label: 'Vida útil estimada', valor: `${n(bat.vidaUtilAnos, 1)} anos` },
      ]} />

      <BlocoValores titulo="Inversor" linhas={[
        { id: 'r-inv-pot-minima', label: 'Potência CA mínima', valor: `${n(inv.potenciaCaMinimaW, 0)} W` },
        { id: 'r-inv-folga', label: 'Folga de potência', valor: `${n(inv.folgaPotenciaW, 0)} W` },
        { id: 'r-inv-utilizacao', label: 'Utilização contínua', valor: pct(inv.utilizacaoContinua) },
        { id: 'r-inv-surge', label: 'Relação surge / partida', valor: n(inv.relacaoSurgePartida) },
        { id: 'r-inv-uso-fv', label: 'Uso da entrada FV', valor: pct(inv.usoEntradaFv) },
        { id: 'r-inv-paralelo', label: 'Inversores em paralelo', valor: n(inv.numInversoresParalelo, 0) },
        { id: 'r-inv-pot-total', label: 'Potência CA total', valor: `${n(inv.potenciaCaTotalW, 0)} W` },
      ]} />
    </div>
  )
}
```

- [ ] **Step 3: Criar `HibridoProducaoMensal.tsx`**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function HibridoProducaoMensal({ producaoMensalKwh }: { producaoMensalKwh: number[] }) {
  const data = producaoMensalKwh.map((kwh, i) => ({ mes: MESES[i] ?? String(i), kwh }))
  const temProducao = producaoMensalKwh.some((v) => v > 0)

  return (
    <div
      className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4"
      data-testid="producao-mensal"
    >
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Produção mensal estimada (kWh)</h3>
      {!temProducao ? (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Selecione o painel e informe a irradiação para ver a produção.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`, 'Produção']} />
            <Bar dataKey="kwh" fill="#FF9F40" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

**Nota:** o `formatter` do Tooltip fica **sem anotação de tipo** no parâmetro. Os
tipos do recharts entregam `ValueType | undefined`; anotar como `number` quebra o
`tsc` (aconteceu na Fase 3a). `Number(v)` resolve.

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoResultadosFV.tsx web/components/simuladores/HibridoResultadosArmazenamento.tsx web/components/simuladores/HibridoProducaoMensal.tsx
git commit -m "feat(hibrido): blocos de resultado FV, armazenamento e producao mensal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `HibridoAlertas`

**Files:**
- Create: `web/components/simuladores/HibridoAlertas.tsx`
- Modify: `web/__tests__/hibrido-simulador-ui.test.tsx`

- [ ] **Step 1: Escrever os testes falhando**

Acrescentar ao fim de `web/__tests__/hibrido-simulador-ui.test.tsx`:

```tsx
import { HibridoAlertas } from '@/components/simuladores/HibridoAlertas'
import type { Alerta } from '@/lib/simuladores/hibrido/types'

const ALERTAS: Alerta[] = [
  { codigo: 'SOBRETENSAO', severidade: 'erro', mensagem: 'Tensão da string no frio excede a tensão CC máxima do inversor.', valor: 520, limite: 500 },
  { codigo: 'OVERSIZING_ALTO', severidade: 'aviso', mensagem: 'Relação DC/AC acima do máximo recomendado.', valor: 1.5, limite: 1.35 },
  { codigo: 'CORRENTE_MPPT', severidade: 'ok', mensagem: 'Corrente por MPPT dentro do limite.', valor: 16, limite: 22 },
]

describe('HibridoAlertas', () => {
  it('lista todos os alertas recebidos', () => {
    render(<HibridoAlertas alertas={ALERTAS} />)
    expect(screen.getByTestId('alerta-SOBRETENSAO')).toBeInTheDocument()
    expect(screen.getByTestId('alerta-OVERSIZING_ALTO')).toBeInTheDocument()
    expect(screen.getByTestId('alerta-CORRENTE_MPPT')).toBeInTheDocument()
  })

  it('distingue erro, aviso e ok', () => {
    render(<HibridoAlertas alertas={ALERTAS} />)
    expect(screen.getByTestId('alerta-SOBRETENSAO')).toHaveAttribute('data-severidade', 'erro')
    expect(screen.getByTestId('alerta-OVERSIZING_ALTO')).toHaveAttribute('data-severidade', 'aviso')
    expect(screen.getByTestId('alerta-CORRENTE_MPPT')).toHaveAttribute('data-severidade', 'ok')
  })

  it('resume quantos erros e avisos existem', () => {
    render(<HibridoAlertas alertas={ALERTAS} />)
    expect(screen.getByTestId('alertas-resumo')).toHaveTextContent('1 erro')
    expect(screen.getByTestId('alertas-resumo')).toHaveTextContent('1 aviso')
  })

  it('mostra valor e limite quando existem', () => {
    render(<HibridoAlertas alertas={ALERTAS} />)
    expect(screen.getByTestId('alerta-SOBRETENSAO')).toHaveTextContent('520')
    expect(screen.getByTestId('alerta-SOBRETENSAO')).toHaveTextContent('500')
  })

  it('lista vazia mostra mensagem neutra', () => {
    render(<HibridoAlertas alertas={[]} />)
    expect(screen.getByText(/Nenhuma verificação/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar `HibridoAlertas.tsx`**

```tsx
'use client'
import type { Alerta, SeveridadeAlerta } from '@/lib/simuladores/hibrido/types'

const ESTILO: Record<SeveridadeAlerta, { cor: string; icone: string }> = {
  erro: { cor: 'border-[#f0b4ab] bg-[#fdf0ee] text-[#c0392b]', icone: '✕' },
  aviso: { cor: 'border-[#f0d9a8] bg-[#fff6e6] text-[#b26b00]', icone: '!' },
  ok: { cor: 'border-[#bce8ce] bg-[#f0fbf4] text-[#1f9d55]', icone: '✓' },
}

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

const plural = (q: number, sing: string, plur: string) => `${q} ${q === 1 ? sing : plur}`

export function HibridoAlertas({ alertas }: { alertas: Alerta[] }) {
  const erros = alertas.filter((a) => a.severidade === 'erro').length
  const avisos = alertas.filter((a) => a.severidade === 'aviso').length

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">Verificações normativas</h3>
        <span className="text-xs text-[var(--theme-text-muted,#7b8194)]" data-testid="alertas-resumo">
          {plural(erros, 'erro', 'erros')} · {plural(avisos, 'aviso', 'avisos')}
        </span>
      </div>

      {alertas.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma verificação disponível ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {alertas.map((a) => {
            const e = ESTILO[a.severidade]
            return (
              <li key={a.codigo} data-testid={`alerta-${a.codigo}`} data-severidade={a.severidade}
                className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${e.cor}`}>
                <span aria-hidden className="font-bold">{e.icone}</span>
                <span className="flex-1">
                  {a.mensagem}
                  {a.valor !== undefined && a.limite !== undefined && (
                    <span className="opacity-70"> ({n(a.valor)} / limite {n(a.limite)})</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: PASS (14 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoAlertas.tsx web/__tests__/hibrido-simulador-ui.test.tsx
git commit -m "feat(hibrido): checklist de verificacoes normativas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: `SimuladorHibrido` e a rota

**Files:**
- Create: `web/components/simuladores/SimuladorHibrido.tsx`
- Modify: `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`
- Modify: `web/__tests__/hibrido-simulador-ui.test.tsx`

- [ ] **Step 1: Escrever o teste de integração falhando**

Acrescentar ao fim de `web/__tests__/hibrido-simulador-ui.test.tsx`:

```tsx
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'
import { montarHibridoInput, montarPremissas } from '@/lib/simuladores/hibrido/montar-input'
import { calcularHibrido } from '@/lib/simuladores/hibrido'

describe('SimuladorHibrido (integração — a tela mostra o que o motor calculou)', () => {
  it('com painel selecionado e 16 módulos forçados, exibe o kWp e a produção do motor', async () => {
    const user = userEvent.setup()
    render(<SimuladorHibrido equipamentos={EQUIP} biblioteca={[]} />)

    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    await user.selectOptions(screen.getByTestId('sel-inversor'), INVERSOR.id)
    await user.click(screen.getByTestId('btn-toggle-avancado'))
    await user.type(screen.getByTestId('av-numModulos'), '16')

    // O esperado é calculado pelo MOTOR, com os mesmos campos que a tela tem.
    const campos: CamposHibrido = {
      ...CAMPOS_INICIAIS,
      painelId: PAINEL.id, inversorId: INVERSOR.id, numModulos: '16',
    }
    const esperado = calcularHibrido(
      montarHibridoInput(campos, EQUIP, []),
      montarPremissas(campos)
    )

    const fmt = (v: number, c = 2) =>
      v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c })

    expect(screen.getByTestId('r-kwp')).toHaveTextContent(fmt(esperado.dimensionamento.potenciaInstaladaKwp))
    expect(screen.getByTestId('r-prod-anual')).toHaveTextContent(fmt(esperado.dimensionamento.producaoAnualKwh, 0))
    expect(screen.getByTestId('r-num-modulos')).toHaveTextContent('16')
  })

  it('sem nada selecionado mostra o alerta de dados insuficientes', () => {
    render(<SimuladorHibrido equipamentos={EQUIP} biblioteca={[]} />)
    expect(screen.getByTestId('alerta-DADOS_INSUFICIENTES')).toBeInTheDocument()
  })

  it('sem equipamentos cadastrados orienta o usuário ao cadastro', () => {
    render(<SimuladorHibrido equipamentos={VAZIO} biblioteca={[]} />)
    expect(screen.getByTestId('aviso-sem-equipamentos')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulador-ui`
Expected: FAIL — `SimuladorHibrido` não existe.

- [ ] **Step 3: Implementar `SimuladorHibrido.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import {
  CAMPOS_INICIAIS, montarHibridoInput, montarPremissas,
  type CamposHibrido, type EquipamentosDisponiveis,
} from '@/lib/simuladores/hibrido/montar-input'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { HibridoInputsProjeto } from './HibridoInputsProjeto'
import { HibridoSelecaoEquipamentos } from './HibridoSelecaoEquipamentos'
import { HibridoAvancado } from './HibridoAvancado'
import { HibridoResultadosFV } from './HibridoResultadosFV'
import { HibridoResultadosArmazenamento } from './HibridoResultadosArmazenamento'
import { HibridoProducaoMensal } from './HibridoProducaoMensal'
import { HibridoAlertas } from './HibridoAlertas'
import { CargasBuilder } from './CargasBuilder'

type Props = {
  equipamentos: EquipamentosDisponiveis
  biblioteca: CargaBiblioteca[]
}

export function SimuladorHibrido({ equipamentos, biblioteca: bibliotecaInicial }: Props) {
  const [campos, setCampos] = useState<CamposHibrido>(CAMPOS_INICIAIS)
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(bibliotecaInicial)

  // Uma única fonte: o input montado gera o resultado. Nenhum cálculo na UI.
  const premissas = useMemo(() => montarPremissas(campos), [campos])
  const input = useMemo(
    () => montarHibridoInput(campos, equipamentos, cargas),
    [campos, equipamentos, cargas]
  )
  const resultado = useMemo(() => calcularHibrido(input, premissas), [input, premissas])

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simulador Híbrido / Off-grid</h1>
        <span className="rounded bg-[#fff6e6] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#b26b00] border border-[#f0d9a8]">
          EM CONSTRUÇÃO
        </span>
      </div>
      <p className="mb-4 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Dimensionamento fotovoltaico, banco de baterias e inversor. Os resultados financeiros chegam na próxima etapa.
      </p>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <Link href="/simuladores/hibrido-offgrid/equipamentos" className="text-[#3b6fd6] underline">
          Cadastro de equipamentos
        </Link>
        <Link href="/simuladores/hibrido-offgrid/cargas" className="text-[#3b6fd6] underline">
          Levantamento de cargas (tela dedicada)
        </Link>
      </div>

      <div className="space-y-4">
        <HibridoInputsProjeto campos={campos} onChange={setCampos} />
        <HibridoSelecaoEquipamentos campos={campos} equipamentos={equipamentos} onChange={setCampos} />

        <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cargas</h2>
          <CargasBuilder
            cargas={cargas}
            onCargasChange={setCargas}
            biblioteca={biblioteca}
            onBibliotecaChange={setBiblioteca}
            premissas={premissas}
          />
        </div>

        <HibridoAvancado campos={campos} onChange={setCampos} />

        <HibridoAlertas alertas={resultado.alertas} />
        <HibridoResultadosFV dim={resultado.dimensionamento} strings={resultado.strings} />
        <HibridoProducaoMensal producaoMensalKwh={resultado.dimensionamento.producaoMensalKwh} />
        <HibridoResultadosArmazenamento bat={resultado.baterias} inv={resultado.inversor} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Trocar a página placeholder pelo simulador**

Substituir todo o conteúdo de
`web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` por:

```tsx
export const metadata = { title: 'Híbrido / Off-grid' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import {
  listPaineis, listInversores, listBaterias,
} from '@/lib/simuladores/equipamentos/equipamentos-actions'
import {
  listCargasBiblioteca, seedCargasBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'

export default async function HibridoOffgridPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')

  const [paineis, inversores, baterias] = await Promise.all([
    listPaineis(), listInversores(), listBaterias(),
  ])

  // Seed no primeiro acesso, mesmo comportamento da tela de cargas.
  let biblioteca = await listCargasBiblioteca()
  if (biblioteca.length === 0) {
    await seedCargasBiblioteca()
    biblioteca = await listCargasBiblioteca()
  }

  return (
    <SimuladorHibrido
      equipamentos={{ paineis, inversores, baterias }}
      biblioteca={biblioteca}
    />
  )
}
```

**Caminho confirmado:** as actions de equipamentos vivem em
`web/lib/simuladores/equipamentos/equipamentos-actions.ts` (verificado), e não
sob `hibrido/` como o resto do motor. `listPaineis`, `listInversores` e
`listBaterias` são exportadas de lá.

- [ ] **Step 5: Rodar tudo**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; suíte inteira verde.

- [ ] **Step 6: Verificação no navegador**

Sem migration nesta fase — as tabelas já existem em produção. Subir o dev server
pela ferramenta de preview e conferir:
- `/simuladores/hibrido-offgrid` abre o simulador (não mais o placeholder)
- Colar `4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78` e aplicar preenche os 12 meses
- Selecionar painel/inversor/bateria faz os resultados aparecerem
- Adicionar cargas atualiza consumo, curva e dimensionamento
- Os alertas mudam de cor conforme o dimensionamento
- Os dois links de navegação funcionam

Se não for possível autenticar, reporte o que ficou pendente em vez de pular
silenciosamente.

- [ ] **Step 7: Commit**

```bash
git add web/components/simuladores/SimuladorHibrido.tsx "web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx" web/__tests__/hibrido-simulador-ui.test.tsx
git commit -m "feat(hibrido): tela do simulador com resultados fisicos ao vivo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- `parseHspColado` com a tabela determinística → Task 1 ✔
- `montarHibridoInput`/`montarPremissas` + regra "vazio ≠ zero" → Task 2 ✔
- `CargasBuilder` controlado + página autônoma preservada → Task 3 ✔
- Inputs de clima/perdas/critério + colagem → Task 4 ✔
- Seleção de equipamentos + estado vazio orientado → Task 5 ✔
- Avançado com os campos curados (sem perda por sujeira) → Task 6 ✔
- Resultados FV, strings, baterias, inversor, produção mensal → Task 7 ✔
- Alertas com erro/aviso/ok → Task 8 ✔
- Orquestrador + rota + teste de integração motor↔tela → Task 9 ✔
- Fora de escopo respeitado: nenhum campo de tarifa, identificação, azimute ou inclinação ✔

**2. Placeholders:** nenhum; todo código está completo.

**3. Consistência de tipos:** `CamposHibrido` e `EquipamentosDisponiveis` são
definidos na Task 2 e usados nas Tasks 4, 5, 6 e 9 com os mesmos nomes.
`BlocoValores` é exportado por `HibridoResultadosFV.tsx` (Task 7) e reutilizado
por `HibridoResultadosArmazenamento.tsx`. Os `data-testid` dos testes das Tasks
4, 5, 8 e 9 são exatamente os emitidos pelos componentes.

**Notas de risco:**
- As actions de equipamentos ficam em `lib/simuladores/**equipamentos**/`, não
  sob `hibrido/` como o resto do motor — assimetria herdada da Fase 1. Caminho
  já verificado e corrigido no plano.
- O `formatter` do Tooltip do recharts fica sem anotação de tipo no parâmetro;
  anotar como `number` quebra o `tsc` (já aconteceu na Fase 3a).
- `CAMPOS_INICIAIS.hspMensal` é `new Array(12).fill(5)` — um valor neutro de
  partida, não um dado de irradiação real. O texto da tela orienta a consultar
  CRESESB/PVGIS.
- O teste de integração da Task 9 depende de `CAMPOS_INICIAIS` continuar com os
  overrides vazios; se alguém preencher um default ali, o esperado calculado no
  teste acompanha automaticamente (ele usa a mesma constante), então o teste não
  fica falsamente verde.
