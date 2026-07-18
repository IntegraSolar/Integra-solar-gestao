# Simulador Híbrido / Off-grid — Fase 1: Cadastro de Equipamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastro (CRUD) org-scoped de painéis, inversores e baterias, que alimentará os dropdowns do simulador Híbrido/Off-grid nas próximas fases.

**Architecture:** Espelha o padrão dos simuladores existentes (cartão/viabilidade): migration Postgres com RLS por organização, server actions Next.js com validação Zod + auditoria + `revalidatePath`, e um componente client "Manager" de CRUD. Três tabelas separadas (painéis/inversores/baterias) por terem colunas muito distintas. Schemas Zod e mapeadores ficam num módulo puro, importável nos testes sem código server-only.

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), Zod, TypeScript, Vitest, Tailwind (variáveis de tema do projeto).

**Referências no código:**
- Padrão de actions: `web/lib/simuladores/cartao/tabelas-actions.ts`
- Padrão de migration/RLS: `web/supabase/migrations/20260717000001_simulador_cartao_tabelas.sql`
- Padrão de Manager: `web/components/simuladores/CartaoTabelasManager.tsx`
- Padrão de página de config: `web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx`
- Registry/Hub: `web/lib/simuladores/registry.ts`, `web/components/simuladores/SimuladoresHub.tsx`
- Spec: `docs/superpowers/specs/2026-07-18-simulador-hibrido-equipamentos-design.md`

**Convenções do repositório:**
- Testes: `cd web && npm run test` (vitest). Import alias `@/` → `web/`.
- `ActionResult = { error?: string; success?: string }` (`@/lib/crm/types`).
- `logAction(action, description)` de `@/lib/auditoria/actions`.
- Unidades guardadas como na planilha: percentuais (Efic./DOD/SOC) como inteiros; coeficientes térmicos como fração/°C.
- Commits: mensagem em pt-BR, prefixo `feat(hibrido):` / `test(hibrido):`, terminando com a linha de co-autoria já usada no repo.

---

## File Structure

- Create `web/supabase/migrations/20260718000001_simulador_equipamentos.sql` — DDL das 3 tabelas + RLS.
- Modify `web/types/database.types.ts` — adiciona os tipos Row/Insert/Update/Relationships das 3 tabelas.
- Create `web/lib/simuladores/equipamentos/schemas.ts` — tipos, Zod schemas e mapeadores row↔objeto (puro, sem `'use server'`).
- Create `web/lib/simuladores/equipamentos/equipamentos-actions.ts` — CRUD (`'use server'`) dos 3 tipos.
- Create `web/__tests__/equipamentos-schemas.test.ts` — testes de Zod + mapeadores.
- Modify `web/lib/simuladores/registry.ts` — novo status `em_construcao`; `hibrido-offgrid` passa a `em_construcao`.
- Modify `web/__tests__/simuladores-registry.test.ts` — ajusta expectativas de status.
- Modify `web/components/simuladores/SimuladoresHub.tsx` — cards `em_construcao` viram Link com badge própria.
- Create `web/components/simuladores/EquipamentosManager.tsx` — Manager de 3 abas.
- Create `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` — página "em construção" com link ao cadastro.
- Create `web/app/(dashboard)/simuladores/hibrido-offgrid/equipamentos/page.tsx` — carrega listas e renderiza o Manager.

---

## Task 1: Registry — status `em_construcao` e Hub clicável

**Files:**
- Modify: `web/lib/simuladores/registry.ts`
- Modify: `web/components/simuladores/SimuladoresHub.tsx`
- Test: `web/__tests__/simuladores-registry.test.ts`

- [ ] **Step 1: Ajustar o teste do registry para o novo status**

Em `web/__tests__/simuladores-registry.test.ts`, substituir o bloco `it('viabilidade-usina e parcelamento-cartao disponíveis, os demais em_breve', ...)` por:

```ts
  it('viabilidade-usina e parcelamento-cartao disponíveis; hibrido-offgrid em construção; demais em_breve', () => {
    expect(getSimulador('viabilidade-usina')?.status).toBe('disponivel')
    expect(getSimulador('parcelamento-cartao')?.status).toBe('disponivel')
    expect(getSimulador('hibrido-offgrid')?.status).toBe('em_construcao')
    const naoEmBreve = ['viabilidade-usina', 'parcelamento-cartao', 'hibrido-offgrid']
    expect(SIMULADORES.filter(s => !naoEmBreve.includes(s.slug)).every(s => s.status === 'em_breve')).toBe(true)
  })
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd web && npm run test -- simuladores-registry`
Expected: FAIL — `getSimulador('hibrido-offgrid')?.status` é `'em_breve'`, não `'em_construcao'`.

- [ ] **Step 3: Atualizar o registry**

Em `web/lib/simuladores/registry.ts`, alterar o tipo de status e o item `hibrido-offgrid`:

```ts
export type SimuladorStatus = 'disponivel' | 'em_construcao' | 'em_breve'
```

E na constante `SIMULADORES`, trocar a linha do `hibrido-offgrid` por:

```ts
  { slug: 'hibrido-offgrid',         titulo: 'Híbrido / Off-grid',   descricao: 'Dimensionamento e autonomia de baterias', icone: '🔋', status: 'em_construcao' },
```

- [ ] **Step 4: Tornar cards `em_construcao` clicáveis no Hub**

Em `web/components/simuladores/SimuladoresHub.tsx`, dentro do `.map`, substituir a linha `const disponivel = s.status === 'disponivel'` e o `return` final por:

```tsx
          const disponivel = s.status === 'disponivel'
          const construcao = s.status === 'em_construcao'
          const clicavel = disponivel || construcao
          const card = (
            <div
              className={`h-full rounded-xl border p-4 text-left transition-colors ${
                clicavel
                  ? 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] hover:border-[#FF9F40]'
                  : 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{s.icone}</span>
                <span
                  className={`text-[9px] rounded px-1.5 py-0.5 border ${
                    disponivel
                      ? 'text-[#1f9d55] border-[#bce8ce] bg-[#f0fbf4]'
                      : construcao
                        ? 'text-[#b26b00] border-[#f0d9a8] bg-[#fff6e6]'
                        : 'text-[#9aa0b0] border-[#e0e3ee]'
                  }`}
                >
                  {disponivel ? 'disponível' : construcao ? 'em construção' : 'em breve'}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">{s.titulo}</h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">{s.descricao}</p>
            </div>
          )
          return clicavel ? (
            <Link key={s.slug} href={`/simuladores/${s.slug}`} className="block h-full">{card}</Link>
          ) : (
            <div key={s.slug} aria-disabled className="cursor-default">{card}</div>
          )
```

(Remover a definição antiga de `card` e do `return` que estavam logo abaixo do `const disponivel`.)

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd web && npm run test -- simuladores-registry`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/simuladores/registry.ts web/components/simuladores/SimuladoresHub.tsx web/__tests__/simuladores-registry.test.ts
git commit -m "feat(hibrido): status em_construcao no registry + hub clicavel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Migration das 3 tabelas de equipamentos

**Files:**
- Create: `web/supabase/migrations/20260718000001_simulador_equipamentos.sql`

- [ ] **Step 1: Escrever a migration**

Criar `web/supabase/migrations/20260718000001_simulador_equipamentos.sql`:

```sql
-- Simulador Híbrido/Off-grid — cadastro de equipamentos por empresa (máx. 100 por tipo — imposto na action).

-- PAINÉIS FOTOVOLTAICOS
CREATE TABLE IF NOT EXISTS simulador_equip_paineis (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  potencia_wp      numeric NOT NULL,
  voc              numeric NOT NULL,
  vmp              numeric NOT NULL,
  isc              numeric NOT NULL,
  imp              numeric NOT NULL,
  area_m2          numeric NOT NULL,
  coef_pmp         numeric,
  coef_voc         numeric,
  noct             numeric,
  eficiencia       numeric,
  peso_kg          numeric,
  garantia_anos    integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_paineis_org ON simulador_equip_paineis(organization_id);
ALTER TABLE simulador_equip_paineis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip paineis"
  ON simulador_equip_paineis FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- INVERSORES (Híbridos / Off-grid / On-grid)
CREATE TABLE IF NOT EXISTS simulador_equip_inversores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('Híbrido','Off-grid','On-grid')),
  pot_ca_nom_w     numeric NOT NULL,
  mppt_min_v       numeric NOT NULL,
  mppt_max_v       numeric NOT NULL,
  tensao_cc_max_v  numeric NOT NULL,
  num_mppt         integer NOT NULL,
  corr_max_mppt_a  numeric NOT NULL,
  pot_fv_max_wp    numeric NOT NULL,
  pot_surge_w      numeric,
  tensao_cc_bat_v  numeric,
  eficiencia       numeric,
  backup           boolean NOT NULL DEFAULT false,
  paralelismo      integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_inversores_org ON simulador_equip_inversores(organization_id);
ALTER TABLE simulador_equip_inversores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip inversores"
  ON simulador_equip_inversores FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- BATERIAS
CREATE TABLE IF NOT EXISTS simulador_equip_baterias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  tecnologia       text NOT NULL CHECK (tecnologia IN ('LiFePO4','Lítio NMC','Chumbo-ácido','Gel','AGM')),
  tensao_v         numeric NOT NULL,
  capacidade_ah    numeric NOT NULL,
  energia_kwh      numeric,
  corr_max_a       numeric,
  corr_recom_a     numeric,
  dod              numeric,
  soc_min          numeric,
  ciclos           integer,
  eficiencia       numeric,
  garantia_anos    integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_baterias_org ON simulador_equip_baterias(organization_id);
ALTER TABLE simulador_equip_baterias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip baterias"
  ON simulador_equip_baterias FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/20260718000001_simulador_equipamentos.sql
git commit -m "feat(hibrido): migration simulador_equip_* (paineis/inversores/baterias) + RLS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> **Nota de execução:** a migration precisa ser aplicada no banco Supabase do projeto (mesmo fluxo usado nas migrations anteriores). A Task 3 adiciona os tipos manualmente para não depender de regeneração automática, mas se o fluxo do time for `supabase gen types`, rode-o após aplicar e confira que o resultado bate com a Task 3.

---

## Task 3: Tipos das tabelas em `database.types.ts`

**Files:**
- Modify: `web/types/database.types.ts`

- [ ] **Step 1: Inserir as três tabelas em `public.Tables`**

Em `web/types/database.types.ts`, logo antes da linha `      simulador_cartao_tabelas: {` (mantém ordem alfabética: `equip` vem antes de `cartao`? não — inserir antes de `simulador_cartao_tabelas` é aceitável; a ordem não afeta o compilador), inserir os três blocos:

```ts
      simulador_equip_paineis: {
        Row: {
          area_m2: number
          coef_pmp: number | null
          coef_voc: number | null
          created_at: string
          eficiencia: number | null
          fabricante: string
          garantia_anos: number | null
          id: string
          imp: number
          isc: number
          modelo: string
          noct: number | null
          organization_id: string
          peso_kg: number | null
          potencia_wp: number
          updated_at: string
          vmp: number
          voc: number
        }
        Insert: {
          area_m2: number
          coef_pmp?: number | null
          coef_voc?: number | null
          created_at?: string
          eficiencia?: number | null
          fabricante: string
          garantia_anos?: number | null
          id?: string
          imp: number
          isc: number
          modelo: string
          noct?: number | null
          organization_id: string
          peso_kg?: number | null
          potencia_wp: number
          updated_at?: string
          vmp: number
          voc: number
        }
        Update: {
          area_m2?: number
          coef_pmp?: number | null
          coef_voc?: number | null
          created_at?: string
          eficiencia?: number | null
          fabricante?: string
          garantia_anos?: number | null
          id?: string
          imp?: number
          isc?: number
          modelo?: string
          noct?: number | null
          organization_id?: string
          peso_kg?: number | null
          potencia_wp?: number
          updated_at?: string
          vmp?: number
          voc?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulador_equip_paineis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_equip_inversores: {
        Row: {
          backup: boolean
          corr_max_mppt_a: number
          created_at: string
          eficiencia: number | null
          fabricante: string
          id: string
          modelo: string
          mppt_max_v: number
          mppt_min_v: number
          num_mppt: number
          organization_id: string
          paralelismo: number | null
          pot_ca_nom_w: number
          pot_fv_max_wp: number
          pot_surge_w: number | null
          tensao_cc_bat_v: number | null
          tensao_cc_max_v: number
          tipo: string
          updated_at: string
        }
        Insert: {
          backup?: boolean
          corr_max_mppt_a: number
          created_at?: string
          eficiencia?: number | null
          fabricante: string
          id?: string
          modelo: string
          mppt_max_v: number
          mppt_min_v: number
          num_mppt: number
          organization_id: string
          paralelismo?: number | null
          pot_ca_nom_w: number
          pot_fv_max_wp: number
          pot_surge_w?: number | null
          tensao_cc_bat_v?: number | null
          tensao_cc_max_v: number
          tipo: string
          updated_at?: string
        }
        Update: {
          backup?: boolean
          corr_max_mppt_a?: number
          created_at?: string
          eficiencia?: number | null
          fabricante?: string
          id?: string
          modelo?: string
          mppt_max_v?: number
          mppt_min_v?: number
          num_mppt?: number
          organization_id?: string
          paralelismo?: number | null
          pot_ca_nom_w?: number
          pot_fv_max_wp?: number
          pot_surge_w?: number | null
          tensao_cc_bat_v?: number | null
          tensao_cc_max_v?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_equip_inversores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_equip_baterias: {
        Row: {
          capacidade_ah: number
          ciclos: number | null
          corr_max_a: number | null
          corr_recom_a: number | null
          created_at: string
          dod: number | null
          eficiencia: number | null
          energia_kwh: number | null
          fabricante: string
          garantia_anos: number | null
          id: string
          modelo: string
          organization_id: string
          soc_min: number | null
          tecnologia: string
          tensao_v: number
          updated_at: string
        }
        Insert: {
          capacidade_ah: number
          ciclos?: number | null
          corr_max_a?: number | null
          corr_recom_a?: number | null
          created_at?: string
          dod?: number | null
          eficiencia?: number | null
          energia_kwh?: number | null
          fabricante: string
          garantia_anos?: number | null
          id?: string
          modelo: string
          organization_id: string
          soc_min?: number | null
          tecnologia: string
          tensao_v: number
          updated_at?: string
        }
        Update: {
          capacidade_ah?: number
          ciclos?: number | null
          corr_max_a?: number | null
          corr_recom_a?: number | null
          created_at?: string
          dod?: number | null
          eficiencia?: number | null
          energia_kwh?: number | null
          fabricante?: string
          garantia_anos?: number | null
          id?: string
          modelo?: string
          organization_id?: string
          soc_min?: number | null
          tecnologia?: string
          tensao_v?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_equip_baterias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 2: Verificar type-check**

Run: `cd web && npx tsc --noEmit`
Expected: sem novos erros relacionados a `simulador_equip_*`. (Se o projeto tiver erros preexistentes não relacionados, ignore-os; confirme que nenhum menciona as novas tabelas.)

- [ ] **Step 3: Commit**

```bash
git add web/types/database.types.ts
git commit -m "feat(hibrido): tipos database.types das tabelas simulador_equip_*

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Schemas Zod, tipos e mapeadores (módulo puro)

**Files:**
- Create: `web/lib/simuladores/equipamentos/schemas.ts`

Este módulo NÃO tem `'use server'` — é importável nos testes.

- [ ] **Step 1: Escrever `schemas.ts`**

Criar `web/lib/simuladores/equipamentos/schemas.ts`:

```ts
// web/lib/simuladores/equipamentos/schemas.ts
// Tipos, schemas Zod e mapeadores row<->objeto do cadastro de equipamentos.
// Módulo puro (sem 'use server') para ser testável isoladamente.
import { z } from 'zod'

// ---------- PAINÉIS ----------
export const painelSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  potenciaWp: z.coerce.number().positive('Potência deve ser > 0.'),
  voc: z.coerce.number().positive('Voc deve ser > 0.'),
  vmp: z.coerce.number().positive('Vmp deve ser > 0.'),
  isc: z.coerce.number().positive('Isc deve ser > 0.'),
  imp: z.coerce.number().positive('Imp deve ser > 0.'),
  areaM2: z.coerce.number().positive('Área deve ser > 0.'),
  coefPmp: z.coerce.number().nullish(),
  coefVoc: z.coerce.number().nullish(),
  noct: z.coerce.number().nullish(),
  eficiencia: z.coerce.number().nullish(),
  pesoKg: z.coerce.number().nullish(),
  garantiaAnos: z.coerce.number().int().nullish(),
})
export type PainelData = z.infer<typeof painelSchema>
export type EquipPainel = PainelData & { id: string }

// ---------- INVERSORES ----------
export const TIPOS_INVERSOR = ['Híbrido', 'Off-grid', 'On-grid'] as const
export const inversorSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  tipo: z.enum(TIPOS_INVERSOR),
  potCaNomW: z.coerce.number().positive('Potência CA deve ser > 0.'),
  mpptMinV: z.coerce.number().positive('MPPT mín deve ser > 0.'),
  mpptMaxV: z.coerce.number().positive('MPPT máx deve ser > 0.'),
  tensaoCcMaxV: z.coerce.number().positive('Tensão CC máx deve ser > 0.'),
  numMppt: z.coerce.number().int().positive('Nº de MPPT deve ser > 0.'),
  corrMaxMpptA: z.coerce.number().positive('Corrente/MPPT deve ser > 0.'),
  potFvMaxWp: z.coerce.number().positive('Potência FV máx deve ser > 0.'),
  potSurgeW: z.coerce.number().nullish(),
  tensaoCcBatV: z.coerce.number().nullish(),
  eficiencia: z.coerce.number().nullish(),
  backup: z.coerce.boolean().default(false),
  paralelismo: z.coerce.number().int().nullish(),
})
export type InversorData = z.infer<typeof inversorSchema>
export type EquipInversor = InversorData & { id: string }

// ---------- BATERIAS ----------
export const TECNOLOGIAS_BATERIA = ['LiFePO4', 'Lítio NMC', 'Chumbo-ácido', 'Gel', 'AGM'] as const
export const bateriaSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  tecnologia: z.enum(TECNOLOGIAS_BATERIA),
  tensaoV: z.coerce.number().positive('Tensão deve ser > 0.'),
  capacidadeAh: z.coerce.number().positive('Capacidade deve ser > 0.'),
  energiaKwh: z.coerce.number().nullish(),
  corrMaxA: z.coerce.number().nullish(),
  corrRecomA: z.coerce.number().nullish(),
  dod: z.coerce.number().nullish(),
  socMin: z.coerce.number().nullish(),
  ciclos: z.coerce.number().int().nullish(),
  eficiencia: z.coerce.number().nullish(),
  garantiaAnos: z.coerce.number().int().nullish(),
})
export type BateriaData = z.infer<typeof bateriaSchema>
export type EquipBateria = BateriaData & { id: string }

// ---------- Mapeadores row<->objeto ----------
const nOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const sOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))

export function rowToPainel(r: Record<string, unknown>): EquipPainel {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    potenciaWp: Number(r.potencia_wp),
    voc: Number(r.voc),
    vmp: Number(r.vmp),
    isc: Number(r.isc),
    imp: Number(r.imp),
    areaM2: Number(r.area_m2),
    coefPmp: nOrNull(r.coef_pmp),
    coefVoc: nOrNull(r.coef_voc),
    noct: nOrNull(r.noct),
    eficiencia: nOrNull(r.eficiencia),
    pesoKg: nOrNull(r.peso_kg),
    garantiaAnos: nOrNull(r.garantia_anos),
  }
}
export function painelToRow(d: PainelData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, potencia_wp: d.potenciaWp,
    voc: d.voc, vmp: d.vmp, isc: d.isc, imp: d.imp, area_m2: d.areaM2,
    coef_pmp: d.coefPmp ?? null, coef_voc: d.coefVoc ?? null, noct: d.noct ?? null,
    eficiencia: d.eficiencia ?? null, peso_kg: d.pesoKg ?? null, garantia_anos: d.garantiaAnos ?? null,
  }
}

export function rowToInversor(r: Record<string, unknown>): EquipInversor {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    tipo: String(r.tipo) as EquipInversor['tipo'],
    potCaNomW: Number(r.pot_ca_nom_w),
    mpptMinV: Number(r.mppt_min_v),
    mpptMaxV: Number(r.mppt_max_v),
    tensaoCcMaxV: Number(r.tensao_cc_max_v),
    numMppt: Number(r.num_mppt),
    corrMaxMpptA: Number(r.corr_max_mppt_a),
    potFvMaxWp: Number(r.pot_fv_max_wp),
    potSurgeW: nOrNull(r.pot_surge_w),
    tensaoCcBatV: nOrNull(r.tensao_cc_bat_v),
    eficiencia: nOrNull(r.eficiencia),
    backup: Boolean(r.backup),
    paralelismo: nOrNull(r.paralelismo),
  }
}
export function inversorToRow(d: InversorData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, tipo: d.tipo, pot_ca_nom_w: d.potCaNomW,
    mppt_min_v: d.mpptMinV, mppt_max_v: d.mpptMaxV, tensao_cc_max_v: d.tensaoCcMaxV,
    num_mppt: d.numMppt, corr_max_mppt_a: d.corrMaxMpptA, pot_fv_max_wp: d.potFvMaxWp,
    pot_surge_w: d.potSurgeW ?? null, tensao_cc_bat_v: d.tensaoCcBatV ?? null,
    eficiencia: d.eficiencia ?? null, backup: d.backup, paralelismo: d.paralelismo ?? null,
  }
}

export function rowToBateria(r: Record<string, unknown>): EquipBateria {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    tecnologia: String(r.tecnologia) as EquipBateria['tecnologia'],
    tensaoV: Number(r.tensao_v),
    capacidadeAh: Number(r.capacidade_ah),
    energiaKwh: nOrNull(r.energia_kwh),
    corrMaxA: nOrNull(r.corr_max_a),
    corrRecomA: nOrNull(r.corr_recom_a),
    dod: nOrNull(r.dod),
    socMin: nOrNull(r.soc_min),
    ciclos: nOrNull(r.ciclos),
    eficiencia: nOrNull(r.eficiencia),
    garantiaAnos: nOrNull(r.garantia_anos),
  }
}
export function bateriaToRow(d: BateriaData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, tecnologia: d.tecnologia,
    tensao_v: d.tensaoV, capacidade_ah: d.capacidadeAh, energia_kwh: d.energiaKwh ?? null,
    corr_max_a: d.corrMaxA ?? null, corr_recom_a: d.corrRecomA ?? null, dod: d.dod ?? null,
    soc_min: d.socMin ?? null, ciclos: d.ciclos ?? null, eficiencia: d.eficiencia ?? null,
    garantia_anos: d.garantiaAnos ?? null,
  }
}

// evita "unused" caso algum mapeador não use sOrNull no futuro
void sOrNull
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros em `schemas.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/lib/simuladores/equipamentos/schemas.ts
git commit -m "feat(hibrido): schemas Zod, tipos e mapeadores do cadastro de equipamentos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Testes de schemas e mapeadores

**Files:**
- Create: `web/__tests__/equipamentos-schemas.test.ts`

- [ ] **Step 1: Escrever os testes**

Criar `web/__tests__/equipamentos-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  painelSchema, inversorSchema, bateriaSchema,
  rowToPainel, painelToRow, rowToInversor, inversorToRow, rowToBateria, bateriaToRow,
} from '@/lib/simuladores/equipamentos/schemas'

describe('painelSchema', () => {
  const minimo = { fabricante: 'OSDA', modelo: 'MHDRZ', potenciaWp: 620, voc: 49.08, vmp: 40.74, isc: 16.08, imp: 15.22, areaM2: 2.7 }
  it('aceita painel mínimo válido (opcionais ausentes)', () => {
    expect(painelSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita quando falta obrigatório (area_m2)', () => {
    const { areaM2, ...semArea } = minimo
    expect(painelSchema.safeParse(semArea).success).toBe(false)
  })
  it('rejeita potência não positiva', () => {
    expect(painelSchema.safeParse({ ...minimo, potenciaWp: 0 }).success).toBe(false)
  })
})

describe('inversorSchema', () => {
  const minimo = { fabricante: 'DEYE', modelo: 'SUN 8K', tipo: 'Híbrido', potCaNomW: 8000, mpptMinV: 125, mpptMaxV: 425, tensaoCcMaxV: 500, numMppt: 2, corrMaxMpptA: 22, potFvMaxWp: 10400 }
  it('aceita inversor mínimo válido', () => {
    expect(inversorSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita tipo fora do enum', () => {
    expect(inversorSchema.safeParse({ ...minimo, tipo: 'Central' }).success).toBe(false)
  })
  it('backup default false quando ausente', () => {
    const p = inversorSchema.parse(minimo)
    expect(p.backup).toBe(false)
  })
})

describe('bateriaSchema', () => {
  const minimo = { fabricante: 'ZTRON', modelo: 'ZTS48150P', tecnologia: 'Lítio NMC', tensaoV: 48, capacidadeAh: 150 }
  it('aceita bateria mínima válida', () => {
    expect(bateriaSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita tecnologia fora do enum', () => {
    expect(bateriaSchema.safeParse({ ...minimo, tecnologia: 'Sódio' }).success).toBe(false)
  })
})

describe('mapeadores row<->objeto', () => {
  it('painel: ida e volta preserva valores e nulos', () => {
    const data = painelSchema.parse({ fabricante: 'OSDA', modelo: 'MHDRZ', potenciaWp: 620, voc: 49.08, vmp: 40.74, isc: 16.08, imp: 15.22, areaM2: 2.7, coefPmp: -0.0029 })
    const row = { id: 'p1', organization_id: 'o1', ...painelToRow(data) }
    const back = rowToPainel(row as Record<string, unknown>)
    expect(back.id).toBe('p1')
    expect(back.potenciaWp).toBe(620)
    expect(back.coefPmp).toBe(-0.0029)
    expect(back.noct).toBeNull()
  })
  it('inversor: preserva tipo, backup e opcionais nulos', () => {
    const data = inversorSchema.parse({ fabricante: 'DEYE', modelo: 'SUN 8K', tipo: 'Híbrido', potCaNomW: 8000, mpptMinV: 125, mpptMaxV: 425, tensaoCcMaxV: 500, numMppt: 2, corrMaxMpptA: 22, potFvMaxWp: 10400, eficiencia: 97 })
    const row = { id: 'i1', ...inversorToRow(data) }
    const back = rowToInversor(row as Record<string, unknown>)
    expect(back.tipo).toBe('Híbrido')
    expect(back.backup).toBe(false)
    expect(back.eficiencia).toBe(97)
    expect(back.paralelismo).toBeNull()
  })
  it('bateria: energia calcula depois; aqui preserva o que veio', () => {
    const data = bateriaSchema.parse({ fabricante: 'ZTRON', modelo: 'ZTS48150P', tecnologia: 'Lítio NMC', tensaoV: 48, capacidadeAh: 150, dod: 90, socMin: 10 })
    const row = { id: 'b1', ...bateriaToRow(data) }
    const back = rowToBateria(row as Record<string, unknown>)
    expect(back.dod).toBe(90)
    expect(back.socMin).toBe(10)
    expect(back.energiaKwh).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver passar**

Run: `cd web && npm run test -- equipamentos-schemas`
Expected: PASS (todos os testes). Se algum mapeador falhar, corrigir `schemas.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/equipamentos-schemas.test.ts
git commit -m "test(hibrido): schemas Zod e mapeadores do cadastro de equipamentos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Server actions (CRUD dos 3 tipos)

**Files:**
- Create: `web/lib/simuladores/equipamentos/equipamentos-actions.ts`

- [ ] **Step 1: Escrever as actions**

Criar `web/lib/simuladores/equipamentos/equipamentos-actions.ts`:

```ts
// web/lib/simuladores/equipamentos/equipamentos-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import {
  painelSchema, inversorSchema, bateriaSchema,
  rowToPainel, painelToRow, rowToInversor, inversorToRow, rowToBateria, bateriaToRow,
  type PainelData, type InversorData, type BateriaData,
  type EquipPainel, type EquipInversor, type EquipBateria,
} from './schemas'

export type { EquipPainel, EquipInversor, EquipBateria, PainelData, InversorData, BateriaData } from './schemas'

const ROUTE = '/simuladores/hibrido-offgrid/equipamentos'
const MAX_POR_TIPO = 100

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

// ---------- PAINÉIS ----------
export async function listPaineis(): Promise<EquipPainel[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_paineis')
    .select('*')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToPainel(r as Record<string, unknown>))
}

export async function createPainel(data: PainelData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = painelSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_paineis')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} painéis por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .insert({ organization_id: ctx.orgId, ...painelToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Painel cadastrado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Painel cadastrado.' }
}

export async function updatePainel(id: string, data: PainelData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = painelSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .update(painelToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Painel atualizado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Painel atualizado.' }
}

export async function deletePainel(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Painel excluído', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Painel excluído.' }
}

// ---------- INVERSORES ----------
export async function listInversores(): Promise<EquipInversor[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_inversores')
    .select('*')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToInversor(r as Record<string, unknown>))
}

export async function createInversor(data: InversorData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = inversorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_inversores')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} inversores por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .insert({ organization_id: ctx.orgId, ...inversorToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Inversor cadastrado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor cadastrado.' }
}

export async function updateInversor(id: string, data: InversorData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = inversorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .update(inversorToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Inversor atualizado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor atualizado.' }
}

export async function deleteInversor(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Inversor excluído', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor excluído.' }
}

// ---------- BATERIAS ----------
export async function listBaterias(): Promise<EquipBateria[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_baterias')
    .select('*')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToBateria(r as Record<string, unknown>))
}

export async function createBateria(data: BateriaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = bateriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_baterias')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} baterias por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .insert({ organization_id: ctx.orgId, ...bateriaToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Bateria cadastrada', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria cadastrada.' }
}

export async function updateBateria(id: string, data: BateriaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = bateriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .update(bateriaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Bateria atualizada', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria atualizada.' }
}

export async function deleteBateria(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Bateria excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria excluída.' }
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros. (Confirma que os nomes de tabela/coluna batem com a Task 3.)

- [ ] **Step 3: Commit**

```bash
git add web/lib/simuladores/equipamentos/equipamentos-actions.ts
git commit -m "feat(hibrido): server actions CRUD de paineis/inversores/baterias (teto 100/tipo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Componente `EquipamentosManager` (3 abas)

**Files:**
- Create: `web/components/simuladores/EquipamentosManager.tsx`

- [ ] **Step 1: Escrever o Manager**

Criar `web/components/simuladores/EquipamentosManager.tsx`. Usa um form genérico dirigido por descritores de campo para não repetir markup entre os 3 tipos.

```tsx
'use client'
import { useState, useTransition } from 'react'
import {
  createPainel, updatePainel, deletePainel,
  createInversor, updateInversor, deleteInversor,
  createBateria, updateBateria, deleteBateria,
} from '@/lib/simuladores/equipamentos/equipamentos-actions'
import {
  TIPOS_INVERSOR, TECNOLOGIAS_BATERIA,
  type EquipPainel, type EquipInversor, type EquipBateria,
} from '@/lib/simuladores/equipamentos/schemas'
import type { ActionResult } from '@/lib/crm/types'

type Aba = 'paineis' | 'inversores' | 'baterias'
type Campo = { key: string; label: string; tipo: 'number' | 'text' | 'select' | 'bool'; opcoes?: readonly string[]; opcional?: boolean }

const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A] text-sm'
const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

const CAMPOS_PAINEL: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'potenciaWp', label: 'Potência (Wp)', tipo: 'number' },
  { key: 'voc', label: 'Voc (V)', tipo: 'number' },
  { key: 'vmp', label: 'Vmp (V)', tipo: 'number' },
  { key: 'isc', label: 'Isc (A)', tipo: 'number' },
  { key: 'imp', label: 'Imp (A)', tipo: 'number' },
  { key: 'areaM2', label: 'Área (m²)', tipo: 'number' },
  { key: 'coefPmp', label: 'Coef. Pmp (%/°C, fração)', tipo: 'number', opcional: true },
  { key: 'coefVoc', label: 'Coef. Voc (%/°C, fração)', tipo: 'number', opcional: true },
  { key: 'noct', label: 'NOCT (°C)', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. (%)', tipo: 'number', opcional: true },
  { key: 'pesoKg', label: 'Peso (kg)', tipo: 'number', opcional: true },
  { key: 'garantiaAnos', label: 'Garantia (anos)', tipo: 'number', opcional: true },
]
const CAMPOS_INVERSOR: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'tipo', label: 'Tipo', tipo: 'select', opcoes: TIPOS_INVERSOR },
  { key: 'potCaNomW', label: 'Pot. CA nom. (W)', tipo: 'number' },
  { key: 'mpptMinV', label: 'MPPT mín (V)', tipo: 'number' },
  { key: 'mpptMaxV', label: 'MPPT máx (V)', tipo: 'number' },
  { key: 'tensaoCcMaxV', label: 'Tensão CC máx (V)', tipo: 'number' },
  { key: 'numMppt', label: 'Nº MPPT', tipo: 'number' },
  { key: 'corrMaxMpptA', label: 'Corr. máx/MPPT (A)', tipo: 'number' },
  { key: 'potFvMaxWp', label: 'Pot. FV máx (Wp)', tipo: 'number' },
  { key: 'potSurgeW', label: 'Pot. pico/surge (W)', tipo: 'number', opcional: true },
  { key: 'tensaoCcBatV', label: 'Tensão CC bat. (V)', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. (%)', tipo: 'number', opcional: true },
  { key: 'backup', label: 'Backup / ilha', tipo: 'bool', opcional: true },
  { key: 'paralelismo', label: 'Paralelismo (nº)', tipo: 'number', opcional: true },
]
const CAMPOS_BATERIA: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'tecnologia', label: 'Tecnologia', tipo: 'select', opcoes: TECNOLOGIAS_BATERIA },
  { key: 'tensaoV', label: 'Tensão (V)', tipo: 'number' },
  { key: 'capacidadeAh', label: 'Capacidade (Ah)', tipo: 'number' },
  { key: 'energiaKwh', label: 'Energia (kWh)', tipo: 'number', opcional: true },
  { key: 'corrMaxA', label: 'Corr. máx (A)', tipo: 'number', opcional: true },
  { key: 'corrRecomA', label: 'Corr. recom. (A)', tipo: 'number', opcional: true },
  { key: 'dod', label: 'DOD (%)', tipo: 'number', opcional: true },
  { key: 'socMin', label: 'SOC mín (%)', tipo: 'number', opcional: true },
  { key: 'ciclos', label: 'Ciclos', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. round-trip (%)', tipo: 'number', opcional: true },
  { key: 'garantiaAnos', label: 'Garantia (anos)', tipo: 'number', opcional: true },
]

type Item = { id: string } & Record<string, unknown>
type Estado = Record<string, string>

function itemParaEstado(campos: Campo[], it?: Item): Estado {
  const e: Estado = {}
  for (const c of campos) {
    const v = it?.[c.key]
    if (c.tipo === 'bool') e[c.key] = v ? 'sim' : 'nao'
    else if (c.tipo === 'select') e[c.key] = v != null ? String(v) : (c.opcoes?.[0] ?? '')
    else e[c.key] = v != null ? String(v) : ''
  }
  return e
}

function estadoParaPayload(campos: Campo[], e: Estado): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  for (const c of campos) {
    if (c.tipo === 'number') p[c.key] = c.opcional ? num(e[c.key]) : num(e[c.key])
    else if (c.tipo === 'bool') p[c.key] = e[c.key] === 'sim'
    else p[c.key] = e[c.key]
  }
  return p
}

export function EquipamentosManager({
  paineis, inversores, baterias,
}: { paineis: EquipPainel[]; inversores: EquipInversor[]; baterias: EquipBateria[] }) {
  const [aba, setAba] = useState<Aba>('paineis')
  const cfg = {
    paineis:    { campos: CAMPOS_PAINEL,   lista: paineis as unknown as Item[],   create: createPainel,   update: updatePainel,   remove: deletePainel,   label: 'painel' },
    inversores: { campos: CAMPOS_INVERSOR, lista: inversores as unknown as Item[], create: createInversor, update: updateInversor, remove: deleteInversor, label: 'inversor' },
    baterias:   { campos: CAMPOS_BATERIA,  lista: baterias as unknown as Item[],   create: createBateria,  update: updateBateria,  remove: deleteBateria,  label: 'bateria' },
  }[aba]

  const [form, setForm] = useState<Estado>(() => itemParaEstado(CAMPOS_PAINEL))
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  function trocarAba(nova: Aba) {
    setAba(nova)
    setEditId(null)
    setMsg(null)
    const campos = { paineis: CAMPOS_PAINEL, inversores: CAMPOS_INVERSOR, baterias: CAMPOS_BATERIA }[nova]
    setForm(itemParaEstado(campos))
  }

  function editar(it: Item) {
    setEditId(it.id)
    setForm(itemParaEstado(cfg.campos, it))
    setMsg(null)
  }

  function cancelar() {
    setEditId(null)
    setForm(itemParaEstado(cfg.campos))
  }

  function salvar() {
    const payload = estadoParaPayload(cfg.campos, form)
    start(async () => {
      const res: ActionResult = editId
        ? await cfg.update(editId, payload as never)
        : await cfg.create(payload as never)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }

  function excluir(id: string) {
    if (!window.confirm(`Excluir este ${cfg.label}?`)) return
    start(async () => {
      const res = await cfg.remove(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }

  const abas: { k: Aba; t: string }[] = [
    { k: 'paineis', t: 'Painéis' }, { k: 'inversores', t: 'Inversores' }, { k: 'baterias', t: 'Baterias' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Cadastro de equipamentos</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">
        Catálogo de painéis, inversores e baterias da empresa. Alimenta o dimensionamento do simulador Híbrido / Off-grid.
      </p>

      <div className="flex gap-2 mb-4 border-b border-[var(--theme-border,#e7e9f2)]">
        {abas.map((a) => (
          <button key={a.k} onClick={() => trocarAba(a.k)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${aba === a.k ? 'border-[#FF9F40] text-[var(--theme-text,#1a2340)]' : 'border-transparent text-[#7b8194]'}`}>
            {a.t}
          </button>
        ))}
      </div>

      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      <div className="rounded-xl border p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cfg.campos.map((c) => (
            <label key={c.key} className="text-xs">
              {c.label}{c.opcional ? <span className="text-[#9aa0b0]"> (opcional)</span> : null}
              {c.tipo === 'select' ? (
                <select className={N} value={form[c.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}>
                  {c.opcoes?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : c.tipo === 'bool' ? (
                <select className={N} value={form[c.key] ?? 'nao'} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              ) : (
                <input type={c.tipo === 'number' ? 'number' : 'text'} step="any" className={N}
                  value={form[c.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
            {editId ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editId && <button disabled={pending} onClick={cancelar} className="rounded border text-sm px-3 py-1.5">Cancelar</button>}
        </div>
      </div>

      <div className="space-y-2">
        {cfg.lista.map((it) => (
          <div key={it.id} className="rounded-lg border p-3 flex items-center justify-between text-sm">
            <div><b>{String(it.fabricante)} {String(it.modelo)}</b></div>
            <div>
              <button className="text-[#3b6fd6] mr-3" onClick={() => editar(it)}>editar</button>
              <button className="text-[#c0392b]" onClick={() => excluir(it.id)}>excluir</button>
            </div>
          </div>
        ))}
        {cfg.lista.length === 0 && <p className="text-sm text-[#6b7280]">Nenhum {cfg.label} cadastrado ainda. Adicione o primeiro acima.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: sem erros. (Os casts `as never` nas chamadas `create/update` são intencionais — o payload é validado por Zod no servidor.)

- [ ] **Step 3: Commit**

```bash
git add web/components/simuladores/EquipamentosManager.tsx
git commit -m "feat(hibrido): tela EquipamentosManager (3 abas, form dirigido por descritores)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Rotas — página do simulador e sub-página do cadastro

**Files:**
- Create: `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`
- Create: `web/app/(dashboard)/simuladores/hibrido-offgrid/equipamentos/page.tsx`

- [ ] **Step 1: Página "em construção" do simulador**

Criar `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`:

```tsx
export const metadata = { title: 'Híbrido / Off-grid' }
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'

export default async function HibridoOffgridPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Híbrido / Off-grid</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#fff6e6] text-[#b26b00] border border-[#f0d9a8] rounded px-1.5 py-0.5">EM CONSTRUÇÃO</span>
      </div>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-5">
        O dimensionamento e a análise ainda estão em desenvolvimento. Por enquanto, mantenha seu catálogo de equipamentos atualizado.
      </p>
      <Link href="/simuladores/hibrido-offgrid/equipamentos" className="block max-w-sm">
        <div className="rounded-xl border p-4 hover:border-[#FF9F40] transition-colors bg-[var(--theme-card,#fff)]">
          <div className="text-2xl">🧰</div>
          <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cadastro de equipamentos</h3>
          <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">Painéis, inversores e baterias que alimentarão o simulador.</p>
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Sub-página do cadastro**

Criar `web/app/(dashboard)/simuladores/hibrido-offgrid/equipamentos/page.tsx`:

```tsx
export const metadata = { title: 'Cadastro de equipamentos' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listPaineis, listInversores, listBaterias } from '@/lib/simuladores/equipamentos/equipamentos-actions'
import { EquipamentosManager } from '@/components/simuladores/EquipamentosManager'

export default async function EquipamentosPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [paineis, inversores, baterias] = await Promise.all([listPaineis(), listInversores(), listBaterias()])
  return <EquipamentosManager paineis={paineis} inversores={inversores} baterias={baterias} />
}
```

- [ ] **Step 3: Type-check + testes completos**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check sem erros novos; todos os testes passam (incl. `simuladores-registry` e `equipamentos-schemas`).

- [ ] **Step 4: Verificação manual no navegador**

Subir o dev server (via ferramenta de preview) e conferir:
- `/simuladores` — card "Híbrido / Off-grid" aparece com badge "em construção" e é clicável.
- `/simuladores/hibrido-offgrid` — página em construção com o card "Cadastro de equipamentos".
- `/simuladores/hibrido-offgrid/equipamentos` — 3 abas; adicionar um painel mínimo (OSDA/MHDRZ/620/49.08/40.74/16.08/15.22/2.7) salva e aparece na lista; editar e excluir funcionam; erro de validação (deixar Modelo vazio) mostra mensagem.

(Se o dev server exigir usuário autenticado com `simuladores_habilitado`, validar com uma organização que tenha o recurso ligado.)

- [ ] **Step 5: Commit**

```bash
git add "web/app/(dashboard)/simuladores/hibrido-offgrid"
git commit -m "feat(hibrido): rotas do simulador (em construcao) e do cadastro de equipamentos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** BD (Task 2), tipos (Task 3), obrigatórios/opcionais e unidades (Tasks 4/2), actions com teto 100 (Task 6), Manager 3 abas (Task 7), rotas + status `em_construcao` no hub (Tasks 1/8), testes (Tasks 1/5). Seed ausente — coerente com decisão "começar vazio". ✔
- **Placeholders:** nenhum; todo código está completo. ✔
- **Consistência de tipos:** nomes camelCase (`potenciaWp`, `potCaNomW`, `capacidadeAh`) e colunas snake_case idênticos entre schemas (Task 4), actions (Task 6) e database.types (Task 3). Enums `TIPOS_INVERSOR`/`TECNOLOGIAS_BATERIA` reusados no Manager. ✔
- **Nota de risco:** a aplicação da migration no Supabase e a regeneração de tipos seguem o fluxo do time; a Task 3 injeta os tipos manualmente para o type-check/local não travar. Se o time usar `supabase gen types`, conferir que a saída bate com a Task 3.
```
