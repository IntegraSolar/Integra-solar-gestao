# Simulador Híbrido / Off-grid — Fase 4: PDFs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar o Memorial descritivo (técnico) e o Relatório executivo (comercial) em PDF, a partir do estado da tela.

**Architecture:** O conteúdo dos documentos é montado por funções **puras** que devolvem seções estruturadas — é onde ficam os testes, porque o risco real é imprimir o valor certo na frase errada. Os módulos jsPDF apenas desenham o que elas devolveram. Os 8 campos descritivos que o Memorial exige entram como colunas do banco, junto da identificação, deixando o snapshot da Fase 3c intacto em `versao: 1`.

**Tech Stack:** Next.js, jsPDF + jspdf-autotable, TypeScript, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-19-simulador-hibrido-pdfs-design.md`.

**Convenções do repositório:**
- Testes: `cd web && npm run test -- <padrão>`; suíte completa `cd web && npm run test`
- Type-check: `cd web && npx tsc --noEmit` (zero erros)
- Import alias `@/` → `web/`
- Testes de componente: docblock `// @vitest-environment jsdom` + `import '@testing-library/jest-dom/vitest'` no próprio arquivo. **`vitest.config.ts` não muda.**
- Commits em pt-BR, prefixo `feat(hibrido):` / `refactor(simuladores):`, terminando com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Migrations não são aplicadas por quem implementa.** Crie o arquivo `.sql`.

**Contexto das fases anteriores:**
- `SimuladorHibrido` é dono de `campos`, `camposFin`, `cargas`, `biblioteca`, `equipamentos` e `identificacao`.
- Tipos de resultado em `web/lib/simuladores/hibrido/types.ts`: `ResultadoHibrido`, `ResultadoFinanceiro`, `ResultadoEconomiaAno`, `ProjetoInput`, `EquipPainel/Inversor/Bateria`.
- `Identificacao` e `IDENTIFICACAO_INICIAL` estão em `web/components/simuladores/HibridoIdentificacao.tsx`.
- Padrão de PDF a espelhar: `web/lib/simuladores/viabilidade/proposta-pdf.ts` (jsPDF, autotable importado dinamicamente, gráfico vetorial desenhado à mão).

---

## File Structure

- Move `web/lib/simuladores/viabilidade/proposta-empresa.ts` → `web/lib/simuladores/proposta-empresa.ts`
- Create `web/supabase/migrations/20260719000003_simulador_hibrido_dados_projeto.sql`
- Modify `web/types/database.types.ts`
- Create `web/lib/simuladores/hibrido/documento-tipos.ts` — `SecaoDocumento`, `DadosMemorial`, `DadosRelatorio`
- Create `web/lib/simuladores/hibrido/memorial-conteudo.ts` — puro
- Create `web/lib/simuladores/hibrido/relatorio-conteudo.ts` — puro
- Create `web/lib/simuladores/hibrido/memorial-pdf.ts`
- Create `web/lib/simuladores/hibrido/relatorio-pdf.ts`
- Modify `web/components/simuladores/HibridoIdentificacao.tsx` (vira `DadosProjeto` + 2º bloco)
- Modify `web/lib/simuladores/hibrido/simulacoes-schemas.ts`, `simulacoes-actions.ts`
- Modify `web/components/simuladores/SimuladorHibrido.tsx`, `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`
- Tests: `hibrido-memorial-conteudo.test.ts`, `hibrido-relatorio-conteudo.test.ts` (puros); `hibrido-dados-projeto-ui.test.tsx` (jsdom)

---

## Task 1: Mover `proposta-empresa` para módulo compartilhado

**Files:**
- Move: `web/lib/simuladores/viabilidade/proposta-empresa.ts` → `web/lib/simuladores/proposta-empresa.ts`
- Modify 5 importadores (lista abaixo)

Refactor puro, sem mudança de comportamento. Dado cadastral da empresa não
pertence a um simulador específico — mesmo movimento feito com `npv`/`irr` na
Fase 2b.

- [ ] **Step 1: Linha de base**

Run: `cd web && npm run test`
Expected: PASS. Anote a contagem — deve ser idêntica no fim.

- [ ] **Step 2: Mover preservando o histórico**

```bash
git mv web/lib/simuladores/viabilidade/proposta-empresa.ts web/lib/simuladores/proposta-empresa.ts
```

- [ ] **Step 3: Atualizar o comentário de caminho no topo do arquivo**

Em `web/lib/simuladores/proposta-empresa.ts`, trocar a primeira linha por:

```ts
// web/lib/simuladores/proposta-empresa.ts
// Dados cadastrais da empresa para os PDFs. Compartilhado entre os simuladores.
```

- [ ] **Step 4: Atualizar os 5 importadores**

Estes são todos (verificados). Em cada um, trocar o caminho:

| Arquivo | De | Para |
|---|---|---|
| `web/lib/simuladores/cartao/proposta-cartao-pdf.ts` | `@/lib/simuladores/viabilidade/proposta-empresa` | `@/lib/simuladores/proposta-empresa` |
| `web/lib/simuladores/viabilidade/proposta-pdf.ts` | `./proposta-empresa` | `../proposta-empresa` |
| `web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx` | `@/lib/simuladores/viabilidade/proposta-empresa` | `@/lib/simuladores/proposta-empresa` |
| `web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx` | `@/lib/simuladores/viabilidade/proposta-empresa` | `@/lib/simuladores/proposta-empresa` |
| `web/components/simuladores/SimuladorCartao.tsx` | `@/lib/simuladores/viabilidade/proposta-empresa` | `@/lib/simuladores/proposta-empresa` |
| `web/components/simuladores/SimuladorViabilidade.tsx` | `@/lib/simuladores/viabilidade/proposta-empresa` | `@/lib/simuladores/proposta-empresa` |

(São 6 linhas em 6 arquivos — a tabela lista todas.)

- [ ] **Step 5: Confirmar que não sobrou nada**

Run: `cd web && grep -rn "viabilidade/proposta-empresa" lib app components --include=*.ts --include=*.tsx`
Expected: nenhum resultado.

- [ ] **Step 6: Verificar**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; a suíte passa com a MESMA contagem do Step 1.

- [ ] **Step 7: Commit**

```bash
git add -A web/lib/simuladores web/app web/components
git commit -m "refactor(simuladores): move proposta-empresa para modulo compartilhado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Migration dos dados descritivos

**Files:**
- Create: `web/supabase/migrations/20260719000003_simulador_hibrido_dados_projeto.sql`
- Modify: `web/types/database.types.ts`

- [ ] **Step 1: Escrever a migration**

```sql
-- Dados descritivos do projeto, exigidos pelo Memorial descritivo (Fase 4).
-- Nenhum deles entra em cálculo: o desvio da condição ótima já entra como
-- perda por orientação, digitada diretamente na tela.
--
-- Ficam em colunas (e não no snapshot) de propósito: incluí-los em
-- CamposHibrido obrigaria o schema Zod do snapshot a acompanhar, e os
-- snapshots versao:1 já salvos deixariam de validar, tornando simulações
-- antigas irreabríveis.
ALTER TABLE simulador_hibrido_simulacoes
  ADD COLUMN IF NOT EXISTS azimute         numeric,
  ADD COLUMN IF NOT EXISTS inclinacao      numeric,
  ADD COLUMN IF NOT EXISTS latitude        numeric,
  ADD COLUMN IF NOT EXISTS longitude       numeric,
  ADD COLUMN IF NOT EXISTS altitude        numeric,
  ADD COLUMN IF NOT EXISTS tipo_ligacao    text,
  ADD COLUMN IF NOT EXISTS tensao_nominal  numeric,
  ADD COLUMN IF NOT EXISTS modo_operacao   text;
```

- [ ] **Step 2: Acrescentar os campos em `database.types.ts`**

Em `web/types/database.types.ts`, no bloco `simulador_hibrido_simulacoes`,
acrescentar a cada um de `Row`, `Insert` e `Update` (mantendo a ordem
alfabética que o gerador usa):

Em `Row` — todos `number | null` ou `string | null`:
```ts
          altitude: number | null
          azimute: number | null
          inclinacao: number | null
          latitude: number | null
          longitude: number | null
          modo_operacao: string | null
          tensao_nominal: number | null
          tipo_ligacao: string | null
```

Em `Insert` e `Update` — os mesmos, com `?`:
```ts
          altitude?: number | null
          azimute?: number | null
          inclinacao?: number | null
          latitude?: number | null
          longitude?: number | null
          modo_operacao?: string | null
          tensao_nominal?: number | null
          tipo_ligacao?: string | null
```

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/20260719000003_simulador_hibrido_dados_projeto.sql web/types/database.types.ts
git commit -m "feat(hibrido): colunas de dados descritivos do projeto para o memorial

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `DadosProjeto` e o segundo bloco do formulário

**Files:**
- Modify: `web/components/simuladores/HibridoIdentificacao.tsx`
- Create: `web/__tests__/hibrido-dados-projeto-ui.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-dados-projeto-ui.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HibridoIdentificacao, DADOS_PROJETO_INICIAL, type DadosProjeto,
} from '@/components/simuladores/HibridoIdentificacao'

vi.mock('@/lib/simuladores/hibrido/simulacoes-actions', () => ({
  listSimulacoesHibrido: vi.fn(async () => []),
  getSimulacaoHibrido: vi.fn(async () => null),
  salvarSimulacaoHibrido: vi.fn(async () => ({ success: 'ok' })),
  deleteSimulacaoHibrido: vi.fn(async () => ({ success: 'ok' })),
}))

function ComEstado() {
  const [dados, setDados] = useState<DadosProjeto>(DADOS_PROJETO_INICIAL)
  return <HibridoIdentificacao dados={dados} onChange={setDados} />
}

describe('HibridoIdentificacao — identificação', () => {
  it('mantém os campos de identificação da fase anterior', () => {
    render(<ComEstado />)
    expect(screen.getByTestId('ident-nome')).toBeInTheDocument()
    expect(screen.getByTestId('ident-clienteNome')).toBeInTheDocument()
    expect(screen.getByTestId('ident-concessionaria')).toBeInTheDocument()
    expect(screen.getByTestId('ident-responsavelTecnico')).toBeInTheDocument()
  })
})

describe('HibridoIdentificacao — dados do projeto', () => {
  it('tem os oito campos descritivos que o memorial exige', () => {
    render(<ComEstado />)
    for (const k of [
      'azimute', 'inclinacao', 'latitude', 'longitude', 'altitude',
      'tipoLigacao', 'tensaoNominal', 'modoOperacao',
    ]) {
      expect(screen.getByTestId(`ident-${k}`), k).toBeInTheDocument()
    }
  })

  it('todos começam vazios (não informado)', () => {
    render(<ComEstado />)
    expect(screen.getByTestId('ident-azimute')).toHaveValue('')
    expect(screen.getByTestId('ident-latitude')).toHaveValue('')
  })

  it('editar um descritivo propaga', async () => {
    const user = userEvent.setup()
    render(<ComEstado />)
    await user.type(screen.getByTestId('ident-inclinacao'), '15')
    expect(screen.getByTestId('ident-inclinacao')).toHaveValue('15')
  })

  it('tipo de ligação é uma escolha, não texto livre', async () => {
    const user = userEvent.setup()
    render(<ComEstado />)
    await user.selectOptions(screen.getByTestId('ident-tipoLigacao'), 'Trifásico')
    expect(screen.getByTestId('ident-tipoLigacao')).toHaveValue('Trifásico')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-dados-projeto-ui`
Expected: FAIL — `DadosProjeto` e `DADOS_PROJETO_INICIAL` não existem.

- [ ] **Step 3: Reescrever `HibridoIdentificacao.tsx`**

```tsx
'use client'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

export const TIPOS_LIGACAO = ['', 'Monofásico', 'Bifásico', 'Trifásico'] as const

/**
 * Identificação + dados descritivos do projeto. Texto livre: NENHUM destes
 * campos entra em cálculo — servem para nomear a simulação salva e preencher o
 * Memorial descritivo. Ficam em colunas do banco, fora do snapshot.
 */
export type DadosProjeto = {
  // Identificação
  nome: string
  clienteNome: string
  clienteCidade: string
  clienteUf: string
  concessionaria: string
  responsavelTecnico: string
  // Descritivos (Memorial)
  azimute: string
  inclinacao: string
  latitude: string
  longitude: string
  altitude: string
  tipoLigacao: string
  tensaoNominal: string
  modoOperacao: string
}

export const DADOS_PROJETO_INICIAL: DadosProjeto = {
  nome: '', clienteNome: '', clienteCidade: '', clienteUf: '',
  concessionaria: '', responsavelTecnico: '',
  azimute: '', inclinacao: '', latitude: '', longitude: '', altitude: '',
  tipoLigacao: '', tensaoNominal: '', modoOperacao: '',
}

const IDENTIFICACAO: { key: keyof DadosProjeto; label: string }[] = [
  { key: 'nome', label: 'Nome da simulação' },
  { key: 'clienteNome', label: 'Cliente' },
  { key: 'clienteCidade', label: 'Cidade' },
  { key: 'clienteUf', label: 'UF' },
  { key: 'concessionaria', label: 'Concessionária' },
  { key: 'responsavelTecnico', label: 'Responsável técnico' },
]

const DESCRITIVOS: { key: keyof DadosProjeto; label: string }[] = [
  { key: 'azimute', label: 'Azimute (°)' },
  { key: 'inclinacao', label: 'Inclinação (°)' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'altitude', label: 'Altitude (m)' },
  { key: 'tensaoNominal', label: 'Tensão nominal (V)' },
  { key: 'modoOperacao', label: 'Modo de operação' },
]

type Props = { dados: DadosProjeto; onChange: (d: DadosProjeto) => void }

export function HibridoIdentificacao({ dados, onChange }: Props) {
  const set = (key: keyof DadosProjeto, valor: string) => onChange({ ...dados, [key]: valor })

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Identificação</h2>
      <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Não entra em nenhum cálculo — serve para nomear a simulação salva e identificar a proposta.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {IDENTIFICACAO.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input className={IN} data-testid={`ident-${c.key}`}
              value={dados[c.key]} onChange={(e) => set(c.key, e.target.value)} />
          </label>
        ))}
      </div>

      <h3 className="mt-5 text-xs font-semibold text-[var(--theme-text,#1a2340)]">Dados do projeto</h3>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Usados apenas no Memorial descritivo. Campos em branco saem como “—” no documento.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DESCRITIVOS.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input className={IN} data-testid={`ident-${c.key}`}
              value={dados[c.key]} onChange={(e) => set(c.key, e.target.value)} />
          </label>
        ))}
        <label className="text-[11px]">Tipo de ligação
          <select className={IN} data-testid="ident-tipoLigacao"
            value={dados.tipoLigacao} onChange={(e) => set('tipoLigacao', e.target.value)}>
            {TIPOS_LIGACAO.map((t) => (
              <option key={t} value={t}>{t === '' ? '— selecione —' : t}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-dados-projeto-ui`
Expected: PASS (5 testes).

O type-check vai falhar em `SimuladorHibrido.tsx`, que ainda usa
`Identificacao`/`IDENTIFICACAO_INICIAL` — a Task 5 corrige. Se quiser rodar o
`tsc` limpo antes disso, faça a Task 5 na sequência.

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/HibridoIdentificacao.tsx web/__tests__/hibrido-dados-projeto-ui.test.tsx
git commit -m "feat(hibrido): dados descritivos do projeto no formulario

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Persistir os descritivos

**Files:**
- Modify: `web/lib/simuladores/hibrido/simulacoes-schemas.ts`
- Modify: `web/__tests__/hibrido-simulacoes-schemas.test.ts`

- [ ] **Step 1: Acrescentar os testes**

Em `web/__tests__/hibrido-simulacoes-schemas.test.ts`, acrescentar ao fim:

```ts
describe('dados descritivos do projeto', () => {
  const COM_DESCRITIVOS = {
    ...MINIMO,
    azimute: 0, inclinacao: 15, latitude: -10.1836, longitude: -48.3338,
    altitude: 240, tipoLigacao: 'Bifásico', tensaoNominal: 380,
    modoOperacao: 'Autoconsumo + Backup',
  }

  it('o schema aceita os descritivos', () => {
    expect(salvarSimulacaoSchema.safeParse(COM_DESCRITIVOS).success).toBe(true)
  })

  it('todos os descritivos são opcionais', () => {
    expect(salvarSimulacaoSchema.safeParse(MINIMO).success).toBe(true)
  })

  it('rowToCompleta traz os descritivos de volta', () => {
    const c = rowToCompleta({
      id: 's1', nome: 'X', cliente_nome: null, cliente_cidade: null, cliente_uf: null,
      concessionaria: null, responsavel_tecnico: null,
      potencia_kwp: 0, investimento_total: 0, vpl: 0, tir: 0, payback_anos: null,
      snapshot: {}, created_at: '2026-07-19T12:00:00Z',
      azimute: 0, inclinacao: 15, latitude: -10.1836, longitude: -48.3338,
      altitude: 240, tipo_ligacao: 'Bifásico', tensao_nominal: 380,
      modo_operacao: 'Autoconsumo + Backup',
    })
    expect(c.inclinacao).toBe(15)
    expect(c.latitude).toBeCloseTo(-10.1836, 6)
    expect(c.tipoLigacao).toBe('Bifásico')
    expect(c.modoOperacao).toBe('Autoconsumo + Backup')
  })

  it('descritivos ausentes voltam como null, nunca 0 ou string vazia', () => {
    const c = rowToCompleta({
      id: 's1', nome: 'X', cliente_nome: null, cliente_cidade: null, cliente_uf: null,
      concessionaria: null, responsavel_tecnico: null,
      potencia_kwp: 0, investimento_total: 0, vpl: 0, tir: 0, payback_anos: null,
      snapshot: {}, created_at: '2026-07-19T12:00:00Z',
      azimute: null, inclinacao: null, latitude: null, longitude: null,
      altitude: null, tipo_ligacao: null, tensao_nominal: null, modo_operacao: null,
    })
    // 0 seria um azimute válido (Norte); null tem de continuar null.
    expect(c.azimute).toBeNull()
    expect(c.latitude).toBeNull()
    expect(c.tipoLigacao).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-simulacoes-schemas`
Expected: FAIL — o schema e os mapeadores ainda não conhecem os descritivos.

- [ ] **Step 3: Estender `simulacoes-schemas.ts`**

No `salvarSimulacaoSchema`, acrescentar antes do fechamento do `z.object`:

```ts
  // Descritivos do projeto (Memorial). Todos opcionais e nullable: 0 é um
  // azimute válido (Norte), então "não informado" precisa ser null, não 0.
  azimute: z.coerce.number().nullish(),
  inclinacao: z.coerce.number().nullish(),
  latitude: z.coerce.number().nullish(),
  longitude: z.coerce.number().nullish(),
  altitude: z.coerce.number().nullish(),
  tipoLigacao: z.string().nullish(),
  tensaoNominal: z.coerce.number().nullish(),
  modoOperacao: z.string().nullish(),
```

Acrescentar ao tipo `SimulacaoCompleta`:

```ts
  azimute: number | null
  inclinacao: number | null
  latitude: number | null
  longitude: number | null
  altitude: number | null
  tipoLigacao: string | null
  tensaoNominal: number | null
  modoOperacao: string | null
```

Acrescentar o helper e usá-lo em `rowToCompleta`:

```ts
/** Numérico opcional: `null` continua `null` — 0 é valor legítimo. */
const nOuNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)
```

```ts
export function rowToCompleta(r: Record<string, unknown>): SimulacaoCompleta {
  return {
    ...rowToResumo(r),
    clienteUf: s(r.cliente_uf),
    concessionaria: s(r.concessionaria),
    responsavelTecnico: s(r.responsavel_tecnico),
    snapshot: r.snapshot,
    azimute: nOuNull(r.azimute),
    inclinacao: nOuNull(r.inclinacao),
    latitude: nOuNull(r.latitude),
    longitude: nOuNull(r.longitude),
    altitude: nOuNull(r.altitude),
    tipoLigacao: s(r.tipo_ligacao),
    tensaoNominal: nOuNull(r.tensao_nominal),
    modoOperacao: s(r.modo_operacao),
  }
}
```

E em `salvarDataToRow`, acrescentar ao objeto devolvido:

```ts
    azimute: d.azimute ?? null,
    inclinacao: d.inclinacao ?? null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    altitude: d.altitude ?? null,
    tipo_ligacao: d.tipoLigacao ?? null,
    tensao_nominal: d.tensaoNominal ?? null,
    modo_operacao: d.modoOperacao ?? null,
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-simulacoes-schemas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/simulacoes-schemas.ts web/__tests__/hibrido-simulacoes-schemas.test.ts
git commit -m "feat(hibrido): persiste os dados descritivos do projeto

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Ligar `DadosProjeto` ao simulador

**Files:**
- Modify: `web/components/simuladores/SimuladorHibrido.tsx`

- [ ] **Step 1: Trocar o tipo e o estado**

Em `web/components/simuladores/SimuladorHibrido.tsx`:

Trocar o import:

```tsx
import {
  HibridoIdentificacao, DADOS_PROJETO_INICIAL, type DadosProjeto,
} from './HibridoIdentificacao'
```

Trocar o estado:

```tsx
  const [dadosProjeto, setDadosProjeto] = useState<DadosProjeto>(DADOS_PROJETO_INICIAL)
```

Trocar o uso no JSX:

```tsx
        <HibridoIdentificacao dados={dadosProjeto} onChange={setDadosProjeto} />
```

- [ ] **Step 2: Enviar os descritivos ao salvar**

Em `salvar()`, dentro do objeto passado a `salvarSimulacaoHibrido`, trocar as
referências de `identificacao.` por `dadosProjeto.` e acrescentar os
descritivos. Campo vazio vira `null`, **nunca 0** — 0 é um azimute válido:

```tsx
      const num = (v: string) => (v.trim() === '' ? null : Number(v))
      const res = await salvarSimulacaoHibrido({
        nome: dadosProjeto.nome,
        snapshot,
        clienteNome: dadosProjeto.clienteNome || null,
        clienteCidade: dadosProjeto.clienteCidade || null,
        clienteUf: dadosProjeto.clienteUf || null,
        concessionaria: dadosProjeto.concessionaria || null,
        responsavelTecnico: dadosProjeto.responsavelTecnico || null,
        azimute: num(dadosProjeto.azimute),
        inclinacao: num(dadosProjeto.inclinacao),
        latitude: num(dadosProjeto.latitude),
        longitude: num(dadosProjeto.longitude),
        altitude: num(dadosProjeto.altitude),
        tipoLigacao: dadosProjeto.tipoLigacao || null,
        tensaoNominal: num(dadosProjeto.tensaoNominal),
        modoOperacao: dadosProjeto.modoOperacao || null,
        potenciaKwp: resultado.dimensionamento.potenciaInstaladaKwp,
        investimentoTotal: financeiro.capex.investimentoTotal,
        vpl: financeiro.indicadores.vpl,
        tir: financeiro.indicadores.tir,
        paybackAnos: financeiro.indicadores.paybackSimplesAnos,
      })
```

- [ ] **Step 3: Restaurar os descritivos ao reabrir**

Em `reabrir()`, trocar o `setIdentificacao({...})` por:

```tsx
      const txt = (v: number | null) => (v === null ? '' : String(v))
      setDadosProjeto({
        nome: sim.nome,
        clienteNome: sim.clienteNome ?? '',
        clienteCidade: sim.clienteCidade ?? '',
        clienteUf: sim.clienteUf ?? '',
        concessionaria: sim.concessionaria ?? '',
        responsavelTecnico: sim.responsavelTecnico ?? '',
        azimute: txt(sim.azimute),
        inclinacao: txt(sim.inclinacao),
        latitude: txt(sim.latitude),
        longitude: txt(sim.longitude),
        altitude: txt(sim.altitude),
        tipoLigacao: sim.tipoLigacao ?? '',
        tensaoNominal: txt(sim.tensaoNominal),
        modoOperacao: sim.modoOperacao ?? '',
      })
```

- [ ] **Step 4: Verificar**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; suíte verde. Os testes da Fase 3c que usam
`ident-nome` e `ident-clienteNome` continuam válidos — os `data-testid` não
mudaram.

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/SimuladorHibrido.tsx
git commit -m "feat(hibrido): liga dados do projeto ao salvar e reabrir

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Conteúdo do Memorial (puro)

**Files:**
- Create: `web/lib/simuladores/hibrido/documento-tipos.ts`
- Create: `web/lib/simuladores/hibrido/memorial-conteudo.ts`
- Test: `web/__tests__/hibrido-memorial-conteudo.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-memorial-conteudo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { montarMemorial } from '@/lib/simuladores/hibrido/memorial-conteudo'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { DADOS_PROJETO_INICIAL } from '@/components/simuladores/HibridoIdentificacao'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

const CAMPOS = {
  ...CAMPOS_INICIAIS,
  tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
  numModulos: '16', modulosPorString: '8',
}

const RESULTADO = calcularHibrido(montarHibridoInput(CAMPOS, EQUIP, CARGAS))

const DADOS = {
  ...DADOS_PROJETO_INICIAL,
  nome: 'Projeto Palmas', clienteNome: 'Iago Bonifácio',
  clienteCidade: 'Palmas', clienteUf: 'TO', concessionaria: 'ENERGISA',
  responsavelTecnico: 'Patrick Limberg',
  azimute: '0', inclinacao: '15', latitude: '-10.1836', longitude: '-48.3338',
  altitude: '240', tipoLigacao: 'Bifásico', tensaoNominal: '380',
  modoOperacao: 'Autoconsumo + Backup',
}

const BASE = {
  dados: DADOS, projeto: { ...PROJETO }, resultado: RESULTADO,
  painel: PAINEL, inversor: INVERSOR, bateria: BATERIA,
  tipoSistema: 'Híbrido',
}

const texto = (s: { paragrafos?: string[]; linhas?: { rotulo: string; valor: string }[] }) =>
  [...(s.paragrafos ?? []), ...(s.linhas ?? []).map((l) => `${l.rotulo}: ${l.valor}`)].join(' | ')

describe('montarMemorial — estrutura', () => {
  const secoes = montarMemorial(BASE)

  it('devolve as 11 seções', () => {
    expect(secoes).toHaveLength(11)
  })
  it('na ordem da planilha', () => {
    expect(secoes[0].titulo).toMatch(/Objetivo/i)
    expect(secoes[3].titulo).toMatch(/Gerador fotovoltaico/i)
    expect(secoes[5].titulo).toMatch(/Armazenamento/i)
    expect(secoes[9].titulo).toMatch(/Normas/i)
    expect(secoes[10].titulo).toMatch(/Conclusão/i)
  })
  it('as seções de texto normativo fixo não estão vazias', () => {
    for (const i of [7, 9, 10]) {
      expect(texto(secoes[i]).length, `seção ${i + 1}`).toBeGreaterThan(80)
    }
  })
})

describe('montarMemorial — cada valor na frase certa', () => {
  const secoes = montarMemorial(BASE)

  it('o gerador traz o nº de módulos e a potência instalada', () => {
    const t = texto(secoes[3])
    expect(t).toContain('16')
    expect(t).toContain('9,92')
    expect(t).toContain('MHDRZ')
  })
  it('o armazenamento traz o nº de baterias, não o de módulos', () => {
    const t = texto(secoes[5])
    expect(t).toContain(String(RESULTADO.baterias.numBaterias))
    expect(t).toContain('ZTS48150P')
  })
  it('a conversão traz o modelo do inversor', () => {
    expect(texto(secoes[4])).toContain('SUN 8K (EU)')
  })
  it('a localização traz coordenadas, altitude e temperaturas', () => {
    const t = texto(secoes[2])
    expect(t).toContain('-10.1836')
    expect(t).toContain('240')
    expect(t).toContain('27')
  })
  it('os dados gerais trazem cliente, concessionária e responsável', () => {
    const t = texto(secoes[1])
    expect(t).toContain('Iago Bonifácio')
    expect(t).toContain('ENERGISA')
    expect(t).toContain('Patrick Limberg')
  })
  it('o arranjo traz módulos por string e o oversizing', () => {
    const t = texto(secoes[6])
    expect(t).toContain('8')
    expect(t).toContain('1,24')
  })
})

describe('montarMemorial — sem bateria', () => {
  const semBateria = calcularHibrido(
    montarHibridoInput({ ...CAMPOS, bateriaId: '' }, EQUIP, CARGAS)
  )
  const secoes = montarMemorial({ ...BASE, resultado: semBateria, bateria: null })

  it('a seção de armazenamento usa a frase alternativa', () => {
    expect(texto(secoes[5])).toMatch(/não contempla armazenamento/i)
  })
  it('e não imprime números de banco', () => {
    expect(texto(secoes[5])).not.toMatch(/kWh/)
  })
})

describe('montarMemorial — campos não informados', () => {
  const secoes = montarMemorial({ ...BASE, dados: DADOS_PROJETO_INICIAL })
  const tudo = secoes.map(texto).join(' | ')

  it('saem como travessão', () => {
    expect(tudo).toContain('—')
  })
  it('nunca imprime undefined, null ou NaN', () => {
    expect(tudo).not.toMatch(/undefined/)
    expect(tudo).not.toMatch(/null/)
    expect(tudo).not.toMatch(/NaN/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-memorial-conteudo`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Criar `documento-tipos.ts`**

```ts
// web/lib/simuladores/hibrido/documento-tipos.ts
// Tipos compartilhados pelos documentos gerados (Memorial e Relatório).
import type { DadosProjeto } from '@/components/simuladores/HibridoIdentificacao'
import type {
  ProjetoInput, ResultadoHibrido, ResultadoFinanceiro, ResultadoEconomiaAno,
  EquipPainel, EquipInversor, EquipBateria,
} from './types'
import type { CamposFinanceiro } from './montar-financeiro'

export type SecaoDocumento = {
  titulo: string
  paragrafos?: string[]
  linhas?: { rotulo: string; valor: string }[]
}

export type DadosMemorial = {
  dados: DadosProjeto
  projeto: ProjetoInput
  resultado: ResultadoHibrido
  painel: EquipPainel | null
  inversor: EquipInversor | null
  bateria: EquipBateria | null
  /** Vem de `campos.tipoSistema` (painel avançado), não de DadosProjeto. */
  tipoSistema: string
}

export type DadosRelatorio = DadosMemorial & {
  financeiro: ResultadoFinanceiro
  economiaAno1: ResultadoEconomiaAno
  camposFin: CamposFinanceiro
  /** Entra por parâmetro: a função de conteúdo não lê o relógio. */
  dataEmissao: Date
}
```

- [ ] **Step 4: Criar `memorial-conteudo.ts`**

```ts
// web/lib/simuladores/hibrido/memorial-conteudo.ts
// Monta o conteúdo do Memorial descritivo. Função PURA: recebe os resultados e
// devolve as seções prontas. O risco real deste documento não é o desenho no
// PDF — é imprimir o valor certo na frase errada, e é isso que os testes cobrem.
import type { DadosMemorial, SecaoDocumento } from './documento-tipos'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** Campo descritivo não informado vira travessão — nunca "undefined" ou "NaN". */
const ou = (v: string, sufixo = '') => (v.trim() === '' ? '—' : `${v.trim()}${sufixo}`)

export function montarMemorial(d: DadosMemorial): SecaoDocumento[] {
  const { dados, projeto, resultado, painel, inversor, bateria } = d
  const dim = resultado.dimensionamento
  const mesCritico = dim.mesCriticoIndice >= 0 ? MESES[dim.mesCriticoIndice] : '—'
  const cobertura = resultado.cargas.consumoAnualKwh > 0
    ? dim.producaoAnualKwh / resultado.cargas.consumoAnualKwh
    : 0

  const armazenamento: SecaoDocumento = bateria
    ? {
        titulo: '6. Armazenamento (banco de baterias)',
        linhas: [
          { rotulo: 'Nº de baterias', valor: n(resultado.baterias.numBaterias, 0) },
          { rotulo: 'Modelo', valor: `${bateria.fabricante} ${bateria.modelo}` },
          { rotulo: 'Energia nominal instalada', valor: `${n(resultado.baterias.energiaInstaladaKwh)} kWh` },
          { rotulo: 'Tensão do banco', valor: `${n(resultado.baterias.tensaoBancoV, 0)} V` },
          { rotulo: 'Autonomia estimada', valor: `${n(resultado.baterias.autonomiaRealDias, 1)} dias` },
        ],
      }
    : {
        titulo: '6. Armazenamento (banco de baterias)',
        paragrafos: [
          'O sistema não contempla armazenamento em baterias, operando conectado à rede da concessionária.',
        ],
      }

  return [
    {
      titulo: '1. Objetivo',
      paragrafos: [
        `Este memorial descreve as especificações técnicas do sistema solar fotovoltaico projetado para ${ou(dados.clienteNome)}, na cidade de ${ou(dados.clienteCidade)}/${ou(dados.clienteUf)}. Contempla o dimensionamento do gerador fotovoltaico, do sistema de conversão e armazenamento, as proteções elétricas e a estimativa de geração de energia, em conformidade com as normas técnicas vigentes.`,
      ],
    },
    {
      titulo: '2. Dados gerais do empreendimento',
      linhas: [
        { rotulo: 'Cliente', valor: ou(dados.clienteNome) },
        { rotulo: 'Concessionária', valor: ou(dados.concessionaria) },
        { rotulo: 'Tipo de sistema', valor: ou(d.tipoSistema) },
        { rotulo: 'Modo de operação', valor: ou(dados.modoOperacao) },
        { rotulo: 'Tipo de ligação', valor: ou(dados.tipoLigacao) },
        { rotulo: 'Tensão nominal', valor: ou(dados.tensaoNominal, ' V') },
        { rotulo: 'Responsável técnico', valor: ou(dados.responsavelTecnico) },
      ],
    },
    {
      titulo: '3. Localização e condições climáticas',
      linhas: [
        { rotulo: 'Latitude', valor: ou(dados.latitude, '°') },
        { rotulo: 'Longitude', valor: ou(dados.longitude, '°') },
        { rotulo: 'Altitude', valor: ou(dados.altitude, ' m') },
        { rotulo: 'Irradiação média (HSP)', valor: `${n(dim.hspMediaAnual)} kWh/m²·dia` },
        { rotulo: 'Mês crítico', valor: mesCritico },
        { rotulo: 'Temperatura média', valor: `${n(projeto.tempMediaC, 0)} °C` },
        { rotulo: 'Temperatura máxima', valor: `${n(projeto.tempMaxC, 0)} °C` },
        { rotulo: 'Temperatura mínima', valor: `${n(projeto.tempMinC, 0)} °C` },
      ],
    },
    {
      titulo: '4. Gerador fotovoltaico',
      linhas: [
        { rotulo: 'Nº de módulos', valor: n(dim.numModulos, 0) },
        { rotulo: 'Modelo', valor: painel ? `${painel.fabricante} ${painel.modelo}` : '—' },
        { rotulo: 'Potência unitária', valor: painel ? `${n(painel.potenciaWp, 0)} Wp` : '—' },
        { rotulo: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { rotulo: 'Área ocupada', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { rotulo: 'Azimute', valor: ou(dados.azimute, '°') },
        { rotulo: 'Inclinação', valor: ou(dados.inclinacao, '°') },
      ],
    },
    {
      titulo: '5. Sistema de conversão (inversor)',
      linhas: [
        { rotulo: 'Nº de inversores', valor: n(resultado.inversor.numInversoresParalelo, 0) },
        { rotulo: 'Modelo', valor: inversor ? `${inversor.fabricante} ${inversor.modelo}` : '—' },
        { rotulo: 'Potência CA total', valor: `${n(resultado.inversor.potenciaCaTotalW, 0)} W` },
      ],
    },
    armazenamento,
    {
      titulo: '7. Arranjo elétrico e dimensionamento',
      linhas: [
        { rotulo: 'Módulos por string', valor: n(resultado.strings.modulosPorString, 0) },
        { rotulo: 'Nº de strings', valor: n(resultado.strings.numStrings, 0) },
        { rotulo: 'Tensão da string a Tmín', valor: `${n(resultado.strings.tensaoStringVocTminV)} V` },
        { rotulo: 'Corrente de projeto', valor: `${n(resultado.strings.correnteProjetoA)} A` },
        { rotulo: 'Relação DC/AC', valor: n(dim.oversizingDcAc) },
        { rotulo: 'HSP de dimensionamento', valor: `${n(dim.hspDimensionamento)} kWh/m²·dia` },
        { rotulo: 'Performance Ratio', valor: `${n(dim.prTotal * 100, 1)}%` },
      ],
    },
    {
      titulo: '8. Proteções e aterramento',
      paragrafos: [
        'As proteções de corrente contínua incluem dispositivo de proteção contra surtos (DPS), fusíveis de string e chave seccionadora sob carga. No lado de corrente alternada, preveem-se disjuntor termomagnético e DPS.',
        'Todo o sistema será aterrado conforme a ABNT NBR 5410 e a ABNT NBR 16690, com condutor de proteção dedicado e equipotencialização das estruturas metálicas.',
      ],
    },
    {
      titulo: '9. Estimativa de geração',
      linhas: [
        { rotulo: 'Geração anual estimada', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { rotulo: 'Média diária', valor: `${n(dim.producaoDiariaKwh, 1)} kWh` },
        { rotulo: 'Consumo anual da unidade', valor: `${n(resultado.cargas.consumoAnualKwh, 0)} kWh` },
        { rotulo: 'Cobertura do consumo', valor: `${n(cobertura * 100, 1)}%` },
      ],
    },
    {
      titulo: '10. Normas aplicáveis',
      paragrafos: [
        'ABNT NBR 16690 — Instalações elétricas de arranjos fotovoltaicos.',
        'ABNT NBR 16149 e 16150 — Interface de conexão inversor–rede.',
        'ABNT NBR 5410 — Instalações elétricas de baixa tensão.',
        'ABNT NBR 5419 — Proteção contra descargas atmosféricas.',
        'Resolução Normativa ANEEL nº 1.059/2023 e Lei nº 14.300/2022 — marco legal da micro e minigeração distribuída.',
      ],
    },
    {
      titulo: '11. Conclusão',
      paragrafos: [
        'O sistema descrito atende aos requisitos técnicos e normativos aplicáveis, apresentando dimensionamento compatível com o consumo levantado e as condições locais informadas. Recomenda-se a execução conforme as especificações deste memorial e das normas vigentes.',
      ],
    },
  ]
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-memorial-conteudo`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/simuladores/hibrido/documento-tipos.ts web/lib/simuladores/hibrido/memorial-conteudo.ts web/__tests__/hibrido-memorial-conteudo.test.ts
git commit -m "feat(hibrido): conteudo do memorial descritivo (funcao pura)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Conteúdo do Relatório (puro)

**Files:**
- Create: `web/lib/simuladores/hibrido/relatorio-conteudo.ts`
- Test: `web/__tests__/hibrido-relatorio-conteudo.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `web/__tests__/hibrido-relatorio-conteudo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { montarRelatorio } from '@/lib/simuladores/hibrido/relatorio-conteudo'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { DADOS_PROJETO_INICIAL } from '@/components/simuladores/HibridoIdentificacao'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }
const CAMPOS = {
  ...CAMPOS_INICIAIS, tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id, numModulos: '16',
}
const RESULTADO = calcularHibrido(montarHibridoInput(CAMPOS, EQUIP, CARGAS))
const CAMPOS_FIN = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22', tusdFioBKwh: '0.36', disponibilidadeKwhMes: '100' }
const PARAMS_FIN = montarFinanceiroInput(CAMPOS_FIN, fisicoParaFinanceiro(RESULTADO))
const FINANCEIRO = calcularFinanceiro(PARAMS_FIN)
const ECONOMIA = calcularEconomiaAno(1, {
  fisico: PARAMS_FIN.fisico, tarifas: PARAMS_FIN.tarifas,
  premissas: PARAMS_FIN.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO,
})

const DATA_FIXA = new Date('2026-07-19T12:00:00Z')

const BASE = {
  dados: { ...DADOS_PROJETO_INICIAL, nome: 'Projeto Palmas', clienteNome: 'Iago' },
  projeto: { ...PROJETO }, resultado: RESULTADO,
  painel: PAINEL, inversor: INVERSOR, bateria: BATERIA, tipoSistema: 'Híbrido',
  financeiro: FINANCEIRO, economiaAno1: ECONOMIA, camposFin: CAMPOS_FIN,
  dataEmissao: DATA_FIXA,
}

const texto = (s: { paragrafos?: string[]; linhas?: { rotulo: string; valor: string }[] }) =>
  [...(s.paragrafos ?? []), ...(s.linhas ?? []).map((l) => `${l.rotulo}: ${l.valor}`)].join(' | ')

describe('montarRelatorio — estrutura', () => {
  const secoes = montarRelatorio(BASE)
  const tudo = secoes.map(texto).join(' | ')

  it('inclui o bloco de premissas adotadas', () => {
    expect(secoes.some((s) => /Premissas/i.test(s.titulo))).toBe(true)
  })
  it('as premissas mostram tarifa, TMA, inflação e horizonte', () => {
    const p = secoes.find((s) => /Premissas/i.test(s.titulo))!
    const t = texto(p)
    expect(t).toContain('1,22')
    expect(t).toMatch(/TMA/i)
    expect(t).toMatch(/[Ii]nflação/)
    expect(t).toMatch(/25/)
  })
  it('registra que os valores são estimativas, não garantia', () => {
    expect(tudo).toMatch(/estimativa/i)
    expect(tudo).toMatch(/não constituem garantia|não constitui garantia/i)
  })
})

describe('montarRelatorio — data de emissão vem por parâmetro', () => {
  it('imprime a data passada, não a de hoje', () => {
    const tudo = montarRelatorio(BASE).map(texto).join(' | ')
    expect(tudo).toContain(DATA_FIXA.toLocaleDateString('pt-BR'))
  })
  it('mudar a data muda o documento', () => {
    const outra = new Date('2030-01-15T12:00:00Z')
    const tudo = montarRelatorio({ ...BASE, dataEmissao: outra }).map(texto).join(' | ')
    expect(tudo).toContain(outra.toLocaleDateString('pt-BR'))
  })
})

describe('montarRelatorio — indicadores batem com o motor', () => {
  const secoes = montarRelatorio(BASE)
  const fin = texto(secoes.find((s) => /Viabilidade/i.test(s.titulo))!)

  it('investimento total e VPL vêm do motor', () => {
    const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    expect(fin).toContain(brl(FINANCEIRO.capex.investimentoTotal))
    expect(fin).toContain(brl(FINANCEIRO.indicadores.vpl))
  })
})

describe('montarRelatorio — payback nulo', () => {
  const semPayback = {
    ...FINANCEIRO,
    indicadores: { ...FINANCEIRO.indicadores, paybackSimplesAnos: null, paybackDescontadoAnos: null },
  }
  const tudo = montarRelatorio({ ...BASE, financeiro: semPayback }).map(texto).join(' | ')

  it('sai como "não se paga no horizonte"', () => {
    expect(tudo).toMatch(/não se paga no horizonte/i)
  })
  it('e nunca como "0 anos"', () => {
    expect(tudo).not.toMatch(/0 anos/)
  })
})

describe('montarRelatorio — conclusão condicional', () => {
  it('VPL positivo conclui pela viabilidade', () => {
    const c = montarRelatorio(BASE).find((s) => /Conclus/i.test(s.titulo))!
    expect(FINANCEIRO.indicadores.vpl).toBeGreaterThan(0)
    expect(texto(c)).toMatch(/vi[áa]vel/i)
  })
  it('VPL negativo recomenda revisar as premissas', () => {
    const ruim = { ...FINANCEIRO, indicadores: { ...FINANCEIRO.indicadores, vpl: -50000 } }
    const c = montarRelatorio({ ...BASE, financeiro: ruim }).find((s) => /Conclus/i.test(s.titulo))!
    expect(texto(c)).toMatch(/revisar/i)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npm run test -- hibrido-relatorio-conteudo`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `web/lib/simuladores/hibrido/relatorio-conteudo.ts`:

```ts
// web/lib/simuladores/hibrido/relatorio-conteudo.ts
// Monta o conteúdo do Relatório executivo. Função PURA.
//
// Este documento vai para o cliente e influencia uma decisão de compra de
// dezenas de milhares de reais. Os indicadores são projeções de 25 anos
// apoiadas em premissas discutíveis, por isso o relatório imprime as premissas
// adotadas como bloco próprio e registra que os valores são estimativas.
import type { DadosRelatorio, SecaoDocumento } from './documento-tipos'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const brl = (v: number) => `R$ ${n(v)}`
const pct = (v: number) => `${n(v * 100, 1)}%`
const ou = (v: string, sufixo = '') => (v.trim() === '' ? '—' : `${v.trim()}${sufixo}`)

/** `null` = não se paga no horizonte. Imprimir 0 diria o oposto. */
const payback = (v: number | null) => (v === null ? 'não se paga no horizonte' : `${n(v, 1)} anos`)

export function montarRelatorio(d: DadosRelatorio): SecaoDocumento[] {
  const { dados, resultado, painel, inversor, bateria, financeiro, economiaAno1, camposFin } = d
  const dim = resultado.dimensionamento
  const ind = financeiro.indicadores
  const cobertura = resultado.cargas.consumoAnualKwh > 0
    ? dim.producaoAnualKwh / resultado.cargas.consumoAnualKwh
    : 0
  const horizonte = financeiro.projecao.length - 1

  const conclusao = ind.vpl > 0
    ? `Com investimento total de ${brl(financeiro.capex.investimentoTotal)}, o sistema proporciona economia estimada de ${brl(economiaAno1.economiaLiquida)} no primeiro ano e Valor Presente Líquido positivo de ${brl(ind.vpl)} ao longo de ${horizonte} anos, com retorno do capital em ${payback(ind.paybackSimplesAnos)}. Nas premissas adotadas, o projeto se mostra economicamente viável.`
    : `Nas premissas adotadas, o Valor Presente Líquido do projeto é de ${brl(ind.vpl)}. Recomenda-se revisar os custos de instalação, a tarifa considerada e o dimensionamento antes de prosseguir.`

  return [
    {
      titulo: '1. Identificação',
      linhas: [
        { rotulo: 'Cliente', valor: ou(dados.clienteNome) },
        { rotulo: 'Simulação', valor: ou(dados.nome) },
        { rotulo: 'Local', valor: `${ou(dados.clienteCidade)} / ${ou(dados.clienteUf)}` },
        { rotulo: 'Concessionária', valor: ou(dados.concessionaria) },
        { rotulo: 'Responsável técnico', valor: ou(dados.responsavelTecnico) },
        { rotulo: 'Data de emissão', valor: d.dataEmissao.toLocaleDateString('pt-BR') },
      ],
    },
    {
      titulo: '2. Sistema proposto',
      linhas: [
        { rotulo: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { rotulo: 'Módulos', valor: painel ? `${n(dim.numModulos, 0)} × ${painel.fabricante} ${painel.modelo}` : '—' },
        { rotulo: 'Área necessária', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { rotulo: 'Inversor', valor: inversor ? `${n(resultado.inversor.numInversoresParalelo, 0)} × ${inversor.fabricante} ${inversor.modelo}` : '—' },
        { rotulo: 'Potência CA total', valor: `${n(resultado.inversor.potenciaCaTotalW, 0)} W` },
        {
          rotulo: 'Banco de baterias',
          valor: bateria
            ? `${n(resultado.baterias.numBaterias, 0)} × ${bateria.modelo} · ${n(resultado.baterias.energiaInstaladaKwh)} kWh`
            : 'não contemplado',
        },
      ],
    },
    {
      titulo: '3. Desempenho energético',
      linhas: [
        { rotulo: 'Irradiação média (HSP)', valor: `${n(dim.hspMediaAnual)} kWh/m²·dia` },
        { rotulo: 'Consumo anual', valor: `${n(resultado.cargas.consumoAnualKwh, 0)} kWh` },
        { rotulo: 'Geração anual estimada', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { rotulo: 'Cobertura do consumo', valor: pct(cobertura) },
        { rotulo: 'Produção diária média', valor: `${n(dim.producaoDiariaKwh, 1)} kWh` },
        { rotulo: 'Performance Ratio', valor: pct(dim.prTotal) },
        {
          rotulo: 'Autonomia do banco',
          valor: bateria ? `${n(resultado.baterias.autonomiaRealDias, 1)} dias` : '—',
        },
      ],
    },
    {
      titulo: '4. Viabilidade financeira',
      linhas: [
        { rotulo: 'Investimento total', valor: brl(financeiro.capex.investimentoTotal) },
        { rotulo: 'Investimento por kWp', valor: brl(financeiro.capex.investimentoPorKwp) },
        { rotulo: 'Economia no 1º ano', valor: brl(economiaAno1.economiaLiquida) },
        { rotulo: `Economia acumulada (${horizonte} anos)`, valor: brl(ind.economiaAcumulada) },
        { rotulo: 'Payback simples', valor: payback(ind.paybackSimplesAnos) },
        { rotulo: 'Payback descontado', valor: payback(ind.paybackDescontadoAnos) },
        { rotulo: 'VPL', valor: brl(ind.vpl) },
        { rotulo: 'TIR', valor: pct(ind.tir) },
        { rotulo: 'LCOE', valor: `R$ ${n(ind.lcoe, 4)}/kWh` },
      ],
    },
    {
      titulo: '5. Premissas adotadas',
      linhas: [
        { rotulo: 'Tarifa de energia', valor: `R$ ${ou(camposFin.tarifaKwh)}/kWh` },
        { rotulo: 'TUSD Fio B', valor: `R$ ${ou(camposFin.tusdFioBKwh)}/kWh` },
        { rotulo: 'Inflação da tarifa', valor: `${ou(camposFin.inflacaoTarifa)} ao ano (fração)` },
        { rotulo: 'TMA', valor: `${ou(camposFin.tma)} ao ano (fração)` },
        { rotulo: 'Degradação dos módulos', valor: `${ou(camposFin.degradacaoAnual)} ao ano (fração)` },
        { rotulo: 'O&M anual', valor: `${ou(camposFin.omAnual)} do investimento (fração)` },
        { rotulo: 'Horizonte de análise', valor: `${horizonte} anos` },
        { rotulo: 'Ano de conexão', valor: ou(camposFin.anoConexao) },
      ],
    },
    {
      titulo: '6. Conclusão',
      paragrafos: [
        conclusao,
        'Os valores apresentados são estimativas calculadas a partir das premissas declaradas neste relatório — irradiação informada, inflação da tarifa, degradação dos módulos e taxa mínima de atratividade. Alterações regulatórias, reajustes da concessionária ou condições de instalação diferentes das previstas podem alterar o resultado. Não constituem garantia de retorno financeiro.',
      ],
    },
  ]
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npm run test -- hibrido-relatorio-conteudo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/simuladores/hibrido/relatorio-conteudo.ts web/__tests__/hibrido-relatorio-conteudo.test.ts
git commit -m "feat(hibrido): conteudo do relatorio executivo com premissas e ressalva

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Geradores de PDF e botões

**Files:**
- Create: `web/lib/simuladores/hibrido/documento-pdf.ts`
- Create: `web/lib/simuladores/hibrido/memorial-pdf.ts`
- Create: `web/lib/simuladores/hibrido/relatorio-pdf.ts`
- Modify: `web/components/simuladores/SimuladorHibrido.tsx`
- Modify: `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`

- [ ] **Step 1: Criar o desenho comum**

Criar `web/lib/simuladores/hibrido/documento-pdf.ts`:

```ts
// web/lib/simuladores/hibrido/documento-pdf.ts
// Desenho comum aos dois documentos. Não decide conteúdo — só pinta o que as
// funções puras de conteúdo devolveram.
import type jsPDF from 'jspdf'
import type { SecaoDocumento } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'

export const MARGEM = 14

export function desenharCabecalho(
  doc: jsPDF, empresa: EmpresaProposta, titulo: string, subtitulo: string
): number {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(26, 35, 64)
  doc.rect(0, 0, W, 26, 'F')

  let hx = MARGEM
  if (empresa.logoBase64) {
    try {
      doc.addImage(empresa.logoBase64, 'PNG', MARGEM, 5, 16, 16)
      hx = MARGEM + 20
    } catch {
      // Logo inválido não pode impedir a emissão do documento.
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(empresa.nome, hx, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 200, 220)
  doc.text(
    [empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : null, empresa.telefone, empresa.email]
      .filter(Boolean).join('   |   '),
    hx, 17
  )
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 200, 80)
  doc.text(titulo, W - MARGEM, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 200, 220)
  doc.text(subtitulo, W - MARGEM, 17, { align: 'right' })

  return 34
}

type AutoTable = (doc: jsPDF, opts: Record<string, unknown>) => void

export function desenharSecoes(
  doc: jsPDF, autoTable: AutoTable, secoes: SecaoDocumento[], yInicial: number
): number {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let y = yInicial

  for (const secao of secoes) {
    if (y > H - 40) { doc.addPage(); y = MARGEM + 6 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(26, 35, 64)
    doc.text(secao.titulo, MARGEM, y)
    y += 5

    for (const p of secao.paragrafos ?? []) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 60, 70)
      const linhas = doc.splitTextToSize(p, W - MARGEM * 2) as string[]
      if (y + linhas.length * 4 > H - 20) { doc.addPage(); y = MARGEM + 6 }
      doc.text(linhas, MARGEM, y)
      y += linhas.length * 4 + 2
    }

    if (secao.linhas && secao.linhas.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGEM, right: MARGEM },
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 1.2 },
        columnStyles: { 0: { textColor: [110, 115, 130] }, 1: { fontStyle: 'bold' } },
        body: secao.linhas.map((l) => [l.rotulo, l.valor]),
      })
      const t = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      y = (t?.finalY ?? y) + 4
    }

    y += 2
  }

  return y
}
```

- [ ] **Step 2: Criar `memorial-pdf.ts`**

```ts
// web/lib/simuladores/hibrido/memorial-pdf.ts
import { montarMemorial } from './memorial-conteudo'
import { desenharCabecalho, desenharSecoes } from './documento-pdf'
import type { DadosMemorial } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'

export async function gerarMemorialPdf(
  dados: DadosMemorial, empresa: EmpresaProposta
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const y = desenharCabecalho(
    doc, empresa, 'MEMORIAL DESCRITIVO',
    `Emitido em ${new Date().toLocaleDateString('pt-BR')}`
  )
  desenharSecoes(doc, autoTable as never, montarMemorial(dados), y)

  const cliente = dados.dados.clienteNome.trim() || 'projeto'
  doc.save(`memorial-descritivo-${cliente.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
```

- [ ] **Step 3: Criar `relatorio-pdf.ts`**

```ts
// web/lib/simuladores/hibrido/relatorio-pdf.ts
import { montarRelatorio } from './relatorio-conteudo'
import { desenharCabecalho, desenharSecoes, MARGEM } from './documento-pdf'
import type { DadosRelatorio } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'
import type jsPDF from 'jspdf'
import type { LinhaProjecaoFinanceira } from './types'

function desenharGraficoAcumulado(doc: jsPDF, projecao: LinhaProjecaoFinanceira[], y: number) {
  const W = doc.internal.pageSize.getWidth()
  const x = MARGEM
  const w = W - MARGEM * 2
  const h = 45
  const valores = projecao.map((l) => l.fluxoAcumulado)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const faixa = max - min || 1
  const py = (v: number) => y + h - ((v - min) / faixa) * h

  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.text('Fluxo de caixa acumulado', x, y - 2)

  doc.setDrawColor(200, 205, 215)
  doc.line(x, py(0), x + w, py(0))

  doc.setDrawColor(255, 159, 64)
  doc.setLineWidth(0.6)
  for (let i = 1; i < projecao.length; i++) {
    const x1 = x + ((i - 1) / (projecao.length - 1)) * w
    const x2 = x + (i / (projecao.length - 1)) * w
    doc.line(x1, py(valores[i - 1]), x2, py(valores[i]))
  }
  doc.setLineWidth(0.2)
}

export async function gerarRelatorioPdf(
  dados: DadosRelatorio, empresa: EmpresaProposta
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const y0 = desenharCabecalho(
    doc, empresa, 'RELATÓRIO EXECUTIVO',
    `Emitido em ${dados.dataEmissao.toLocaleDateString('pt-BR')}`
  )
  const y = desenharSecoes(doc, autoTable as never, montarRelatorio(dados), y0)

  const H = doc.internal.pageSize.getHeight()
  const yGrafico = y > H - 60 ? (doc.addPage(), MARGEM + 10) : y + 6
  desenharGraficoAcumulado(doc, dados.financeiro.projecao, yGrafico)

  const cliente = dados.dados.clienteNome.trim() || 'projeto'
  doc.save(`relatorio-executivo-${cliente.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
```

- [ ] **Step 4: Ligar os botões no simulador**

Em `web/components/simuladores/SimuladorHibrido.tsx`, acrescentar aos imports:

```tsx
import { gerarMemorialPdf } from '@/lib/simuladores/hibrido/memorial-pdf'
import { gerarRelatorioPdf } from '@/lib/simuladores/hibrido/relatorio-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/proposta-empresa'
```

Acrescentar `empresa` às `Props` e à assinatura:

```tsx
type Props = {
  equipamentos: EquipamentosDisponiveis
  biblioteca: CargaBiblioteca[]
  simulacoes: SimulacaoResumo[]
  empresa: EmpresaProposta
}
```

```tsx
export function SimuladorHibrido({
  equipamentos: equipamentosIniciais, biblioteca: bibliotecaInicial, simulacoes, empresa,
}: Props) {
```

Acrescentar os handlers, junto dos demais:

```tsx
  const baseDocumento = {
    dados: dadosProjeto,
    projeto: input.projeto,
    resultado,
    painel: input.painel,
    inversor: input.inversor,
    bateria: input.bateria,
    // Vem do painel avançado, não de DadosProjeto.
    tipoSistema: campos.tipoSistema,
  }

  async function memorialPdf() {
    await gerarMemorialPdf(baseDocumento, empresa)
  }

  async function relatorioPdf() {
    await gerarRelatorioPdf(
      {
        ...baseDocumento,
        financeiro,
        economiaAno1,
        camposFin,
        dataEmissao: new Date(),
      },
      empresa
    )
  }
```

E, no bloco de botões (junto do "Salvar simulação"), acrescentar antes dele:

```tsx
          <button
            type="button"
            data-testid="btn-memorial-pdf"
            disabled={!input.painel || !input.inversor}
            onClick={memorialPdf}
            className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Memorial descritivo (PDF)
          </button>
          <button
            type="button"
            data-testid="btn-relatorio-pdf"
            disabled={!input.painel || !input.inversor}
            onClick={relatorioPdf}
            className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Relatório executivo (PDF)
          </button>
```

Ajustar o contêiner dos botões para `className="flex flex-wrap justify-end gap-2"`.

- [ ] **Step 5: Passar a empresa pela rota**

Em `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx`, acrescentar o
import e incluir no `Promise.all`:

```tsx
import { getEmpresaParaProposta } from '@/lib/simuladores/proposta-empresa'
```

```tsx
  const [paineis, inversores, baterias, simulacoes, empresa] = await Promise.all([
    listPaineis(), listInversores(), listBaterias(), listSimulacoesHibrido(), getEmpresaParaProposta(),
  ])
```

```tsx
    <SimuladorHibrido
      equipamentos={{ paineis, inversores, baterias }}
      biblioteca={biblioteca}
      simulacoes={simulacoes}
      empresa={empresa}
    />
```

- [ ] **Step 6: Corrigir os testes que renderizam o simulador**

`SimuladorHibrido` ganhou a prop obrigatória `empresa`. Acrescente em cada
`render(<SimuladorHibrido …>)` de `web/__tests__/hibrido-financeiro-ui.test.tsx`,
`hibrido-simulador-ui.test.tsx` e `hibrido-simulacoes-ui.test.tsx`:

```tsx
empresa={{ nome: 'Empresa Teste', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }}
```

Isso é esperado, não é regressão.

- [ ] **Step 7: Verificar**

Run: `cd web && npx tsc --noEmit && npm run test`
Expected: type-check limpo; suíte verde.

- [ ] **Step 8: Verificação no navegador**

A migration da Task 2 precisa estar aplicada. Se não estiver, **reporte como
pendente — não tente aplicá-la.**

Subir o dev server e conferir:
- Preencher identificação e dados do projeto, selecionar equipamentos e cargas
- Os dois botões ficam desabilitados sem painel/inversor e habilitam depois
- "Memorial descritivo (PDF)" baixa um PDF com as 11 seções, logo da empresa e
  os campos vazios como "—"
- Sem bateria selecionada, a seção 6 diz que o sistema não contempla armazenamento
- "Relatório executivo (PDF)" baixa um PDF com os blocos, o gráfico de fluxo
  acumulado e a ressalva de estimativa
- Nenhum documento imprime "undefined" ou "NaN"

- [ ] **Step 9: Commit**

```bash
git add web/lib/simuladores/hibrido/documento-pdf.ts web/lib/simuladores/hibrido/memorial-pdf.ts web/lib/simuladores/hibrido/relatorio-pdf.ts web/components/simuladores/SimuladorHibrido.tsx "web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx" web/__tests__
git commit -m "feat(hibrido): geracao dos PDFs do memorial e do relatorio

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- `proposta-empresa` compartilhado → Task 1 ✔
- 8 colunas descritivas + tipos → Task 2 ✔
- `DadosProjeto` e segundo bloco do formulário → Task 3 ✔
- Persistência dos descritivos → Tasks 4 e 5 ✔
- Memorial: 11 seções, ramo sem bateria, "—" nos vazios → Task 6 ✔
- Relatório: premissas adotadas, ressalva, payback nulo, conclusão condicional, data por parâmetro → Task 7 ✔
- Dois PDFs, botões desabilitados sem equipamento → Task 8 ✔

**2. Placeholders:** nenhum; todo código está completo.

**3. Consistência de tipos:** `DadosProjeto` e `DADOS_PROJETO_INICIAL` (Task 3)
são usados nas Tasks 5, 6 e 7. `SecaoDocumento`, `DadosMemorial` e
`DadosRelatorio` (Task 6) são consumidos pelas Tasks 7 e 8.
`EmpresaProposta` vem do módulo movido na Task 1.

**Notas de risco:**
- **A Task 3 deixa o `tsc` quebrado até a Task 5**, porque `SimuladorHibrido`
  ainda usa `Identificacao`/`IDENTIFICACAO_INICIAL`. Está avisado no Step 4 da
  Task 3; execute 3 e 5 na mesma sessão.
- **A Task 8 quebra os testes que renderizam `SimuladorHibrido`** (três
  arquivos), por causa da prop `empresa`. O Step 6 lista os arquivos e o valor a
  usar — é esperado, não é regressão.
- `0` é um azimute válido (Norte). Por isso os descritivos numéricos usam
  `null` para "não informado", e o plano evita `|| 0` na conversão em ambos os
  sentidos (Tasks 4 e 5).
- Os `data-testid` de identificação (`ident-nome`, `ident-clienteNome`, …) foram
  mantidos ao renomear o tipo, então os testes da Fase 3c continuam válidos sem
  alteração.
