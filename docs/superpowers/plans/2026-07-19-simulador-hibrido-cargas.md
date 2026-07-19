# Simulador Híbrido / Off-grid — Fase 3a: Construtor de cargas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela de levantamento de carga em `/simuladores/hibrido-offgrid/cargas`, com biblioteca de cargas típicas por empresa, resumo de consumo e curva de demanda de 24 h.

**Architecture:** Biblioteca persistida por empresa (migration + RLS + actions, no padrão do cadastro de equipamentos), semeada por upsert idempotente no primeiro acesso. O levantamento é estado em memória de um componente orquestrador que chama `calcularCargas()` do motor da Fase 2a — nenhuma fórmula é reimplementada na UI. Cinco componentes focados em vez de um monolito.

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), Zod, recharts, TypeScript, Vitest + jsdom + Testing Library (adicionados nesta fase).

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-cargas-design.md`.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (deve ficar em zero erros)
- Import alias `@/` → `web/`
- Commits em pt-BR, prefixo `feat(hibrido):` / `test(hibrido):` / `chore(web):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Migrations não são aplicadas por quem implementa.** Crie o arquivo `.sql`; quem aplica no Supabase de produção é o dono do projeto.

**Contexto das fases anteriores:** o motor está pronto e testado em
`web/lib/simuladores/hibrido/` — em especial `calcularCargas(cargas, premissas)`
(`cargas.ts`), o tipo `Carga` (`types.ts`) e `PREMISSAS_PADRAO` (`premissas.ts`).
O cadastro de equipamentos (Fase 1) é o padrão a copiar para migration, schemas
e actions.

**Refinamento em relação ao spec:** o spec escreveu a faixa de horários como
`0 <= hora < 24`. Isso torna "24 horas por dia" irrepresentável (geladeira,
roteador, câmera). Este plano usa **`0 <= hora <= 24`**, com `0 → 24`
significando o dia inteiro. `horaFim === horaInicio` continua sendo janela nula
(carga inativa), conforme o motor da Fase 2a já implementa.

---

## File Structure

**Banco e domínio** (`web/lib/simuladores/hibrido/`):
- `cargas-biblioteca-schemas.ts` — Zod, tipos, mapeadores row↔objeto e `bibliotecaParaCarga()`
- `cargas-biblioteca-seed.ts` — 26 cargas típicas
- `cargas-biblioteca-actions.ts` — CRUD + seed idempotente (`'use server'`)

**Migration e tipos:**
- `web/supabase/migrations/20260719000001_simulador_cargas_biblioteca.sql`
- `web/types/database.types.ts` (acrescenta a tabela)

**Componentes** (`web/components/simuladores/`):
- `CargasResumo.tsx` — blocos de consumo e potências
- `CargasCurva24h.tsx` — gráfico da curva (recharts)
- `CargasTabela.tsx` — lista editável do levantamento
- `BibliotecaCargasPanel.tsx` — gestão inline da biblioteca
- `CargasBuilder.tsx` — orquestrador; dono do estado do levantamento

**Rota:**
- `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx`

**Testes** (`web/__tests__/`):
- `hibrido-cargas-biblioteca.test.ts` (puro)
- `hibrido-cargas-seed.test.ts` (puro)
- `hibrido-cargas-ui.test.tsx` (jsdom)

---

## Task 1: Migration da biblioteca de cargas

**Files:**
- Create: `web/supabase/migrations/20260719000001_simulador_cargas_biblioteca.sql`
- Modify: `web/types/database.types.ts`

- [ ] **Step 1: Escrever a migration**

Criar `web/supabase/migrations/20260719000001_simulador_cargas_biblioteca.sql`:

```sql
-- Simulador Híbrido/Off-grid — biblioteca de cargas típicas por empresa.
-- Semeada por upsert idempotente no primeiro acesso à tela (ver
-- seedCargasBiblioteca), por isso a constraint única em (organization_id, nome).
CREATE TABLE IF NOT EXISTS simulador_cargas_biblioteca (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                text NOT NULL,
  categoria           text,
  potencia_unit_w     numeric NOT NULL CHECK (potencia_unit_w > 0),
  potencia_partida_w  numeric NOT NULL CHECK (potencia_partida_w > 0),
  tensao_v            numeric NOT NULL CHECK (tensao_v > 0),
  fator_potencia      numeric NOT NULL CHECK (fator_potencia > 0 AND fator_potencia <= 1),
  horas_dia           numeric NOT NULL CHECK (horas_dia >= 0 AND horas_dia <= 24),
  dias_semana         integer NOT NULL CHECK (dias_semana >= 1 AND dias_semana <= 7),
  hora_inicio         numeric NOT NULL CHECK (hora_inicio >= 0 AND hora_inicio <= 24),
  hora_fim            numeric NOT NULL CHECK (hora_fim >= 0 AND hora_fim <= 24),
  prioridade          text,
  critica             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulador_cargas_biblioteca_org_nome_key UNIQUE (organization_id, nome),
  CONSTRAINT simulador_cargas_biblioteca_partida_ge_nominal
    CHECK (potencia_partida_w >= potencia_unit_w)
);

CREATE INDEX IF NOT EXISTS idx_simulador_cargas_biblioteca_org
  ON simulador_cargas_biblioteca(organization_id);

ALTER TABLE simulador_cargas_biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador cargas biblioteca"
  ON simulador_cargas_biblioteca FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Acrescentar os tipos em `database.types.ts`**

Em `web/types/database.types.ts`, dentro de `public.Tables`, imediatamente antes
da linha `      simulador_cartao_tabelas: {`, inserir:

```ts
      simulador_cargas_biblioteca: {
        Row: {
          categoria: string | null
          created_at: string
          critica: boolean
          dias_semana: number
          fator_potencia: number
          hora_fim: number
          hora_inicio: number
          horas_dia: number
          id: string
          nome: string
          organization_id: string
          potencia_partida_w: number
          potencia_unit_w: number
          prioridade: string | null
          tensao_v: number
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          critica?: boolean
          dias_semana: number
          fator_potencia: number
          hora_fim: number
          hora_inicio: number
          horas_dia: number
          id?: string
          nome: string
          organization_id: string
          potencia_partida_w: number
          potencia_unit_w: number
          prioridade?: string | null
          tensao_v: number
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          critica?: boolean
          dias_semana?: number
          fator_potencia?: number
          hora_fim?: number
          hora_inicio?: number
          horas_dia?: number
          id?: string
          nome?: string
          organization_id?: string
          potencia_partida_w?: number
          potencia_unit_w?: number
          prioridade?: string | null
          tensao_v?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_cargas_biblioteca_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/20260719000001_simulador_cargas_biblioteca.sql web/types/database.types.ts
git commit -m "feat(hibrido): migration da biblioteca de cargas + RLS e tipos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Schemas, mapeadores e ponte para o motor

**Files:**
- Create: `web/lib/simuladores/hibrido/cargas-biblioteca-schemas.ts`
- Test: `web/__tests__/hibrido-cargas-biblioteca.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-cargas-biblioteca.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  cargaBibliotecaSchema, rowToCargaBiblioteca, cargaBibliotecaToRow,
  bibliotecaParaCarga, duracaoJanelaHoras,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const MINIMO = {
  nome: 'Geladeira duplex',
  potenciaUnitW: 150,
  potenciaPartidaW: 600,
  tensaoV: 220,
  fatorPotencia: 0.85,
  horasDia: 10,
  diasSemana: 7,
  horaInicio: 0,
  horaFim: 24,
  critica: true,
}

describe('cargaBibliotecaSchema', () => {
  it('aceita um modelo mínimo válido', () => {
    expect(cargaBibliotecaSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('rejeita potência de partida menor que a nominal', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, potenciaPartidaW: 100 }).success).toBe(false)
  })
  it('aceita partida igual à nominal (cargas resistivas)', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, potenciaUnitW: 5500, potenciaPartidaW: 5500 }).success).toBe(true)
  })
  it('rejeita fator de potência fora de (0, 1]', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 0 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 1.2 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 1 }).success).toBe(true)
  })
  it('rejeita horas/dia fora de 0–24', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horasDia: 25 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horasDia: -1 }).success).toBe(false)
  })
  it('rejeita dias/semana fora de 1–7', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, diasSemana: 0 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, diasSemana: 8 }).success).toBe(false)
  })
  it('aceita hora 24 (dia inteiro) e rejeita acima disso', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horaFim: 24 }).success).toBe(true)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horaFim: 25 }).success).toBe(false)
  })
  it('rejeita nome vazio', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, nome: '' }).success).toBe(false)
  })
})

describe('mapeadores row<->objeto', () => {
  it('ida e volta preserva valores e nulos', () => {
    const data = cargaBibliotecaSchema.parse(MINIMO)
    const row = { id: 'b1', ...cargaBibliotecaToRow(data) }
    const back = rowToCargaBiblioteca(row as Record<string, unknown>)
    expect(back.id).toBe('b1')
    expect(back.nome).toBe('Geladeira duplex')
    expect(back.potenciaPartidaW).toBe(600)
    expect(back.critica).toBe(true)
    expect(back.categoria).toBeNull()
    expect(back.prioridade).toBeNull()
  })
})

describe('bibliotecaParaCarga', () => {
  const modelo = { id: 'b1', ...cargaBibliotecaSchema.parse({ ...MINIMO, categoria: 'Refrigeração', prioridade: 'Alta' }) }

  it('cria a carga com quantidade 1', () => {
    expect(bibliotecaParaCarga(modelo).quantidade).toBe(1)
  })
  it('copia os demais campos do modelo', () => {
    const c = bibliotecaParaCarga(modelo)
    expect(c.nome).toBe('Geladeira duplex')
    expect(c.categoria).toBe('Refrigeração')
    expect(c.potenciaUnitW).toBe(150)
    expect(c.potenciaPartidaW).toBe(600)
    expect(c.tensaoV).toBe(220)
    expect(c.fatorPotencia).toBe(0.85)
    expect(c.horasDia).toBe(10)
    expect(c.diasSemana).toBe(7)
    expect(c.horaInicio).toBe(0)
    expect(c.horaFim).toBe(24)
    expect(c.prioridade).toBe('Alta')
    expect(c.critica).toBe(true)
  })
  it('não carrega o id do modelo para a carga', () => {
    expect('id' in bibliotecaParaCarga(modelo)).toBe(false)
  })
})

describe('duracaoJanelaHoras', () => {
  it('janela simples', () => {
    expect(duracaoJanelaHoras(18, 22)).toBe(4)
  })
  it('janela que atravessa a meia-noite', () => {
    expect(duracaoJanelaHoras(18, 6)).toBe(12)
  })
  it('dia inteiro', () => {
    expect(duracaoJanelaHoras(0, 24)).toBe(24)
  })
  it('janela nula', () => {
    expect(duracaoJanelaHoras(10, 10)).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas-biblioteca`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `cargas-biblioteca-schemas.ts`**

Criar `web/lib/simuladores/hibrido/cargas-biblioteca-schemas.ts`:

```ts
// web/lib/simuladores/hibrido/cargas-biblioteca-schemas.ts
// Biblioteca de cargas típicas: schema, mapeadores row<->objeto e a ponte para
// o tipo Carga do motor. Módulo puro (sem 'use server') para ser testável.
import { z } from 'zod'
import type { Carga } from './types'

export const CATEGORIAS_CARGA = [
  'Iluminação', 'Refrigeração', 'Aquecimento', 'Eletrônico', 'Motor', 'Outro',
] as const

export const PRIORIDADES_CARGA = ['Alta', 'Média', 'Baixa'] as const

export const cargaBibliotecaSchema = z
  .object({
    nome: z.string().min(1, 'Informe o nome da carga.'),
    categoria: z.enum(CATEGORIAS_CARGA).nullish(),
    potenciaUnitW: z.coerce.number().positive('Potência deve ser > 0.'),
    potenciaPartidaW: z.coerce.number().positive('Potência de partida deve ser > 0.'),
    tensaoV: z.coerce.number().positive('Tensão deve ser > 0.'),
    fatorPotencia: z.coerce.number().gt(0, 'FP deve ser > 0.').max(1, 'FP não pode passar de 1.'),
    horasDia: z.coerce.number().min(0).max(24, 'Horas/dia entre 0 e 24.'),
    diasSemana: z.coerce.number().int().min(1).max(7, 'Dias/semana entre 1 e 7.'),
    horaInicio: z.coerce.number().min(0).max(24, 'Hora entre 0 e 24.'),
    horaFim: z.coerce.number().min(0).max(24, 'Hora entre 0 e 24.'),
    prioridade: z.enum(PRIORIDADES_CARGA).nullish(),
    critica: z.coerce.boolean().default(false),
  })
  .refine((d) => d.potenciaPartidaW >= d.potenciaUnitW, {
    message: 'Potência de partida não pode ser menor que a nominal.',
    path: ['potenciaPartidaW'],
  })

export type CargaBibliotecaData = z.infer<typeof cargaBibliotecaSchema>
export type CargaBiblioteca = CargaBibliotecaData & { id: string }

export function rowToCargaBiblioteca(r: Record<string, unknown>): CargaBiblioteca {
  return {
    id: String(r.id),
    nome: String(r.nome),
    categoria: (r.categoria ?? null) as CargaBiblioteca['categoria'],
    potenciaUnitW: Number(r.potencia_unit_w),
    potenciaPartidaW: Number(r.potencia_partida_w),
    tensaoV: Number(r.tensao_v),
    fatorPotencia: Number(r.fator_potencia),
    horasDia: Number(r.horas_dia),
    diasSemana: Number(r.dias_semana),
    horaInicio: Number(r.hora_inicio),
    horaFim: Number(r.hora_fim),
    prioridade: (r.prioridade ?? null) as CargaBiblioteca['prioridade'],
    critica: Boolean(r.critica),
  }
}

export function cargaBibliotecaToRow(d: CargaBibliotecaData) {
  return {
    nome: d.nome,
    categoria: d.categoria ?? null,
    potencia_unit_w: d.potenciaUnitW,
    potencia_partida_w: d.potenciaPartidaW,
    tensao_v: d.tensaoV,
    fator_potencia: d.fatorPotencia,
    horas_dia: d.horasDia,
    dias_semana: d.diasSemana,
    hora_inicio: d.horaInicio,
    hora_fim: d.horaFim,
    prioridade: d.prioridade ?? null,
    critica: d.critica,
  }
}

/** Modelo da biblioteca → carga do levantamento, com quantidade 1. */
export function bibliotecaParaCarga(m: CargaBiblioteca): Carga {
  return {
    nome: m.nome,
    categoria: m.categoria ?? undefined,
    quantidade: 1,
    potenciaUnitW: m.potenciaUnitW,
    potenciaPartidaW: m.potenciaPartidaW,
    tensaoV: m.tensaoV,
    fatorPotencia: m.fatorPotencia,
    horasDia: m.horasDia,
    diasSemana: m.diasSemana,
    horaInicio: m.horaInicio,
    horaFim: m.horaFim,
    prioridade: m.prioridade ?? undefined,
    critica: m.critica,
  }
}

/** Duração da janela de uso em horas, tratando a volta da meia-noite. */
export function duracaoJanelaHoras(horaInicio: number, horaFim: number): number {
  if (horaFim === horaInicio) return 0
  return horaFim > horaInicio ? horaFim - horaInicio : 24 - horaInicio + horaFim
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-biblioteca`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/cargas-biblioteca-schemas.ts web/__tests__/hibrido-cargas-biblioteca.test.ts
git commit -m "feat(hibrido): schemas e ponte da biblioteca de cargas para o motor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Seed de cargas típicas

**Files:**
- Create: `web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts`
- Test: `web/__tests__/hibrido-cargas-seed.test.ts`

O seed vira dado de produção em toda empresa, então sua qualidade é testada.

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-cargas-seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CARGAS_BIBLIOTECA_SEED } from '@/lib/simuladores/hibrido/cargas-biblioteca-seed'
import { cargaBibliotecaSchema, duracaoJanelaHoras } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

describe('CARGAS_BIBLIOTECA_SEED', () => {
  it('tem pelo menos 20 cargas', () => {
    expect(CARGAS_BIBLIOTECA_SEED.length).toBeGreaterThanOrEqual(20)
  })

  it('todos os itens passam no schema', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      const r = cargaBibliotecaSchema.safeParse(c)
      expect(r.success, `${c.nome}: ${r.success ? '' : r.error.issues[0].message}`).toBe(true)
    }
  })

  it('nomes são únicos (a constraint do banco depende disso)', () => {
    const nomes = CARGAS_BIBLIOTECA_SEED.map((c) => c.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('potência de partida nunca é menor que a nominal', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      expect(c.potenciaPartidaW, c.nome).toBeGreaterThanOrEqual(c.potenciaUnitW)
    }
  })

  it('há cargas com partida ESTRITAMENTE maior que a nominal', () => {
    // Sem isso, a verificação de surge do inversor (motor da Fase 2a) nunca é
    // exercitada por nenhum levantamento montado a partir da biblioteca.
    const comSurge = CARGAS_BIBLIOTECA_SEED.filter((c) => c.potenciaPartidaW > c.potenciaUnitW)
    expect(comSurge.length).toBeGreaterThanOrEqual(5)
  })

  it('horas/dia nunca excedem a duração da janela de uso', () => {
    // Não se exige igualdade: cargas com ciclo de trabalho (geladeira) rodam
    // menos horas do que a janela em que estão disponíveis.
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      const janela = duracaoJanelaHoras(c.horaInicio, c.horaFim)
      expect(c.horasDia, `${c.nome} (janela ${janela}h)`).toBeLessThanOrEqual(janela)
    }
  })

  it('toda carga tem categoria', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      expect(c.categoria, c.nome).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas-seed`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `cargas-biblioteca-seed.ts`**

Criar `web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts`:

```ts
// web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts
// Biblioteca padrão de cargas típicas (residenciais e rurais), copiada para
// cada empresa no primeiro acesso à tela de cargas.
//
// Dois campos merecem atenção porque alimentam verificações do motor:
//  - potenciaPartidaW: motores e compressores partem com várias vezes a
//    potência nominal. É o que exercita a checagem de surge do inversor.
//  - horaInicio/horaFim: definem a curva de 24 h e, portanto, o pico de
//    demanda. 0 → 24 significa disponível o dia inteiro.
import type { CargaBibliotecaData } from './cargas-biblioteca-schemas'

export const CARGAS_BIBLIOTECA_SEED: CargaBibliotecaData[] = [
  { nome: 'Lâmpada LED 12 W', categoria: 'Iluminação', potenciaUnitW: 12, potenciaPartidaW: 12, tensaoV: 220, fatorPotencia: 0.92, horasDia: 5, diasSemana: 7, horaInicio: 18, horaFim: 23, prioridade: 'Alta', critica: true },
  { nome: 'Geladeira duplex', categoria: 'Refrigeração', potenciaUnitW: 150, potenciaPartidaW: 600, tensaoV: 220, fatorPotencia: 0.85, horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Freezer horizontal', categoria: 'Refrigeração', potenciaUnitW: 200, potenciaPartidaW: 800, tensaoV: 220, fatorPotencia: 0.85, horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Chuveiro elétrico', categoria: 'Aquecimento', potenciaUnitW: 5500, potenciaPartidaW: 5500, tensaoV: 220, fatorPotencia: 1, horasDia: 0.7, diasSemana: 7, horaInicio: 18, horaFim: 21, prioridade: 'Média', critica: false },
  { nome: 'Torneira elétrica', categoria: 'Aquecimento', potenciaUnitW: 3000, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 1, horasDia: 0.3, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Baixa', critica: false },
  { nome: 'Ar-condicionado 9.000 BTU', categoria: 'Refrigeração', potenciaUnitW: 900, potenciaPartidaW: 2700, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Média', critica: false },
  { nome: 'Ar-condicionado 12.000 BTU', categoria: 'Refrigeração', potenciaUnitW: 1200, potenciaPartidaW: 3600, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Média', critica: false },
  { nome: 'Ventilador de teto', categoria: 'Motor', potenciaUnitW: 100, potenciaPartidaW: 200, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Baixa', critica: false },
  { nome: 'TV LED 43"', categoria: 'Eletrônico', potenciaUnitW: 100, potenciaPartidaW: 100, tensaoV: 220, fatorPotencia: 0.9, horasDia: 5, diasSemana: 7, horaInicio: 18, horaFim: 23, prioridade: 'Baixa', critica: false },
  { nome: 'Notebook', categoria: 'Eletrônico', potenciaUnitW: 65, potenciaPartidaW: 65, tensaoV: 220, fatorPotencia: 0.9, horasDia: 6, diasSemana: 5, horaInicio: 8, horaFim: 18, prioridade: 'Média', critica: false },
  { nome: 'Roteador Wi-Fi', categoria: 'Eletrônico', potenciaUnitW: 10, potenciaPartidaW: 10, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Câmera de segurança', categoria: 'Eletrônico', potenciaUnitW: 15, potenciaPartidaW: 15, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Micro-ondas', categoria: 'Aquecimento', potenciaUnitW: 1400, potenciaPartidaW: 1400, tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 7, horaInicio: 11, horaFim: 13, prioridade: 'Baixa', critica: false },
  { nome: 'Forno elétrico', categoria: 'Aquecimento', potenciaUnitW: 1500, potenciaPartidaW: 1500, tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 3, horaInicio: 18, horaFim: 20, prioridade: 'Baixa', critica: false },
  { nome: 'Cafeteira', categoria: 'Aquecimento', potenciaUnitW: 800, potenciaPartidaW: 800, tensaoV: 220, fatorPotencia: 1, horasDia: 0.3, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Baixa', critica: false },
  { nome: 'Ferro de passar', categoria: 'Aquecimento', potenciaUnitW: 1000, potenciaPartidaW: 1000, tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 2, horaInicio: 14, horaFim: 16, prioridade: 'Baixa', critica: false },
  { nome: 'Máquina de lavar roupa', categoria: 'Motor', potenciaUnitW: 500, potenciaPartidaW: 1500, tensaoV: 220, fatorPotencia: 0.8, horasDia: 1, diasSemana: 3, horaInicio: 9, horaFim: 11, prioridade: 'Baixa', critica: false },
  { nome: 'Secadora de roupa', categoria: 'Aquecimento', potenciaUnitW: 2500, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 0.95, horasDia: 1, diasSemana: 2, horaInicio: 10, horaFim: 12, prioridade: 'Baixa', critica: false },
  { nome: 'Liquidificador', categoria: 'Motor', potenciaUnitW: 300, potenciaPartidaW: 900, tensaoV: 220, fatorPotencia: 0.85, horasDia: 0.2, diasSemana: 7, horaInicio: 7, horaFim: 9, prioridade: 'Baixa', critica: false },
  { nome: 'Portão eletrônico', categoria: 'Motor', potenciaUnitW: 300, potenciaPartidaW: 900, tensaoV: 220, fatorPotencia: 0.8, horasDia: 0.2, diasSemana: 7, horaInicio: 6, horaFim: 22, prioridade: 'Média', critica: false },
  { nome: "Bomba d'água 1/2 CV", categoria: 'Motor', potenciaUnitW: 370, potenciaPartidaW: 1480, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Alta', critica: true },
  { nome: "Bomba d'água 1 CV", categoria: 'Motor', potenciaUnitW: 750, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Alta', critica: true },
  { nome: 'Bomba de piscina', categoria: 'Motor', potenciaUnitW: 550, potenciaPartidaW: 2200, tensaoV: 220, fatorPotencia: 0.8, horasDia: 4, diasSemana: 7, horaInicio: 8, horaFim: 14, prioridade: 'Baixa', critica: false },
  { nome: 'Motor monofásico 2 CV', categoria: 'Motor', potenciaUnitW: 1500, potenciaPartidaW: 6000, tensaoV: 220, fatorPotencia: 0.8, horasDia: 3, diasSemana: 6, horaInicio: 8, horaFim: 17, prioridade: 'Média', critica: false },
  { nome: 'Ordenhadeira', categoria: 'Motor', potenciaUnitW: 1100, potenciaPartidaW: 4400, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 5, horaFim: 7, prioridade: 'Alta', critica: true },
  { nome: 'Cerca elétrica rural', categoria: 'Eletrônico', potenciaUnitW: 20, potenciaPartidaW: 20, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-seed`
Expected: PASS (7 testes). Se algum item falhar o invariante de janela, ajuste
`horasDia` ou os horários daquele item — não relaxe o teste.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts web/__tests__/hibrido-cargas-seed.test.ts
git commit -m "feat(hibrido): seed de 26 cargas tipicas com partida realista

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Server actions da biblioteca

**Files:**
- Create: `web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts`

- [ ] **Step 1: Implementar as actions**

Criar `web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts`:

```ts
// web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import { CARGAS_BIBLIOTECA_SEED } from './cargas-biblioteca-seed'
import {
  cargaBibliotecaSchema, rowToCargaBiblioteca, cargaBibliotecaToRow,
  type CargaBibliotecaData, type CargaBiblioteca,
} from './cargas-biblioteca-schemas'

export type { CargaBiblioteca, CargaBibliotecaData } from './cargas-biblioteca-schemas'

const ROUTE = '/simuladores/hibrido-offgrid/cargas'
const MAX_CARGAS = 200
const COLUNAS =
  'id, nome, categoria, potencia_unit_w, potencia_partida_w, tensao_v, fator_potencia, horas_dia, dias_semana, hora_inicio, hora_fim, prioridade, critica'

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function listCargasBiblioteca(): Promise<CargaBiblioteca[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_cargas_biblioteca')
    .select(COLUNAS)
    .eq('organization_id', ctx.orgId)
    .order('nome', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToCargaBiblioteca(r as Record<string, unknown>))
}

export async function createCargaBiblioteca(data: CargaBibliotecaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = cargaBibliotecaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_cargas_biblioteca')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_CARGAS) return { error: `Máximo de ${MAX_CARGAS} cargas por empresa.` }
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .insert({ organization_id: ctx.orgId, ...cargaBibliotecaToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Carga adicionada à biblioteca', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Carga adicionada.' }
}

export async function updateCargaBiblioteca(id: string, data: CargaBibliotecaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = cargaBibliotecaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .update(cargaBibliotecaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Carga da biblioteca atualizada', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Carga atualizada.' }
}

export async function deleteCargaBiblioteca(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Carga da biblioteca excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Carga excluída.' }
}

/**
 * Popula a biblioteca padrão para a empresa. Idempotente: upsert por
 * (organization_id, nome) com ignoreDuplicates, então só insere o que falta.
 *
 * SEM revalidatePath: esta função é chamada durante o render da página, e
 * revalidar durante o render lança erro no Next (mesmo caso já corrigido em
 * seedConcessionarias).
 */
export async function seedCargasBiblioteca(): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const rows = CARGAS_BIBLIOTECA_SEED.map((c) => ({
    organization_id: ctx.orgId,
    ...cargaBibliotecaToRow(c),
  }))
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .upsert(rows, { onConflict: 'organization_id,nome', ignoreDuplicates: true })
  if (error) return { error: error.message }
  await logAction('Biblioteca de cargas padrão carregada', `${rows.length} cargas`)
  return { success: 'Biblioteca padrão carregada.' }
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros (confirma que os nomes de coluna batem com a Task 1).

- [ ] **Step 3: Commit**

```bash
git add web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts
git commit -m "feat(hibrido): actions CRUD e seed idempotente da biblioteca de cargas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Infraestrutura de teste de componente

**Files:**
- Modify: `web/package.json` (devDependencies)
- Test: `web/__tests__/hibrido-cargas-ui.test.tsx` (arquivo inicial, com um teste real)

Verificado nesta versão do vitest (4.1.10): o docblock
`// @vitest-environment jsdom` é honrado por arquivo. `vitest.config.ts`
**não muda** — o ambiente global segue `node` e os testes puros existentes
continuam intocados.

- [ ] **Step 1: Instalar as dependências**

```bash
cd web && npm install -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Escrever o primeiro teste de componente (falhando)**

Este teste prova a infraestrutura e já cobre `CargasResumo`, que será
implementado na Task 6.

Criar `web/__tests__/hibrido-cargas-ui.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { CargasResumo } from '@/components/simuladores/CargasResumo'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga } from '@/lib/simuladores/hibrido/types'

const CARGA: Carga = {
  nome: 'Chuveiro', quantidade: 1, potenciaUnitW: 5500, potenciaPartidaW: 5500,
  tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 7,
  horaInicio: 19, horaFim: 19.5, critica: false,
}

describe('CargasResumo', () => {
  it('exibe o consumo diário calculado pelo motor', () => {
    const resumo = calcularCargas([CARGA], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    // 5500 W × 0,5 h = 2750 Wh = 2,75 kWh/dia
    expect(screen.getByTestId('consumo-diario')).toHaveTextContent('2,75')
  })

  it('exibe o pico de demanda vindo da curva', () => {
    const resumo = calcularCargas([CARGA], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    expect(screen.getByTestId('pico-demanda')).toHaveTextContent('5.500')
  })

  it('levantamento vazio mostra zeros sem quebrar', () => {
    const resumo = calcularCargas([], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    expect(screen.getByTestId('consumo-diario')).toHaveTextContent('0')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: FAIL — `CargasResumo` ainda não existe. **Importante:** o erro deve ser
sobre o módulo do componente, não sobre o ambiente. Se aparecer
`ERR_MODULE_NOT_FOUND` mencionando `jsdom`, a instalação do Step 1 falhou.

- [ ] **Step 4: Commit das dependências**

(O teste segue vermelho até a Task 6 — commit só das dependências aqui.)

```bash
git add web/package.json web/package-lock.json
git commit -m "chore(web): adiciona jsdom e testing-library para testes de componente

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `CargasResumo` e `CargasCurva24h`

**Files:**
- Create: `web/components/simuladores/CargasResumo.tsx`
- Create: `web/components/simuladores/CargasCurva24h.tsx`
- Modify: `web/__tests__/hibrido-cargas-ui.test.tsx` (acrescenta o bloco da curva)

- [ ] **Step 1: Implementar `CargasResumo.tsx`**

Criar `web/components/simuladores/CargasResumo.tsx`:

```tsx
'use client'
import type { ResultadoCargas } from '@/lib/simuladores/hibrido/types'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

type Bloco = { id: string; label: string; valor: string; unidade: string }

export function CargasResumo({ resumo }: { resumo: ResultadoCargas }) {
  const blocos: Bloco[] = [
    { id: 'consumo-diario', label: 'Consumo diário', valor: n(resumo.consumoDiarioKwh), unidade: 'kWh/dia' },
    { id: 'consumo-mensal', label: 'Consumo mensal', valor: n(resumo.consumoMensalKwh), unidade: 'kWh/mês' },
    { id: 'consumo-anual', label: 'Consumo anual', valor: n(resumo.consumoAnualKwh), unidade: 'kWh/ano' },
    { id: 'consumo-critico', label: 'Consumo das cargas críticas', valor: n(resumo.consumoDiarioCriticoKwh), unidade: 'kWh/dia' },
    { id: 'pot-conectada', label: 'Potência conectada', valor: n(resumo.potenciaConectadaW, 0), unidade: 'W' },
    { id: 'pot-simultanea', label: 'Potência simultânea', valor: n(resumo.potenciaSimultaneaW, 0), unidade: 'W' },
    { id: 'pot-partida', label: 'Potência de partida', valor: n(resumo.potenciaPartidaW, 0), unidade: 'W' },
    { id: 'pico-demanda', label: 'Pico de demanda (24 h)', valor: n(resumo.picoDemandaW, 0), unidade: 'W' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {blocos.map((b) => (
        <div key={b.id} className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-3">
          <p className="text-[11px] text-[var(--theme-text-muted,#7b8194)]">{b.label}</p>
          <p className="mt-0.5 text-lg font-bold text-[var(--theme-text,#1a2340)]" data-testid={b.id}>
            {b.valor}
          </p>
          <p className="text-[10px] text-[var(--theme-text-muted,#9aa0b0)]">{b.unidade}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Rodar o teste do resumo e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: PASS (3 testes de `CargasResumo`).

- [ ] **Step 3: Implementar `CargasCurva24h.tsx`**

Criar `web/components/simuladores/CargasCurva24h.tsx`:

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function CargasCurva24h({ curva }: { curva: number[] }) {
  const data = curva.map((w, h) => ({ hora: `${String(h).padStart(2, '0')}h`, w }))
  const temCarga = curva.some((w) => w > 0)

  return (
    <div
      className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4"
      data-testid="curva-24h"
    >
      <h3 className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">Curva de demanda (24 h)</h3>
      <p className="mb-3 text-xs text-[var(--theme-text-muted,#7b8194)]">
        Soma das cargas ativas em cada hora, a partir dos horários de início e fim.
      </p>
      {!temCarga ? (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma carga no levantamento ainda.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
            <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} unit=" W" width={70} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString('pt-BR')} W`, 'Demanda']} />
            <Bar dataKey="w" fill="#FF9F40" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Acrescentar o teste da curva**

No fim de `web/__tests__/hibrido-cargas-ui.test.tsx`, acrescentar o import e o bloco:

```tsx
import { CargasCurva24h } from '@/components/simuladores/CargasCurva24h'

describe('CargasCurva24h', () => {
  // Escopo deliberado: apenas "monta sem quebrar". O ResponsiveContainer do
  // recharts mede largura zero em jsdom e não desenha as barras, então afirmar
  // sobre o desenho daria atrito alto e valor quase nulo — a correção da curva
  // já está coberta pelos testes puros de calcularCargas (Fase 2a).
  it('monta com uma curva preenchida', () => {
    const curva = new Array(24).fill(0)
    curva[19] = 5795
    render(<CargasCurva24h curva={curva} />)
    expect(screen.getByTestId('curva-24h')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há carga', () => {
    render(<CargasCurva24h curva={new Array(24).fill(0)} />)
    expect(screen.getByText(/Nenhuma carga no levantamento/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add web/components/simuladores/CargasResumo.tsx web/components/simuladores/CargasCurva24h.tsx web/__tests__/hibrido-cargas-ui.test.tsx
git commit -m "feat(hibrido): resumo de consumo e curva de demanda 24h

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `CargasTabela`

**Files:**
- Create: `web/components/simuladores/CargasTabela.tsx`
- Modify: `web/__tests__/hibrido-cargas-ui.test.tsx`

Componente controlado: recebe as cargas e um `onChange`; não guarda estado do
levantamento (quem guarda é o `CargasBuilder`, na Task 9).

- [ ] **Step 1: Escrever os testes falhando**

No fim de `web/__tests__/hibrido-cargas-ui.test.tsx`, acrescentar:

```tsx
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { CargasTabela } from '@/components/simuladores/CargasTabela'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const MODELO: CargaBiblioteca = {
  id: 'b1', nome: 'Geladeira duplex', categoria: 'Refrigeração',
  potenciaUnitW: 150, potenciaPartidaW: 600, tensaoV: 220, fatorPotencia: 0.85,
  horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24,
  prioridade: 'Alta', critica: true,
}

/** Envoltório com estado, já que CargasTabela é controlado. */
function TabelaComEstado({ inicial = [] as Carga[] }) {
  const [cargas, setCargas] = useState<Carga[]>(inicial)
  return <CargasTabela cargas={cargas} biblioteca={[MODELO]} onChange={setCargas} />
}

describe('CargasTabela', () => {
  it('começa vazia com uma mensagem', () => {
    render(<TabelaComEstado />)
    expect(screen.getByText(/Nenhuma carga adicionada/)).toBeInTheDocument()
  })

  it('adicionar da biblioteca preenche os campos do modelo', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.selectOptions(screen.getByTestId('select-biblioteca'), 'b1')
    await user.click(screen.getByTestId('btn-add-biblioteca'))
    expect(screen.getByDisplayValue('Geladeira duplex')).toBeInTheDocument()
    expect(screen.getByTestId('qtd-0')).toHaveValue(1)
    expect(screen.getByTestId('pot-0')).toHaveValue(150)
  })

  it('alterar a quantidade atualiza o consumo exibido na linha', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.selectOptions(screen.getByTestId('select-biblioteca'), 'b1')
    await user.click(screen.getByTestId('btn-add-biblioteca'))
    // 1 × 150 W × 10 h = 1500 Wh
    expect(screen.getByTestId('consumo-linha-0')).toHaveTextContent('1.500')
    await user.clear(screen.getByTestId('qtd-0'))
    await user.type(screen.getByTestId('qtd-0'), '2')
    // 2 × 150 W × 10 h = 3000 Wh
    expect(screen.getByTestId('consumo-linha-0')).toHaveTextContent('3.000')
  })

  it('adicionar em branco cria uma linha editável', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.click(screen.getByTestId('btn-add-branco'))
    expect(screen.getByTestId('qtd-0')).toBeInTheDocument()
  })

  it('remover tira a linha da lista', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.click(screen.getByTestId('btn-add-branco'))
    expect(screen.getByTestId('qtd-0')).toBeInTheDocument()
    await user.click(screen.getByTestId('btn-remover-0'))
    expect(screen.queryByTestId('qtd-0')).not.toBeInTheDocument()
    expect(screen.getByText(/Nenhuma carga adicionada/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: FAIL — `CargasTabela` não existe.

- [ ] **Step 3: Implementar `CargasTabela.tsx`**

Criar `web/components/simuladores/CargasTabela.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { bibliotecaParaCarga, type CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import type { Carga } from '@/lib/simuladores/hibrido/types'

const IN = 'w-full rounded border px-1.5 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'

const CARGA_VAZIA: Carga = {
  nome: '', quantidade: 1, potenciaUnitW: 0, potenciaPartidaW: 0, tensaoV: 220,
  fatorPotencia: 0.9, horasDia: 1, diasSemana: 7, horaInicio: 18, horaFim: 22,
  critica: false,
}

const consumoDiarioWh = (c: Carga) =>
  c.quantidade * c.potenciaUnitW * c.horasDia * (c.diasSemana / 7)

type Props = {
  cargas: Carga[]
  biblioteca: CargaBiblioteca[]
  onChange: (cargas: Carga[]) => void
}

export function CargasTabela({ cargas, biblioteca, onChange }: Props) {
  const [selecionado, setSelecionado] = useState<string>(biblioteca[0]?.id ?? '')

  function addDaBiblioteca() {
    const m = biblioteca.find((b) => b.id === selecionado)
    if (!m) return
    onChange([...cargas, bibliotecaParaCarga(m)])
  }

  function addEmBranco() {
    onChange([...cargas, { ...CARGA_VAZIA }])
  }

  function alterar(i: number, patch: Partial<Carga>) {
    onChange(cargas.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function remover(i: number) {
    onChange(cargas.filter((_, idx) => idx !== i))
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Adicionar da biblioteca
          <select
            className={`${IN} mt-1 min-w-56`}
            data-testid="select-biblioteca"
            value={selecionado}
            onChange={(e) => setSelecionado(e.target.value)}
          >
            {biblioteca.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="btn-add-biblioteca"
          onClick={addDaBiblioteca}
          className="rounded bg-[#FF9F40] px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]"
        >
          Adicionar
        </button>
        <button
          type="button"
          data-testid="btn-add-branco"
          onClick={addEmBranco}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Adicionar em branco
        </button>
      </div>

      {cargas.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma carga adicionada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
                <th className="p-1">Carga</th>
                <th className="p-1">Qtd</th>
                <th className="p-1">Pot. (W)</th>
                <th className="p-1">Partida (W)</th>
                <th className="p-1">h/dia</th>
                <th className="p-1">dias/sem</th>
                <th className="p-1">Início</th>
                <th className="p-1">Fim</th>
                <th className="p-1">Crítica</th>
                <th className="p-1">Wh/dia</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c, i) => (
                <tr key={i} className="border-t border-[var(--theme-border,#e7e9f2)]">
                  <td className="p-1">
                    <input className={IN} data-testid={`nome-${i}`} value={c.nome}
                      onChange={(e) => alterar(i, { nome: e.target.value })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} className={IN} data-testid={`qtd-${i}`} value={c.quantidade}
                      onChange={(e) => alterar(i, { quantidade: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-20">
                    <input type="number" min={0} className={IN} data-testid={`pot-${i}`} value={c.potenciaUnitW}
                      onChange={(e) => alterar(i, { potenciaUnitW: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-20">
                    <input type="number" min={0} className={IN} data-testid={`partida-${i}`} value={c.potenciaPartidaW}
                      onChange={(e) => alterar(i, { potenciaPartidaW: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`horas-${i}`} value={c.horasDia}
                      onChange={(e) => alterar(i, { horasDia: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={1} max={7} className={IN} data-testid={`dias-${i}`} value={c.diasSemana}
                      onChange={(e) => alterar(i, { diasSemana: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`inicio-${i}`} value={c.horaInicio}
                      onChange={(e) => alterar(i, { horaInicio: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`fim-${i}`} value={c.horaFim}
                      onChange={(e) => alterar(i, { horaFim: num(e.target.value) })} />
                  </td>
                  <td className="p-1 text-center">
                    <input type="checkbox" data-testid={`critica-${i}`} checked={c.critica}
                      onChange={(e) => alterar(i, { critica: e.target.checked })} />
                  </td>
                  <td className="p-1 tabular-nums" data-testid={`consumo-linha-${i}`}>
                    {consumoDiarioWh(c).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-1">
                    <button type="button" data-testid={`btn-remover-${i}`} onClick={() => remover(i)}
                      className="text-[#c0392b]">remover</button>
                  </td>
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

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/CargasTabela.tsx web/__tests__/hibrido-cargas-ui.test.tsx
git commit -m "feat(hibrido): tabela editavel do levantamento de cargas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `BibliotecaCargasPanel`

**Files:**
- Create: `web/components/simuladores/BibliotecaCargasPanel.tsx`
- Modify: `web/__tests__/hibrido-cargas-ui.test.tsx`

- [ ] **Step 1: Escrever os testes falhando**

Em `web/__tests__/hibrido-cargas-ui.test.tsx`, primeiro **estender** o import
existente do vitest (não criar um segundo) para incluir `vi`:

```tsx
import { describe, it, expect, vi } from 'vitest'
```

Depois, logo após os imports, acrescentar o mock das server actions. O `vi.mock`
precisa ficar no escopo de módulo — o vitest faz hoisting dele para antes dos
imports, e é isso que impede o módulo real (`'use server'`) de ser carregado no
ambiente de teste:

```tsx
vi.mock('@/lib/simuladores/hibrido/cargas-biblioteca-actions', () => ({
  createCargaBiblioteca: vi.fn(async () => ({ success: 'Carga adicionada.' })),
  updateCargaBiblioteca: vi.fn(async () => ({ success: 'Carga atualizada.' })),
  deleteCargaBiblioteca: vi.fn(async () => ({ success: 'Carga excluída.' })),
}))
```

E, no fim do arquivo, o bloco de testes:

```tsx
import { BibliotecaCargasPanel } from '@/components/simuladores/BibliotecaCargasPanel'
import {
  createCargaBiblioteca, deleteCargaBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'

describe('BibliotecaCargasPanel', () => {
  it('começa recolhido e abre ao clicar', async () => {
    const user = userEvent.setup()
    render(<BibliotecaCargasPanel inicial={[MODELO]} />)
    expect(screen.queryByTestId('bib-nome')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    expect(screen.getByTestId('bib-nome')).toBeInTheDocument()
  })

  it('lista os modelos existentes', async () => {
    const user = userEvent.setup()
    render(<BibliotecaCargasPanel inicial={[MODELO]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    expect(screen.getByText('Geladeira duplex')).toBeInTheDocument()
  })

  it('criar chama a action com os dados do formulário', async () => {
    const user = userEvent.setup()
    render(<BibliotecaCargasPanel inicial={[]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    await user.type(screen.getByTestId('bib-nome'), 'Bomba nova')
    await user.clear(screen.getByTestId('bib-pot'))
    await user.type(screen.getByTestId('bib-pot'), '750')
    await user.clear(screen.getByTestId('bib-partida'))
    await user.type(screen.getByTestId('bib-partida'), '3000')
    await user.click(screen.getByTestId('btn-salvar-biblioteca'))
    expect(createCargaBiblioteca).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Bomba nova', potenciaUnitW: 750, potenciaPartidaW: 3000 })
    )
  })

  it('excluir chama a action com o id', async () => {
    const user = userEvent.setup()
    render(<BibliotecaCargasPanel inicial={[MODELO]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    await user.click(screen.getByTestId('btn-excluir-b1'))
    expect(deleteCargaBiblioteca).toHaveBeenCalledWith('b1')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: FAIL — `BibliotecaCargasPanel` não existe.

- [ ] **Step 3: Implementar `BibliotecaCargasPanel.tsx`**

Criar `web/components/simuladores/BibliotecaCargasPanel.tsx`:

```tsx
'use client'
import { useState, useTransition } from 'react'
import {
  createCargaBiblioteca, updateCargaBiblioteca, deleteCargaBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import {
  CATEGORIAS_CARGA, PRIORIDADES_CARGA,
  type CargaBiblioteca, type CargaBibliotecaData,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'

const VAZIO: CargaBibliotecaData = {
  nome: '', categoria: 'Outro', potenciaUnitW: 0, potenciaPartidaW: 0, tensaoV: 220,
  fatorPotencia: 0.9, horasDia: 1, diasSemana: 7, horaInicio: 18, horaFim: 22,
  prioridade: 'Média', critica: false,
}

export function BibliotecaCargasPanel({ inicial }: { inicial: CargaBiblioteca[] }) {
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState(inicial)
  const [form, setForm] = useState<CargaBibliotecaData>(VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  const num = (v: string) => (v === '' ? 0 : Number(v))
  const set = (patch: Partial<CargaBibliotecaData>) => setForm((f) => ({ ...f, ...patch }))

  function editar(m: CargaBiblioteca) {
    const { id, ...dados } = m
    void id
    setEditId(m.id)
    setForm(dados)
    setMsg(null)
  }

  function salvar() {
    start(async () => {
      const res = editId ? await updateCargaBiblioteca(editId, form) : await createCargaBiblioteca(form)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setMsg({ text: res.success ?? 'Salvo.', erro: false })
      setForm(VAZIO)
      setEditId(null)
    })
  }

  function excluir(id: string) {
    start(async () => {
      const res = await deleteCargaBiblioteca(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setLista((l) => l.filter((m) => m.id !== id))
    })
  }

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <button
        type="button"
        data-testid="btn-toggle-biblioteca"
        onClick={() => setAberto((a) => !a)}
        className="text-sm font-semibold text-[var(--theme-text,#1a2340)]"
      >
        {aberto ? '▾' : '▸'} Biblioteca de cargas da empresa ({lista.length})
      </button>

      {aberto && (
        <div className="mt-3">
          {msg && (
            <p className={`mb-2 text-xs ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</p>
          )}

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label className="text-[11px]">Nome
              <input className={IN} data-testid="bib-nome" value={form.nome}
                onChange={(e) => set({ nome: e.target.value })} />
            </label>
            <label className="text-[11px]">Categoria
              <select className={IN} data-testid="bib-categoria" value={form.categoria ?? 'Outro'}
                onChange={(e) => set({ categoria: e.target.value as CargaBibliotecaData['categoria'] })}>
                {CATEGORIAS_CARGA.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px]">Potência (W)
              <input type="number" className={IN} data-testid="bib-pot" value={form.potenciaUnitW}
                onChange={(e) => set({ potenciaUnitW: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Partida (W)
              <input type="number" className={IN} data-testid="bib-partida" value={form.potenciaPartidaW}
                onChange={(e) => set({ potenciaPartidaW: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Tensão (V)
              <input type="number" className={IN} data-testid="bib-tensao" value={form.tensaoV}
                onChange={(e) => set({ tensaoV: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">FP
              <input type="number" step="any" className={IN} data-testid="bib-fp" value={form.fatorPotencia}
                onChange={(e) => set({ fatorPotencia: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">h/dia
              <input type="number" step="any" className={IN} data-testid="bib-horas" value={form.horasDia}
                onChange={(e) => set({ horasDia: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">dias/sem
              <input type="number" className={IN} data-testid="bib-dias" value={form.diasSemana}
                onChange={(e) => set({ diasSemana: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Início
              <input type="number" step="any" className={IN} data-testid="bib-inicio" value={form.horaInicio}
                onChange={(e) => set({ horaInicio: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Fim
              <input type="number" step="any" className={IN} data-testid="bib-fim" value={form.horaFim}
                onChange={(e) => set({ horaFim: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Prioridade
              <select className={IN} data-testid="bib-prioridade" value={form.prioridade ?? 'Média'}
                onChange={(e) => set({ prioridade: e.target.value as CargaBibliotecaData['prioridade'] })}>
                {PRIORIDADES_CARGA.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-[11px]">Crítica
              <input type="checkbox" className="mt-2 block" data-testid="bib-critica" checked={form.critica}
                onChange={(e) => set({ critica: e.target.checked })} />
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} data-testid="btn-salvar-biblioteca" onClick={salvar}
              className="rounded bg-[#FF9F40] px-3 py-1.5 text-sm font-semibold text-[#1a1a1a] disabled:opacity-60">
              {editId ? 'Salvar alterações' : 'Adicionar à biblioteca'}
            </button>
            {editId && (
              <button type="button" disabled={pending} onClick={() => { setEditId(null); setForm(VAZIO) }}
                className="rounded border px-3 py-1.5 text-sm">Cancelar</button>
            )}
          </div>

          <ul className="mt-4 space-y-1">
            {lista.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-t border-[var(--theme-border,#e7e9f2)] py-1 text-xs">
                <span>
                  <b>{m.nome}</b>
                  <span className="text-[var(--theme-text-muted,#7b8194)]">
                    {' '}— {m.potenciaUnitW} W (partida {m.potenciaPartidaW} W)
                  </span>
                </span>
                <span>
                  <button type="button" className="mr-3 text-[#3b6fd6]" data-testid={`btn-editar-${m.id}`}
                    onClick={() => editar(m)}>editar</button>
                  <button type="button" className="text-[#c0392b]" data-testid={`btn-excluir-${m.id}`}
                    onClick={() => excluir(m.id)}>excluir</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-cargas-ui`
Expected: PASS (14 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/BibliotecaCargasPanel.tsx web/__tests__/hibrido-cargas-ui.test.tsx
git commit -m "feat(hibrido): painel inline de gestao da biblioteca de cargas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: `CargasBuilder` e a rota

**Files:**
- Create: `web/components/simuladores/CargasBuilder.tsx`
- Create: `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx`
- Modify: `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` (link para a nova tela)

- [ ] **Step 1: Implementar `CargasBuilder.tsx`**

Criar `web/components/simuladores/CargasBuilder.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { CargasTabela } from './CargasTabela'
import { CargasResumo } from './CargasResumo'
import { CargasCurva24h } from './CargasCurva24h'
import { BibliotecaCargasPanel } from './BibliotecaCargasPanel'

export function CargasBuilder({ biblioteca }: { biblioteca: CargaBiblioteca[] }) {
  const [cargas, setCargas] = useState<Carga[]>([])

  // Os cálculos vêm do motor da Fase 2a — nenhuma fórmula vive na UI.
  const resumo = useMemo(() => calcularCargas(cargas, PREMISSAS_PADRAO), [cargas])

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-[var(--theme-text,#1a2340)]">Levantamento de cargas</h1>
      <p className="mb-3 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Monte a lista de cargas da instalação. O consumo e a curva de demanda são calculados automaticamente.
      </p>

      <div className="mb-5 rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]">
        Este levantamento ainda não é salvo: ao recarregar a página, a lista é perdida.
        A persistência chega junto com o simulador completo.
      </div>

      <div className="space-y-4">
        <CargasTabela cargas={cargas} biblioteca={biblioteca} onChange={setCargas} />
        <CargasResumo resumo={resumo} />
        <CargasCurva24h curva={resumo.curva24h} />
        <BibliotecaCargasPanel inicial={biblioteca} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar a rota com o seed no primeiro acesso**

Criar `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx`:

```tsx
export const metadata = { title: 'Levantamento de cargas' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import {
  listCargasBiblioteca, seedCargasBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import { CargasBuilder } from '@/components/simuladores/CargasBuilder'

export default async function CargasPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')

  // Seed no primeiro acesso: se a empresa ainda não tem biblioteca, popula do padrão.
  let biblioteca = await listCargasBiblioteca()
  if (biblioteca.length === 0) {
    await seedCargasBiblioteca()
    biblioteca = await listCargasBiblioteca()
  }
  return <CargasBuilder biblioteca={biblioteca} />
}
```

- [ ] **Step 3: Linkar a nova tela na página do simulador**

Em `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`, o conteúdo hoje é
um único `<Link>` para o cadastro de equipamentos dentro de um
`<div className="...">`. Envolver os dois cards numa grade: substituir o bloco
que começa em `<Link href="/simuladores/hibrido-offgrid/equipamentos"` e termina
no `</Link>` correspondente por:

```tsx
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/simuladores/hibrido-offgrid/equipamentos" className="block h-full">
          <div className="h-full rounded-xl border p-4 transition-colors hover:border-[#FF9F40] bg-[var(--theme-card,#fff)]">
            <div className="text-2xl">🧰</div>
            <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cadastro de equipamentos</h3>
            <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">Painéis, inversores e baterias que alimentarão o simulador.</p>
          </div>
        </Link>
        <Link href="/simuladores/hibrido-offgrid/cargas" className="block h-full">
          <div className="h-full rounded-xl border p-4 transition-colors hover:border-[#FF9F40] bg-[var(--theme-card,#fff)]">
            <div className="text-2xl">🔌</div>
            <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Levantamento de cargas</h3>
            <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">Consumo, potências e curva de demanda de 24 h.</p>
          </div>
        </Link>
      </div>
```

- [ ] **Step 4: Type-check e suíte completa**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; toda a suíte passa (318 anteriores + os novos).

- [ ] **Step 5: Verificação no navegador**

A migration da Task 1 precisa estar aplicada no banco para esta verificação
funcionar. Se ainda não estiver, reporte isso em vez de tentar aplicá-la.

Subir o dev server pela ferramenta de preview e conferir:
- `/simuladores/hibrido-offgrid` mostra os dois cards
- `/simuladores/hibrido-offgrid/cargas` abre com a biblioteca já semeada (26 cargas no seletor)
- Adicionar "Chuveiro elétrico" e "Lâmpada LED 12 W" (qtd 20) atualiza resumo e curva
- O pico da curva reflete a soma das cargas ativas na mesma hora
- O painel da biblioteca abre, cria, edita e exclui
- O aviso de não-persistência aparece

- [ ] **Step 6: Commit**

```bash
git add web/components/simuladores/CargasBuilder.tsx "web/app/(dashboard)/simuladores/hibrido-offgrid"
git commit -m "feat(hibrido): tela de levantamento de cargas com curva de 24h

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- Migration com constraint única e RLS → Task 1 ✔
- Schemas, mapeadores, `bibliotecaParaCarga` → Task 2 ✔
- Seed de ~25 cargas + testes de qualidade do seed → Task 3 ✔
- Actions CRUD + seed idempotente sem `revalidatePath` → Task 4 ✔
- Infra jsdom sem alterar `vitest.config.ts` → Task 5 ✔
- Cinco componentes → Tasks 6, 7, 8, 9 ✔
- Rota com seed no primeiro acesso → Task 9 ✔
- Aviso de não-persistência → Task 9 ✔
- Teste do gráfico limitado a "monta sem quebrar" → Task 6 ✔

**2. Placeholders:** nenhum; todo código está completo.

**3. Consistência de tipos:** `CargaBiblioteca`/`CargaBibliotecaData` são
definidos na Task 2 e usados nas Tasks 3, 4, 7 e 8 com os mesmos nomes de campo.
`bibliotecaParaCarga` devolve `Carga` (tipo da Fase 2a). `CargasTabela` é
controlado (`cargas` + `onChange`), e o `CargasBuilder` da Task 9 fornece os
dois. Os `data-testid` usados nos testes das Tasks 5–8 são exatamente os
emitidos pelos componentes.

**Notas de risco:**
- **A migration precisa ser aplicada antes da verificação no navegador da Task
  9.** Quem implementa não aplica migration em produção; se não estiver
  aplicada, a Task 9 Step 5 deve ser reportada como pendente, não contornada.
- O `vi.mock` da Task 8 precisa estar no escopo de módulo do arquivo de teste
  (hoisting do vitest), não dentro de um `describe`.
- `CargasTabela` usa o índice do array como `key`. É aceitável porque a lista só
  é alterada por append e remoção explícita, e cada linha é um formulário
  controlado sem estado interno próprio. Se a Fase 3b introduzir reordenação,
  troque por um id estável gerado na criação da carga.
- O spec dizia `0 <= hora < 24`; este plano usa `<= 24` para permitir cargas de
  24 h (geladeira, roteador, câmera). O motor da Fase 2a já trata
  `horaFim === horaInicio` como janela nula, então `0 → 24` é a única forma de
  representar o dia inteiro.
