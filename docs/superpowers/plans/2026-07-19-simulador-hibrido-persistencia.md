# Simulador Híbrido / Off-grid — Fase 3c: Persistência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salvar, listar, reabrir e excluir simulações do simulador híbrido, com fidelidade garantida mesmo que o catálogo de equipamentos mude depois.

**Architecture:** Uma tabela org-scoped guarda um snapshot versionado do estado da tela (campos físicos, financeiros, cargas e uma cópia dos equipamentos usados) mais colunas de identificação e indicadores de resumo. Um módulo puro monta, valida e restaura o snapshot; a listagem traz só o resumo e o snapshot vem sob demanda ao reabrir.

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), Zod, TypeScript, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-persistencia-design.md`.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (zero erros)
- Import alias `@/` → `web/`
- Testes de componente: docblock `// @vitest-environment jsdom` + `import '@testing-library/jest-dom/vitest'` no próprio arquivo. **`vitest.config.ts` não muda.**
- Commits em pt-BR, prefixo `feat(hibrido):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Migrations não são aplicadas por quem implementa.** Crie o arquivo `.sql`; quem aplica em produção é o dono do projeto.

**Contexto das fases anteriores:**
- `SimuladorHibrido` (`web/components/simuladores/SimuladorHibrido.tsx`) é dono de `campos`, `cargas`, `biblioteca` e `camposFin`.
- Tipos: `CamposHibrido` e `EquipamentosDisponiveis` em `montar-input.ts`; `CamposFinanceiro` em `montar-financeiro.ts`; `Carga`, `EquipPainel`, `EquipInversor`, `EquipBateria` em `types.ts`.
- Padrão a espelhar: `web/lib/simuladores/viabilidade/simulacoes-actions.ts` e a migration `20260716000001_simulador_viabilidade.sql` — **com as duas correções descritas no spec** (reabrir de verdade, e payback nullable).

---

## File Structure

- Create `web/supabase/migrations/20260719000002_simulador_hibrido_simulacoes.sql`
- Modify `web/types/database.types.ts`
- Create `web/lib/simuladores/hibrido/snapshot.ts` — snapshot versionado, validação e merge de equipamentos
- Create `web/lib/simuladores/hibrido/simulacoes-schemas.ts` — schema de salvar e mapeadores row↔objeto
- Create `web/lib/simuladores/hibrido/simulacoes-actions.ts` — CRUD (`'use server'`)
- Create `web/components/simuladores/HibridoIdentificacao.tsx`
- Create `web/components/simuladores/HibridoSimulacoesSalvas.tsx`
- Modify `web/components/simuladores/SimuladorHibrido.tsx`
- Modify `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`
- Tests: `web/__tests__/hibrido-snapshot.test.ts`, `hibrido-simulacoes-schemas.test.ts` (puros), `hibrido-simulacoes-ui.test.tsx` (jsdom)

---

## Task 1: Migration e tipos

**Files:**
- Create: `web/supabase/migrations/20260719000002_simulador_hibrido_simulacoes.sql`
- Modify: `web/types/database.types.ts`

- [ ] **Step 1: Escrever a migration**

```sql
-- Simulações salvas do simulador Híbrido/Off-grid, por empresa.
-- Standalone, sem vínculo com o CRM (identificação do cliente em texto livre).
--
-- Duas diferenças deliberadas em relação a simulador_viabilidade:
--  1. O snapshot guarda o estado da TELA e uma cópia dos equipamentos usados,
--     para que reabrir reproduza os mesmos números mesmo que o catálogo mude.
--  2. payback_anos é NULLABLE: o investimento pode não se pagar dentro do
--     horizonte, e gravar 0 nesse caso leria como "se paga imediatamente".
CREATE TABLE IF NOT EXISTS simulador_hibrido_simulacoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                 text NOT NULL,
  snapshot             jsonb NOT NULL,
  cliente_nome         text,
  cliente_cidade       text,
  cliente_uf           text,
  concessionaria       text,
  responsavel_tecnico  text,
  potencia_kwp         numeric NOT NULL DEFAULT 0,
  investimento_total   numeric NOT NULL DEFAULT 0,
  vpl                  numeric NOT NULL DEFAULT 0,
  tir                  numeric NOT NULL DEFAULT 0,
  payback_anos         numeric,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_hibrido_simulacoes_org
  ON simulador_hibrido_simulacoes(organization_id);

ALTER TABLE simulador_hibrido_simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador hibrido simulacoes"
  ON simulador_hibrido_simulacoes FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Acrescentar os tipos em `database.types.ts`**

Em `web/types/database.types.ts`, dentro de `public.Tables`, imediatamente antes
de `      simulador_cargas_biblioteca: {`, inserir:

```ts
      simulador_hibrido_simulacoes: {
        Row: {
          cliente_cidade: string | null
          cliente_nome: string | null
          cliente_uf: string | null
          concessionaria: string | null
          created_at: string
          id: string
          investimento_total: number
          nome: string
          organization_id: string
          payback_anos: number | null
          potencia_kwp: number
          responsavel_tecnico: string | null
          snapshot: Json
          tir: number
          updated_at: string
          vpl: number
        }
        Insert: {
          cliente_cidade?: string | null
          cliente_nome?: string | null
          cliente_uf?: string | null
          concessionaria?: string | null
          created_at?: string
          id?: string
          investimento_total?: number
          nome: string
          organization_id: string
          payback_anos?: number | null
          potencia_kwp?: number
          responsavel_tecnico?: string | null
          snapshot: Json
          tir?: number
          updated_at?: string
          vpl?: number
        }
        Update: {
          cliente_cidade?: string | null
          cliente_nome?: string | null
          cliente_uf?: string | null
          concessionaria?: string | null
          created_at?: string
          id?: string
          investimento_total?: number
          nome?: string
          organization_id?: string
          payback_anos?: number | null
          potencia_kwp?: number
          responsavel_tecnico?: string | null
          snapshot?: Json
          tir?: number
          updated_at?: string
          vpl?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulador_hibrido_simulacoes_organization_id_fkey"
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
git add web/supabase/migrations/20260719000002_simulador_hibrido_simulacoes.sql web/types/database.types.ts
git commit -m "feat(hibrido): migration de simulacoes salvas + RLS e tipos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Snapshot versionado

**Files:**
- Create: `web/lib/simuladores/hibrido/snapshot.ts`
- Test: `web/__tests__/hibrido-snapshot.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-snapshot.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  VERSAO_SNAPSHOT, montarSnapshot, lerSnapshot, mesclarEquipamentos,
} from '@/lib/simuladores/hibrido/snapshot'
import { CAMPOS_INICIAIS, type EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'
import { camposFinanceiroIniciais } from '@/lib/simuladores/hibrido/montar-financeiro'
import { PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const CAMPOS = { ...CAMPOS_INICIAIS, painelId: PAINEL.id, numModulos: '16' }
const CAMPOS_FIN = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' }
const EQUIP_USADOS = { painel: PAINEL, inversor: INVERSOR, bateria: BATERIA }

describe('montarSnapshot / lerSnapshot', () => {
  const snap = montarSnapshot(CAMPOS, CAMPOS_FIN, CARGAS, EQUIP_USADOS)

  it('carimba a versão atual', () => {
    expect(snap.versao).toBe(VERSAO_SNAPSHOT)
  })
  it('ida e volta preserva campos, financeiro, cargas e equipamentos', () => {
    const lido = lerSnapshot(JSON.parse(JSON.stringify(snap)))
    expect(lido).not.toBeNull()
    expect(lido!.campos).toEqual(CAMPOS)
    expect(lido!.camposFin).toEqual(CAMPOS_FIN)
    expect(lido!.cargas).toEqual(CARGAS)
    expect(lido!.equipamentos.painel?.modelo).toBe('MHDRZ')
    expect(lido!.equipamentos.bateria?.modelo).toBe('ZTS48150P')
  })
  it('aceita equipamentos nulos (nada selecionado)', () => {
    const s = montarSnapshot(CAMPOS_INICIAIS, CAMPOS_FIN, [], { painel: null, inversor: null, bateria: null })
    const lido = lerSnapshot(JSON.parse(JSON.stringify(s)))
    expect(lido!.equipamentos.painel).toBeNull()
    expect(lido!.cargas).toEqual([])
  })
})

describe('lerSnapshot — recusa em vez de restaurar pela metade', () => {
  const snap = montarSnapshot(CAMPOS, CAMPOS_FIN, CARGAS, EQUIP_USADOS)

  it('recusa versão desconhecida', () => {
    expect(lerSnapshot({ ...snap, versao: 99 })).toBeNull()
  })
  it('recusa objeto sem campos', () => {
    const { campos, ...semCampos } = snap
    void campos
    expect(lerSnapshot(semCampos)).toBeNull()
  })
  it('recusa campos truncados (faltando hspMensal)', () => {
    const { hspMensal, ...camposTruncados } = snap.campos
    void hspMensal
    expect(lerSnapshot({ ...snap, campos: camposTruncados })).toBeNull()
  })
  it('recusa hspMensal com tamanho errado', () => {
    expect(lerSnapshot({ ...snap, campos: { ...snap.campos, hspMensal: [1, 2, 3] } })).toBeNull()
  })
  it('recusa null, undefined e tipos errados', () => {
    expect(lerSnapshot(null)).toBeNull()
    expect(lerSnapshot(undefined)).toBeNull()
    expect(lerSnapshot('texto')).toBeNull()
    expect(lerSnapshot(42)).toBeNull()
  })
})

describe('mesclarEquipamentos', () => {
  const vazio: EquipamentosDisponiveis = { paineis: [], inversores: [], baterias: [] }
  const catalogo: EquipamentosDisponiveis = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

  it('acrescenta equipamento que só existe no snapshot', () => {
    const r = mesclarEquipamentos(vazio, EQUIP_USADOS)
    expect(r.paineis.map((p) => p.id)).toEqual([PAINEL.id])
    expect(r.inversores.map((i) => i.id)).toEqual([INVERSOR.id])
    expect(r.baterias.map((b) => b.id)).toEqual([BATERIA.id])
  })
  it('não duplica o que já está no catálogo', () => {
    const r = mesclarEquipamentos(catalogo, EQUIP_USADOS)
    expect(r.paineis).toHaveLength(1)
    expect(r.inversores).toHaveLength(1)
    expect(r.baterias).toHaveLength(1)
  })
  it('preserva o catálogo quando o snapshot não tem equipamentos', () => {
    const r = mesclarEquipamentos(catalogo, { painel: null, inversor: null, bateria: null })
    expect(r).toEqual(catalogo)
  })
  it('mantém a ordem do catálogo e põe o do snapshot ao fim', () => {
    const outro = { ...PAINEL, id: 'outro-painel', modelo: 'OUTRO' }
    const r = mesclarEquipamentos({ ...catalogo, paineis: [outro] }, EQUIP_USADOS)
    expect(r.paineis.map((p) => p.id)).toEqual(['outro-painel', PAINEL.id])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-snapshot`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/hibrido/snapshot.ts`:

```ts
// web/lib/simuladores/hibrido/snapshot.ts
// Snapshot versionado do estado da tela, para salvar e reabrir simulações.
//
// Guarda uma CÓPIA dos equipamentos usados, não só os ids: se o catálogo mudar
// depois (preço editado, equipamento excluído), reabrir precisa reproduzir os
// mesmos números que o cliente recebeu na proposta.
import { z } from 'zod'
import type { CamposHibrido, EquipamentosDisponiveis } from './montar-input'
import type { CamposFinanceiro } from './montar-financeiro'
import type { Carga, EquipPainel, EquipInversor, EquipBateria } from './types'

/**
 * Versão da forma do snapshot. Incrementar sempre que a estrutura mudar de modo
 * incompatível. Sem isso, um snapshot antigo restauraria pela metade em vez de
 * ser recusado — e o usuário levaria tempo para perceber que algo se perdeu.
 */
export const VERSAO_SNAPSHOT = 1

export type SnapshotSimulacao = {
  versao: number
  campos: CamposHibrido
  camposFin: CamposFinanceiro
  cargas: Carga[]
  equipamentos: {
    painel: EquipPainel | null
    inversor: EquipInversor | null
    bateria: EquipBateria | null
  }
}

const camposSchema = z.object({
  tempMediaC: z.number(),
  tempMaxC: z.number(),
  tempMinC: z.number(),
  hspMensal: z.array(z.number()).length(12),
  perdaSombreamento: z.number(),
  perdaOrientacao: z.number(),
  criterioGeracao: z.enum(['mes_critico', 'media_anual']),
  painelId: z.string(),
  inversorId: z.string(),
  bateriaId: z.string(),
  numModulos: z.string(),
  modulosPorString: z.string(),
  numStrings: z.string(),
  tensaoBancoV: z.string(),
  diasAutonomia: z.string(),
  baseEnergia: z.enum(['total', 'criticas']),
  tipoSistema: z.enum(['Híbrido', 'Off-grid', 'On-grid']),
  simultaneidade: z.string(),
  margemInversor: z.string(),
  dcAcMax: z.string(),
  dcAcMin: z.string(),
})

const camposFinSchema = z.object({
  tarifaKwh: z.string(),
  tusdFioBKwh: z.string(),
  disponibilidadeKwhMes: z.string(),
  moduloUnitario: z.string(),
  inversorUnitario: z.string(),
  bateriaUnitaria: z.string(),
  estruturaPorModulo: z.string(),
  cabeamentoPorKwp: z.string(),
  projetoArt: z.string(),
  maoDeObraPorKwp: z.string(),
  freteImprevistos: z.string(),
  bdi: z.string(),
  margemLucro: z.string(),
  impostos: z.string(),
  tma: z.string(),
  inflacaoTarifa: z.string(),
  degradacaoAnual: z.string(),
  omAnual: z.string(),
  horizonteAnos: z.string(),
  anoConexao: z.string(),
})

const cargaSchema = z.object({
  nome: z.string(),
  categoria: z.string().optional(),
  quantidade: z.number(),
  potenciaUnitW: z.number(),
  potenciaPartidaW: z.number(),
  tensaoV: z.number(),
  fatorPotencia: z.number(),
  horasDia: z.number(),
  diasSemana: z.number(),
  horaInicio: z.number(),
  horaFim: z.number(),
  prioridade: z.string().optional(),
  critica: z.boolean(),
})

// Equipamentos são validados de forma frouxa de propósito: o que importa é que
// o objeto tenha id e os campos que o motor lê. Um schema estrito replicaria
// o cadastro inteiro e quebraria snapshots antigos a cada campo novo opcional.
const equipamentoSchema = z.object({ id: z.string() }).passthrough().nullable()

const snapshotSchema = z.object({
  versao: z.literal(VERSAO_SNAPSHOT),
  campos: camposSchema,
  camposFin: camposFinSchema,
  cargas: z.array(cargaSchema),
  equipamentos: z.object({
    painel: equipamentoSchema,
    inversor: equipamentoSchema,
    bateria: equipamentoSchema,
  }),
})

// Guardas de compilação: se CamposHibrido ou CamposFinanceiro ganharem um campo
// e o schema não acompanhar, o tsc falha AQUI — em vez de o snapshot passar a
// recusar simulações válidas silenciosamente em produção.
const _camposOk: CamposHibrido = {} as z.infer<typeof camposSchema>
const _camposFinOk: CamposFinanceiro = {} as z.infer<typeof camposFinSchema>
const _camposReverso: z.infer<typeof camposSchema> = {} as CamposHibrido
const _camposFinReverso: z.infer<typeof camposFinSchema> = {} as CamposFinanceiro
void _camposOk; void _camposFinOk; void _camposReverso; void _camposFinReverso

export function montarSnapshot(
  campos: CamposHibrido,
  camposFin: CamposFinanceiro,
  cargas: Carga[],
  equipamentos: SnapshotSimulacao['equipamentos']
): SnapshotSimulacao {
  return { versao: VERSAO_SNAPSHOT, campos, camposFin, cargas, equipamentos }
}

/** Valida o snapshot bruto vindo do banco. Devolve `null` se não for confiável. */
export function lerSnapshot(bruto: unknown): SnapshotSimulacao | null {
  const r = snapshotSchema.safeParse(bruto)
  if (!r.success) return null
  return r.data as unknown as SnapshotSimulacao
}

/** Junta um item ao fim da lista, sem duplicar por id. */
function juntar<T extends { id: string }>(lista: T[], item: T | null): T[] {
  if (!item) return lista
  return lista.some((x) => x.id === item.id) ? lista : [...lista, item]
}

/**
 * Catálogo atual + equipamentos do snapshot que não estão mais nele.
 * Sem isso, reabrir uma simulação cujo painel foi excluído do cadastro zeraria
 * o dimensionamento, porque `montarHibridoInput` resolve por id.
 */
export function mesclarEquipamentos(
  catalogo: EquipamentosDisponiveis,
  doSnapshot: SnapshotSimulacao['equipamentos']
): EquipamentosDisponiveis {
  return {
    paineis: juntar(catalogo.paineis, doSnapshot.painel),
    inversores: juntar(catalogo.inversores, doSnapshot.inversor),
    baterias: juntar(catalogo.baterias, doSnapshot.bateria),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-snapshot`
Expected: PASS.

Depois: `cd web && npx tsc --noEmit` → zero erros. **Se as guardas de compilação
falharem**, é porque um schema não bate com o tipo — corrija o schema, não a
guarda.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/snapshot.ts web/__tests__/hibrido-snapshot.test.ts
git commit -m "feat(hibrido): snapshot versionado com validacao e merge de equipamentos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Schemas e mapeadores das simulações

**Files:**
- Create: `web/lib/simuladores/hibrido/simulacoes-schemas.ts`
- Test: `web/__tests__/hibrido-simulacoes-schemas.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-simulacoes-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  salvarSimulacaoSchema, rowToResumo, rowToCompleta,
} from '@/lib/simuladores/hibrido/simulacoes-schemas'

const MINIMO = {
  nome: 'Projeto Palmas',
  snapshot: { versao: 1 },
  potenciaKwp: 9.92,
  investimentoTotal: 89681.35,
  vpl: 141864.78,
  tir: 0.1848,
  paybackAnos: 6.61,
}

describe('salvarSimulacaoSchema', () => {
  it('aceita o mínimo válido', () => {
    expect(salvarSimulacaoSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('recusa nome vazio', () => {
    expect(salvarSimulacaoSchema.safeParse({ ...MINIMO, nome: '' }).success).toBe(false)
  })
  it('aceita payback null (não se paga no horizonte)', () => {
    const r = salvarSimulacaoSchema.safeParse({ ...MINIMO, paybackAnos: null })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.paybackAnos).toBeNull()
  })
  it('aceita campos de cliente ausentes', () => {
    expect(salvarSimulacaoSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('aceita campos de cliente preenchidos', () => {
    const r = salvarSimulacaoSchema.safeParse({
      ...MINIMO, clienteNome: 'Iago', clienteCidade: 'Palmas', clienteUf: 'TO',
      concessionaria: 'ENERGISA', responsavelTecnico: 'Patrick',
    })
    expect(r.success).toBe(true)
  })
})

describe('mapeadores', () => {
  const row = {
    id: 's1', nome: 'Projeto Palmas',
    cliente_nome: 'Iago', cliente_cidade: 'Palmas', cliente_uf: 'TO',
    concessionaria: 'ENERGISA', responsavel_tecnico: 'Patrick',
    potencia_kwp: 9.92, investimento_total: 89681.35, vpl: 141864.78,
    tir: 0.1848, payback_anos: 6.61,
    snapshot: { versao: 1 },
    created_at: '2026-07-19T12:00:00Z',
  }

  it('rowToResumo traz os campos da listagem', () => {
    const r = rowToResumo(row)
    expect(r.id).toBe('s1')
    expect(r.nome).toBe('Projeto Palmas')
    expect(r.clienteNome).toBe('Iago')
    expect(r.potenciaKwp).toBeCloseTo(9.92, 6)
    expect(r.paybackAnos).toBeCloseTo(6.61, 6)
    expect(r.createdAt).toBe('2026-07-19T12:00:00Z')
  })
  it('rowToResumo preserva payback null', () => {
    expect(rowToResumo({ ...row, payback_anos: null }).paybackAnos).toBeNull()
  })
  it('rowToResumo converte campos de cliente ausentes em null', () => {
    const r = rowToResumo({ ...row, cliente_nome: null, cliente_cidade: null })
    expect(r.clienteNome).toBeNull()
    expect(r.clienteCidade).toBeNull()
  })
  it('rowToCompleta acrescenta identificação e snapshot', () => {
    const c = rowToCompleta(row)
    expect(c.clienteUf).toBe('TO')
    expect(c.concessionaria).toBe('ENERGISA')
    expect(c.responsavelTecnico).toBe('Patrick')
    expect(c.snapshot).toEqual({ versao: 1 })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulacoes-schemas`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/hibrido/simulacoes-schemas.ts`:

```ts
// web/lib/simuladores/hibrido/simulacoes-schemas.ts
// Schema de salvar e mapeadores row<->objeto das simulações salvas.
// Módulo puro (sem 'use server') para ser testável isoladamente.
import { z } from 'zod'

export const salvarSimulacaoSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à simulação.'),
  snapshot: z.unknown(),
  clienteNome: z.string().nullish(),
  clienteCidade: z.string().nullish(),
  clienteUf: z.string().nullish(),
  concessionaria: z.string().nullish(),
  responsavelTecnico: z.string().nullish(),
  potenciaKwp: z.coerce.number(),
  investimentoTotal: z.coerce.number(),
  vpl: z.coerce.number(),
  tir: z.coerce.number(),
  // Nullable de propósito: o investimento pode não se pagar no horizonte, e
  // gravar 0 nesse caso leria como "se paga imediatamente".
  paybackAnos: z.coerce.number().nullable(),
})

export type SalvarSimulacaoData = z.infer<typeof salvarSimulacaoSchema>

/** O que a listagem precisa — sem o snapshot, que vem sob demanda ao reabrir. */
export type SimulacaoResumo = {
  id: string
  nome: string
  clienteNome: string | null
  clienteCidade: string | null
  potenciaKwp: number
  investimentoTotal: number
  vpl: number
  tir: number
  paybackAnos: number | null
  createdAt: string
}

/** Resumo + identificação completa + snapshot, para reabrir. */
export type SimulacaoCompleta = SimulacaoResumo & {
  clienteUf: string | null
  concessionaria: string | null
  responsavelTecnico: string | null
  snapshot: unknown
}

const s = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))
const n = (v: unknown): number => Number(v ?? 0)

export function rowToResumo(r: Record<string, unknown>): SimulacaoResumo {
  return {
    id: String(r.id),
    nome: String(r.nome),
    clienteNome: s(r.cliente_nome),
    clienteCidade: s(r.cliente_cidade),
    potenciaKwp: n(r.potencia_kwp),
    investimentoTotal: n(r.investimento_total),
    vpl: n(r.vpl),
    tir: n(r.tir),
    paybackAnos: r.payback_anos === null || r.payback_anos === undefined ? null : Number(r.payback_anos),
    createdAt: String(r.created_at),
  }
}

export function rowToCompleta(r: Record<string, unknown>): SimulacaoCompleta {
  return {
    ...rowToResumo(r),
    clienteUf: s(r.cliente_uf),
    concessionaria: s(r.concessionaria),
    responsavelTecnico: s(r.responsavel_tecnico),
    snapshot: r.snapshot,
  }
}

export function salvarDataToRow(d: SalvarSimulacaoData) {
  return {
    nome: d.nome,
    snapshot: d.snapshot,
    cliente_nome: d.clienteNome ?? null,
    cliente_cidade: d.clienteCidade ?? null,
    cliente_uf: d.clienteUf ?? null,
    concessionaria: d.concessionaria ?? null,
    responsavel_tecnico: d.responsavelTecnico ?? null,
    potencia_kwp: d.potenciaKwp,
    investimento_total: d.investimentoTotal,
    vpl: d.vpl,
    tir: d.tir,
    payback_anos: d.paybackAnos,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulacoes-schemas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/simulacoes-schemas.ts web/__tests__/hibrido-simulacoes-schemas.test.ts
git commit -m "feat(hibrido): schemas e mapeadores das simulacoes salvas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Server actions

**Files:**
- Create: `web/lib/simuladores/hibrido/simulacoes-actions.ts`

- [ ] **Step 1: Implementar**

Criar `web/lib/simuladores/hibrido/simulacoes-actions.ts`:

```ts
// web/lib/simuladores/hibrido/simulacoes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import type { Json } from '@/types/database.types'
import {
  salvarSimulacaoSchema, salvarDataToRow, rowToResumo, rowToCompleta,
  type SalvarSimulacaoData, type SimulacaoResumo, type SimulacaoCompleta,
} from './simulacoes-schemas'

export type { SimulacaoResumo, SimulacaoCompleta, SalvarSimulacaoData } from './simulacoes-schemas'

const ROUTE = '/simuladores/hibrido-offgrid'
const MAX_SIMULACOES = 200

// Sem `snapshot`: a listagem não carrega o estado inteiro de cada simulação.
const COLUNAS_RESUMO =
  'id, nome, cliente_nome, cliente_cidade, potencia_kwp, investimento_total, vpl, tir, payback_anos, created_at'

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function listSimulacoesHibrido(): Promise<SimulacaoResumo[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select(COLUNAS_RESUMO)
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => rowToResumo(r as Record<string, unknown>))
}

/** Busca snapshot + identificação completa, para reabrir. */
export async function getSimulacaoHibrido(id: string): Promise<SimulacaoCompleta | null> {
  const ctx = await requireOrg()
  if ('error' in ctx) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .maybeSingle()
  if (error || !data) return null
  return rowToCompleta(data as Record<string, unknown>)
}

export async function salvarSimulacaoHibrido(data: SalvarSimulacaoData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = salvarSimulacaoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_SIMULACOES) {
    return { error: `Máximo de ${MAX_SIMULACOES} simulações por empresa.` }
  }
  const row = salvarDataToRow(parsed.data)
  const { error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .insert({ organization_id: ctx.orgId, ...row, snapshot: row.snapshot as Json })
  if (error) return { error: error.message }
  await logAction('Simulação híbrida salva', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Simulação salva.' }
}

export async function deleteSimulacaoHibrido(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Simulação híbrida excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação excluída.' }
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros (confirma que os nomes de coluna batem com a Task 1).

- [ ] **Step 3: Commit**

```bash
git add web/lib/simuladores/hibrido/simulacoes-actions.ts
git commit -m "feat(hibrido): actions de salvar, listar, reabrir e excluir simulacoes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `HibridoIdentificacao`

**Files:**
- Create: `web/components/simuladores/HibridoIdentificacao.tsx`
- Create: `web/__tests__/hibrido-simulacoes-ui.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-simulacoes-ui.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HibridoIdentificacao, IDENTIFICACAO_INICIAL, type Identificacao,
} from '@/components/simuladores/HibridoIdentificacao'

vi.mock('@/lib/simuladores/hibrido/simulacoes-actions', () => ({
  listSimulacoesHibrido: vi.fn(async () => []),
  getSimulacaoHibrido: vi.fn(async () => null),
  salvarSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação salva.' })),
  deleteSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação excluída.' })),
}))

function IdentComEstado() {
  const [ident, setIdent] = useState<Identificacao>(IDENTIFICACAO_INICIAL)
  return <HibridoIdentificacao identificacao={ident} onChange={setIdent} />
}

describe('HibridoIdentificacao', () => {
  it('começa com todos os campos vazios', () => {
    render(<IdentComEstado />)
    expect(screen.getByTestId('ident-nome')).toHaveValue('')
    expect(screen.getByTestId('ident-clienteNome')).toHaveValue('')
  })

  it('editar o nome da simulação propaga', async () => {
    const user = userEvent.setup()
    render(<IdentComEstado />)
    await user.type(screen.getByTestId('ident-nome'), 'Projeto Palmas')
    expect(screen.getByTestId('ident-nome')).toHaveValue('Projeto Palmas')
  })

  it('tem os campos de cliente, cidade, UF, concessionária e responsável', () => {
    render(<IdentComEstado />)
    expect(screen.getByTestId('ident-clienteCidade')).toBeInTheDocument()
    expect(screen.getByTestId('ident-clienteUf')).toBeInTheDocument()
    expect(screen.getByTestId('ident-concessionaria')).toBeInTheDocument()
    expect(screen.getByTestId('ident-responsavelTecnico')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `web/components/simuladores/HibridoIdentificacao.tsx`:

```tsx
'use client'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

/** Texto livre: nenhum destes campos entra em cálculo. */
export type Identificacao = {
  nome: string
  clienteNome: string
  clienteCidade: string
  clienteUf: string
  concessionaria: string
  responsavelTecnico: string
}

export const IDENTIFICACAO_INICIAL: Identificacao = {
  nome: '',
  clienteNome: '',
  clienteCidade: '',
  clienteUf: '',
  concessionaria: '',
  responsavelTecnico: '',
}

const CAMPOS: { key: keyof Identificacao; label: string }[] = [
  { key: 'nome', label: 'Nome da simulação' },
  { key: 'clienteNome', label: 'Cliente' },
  { key: 'clienteCidade', label: 'Cidade' },
  { key: 'clienteUf', label: 'UF' },
  { key: 'concessionaria', label: 'Concessionária' },
  { key: 'responsavelTecnico', label: 'Responsável técnico' },
]

type Props = { identificacao: Identificacao; onChange: (i: Identificacao) => void }

export function HibridoIdentificacao({ identificacao, onChange }: Props) {
  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Identificação</h2>
      <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Não entra em nenhum cálculo — serve para nomear a simulação salva e identificar a proposta.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CAMPOS.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input
              className={IN}
              data-testid={`ident-${c.key}`}
              value={identificacao[c.key]}
              onChange={(e) => onChange({ ...identificacao, [c.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoIdentificacao.tsx web/__tests__/hibrido-simulacoes-ui.test.tsx
git commit -m "feat(hibrido): bloco de identificacao da simulacao

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `HibridoSimulacoesSalvas`

**Files:**
- Create: `web/components/simuladores/HibridoSimulacoesSalvas.tsx`
- Modify: `web/__tests__/hibrido-simulacoes-ui.test.tsx`

- [ ] **Step 1: Escrever os testes falhando**

Acrescentar ao fim de `web/__tests__/hibrido-simulacoes-ui.test.tsx`:

```tsx
import { HibridoSimulacoesSalvas } from '@/components/simuladores/HibridoSimulacoesSalvas'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'

const SIM: SimulacaoResumo = {
  id: 's1', nome: 'Projeto Palmas', clienteNome: 'Iago', clienteCidade: 'Palmas',
  potenciaKwp: 9.92, investimentoTotal: 89681.35, vpl: 141864.78, tir: 0.1848,
  paybackAnos: 6.61, createdAt: '2026-07-19T12:00:00Z',
}

const SEM_PAYBACK: SimulacaoResumo = { ...SIM, id: 's2', nome: 'Sem retorno', paybackAnos: null }

describe('HibridoSimulacoesSalvas', () => {
  it('não renderiza nada quando a lista está vazia', () => {
    const { container } = render(
      <HibridoSimulacoesSalvas simulacoes={[]} onReabrir={vi.fn()} onExcluir={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lista as simulações com nome e cliente', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    expect(screen.getByText('Projeto Palmas')).toBeInTheDocument()
    expect(screen.getByText('Iago')).toBeInTheDocument()
  })

  it('payback null aparece como "não se paga", nunca como zero', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SEM_PAYBACK]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    const celula = screen.getByTestId('sim-payback-s2')
    expect(celula).toHaveTextContent('não se paga')
    expect(celula).not.toHaveTextContent('0')
  })

  it('payback preenchido aparece em anos', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    expect(screen.getByTestId('sim-payback-s1')).toHaveTextContent('6,6')
  })

  it('reabrir chama o callback com o id', async () => {
    const user = userEvent.setup()
    const onReabrir = vi.fn()
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={onReabrir} onExcluir={vi.fn()} />)
    await user.click(screen.getByTestId('btn-reabrir-s1'))
    expect(onReabrir).toHaveBeenCalledWith('s1')
  })

  it('excluir chama o callback com o id', async () => {
    const user = userEvent.setup()
    const onExcluir = vi.fn()
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={onExcluir} />)
    await user.click(screen.getByTestId('btn-excluir-s1'))
    expect(onExcluir).toHaveBeenCalledWith('s1')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `web/components/simuladores/HibridoSimulacoesSalvas.tsx`:

```tsx
'use client'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** `null` significa que não se paga no horizonte — mostrar 0 seria o oposto. */
const payback = (v: number | null) => (v === null ? 'não se paga' : `${n(v, 1)} anos`)

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

type Props = {
  simulacoes: SimulacaoResumo[]
  onReabrir: (id: string) => void
  onExcluir: (id: string) => void
}

export function HibridoSimulacoesSalvas({ simulacoes, onReabrir, onExcluir }: Props) {
  if (simulacoes.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        Simulações salvas ({simulacoes.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
              <th className="p-1">Nome</th>
              <th className="p-1">Cliente</th>
              <th className="p-1 text-right">kWp</th>
              <th className="p-1 text-right">Investimento</th>
              <th className="p-1 text-right">VPL</th>
              <th className="p-1 text-right">TIR</th>
              <th className="p-1 text-right">Payback</th>
              <th className="p-1">Data</th>
              <th className="p-1"></th>
            </tr>
          </thead>
          <tbody>
            {simulacoes.map((s) => (
              <tr key={s.id} className="border-t border-[var(--theme-border,#f1f2f7)]">
                <td className="p-1 font-medium">{s.nome}</td>
                <td className="p-1">{s.clienteNome ?? '—'}</td>
                <td className="p-1 text-right tabular-nums">{n(s.potenciaKwp)}</td>
                <td className="p-1 text-right tabular-nums">R$ {n(s.investimentoTotal)}</td>
                <td className="p-1 text-right tabular-nums">R$ {n(s.vpl)}</td>
                <td className="p-1 text-right tabular-nums">{n(s.tir * 100, 1)}%</td>
                <td className="p-1 text-right tabular-nums" data-testid={`sim-payback-${s.id}`}>
                  {payback(s.paybackAnos)}
                </td>
                <td className="p-1">{data(s.createdAt)}</td>
                <td className="p-1 whitespace-nowrap">
                  <button type="button" className="mr-3 text-[#3b6fd6]"
                    data-testid={`btn-reabrir-${s.id}`} onClick={() => onReabrir(s.id)}>reabrir</button>
                  <button type="button" className="text-[#c0392b]"
                    data-testid={`btn-excluir-${s.id}`} onClick={() => onExcluir(s.id)}>excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoSimulacoesSalvas.tsx web/__tests__/hibrido-simulacoes-ui.test.tsx
git commit -m "feat(hibrido): listagem de simulacoes salvas com reabrir e excluir

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Salvar e reabrir no `SimuladorHibrido`

**Files:**
- Modify: `web/components/simuladores/SimuladorHibrido.tsx`
- Modify: `web/__tests__/hibrido-simulacoes-ui.test.tsx`

- [ ] **Step 1: Escrever os testes de integração falhando**

Acrescentar ao fim de `web/__tests__/hibrido-simulacoes-ui.test.tsx`:

```tsx
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'
import {
  salvarSimulacaoHibrido, getSimulacaoHibrido,
} from '@/lib/simuladores/hibrido/simulacoes-actions'
import { montarSnapshot } from '@/lib/simuladores/hibrido/snapshot'
import { CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { camposFinanceiroIniciais } from '@/lib/simuladores/hibrido/montar-financeiro'
import { PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP_UI = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

describe('SimuladorHibrido — salvar e reabrir', () => {
  it('salvar envia o nome, o resumo e o snapshot', async () => {
    const user = userEvent.setup()
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[]} />)

    await user.type(screen.getByTestId('ident-nome'), 'Projeto Palmas')
    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    await user.click(screen.getByTestId('btn-salvar-simulacao'))

    expect(salvarSimulacaoHibrido).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Projeto Palmas',
        snapshot: expect.objectContaining({ versao: 1 }),
        potenciaKwp: expect.any(Number),
      })
    )
  })

  it('reabrir pede confirmação; cancelar não muda nada', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} />)

    await user.click(screen.getByTestId('btn-reabrir-s1'))
    expect(confirmSpy).toHaveBeenCalled()
    expect(getSimulacaoHibrido).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('ao confirmar, restaura campos, cargas e identificação', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const snapshot = montarSnapshot(
      { ...CAMPOS_INICIAIS, tempMediaC: 27, painelId: PAINEL.id, numModulos: '16' },
      { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' },
      CARGAS,
      { painel: PAINEL, inversor: INVERSOR, bateria: BATERIA }
    )
    vi.mocked(getSimulacaoHibrido).mockResolvedValueOnce({
      ...SIM, clienteUf: 'TO', concessionaria: 'ENERGISA',
      responsavelTecnico: 'Patrick', snapshot,
    })

    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} />)
    await user.click(screen.getByTestId('btn-reabrir-s1'))

    expect(await screen.findByDisplayValue('Projeto Palmas')).toBeInTheDocument()
    expect(screen.getByTestId('temp-media')).toHaveValue(27)
    expect(screen.getByTestId('ident-clienteNome')).toHaveValue('Iago')
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('1.22')
    confirmSpy.mockRestore()
  })

  it('snapshot inválido mostra erro e não altera a tela', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(getSimulacaoHibrido).mockResolvedValueOnce({
      ...SIM, clienteUf: null, concessionaria: null, responsavelTecnico: null,
      snapshot: { versao: 99 },
    })

    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} />)
    const antes = (screen.getByTestId('temp-media') as HTMLInputElement).value
    await user.click(screen.getByTestId('btn-reabrir-s1'))

    expect(await screen.findByTestId('erro-simulacao')).toBeInTheDocument()
    expect((screen.getByTestId('temp-media') as HTMLInputElement).value).toBe(antes)
    confirmSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: FAIL — `SimuladorHibrido` ainda não aceita `simulacoes` nem salva.

- [ ] **Step 3: Integrar no `SimuladorHibrido.tsx`**

Acrescentar aos imports:

```tsx
import { useTransition } from 'react'
import {
  salvarSimulacaoHibrido, getSimulacaoHibrido, deleteSimulacaoHibrido,
} from '@/lib/simuladores/hibrido/simulacoes-actions'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'
import { montarSnapshot, lerSnapshot, mesclarEquipamentos } from '@/lib/simuladores/hibrido/snapshot'
import {
  HibridoIdentificacao, IDENTIFICACAO_INICIAL, type Identificacao,
} from './HibridoIdentificacao'
import { HibridoSimulacoesSalvas } from './HibridoSimulacoesSalvas'
```

Trocar o tipo `Props` e a assinatura para receber as simulações:

```tsx
type Props = {
  equipamentos: EquipamentosDisponiveis
  biblioteca: CargaBiblioteca[]
  simulacoes: SimulacaoResumo[]
}

export function SimuladorHibrido({
  equipamentos: equipamentosIniciais, biblioteca: bibliotecaInicial, simulacoes,
}: Props) {
```

Acrescentar estado, logo após o `useState` de `camposFin`:

```tsx
  const [identificacao, setIdentificacao] = useState<Identificacao>(IDENTIFICACAO_INICIAL)
  // Catálogo pode crescer ao reabrir uma simulação cujo equipamento saiu do cadastro.
  const [equipamentos, setEquipamentos] = useState(equipamentosIniciais)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()
```

Acrescentar os handlers, após o `useMemo` de `economiaAno1`:

```tsx
  function salvar() {
    const snapshot = montarSnapshot(campos, camposFin, cargas, {
      painel: input.painel,
      inversor: input.inversor,
      bateria: input.bateria,
    })
    start(async () => {
      const res = await salvarSimulacaoHibrido({
        nome: identificacao.nome,
        snapshot,
        clienteNome: identificacao.clienteNome || null,
        clienteCidade: identificacao.clienteCidade || null,
        clienteUf: identificacao.clienteUf || null,
        concessionaria: identificacao.concessionaria || null,
        responsavelTecnico: identificacao.responsavelTecnico || null,
        potenciaKwp: resultado.dimensionamento.potenciaInstaladaKwp,
        investimentoTotal: financeiro.capex.investimentoTotal,
        vpl: financeiro.indicadores.vpl,
        tir: financeiro.indicadores.tir,
        paybackAnos: financeiro.indicadores.paybackSimplesAnos,
      })
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setMsg({ text: res.success ?? 'Simulação salva.', erro: false })
      window.location.reload()
    })
  }

  function reabrir(id: string) {
    if (!window.confirm('Reabrir esta simulação substitui o que está na tela. Continuar?')) return
    start(async () => {
      const sim = await getSimulacaoHibrido(id)
      const snap = sim ? lerSnapshot(sim.snapshot) : null
      if (!sim || !snap) {
        setMsg({ text: 'Não foi possível ler esta simulação salva.', erro: true })
        return
      }
      setEquipamentos((cat) => mesclarEquipamentos(cat, snap.equipamentos))
      setCampos(snap.campos)
      setCamposFin(snap.camposFin)
      setCargas(snap.cargas)
      setIdentificacao({
        nome: sim.nome,
        clienteNome: sim.clienteNome ?? '',
        clienteCidade: sim.clienteCidade ?? '',
        clienteUf: sim.clienteUf ?? '',
        concessionaria: sim.concessionaria ?? '',
        responsavelTecnico: sim.responsavelTecnico ?? '',
      })
      setMsg({ text: `Simulação "${sim.nome}" reaberta.`, erro: false })
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta simulação?')) return
    start(async () => {
      const res = await deleteSimulacaoHibrido(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }
```

No JSX, logo após o parágrafo de subtítulo, acrescentar a faixa de mensagem:

```tsx
      {msg && (
        <div
          className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}
          data-testid={msg.erro ? 'erro-simulacao' : 'ok-simulacao'}
        >
          {msg.text}
        </div>
      )}
```

No início da `<div className="space-y-4">`, antes de `<HibridoInputsProjeto …>`:

```tsx
        <HibridoIdentificacao identificacao={identificacao} onChange={setIdentificacao} />
```

E ao final da mesma `<div>`, depois de `<HibridoProjecao …>` (ou do bloco
condicional da tarifa):

```tsx
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            data-testid="btn-salvar-simulacao"
            onClick={salvar}
            className="rounded bg-[#FF9F40] px-4 py-2 text-sm font-semibold text-[#1a1a1a] disabled:opacity-60"
          >
            Salvar simulação
          </button>
        </div>

        <HibridoSimulacoesSalvas simulacoes={simulacoes} onReabrir={reabrir} onExcluir={excluir} />
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulacoes-ui`
Expected: PASS (13 testes).

Rodar também os testes anteriores da tela, que agora passam uma prop nova:

Run: `cd web && npm run test -- hibrido-financeiro-ui`
Expected: pode FALHAR, porque `SimuladorHibrido` passou a exigir `simulacoes`.
Nesse caso, acrescente `simulacoes={[]}` nos três `render(<SimuladorHibrido …>)`
daquele arquivo e rode de novo até passar.

- [ ] **Step 5: Suíte completa e type-check**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add web/components/simuladores/SimuladorHibrido.tsx web/__tests__/hibrido-simulacoes-ui.test.tsx web/__tests__/hibrido-financeiro-ui.test.tsx
git commit -m "feat(hibrido): salvar e reabrir simulacoes na tela

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Carregar as simulações na rota

**Files:**
- Modify: `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`

- [ ] **Step 1: Acrescentar a busca e a prop**

Em `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`, acrescentar o import:

```tsx
import { listSimulacoesHibrido } from '@/lib/simuladores/hibrido/simulacoes-actions'
```

Incluir a busca no `Promise.all` existente e passar a prop:

```tsx
  const [paineis, inversores, baterias, simulacoes] = await Promise.all([
    listPaineis(), listInversores(), listBaterias(), listSimulacoesHibrido(),
  ])
```

```tsx
  return (
    <SimuladorHibrido
      equipamentos={{ paineis, inversores, baterias }}
      biblioteca={biblioteca}
      simulacoes={simulacoes}
    />
  )
```

- [ ] **Step 2: Type-check e suíte**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: tudo verde.

- [ ] **Step 3: Verificação no navegador**

A migration da Task 1 precisa estar aplicada no banco. Se não estiver, **reporte
como pendente — não tente aplicá-la.**

Subir o dev server pela ferramenta de preview e conferir:
- Preencher nome da simulação e cliente, selecionar equipamentos, salvar
- A simulação aparece na tabela com kWp, VPL, TIR e payback
- Recarregar a página, clicar em "reabrir", confirmar: campos, cargas e cliente voltam
- Cancelar a confirmação não altera nada
- Excluir remove da lista
- Uma simulação cujo investimento não se paga mostra "não se paga" no payback

- [ ] **Step 4: Commit**

```bash
git add "web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx"
git commit -m "feat(hibrido): carrega simulacoes salvas na rota do simulador

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- Migration com payback nullable + tipos → Task 1 ✔
- Snapshot versionado, validação que recusa, merge de equipamentos → Task 2 ✔
- Schema de salvar e mapeadores → Task 3 ✔
- Actions com listagem sem snapshot e `get` sob demanda → Task 4 ✔
- Identificação em texto livre → Task 5 ✔
- Listagem com "não se paga" → Task 6 ✔
- Salvar, reabrir com confirmação, restaurar identificação, erro sem alterar estado → Task 7 ✔
- Rota carregando as simulações → Task 8 ✔

**2. Placeholders:** nenhum; todo código está completo.

**3. Consistência de tipos:** `SimulacaoResumo` e `SimulacaoCompleta` são
definidos na Task 3 e usados nas Tasks 4, 6 e 7. `Identificacao` e
`IDENTIFICACAO_INICIAL` vêm da Task 5 e são usados na Task 7. `montarSnapshot`,
`lerSnapshot` e `mesclarEquipamentos` (Task 2) são consumidos na Task 7. Os
`data-testid` dos testes batem com os emitidos pelos componentes.

**Notas de risco:**
- **A Task 7 quebra os testes de `hibrido-financeiro-ui.test.tsx`**, porque
  `SimuladorHibrido` ganha uma prop obrigatória. O Step 4 avisa e manda
  acrescentar `simulacoes={[]}` nos renders daquele arquivo — é esperado, não é
  regressão.
- As guardas de compilação em `snapshot.ts` falham de propósito se alguém
  acrescentar um campo a `CamposHibrido`/`CamposFinanceiro` sem atualizar o
  schema Zod. **Corrija o schema, não a guarda** — ela existe justamente para
  impedir que o snapshot passe a recusar simulações válidas em silêncio.
- O snapshot valida equipamentos de forma frouxa (`{ id }` + passthrough) de
  propósito: um schema estrito replicaria o cadastro inteiro e quebraria
  snapshots antigos a cada campo opcional novo.
- `salvar` e `excluir` usam `window.location.reload()` para a lista refletir a
  mudança, seguindo o padrão já usado nos outros simuladores. É pesado, e a
  dívida de trocar por `router.refresh()` já está anotada para uma PR de limpeza.
