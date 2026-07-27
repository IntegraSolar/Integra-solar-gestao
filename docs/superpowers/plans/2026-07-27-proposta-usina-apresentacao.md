# Proposta comercial de usina (Viabilidade) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o "Gerar PDF" do simulador de Viabilidade por uma proposta comercial de investimento entregue como página web por link (`/proposta-usina/[token]`) + botão "Baixar PDF", reusando o visual da apresentação comercial.

**Architecture:** Módulo paralelo (`lib/apresentacoes-usina/`, `components/apresentacao-usina/`) com modelo de dados e blocos próprios, que importa os primitivos visuais, o `tema.css`, a `BarraAcoes` e o pipeline de PDF por Chromium já existentes. Snapshot do input+resultado persistido em `simulador_viabilidade_apresentacoes`, lido por token na rota pública via service-role.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS + Storage), Vitest, puppeteer-core + @sparticuz/chromium.

**Fonte da verdade dos golden:** aba "Proposta" de `docs/Tabela de viabilidade usinas de investimento.xlsx` (fora do git). Caso de referência: concessionária **RGE**, 150 painéis 600 Wp, 1 inversor 75 kW, fator 0,14 → kWp 90, geração anual 109.272 kWh, TIR próprio 21,41%, VPL R$ 226.670,97, payback 5, CAPEX R$ 154.413,82, reestruturação do inversor R$ 20.782,07, Microusina.

**Decisão registrada (O&M Acumulado VP):** o valor da planilha (-959.820,04) NÃO é reproduzível pelo motor atual — o motor modela OPEX como `opexPct × CAPEX` (12.538/ano), enquanto a planilha soma uma composição mensal detalhada (aba "Dados Projeto", ~20.628/ano). Pela disciplina do spec, a linha "O&M Acumulado (VP)" e o "Total" **não entram**. O bloco de custos mostra CAPEX + reestruturação do inversor + vida útil, como o PDF atual. Reproduzir o O&M fiel exigiria modelar o OPEX completo — fica para etapa futura.

---

## Estrutura de arquivos

**Criar:**
- `web/supabase/migrations/20260727000001_viabilidade_apresentacoes.sql` — tabela + RLS.
- `web/lib/apresentacoes-usina/tipos.ts` — `ApresentacaoUsinaData`.
- `web/lib/apresentacoes-usina/custos.ts` — cálculo dos custos exibidos (puro).
- `web/lib/apresentacoes-usina/grafico.ts` — SVG do fluxo acumulado (puro).
- `web/lib/apresentacoes-usina/dados.ts` — `montarApresentacaoUsina` (puro).
- `web/lib/apresentacoes-usina/actions.ts` — `gerarPropostaUsina` (server action).
- `web/components/apresentacao-usina/ApresentacaoUsina.tsx` — orquestrador.
- `web/components/apresentacao-usina/blocos/*.tsx` — 10 blocos.
- `web/app/proposta-usina/[token]/page.tsx` + `PropostaUsinaView.tsx` — página pública.
- `web/app/api/proposta-usina/[token]/route.ts` — JSON público.
- `web/app/api/proposta-usina/[token]/pdf/route.ts` — PDF por Chromium.
- Testes: `web/__tests__/apresentacao-usina-dados.test.ts`, `-custos.test.ts`, `-grafico.test.ts`, `-seguranca.test.ts`, `-fiacao.test.ts`.

**Modificar:**
- `web/components/apresentacao/BarraAcoes.tsx` — aceitar `pdfEndpoint` (default mantém o comportamento do CRM).
- `web/components/simuladores/SimuladorViabilidade.tsx` — "Gerar PDF" → "Gerar proposta".
- `web/middleware.ts` — `/proposta-usina` e `/api/proposta-usina` em `PUBLIC_ROUTES`.
- `web/next.config.mjs` — tracing do Chromium para `/api/proposta-usina/**`.
- `web/types/database.types.ts` — tipos da tabela nova.

**Aposentar (parar de usar, sem apagar jspdf):**
- `web/lib/simuladores/viabilidade/proposta-pdf.ts` — deixa de ser chamado pela tela.

---

## Task 1: Migration da tabela de apresentações de usina

**Files:**
- Create: `web/supabase/migrations/20260727000001_viabilidade_apresentacoes.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Apresentação (proposta comercial) de uma simulação de viabilidade de usina.
--
-- Guarda um SNAPSHOT do input e do resultado, não uma referência à simulação
-- salva: o link precisa sobreviver à exclusão da simulação na lista, e o
-- investidor deve ver exatamente o que foi gerado no momento.
CREATE TABLE IF NOT EXISTS public.simulador_viabilidade_apresentacoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token                text NOT NULL UNIQUE,
  cliente_nome         text,
  cliente_cidade       text,
  concessionaria_nome  text NOT NULL,
  modelo_painel        text,
  modelo_inversor      text,
  input                jsonb NOT NULL,   -- snapshot do ViabilidadeInput
  resultado            jsonb NOT NULL,   -- snapshot do ViabilidadeResultado
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viab_apres_org
  ON public.simulador_viabilidade_apresentacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_viab_apres_token
  ON public.simulador_viabilidade_apresentacoes(token) WHERE active;

ALTER TABLE public.simulador_viabilidade_apresentacoes ENABLE ROW LEVEL SECURITY;

-- Membros da org gerenciam as próprias. A LEITURA PÚBLICA (investidor sem login)
-- é feita pela rota via service-role, que ignora RLS — como em /api/proposta.
CREATE POLICY "org members manage viab apresentacoes"
  ON public.simulador_viabilidade_apresentacoes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/20260727000001_viabilidade_apresentacoes.sql
git commit -m "feat(viabilidade): migration da apresentacao de usina"
```

> **Ordem de deploy:** esta migration é aplicada por Iago no SQL Editor ANTES do código das Tasks 8–12 subir. Até lá, a action e a rota pública falham de forma controlada.

---

## Task 2: Tipo `ApresentacaoUsinaData`

**Files:**
- Create: `web/lib/apresentacoes-usina/tipos.ts`

- [ ] **Step 1: Escrever o tipo (tudo já formatado para leitura, como ApresentacaoData)**

```ts
// web/lib/apresentacoes-usina/tipos.ts
// Dado exibido na proposta de usina. Tudo já em string formatada pt-BR — a
// página pública não formata nem calcula; só desenha.

export type LinhaProjecaoView = {
  ano: string
  producao: string
  receita: string
  opex: string
  fluxoProprio: string
  acumulado: string
}

export type ApresentacaoUsinaData = {
  titulo: string
  empresa: {
    nome: string
    cnpj: string | null
    telefone: string | null
    email: string | null
    logo_url: string | null
  }
  cliente: { nome: string | null; cidade: string | null }
  datas: { emitida_em: string; validade_dias: string }
  tema: { cor_principal: string; cor_texto: string; cor_secundaria: string }

  indicadores: {
    tir: string
    vpl: string
    payback: string
    potencia_kwp: string
    geracao_anual: string
  }
  usina: {
    modelo_compensacao: string
    regra_transicao: string
    concessionaria: string
    potencia_pico: string
    potencia_nominal: string
    painel: string        // "600 Wp × 150 un — Jinko Solar S600"
    inversor: string
    fator_capacidade: string
    geracao_anual: string
    geracao_mensal: string
    tipo_usina: string
  }
  premissas: { rotulo: string; valor: string }[]
  custos: { rotulo: string; valor: string }[]
  financiamento: {
    resumo: string        // "100% recursos próprios" OU "70% financiado"
    linhas: { rotulo: string; valor: string }[]
  }
  retorno: {
    cenarios: { rotulo: string; proprio: string; financiado: string }[]
  }
  projecao: {
    svg: string           // SVG inline do fluxo acumulado
    tabela: LinhaProjecaoView[]
  }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS (arquivo só declara tipos).

- [ ] **Step 3: Commit**

```bash
git add web/lib/apresentacoes-usina/tipos.ts
git commit -m "feat(viabilidade): tipo ApresentacaoUsinaData"
```

---

## Task 3: Cálculo dos custos exibidos (`custos.ts`)

**Files:**
- Create: `web/lib/apresentacoes-usina/custos.ts`
- Test: `web/__tests__/apresentacao-usina-custos.test.ts`

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, it, expect } from 'vitest'
import { custosProjeto } from '@/lib/apresentacoes-usina/custos'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const inputBase = { valorInvestimento: 154413.82, horizonteAnos: 25 } as ViabilidadeInput

describe('custosProjeto', () => {
  it('reproduz CAPEX, reestruturação do inversor e vida útil da planilha', () => {
    const linhas = custosProjeto(inputBase)
    const capex = linhas.find((l) => l.rotulo.includes('CAPEX'))
    const reest = linhas.find((l) => l.rotulo.includes('Reestruturação'))
    const vida = linhas.find((l) => l.rotulo.includes('Vida útil'))
    expect(capex?.valor).toBe('-R$ 154.413,82')
    expect(reest?.valor).toBe('-R$ 20.782,07')
    expect(vida?.valor).toBe('25 anos')
  })

  it('NÃO inclui O&M Acumulado nem Total (não reproduzíveis pelo motor)', () => {
    const linhas = custosProjeto(inputBase)
    expect(linhas.some((l) => l.rotulo.includes('O&M'))).toBe(false)
    expect(linhas.some((l) => l.rotulo === 'Total')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-custos.test.ts`
Expected: FAIL ("custosProjeto is not a function").

- [ ] **Step 3: Implementar**

```ts
// web/lib/apresentacoes-usina/custos.ts
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Linhas de "Custos totais do projeto" exibidas na proposta.
 *
 * O&M Acumulado (VP) e Total ficam de fora: o motor modela OPEX como
 * opexPct × CAPEX, que não reproduz o valor da planilha (composição mensal da
 * aba "Dados Projeto"). Incluir um número aproximado numa proposta de
 * investimento seria desonesto. Fórmulas reproduzíveis: CAPEX (entrada) e a
 * reestruturação do inversor no ano 15 (idêntica ao engine.ts).
 */
export function custosProjeto(input: ViabilidadeInput): { rotulo: string; valor: string }[] {
  const reestruturacao = 0.1 * input.valorInvestimento * Math.pow(1.02, 15)
  return [
    { rotulo: 'Investimento inicial (CAPEX)', valor: '-' + brl(input.valorInvestimento) },
    { rotulo: 'Reestruturação do inversor (ano 15)', valor: '-' + brl(reestruturacao) },
    { rotulo: 'Vida útil do projeto', valor: `${input.horizonteAnos} anos` },
  ]
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-custos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/apresentacoes-usina/custos.ts web/__tests__/apresentacao-usina-custos.test.ts
git commit -m "feat(viabilidade): custos exibidos na proposta de usina"
```

---

## Task 4: Gráfico SVG do fluxo acumulado (`grafico.ts`)

**Files:**
- Create: `web/lib/apresentacoes-usina/grafico.ts`
- Test: `web/__tests__/apresentacao-usina-grafico.test.ts`

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, it, expect } from 'vitest'
import { svgFluxoAcumulado } from '@/lib/apresentacoes-usina/grafico'

describe('svgFluxoAcumulado', () => {
  it('gera um SVG com um ponto por ano da série', () => {
    const svg = svgFluxoAcumulado([-100, -60, -20, 30, 80])
    expect(svg.startsWith('<svg')).toBe(true)
    // polyline com 5 vértices (x,y separados por espaço)
    const pontos = svg.match(/points="([^"]+)"/)?.[1].trim().split(/\s+/) ?? []
    expect(pontos.length).toBe(5)
  })

  it('série vazia não quebra', () => {
    expect(svgFluxoAcumulado([]).startsWith('<svg')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-grafico.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// web/lib/apresentacoes-usina/grafico.ts
// SVG do fluxo de caixa acumulado, gerado no servidor. Sem canvas: canvas é
// pintado por JS e sai em branco no PDF do Chromium (captura antes do paint).

const W = 600
const H = 220
const PAD = 8

/** Recebe a série de fluxo acumulado (ano 0..N) e devolve um SVG inline. */
export function svgFluxoAcumulado(acumulado: number[]): string {
  if (acumulado.length === 0) {
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`
  }
  const min = Math.min(...acumulado, 0)
  const max = Math.max(...acumulado, 0)
  const range = max - min || 1
  const n = acumulado.length - 1 || 1
  const x = (i: number) => PAD + (i / n) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const pontos = acumulado.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const zero = y(0).toFixed(1)
  return [
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="apr-usina__grafico">`,
    `<line x1="${PAD}" y1="${zero}" x2="${W - PAD}" y2="${zero}" stroke="rgba(0,0,0,.2)" stroke-width="1"/>`,
    `<polyline fill="none" stroke="var(--apr-destaque-cheia)" stroke-width="2.5" points="${pontos}"/>`,
    `</svg>`,
  ].join('')
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-grafico.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/apresentacoes-usina/grafico.ts web/__tests__/apresentacao-usina-grafico.test.ts
git commit -m "feat(viabilidade): grafico SVG do fluxo acumulado"
```

---

## Task 5: `montarApresentacaoUsina` (função pura)

**Files:**
- Create: `web/lib/apresentacoes-usina/dados.ts`
- Test: `web/__tests__/apresentacao-usina-dados.test.ts`

**Contexto para o implementador:** a assinatura recebe o snapshot (input+resultado já calculados), a empresa (`EmpresaProposta` de `web/lib/simuladores/proposta-empresa.ts`) e a config visual (cores/tema de `getConfigApresentacao`). Reusa `corLegivelSobreClaro` de `web/lib/apresentacoes/contraste.ts` para a cor de texto legível. Formatações: `brl`, `pct` (fração→%), `num` (milhar). O caso golden monta o input com `montarViabilidadeInput(campos, RGE)` + `calcularViabilidade`.

- [ ] **Step 1: Escrever o teste (golden do caso RGE)**

```ts
import { describe, it, expect } from 'vitest'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'
import { montarViabilidadeInput, PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025',
  tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25,
  icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23,
  aplicaReajuste1430: true,
}
const campos = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2' as const, valorInvestimento: 154413.82,
  descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
}
const empresa = { nome: 'Solar X', cnpj: '00.000.000/0001-00', telefone: '(63) 99999-9999', email: 'x@x.com', logoBase64: null }

function montar() {
  const input = montarViabilidadeInput(campos, RGE)
  const resultado = calcularViabilidade(input)
  const config = { cor_principal: '#0a0e1a', cor_secundaria: '#0a0e1a' }
  return montarApresentacaoUsina({
    input, resultado, empresa,
    clienteNome: 'Investidor Teste', clienteCidade: 'Palmas/TO',
    concessionariaNome: 'RGE', modeloPainel: 'Jinko S600', modeloInversor: 'Huawei A60',
    config,
  })
}

describe('montarApresentacaoUsina', () => {
  it('formata os indicadores do caso RGE', () => {
    const d = montar()
    expect(d.indicadores.potencia_kwp).toBe('90,00 kWp')
    expect(d.indicadores.geracao_anual).toBe('109.272 kWh')
    expect(d.indicadores.payback).toBe('5 anos')
    expect(d.indicadores.tir).toMatch(/^21,4/)      // ~21,41%
    expect(d.indicadores.vpl).toContain('226.6')     // R$ 226.6xx
  })

  it('descreve a usina', () => {
    const d = montar()
    expect(d.usina.tipo_usina).toBe('Microusina')
    expect(d.usina.potencia_nominal).toBe('75 kW')
    expect(d.usina.painel).toContain('150')
    expect(d.usina.painel).toContain('Jinko S600')
  })

  it('financiamento 0% vira "100% recursos próprios"', () => {
    const d = montar()
    expect(d.financiamento.resumo).toContain('100%')
  })

  it('projeção tem uma linha por ano do horizonte + ano 0', () => {
    const d = montar()
    expect(d.projecao.tabela.length).toBe(26) // ano 0 + 25
    expect(d.projecao.svg.startsWith('<svg')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-dados.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `dados.ts`**

```ts
// web/lib/apresentacoes-usina/dados.ts
import type { ViabilidadeInput, ViabilidadeResultado } from '@/lib/simuladores/viabilidade/types'
import type { EmpresaProposta } from '@/lib/simuladores/proposta-empresa'
import type { ApresentacaoUsinaData } from './tipos'
import { custosProjeto } from './custos'
import { svgFluxoAcumulado } from './grafico'
import { corLegivelSobreClaro } from '@/lib/apresentacoes/contraste'

const COR_PADRAO = '#0a0e1a'
const VALIDADE_DIAS = 10

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const num = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

export type SnapshotUsina = {
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
  config: { cor_principal: string; cor_secundaria: string }
}

export function montarApresentacaoUsina(s: SnapshotUsina): ApresentacaoUsinaData {
  const i = s.input
  const r = s.resultado
  const corPrincipal = s.config.cor_principal?.trim() || COR_PADRAO
  const geracaoMensal = r.geracaoAnualKwh / 12
  const potenciaNominal = i.numInversores * i.potenciaInversorKw
  const receitaBrutaMensal = r.projecao[1]?.receitaBruta ? r.projecao[1].receitaBruta / 12 : 0
  const financiado = i.pctFinanciado > 0

  return {
    titulo: 'Proposta de Investimento em Usina Solar',
    empresa: {
      nome: s.empresa.nome,
      cnpj: s.empresa.cnpj,
      telefone: s.empresa.telefone,
      email: s.empresa.email,
      logo_url: s.empresa.logoBase64,
    },
    cliente: { nome: s.clienteNome, cidade: s.clienteCidade },
    datas: {
      emitida_em: new Date().toLocaleDateString('pt-BR'),
      validade_dias: String(VALIDADE_DIAS),
    },
    tema: {
      cor_principal: corPrincipal,
      cor_texto: corLegivelSobreClaro(corPrincipal),
      cor_secundaria: s.config.cor_secundaria?.trim() || COR_PADRAO,
    },
    indicadores: {
      tir: pct(r.capitalProprio.tir),
      vpl: brl(r.capitalProprio.vpl),
      payback: `${r.capitalProprio.paybackAnos} anos`,
      potencia_kwp: `${num(r.kwp, 2)} kWp`,
      geracao_anual: `${num(r.geracaoAnualKwh)} kWh`,
    },
    usina: {
      modelo_compensacao: 'Compartilhada',
      regra_transicao: i.modalidade === 'GD1' ? 'GD 1' : 'GD 2',
      concessionaria: s.concessionariaNome,
      potencia_pico: `${num(r.kwp, 2)} kWp`,
      potencia_nominal: `${num(potenciaNominal)} kW`,
      painel: `${num(i.potenciaPainelWp)} Wp × ${i.numPaineis} un — ${s.modeloPainel}`,
      inversor: `${num(i.potenciaInversorKw)} kW × ${i.numInversores} un — ${s.modeloInversor}`,
      fator_capacidade: pct(i.fatorCapacidade),
      geracao_anual: `${num(r.geracaoAnualKwh)} kWh`,
      geracao_mensal: `${num(geracaoMensal)} kWh`,
      tipo_usina: r.tipoUsina,
    },
    premissas: [
      { rotulo: 'Desconto do consumidor', valor: pct(i.descontoLocacao) },
      { rotulo: 'Tarifa compensável (R$/kWh)', valor: num(i.tarifaLocacaoBase, 4) },
      { rotulo: 'Reajuste de energia / IPCA', valor: pct(i.reajusteTarifaAnual) },
      { rotulo: 'Fator de indisponibilidade', valor: pct(i.degradacaoAnual) },
      { rotulo: 'TMA', valor: pct(i.tma) },
      { rotulo: 'Percentual de imposto', valor: pct(i.impostoPct) },
      { rotulo: 'Receita bruta mensal prevista', valor: brl(receitaBrutaMensal) },
    ],
    custos: custosProjeto(i),
    financiamento: {
      resumo: financiado
        ? `${pct(i.pctFinanciado)} financiado`
        : 'Investimento 100% com recursos próprios',
      linhas: financiado
        ? [
            { rotulo: 'Porcentagem financiada', valor: pct(i.pctFinanciado) },
            { rotulo: 'Taxa de juros (anual)', valor: pct(i.jurosAnual) },
            { rotulo: 'Prazo (meses)', valor: String(i.prazoMeses) },
            { rotulo: 'Recursos financiados', valor: brl(i.valorInvestimento * i.pctFinanciado) },
            { rotulo: 'Recursos próprios', valor: brl(i.valorInvestimento * (1 - i.pctFinanciado)) },
          ]
        : [{ rotulo: 'Recursos próprios', valor: brl(i.valorInvestimento) }],
    },
    retorno: {
      cenarios: [
        { rotulo: 'TIR', proprio: pct(r.capitalProprio.tir), financiado: pct(r.comFinanciamento.tir) },
        { rotulo: 'VPL', proprio: brl(r.capitalProprio.vpl), financiado: brl(r.comFinanciamento.vpl) },
        { rotulo: 'Payback (anos)', proprio: String(r.capitalProprio.paybackAnos), financiado: String(r.comFinanciamento.paybackAnos) },
      ],
    },
    projecao: {
      svg: svgFluxoAcumulado(r.projecao.map((l) => l.fluxoProprioAcum)),
      tabela: r.projecao.map((l) => ({
        ano: String(l.ano),
        producao: num(l.producaoKwh),
        receita: brl(l.receitaBruta),
        opex: brl(l.opex),
        fluxoProprio: brl(l.fluxoProprio),
        acumulado: brl(l.fluxoProprioAcum),
      })),
    },
  }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-dados.test.ts`
Expected: PASS. (Se `potencia_kwp`/`geracao_anual` divergirem, conferir contra o golden da planilha e ajustar SÓ o esperado do teste se a planilha confirmar — nunca o motor.)

- [ ] **Step 5: Commit**

```bash
git add web/lib/apresentacoes-usina/dados.ts web/__tests__/apresentacao-usina-dados.test.ts
git commit -m "feat(viabilidade): montarApresentacaoUsina com golden RGE"
```

---

## Task 6: Teste de vazamento (segurança)

**Files:**
- Test: `web/__tests__/apresentacao-usina-seguranca.test.ts`

**Contexto:** a rota é pública. `ApresentacaoUsinaData` não pode expor margem, comissão, custo interno nem `opexPct` cru. Como todos os campos são strings já formatadas, o teste serializa a saída e falha se algum termo sensível aparecer.

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, it, expect } from 'vitest'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'
import { montarViabilidadeInput, PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025', tusd: 517.75, te: 304.45, tusdFioB: 303.53,
  tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25, icms: 0.18, pisCofins: 0.05,
  demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23, aplicaReajuste1430: true,
}

describe('proposta de usina não vaza dado interno', () => {
  it('serialização não contém termos sensíveis', () => {
    const input = montarViabilidadeInput({
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD2', valorInvestimento: 154413.82,
      descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
    }, RGE)
    const data = montarApresentacaoUsina({
      input, resultado: calcularViabilidade(input),
      empresa: { nome: 'X', cnpj: null, telefone: null, email: null, logoBase64: null },
      clienteNome: null, clienteCidade: null, concessionariaNome: 'RGE',
      modeloPainel: '', modeloInversor: '',
      config: { cor_principal: '#0a0e1a', cor_secundaria: '#0a0e1a' },
    })
    const txt = JSON.stringify(data).toLowerCase()
    for (const termo of ['margem', 'comiss', 'custo interno', 'lucro', 'opexpct']) {
      expect(txt).not.toContain(termo)
    }
  })
})
```

- [ ] **Step 2: Rodar (deve passar de primeira — a saída já é curada)**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-seguranca.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/__tests__/apresentacao-usina-seguranca.test.ts
git commit -m "test(viabilidade): proposta de usina nao vaza dado interno"
```

---

## Task 7: Parametrizar `BarraAcoes` com `pdfEndpoint`

**Files:**
- Modify: `web/components/apresentacao/BarraAcoes.tsx`

- [ ] **Step 1: Adicionar a prop opcional (default mantém o CRM intacto)**

Trocar a assinatura e o uso do endpoint:

```tsx
export function BarraAcoes({
  token,
  totalBlocos,
  pdfEndpoint = '/api/proposta',
}: {
  token: string
  totalBlocos: number
  /** Base da rota de PDF. A proposta de usina usa '/api/proposta-usina'. */
  pdfEndpoint?: string
}) {
```

E em `baixarPdf`:

```tsx
    window.open(`${pdfEndpoint}/${token}/pdf`, '_blank')
```

- [ ] **Step 2: Verificar que o CRM não quebrou (typecheck + testes)**

Run: `cd web && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run`
Expected: PASS (a chamada existente em `Apresentacao.tsx` não passa `pdfEndpoint`, então usa o default).

- [ ] **Step 3: Commit**

```bash
git add web/components/apresentacao/BarraAcoes.tsx
git commit -m "refactor(apresentacao): BarraAcoes aceita pdfEndpoint"
```

---

## Task 8: Blocos e orquestrador da proposta de usina

**Files:**
- Create: `web/components/apresentacao-usina/blocos/{Capa,Indicadores,Usina,Premissas,Custos,Financiamento,Retorno,Projecao,Empresa,Contato}.tsx`
- Create: `web/components/apresentacao-usina/ApresentacaoUsina.tsx`

**Contexto:** todos os blocos recebem `{ dados }: { dados: ApresentacaoUsinaData }`, usam as classes `.apr__*` de `components/apresentacao/tema.css` (importado pelo orquestrador) e os primitivos `Secao`/`Indicador` de `components/apresentacao/primitivos/`. Os blocos são estáticos (SSR), sem estado.

- [ ] **Step 1: Escrever os blocos**

`Capa.tsx`:
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
export function Capa({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <section className="apr__card apr__cover">
      {dados.empresa.logo_url && <img src={dados.empresa.logo_url} alt="" className="apr__cover-logo" />}
      <h1 className="apr__cover-titulo">{dados.titulo}</h1>
      {dados.cliente.nome && (
        <p className="apr__cover-cliente">
          {dados.cliente.nome}{dados.cliente.cidade ? ` — ${dados.cliente.cidade}` : ''}
        </p>
      )}
      <p className="apr__cover-data">
        Emitida em {dados.datas.emitida_em} · validade {dados.datas.validade_dias} dias
      </p>
    </section>
  )
}
```

`Indicadores.tsx`:
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
import { Indicador } from '@/components/apresentacao/primitivos/Indicador'
export function Indicadores({ dados }: { dados: ApresentacaoUsinaData }) {
  const i = dados.indicadores
  return (
    <Secao titulo="Retorno do investimento">
      <div className="apr__ind-grid">
        <Indicador rotulo="TIR" valor={i.tir} />
        <Indicador rotulo="VPL" valor={i.vpl} />
        <Indicador rotulo="Payback" valor={i.payback} />
        <Indicador rotulo="Potência" valor={i.potencia_kwp} />
        <Indicador rotulo="Geração anual" valor={i.geracao_anual} />
      </div>
    </Secao>
  )
}
```

`Usina.tsx`, `Premissas.tsx`, `Custos.tsx`, `Financiamento.tsx` seguem o mesmo padrão de lista rótulo/valor dentro de `<Secao>`. Modelo (Premissas, replicar para Custos e Financiamento.linhas):
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Premissas({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Premissas do projeto">
      <dl className="apr-usina__lista">
        {dados.premissas.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha">
            <dt>{l.rotulo}</dt><dd>{l.valor}</dd>
          </div>
        ))}
      </dl>
    </Secao>
  )
}
```

`Usina.tsx` monta a lista a partir dos campos de `dados.usina` (mesma estrutura `<dl>`):
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Usina({ dados }: { dados: ApresentacaoUsinaData }) {
  const u = dados.usina
  const linhas: [string, string][] = [
    ['Modelo de compensação', u.modelo_compensacao],
    ['Regra de transição', u.regra_transicao],
    ['Concessionária', u.concessionaria],
    ['Potência pico', u.potencia_pico],
    ['Potência nominal', u.potencia_nominal],
    ['Painel FV', u.painel],
    ['Inversor(es)', u.inversor],
    ['Fator de capacidade', u.fator_capacidade],
    ['Geração anual', u.geracao_anual],
    ['Geração mensal', u.geracao_mensal],
    ['Tipo de usina', u.tipo_usina],
  ]
  return (
    <Secao titulo="A usina fotovoltaica">
      <dl className="apr-usina__lista">
        {linhas.map(([r, v]) => (
          <div key={r} className="apr-usina__linha"><dt>{r}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}
```

`Custos.tsx` e `Financiamento.tsx` (com o `resumo` em destaque antes da lista):
```tsx
// Custos.tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Custos({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Custos totais do projeto">
      <dl className="apr-usina__lista">
        {dados.custos.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha"><dt>{l.rotulo}</dt><dd>{l.valor}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}
```
```tsx
// Financiamento.tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Financiamento({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Financiamento">
      <p className="apr-usina__resumo">{dados.financiamento.resumo}</p>
      <dl className="apr-usina__lista">
        {dados.financiamento.linhas.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha"><dt>{l.rotulo}</dt><dd>{l.valor}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}
```

`Retorno.tsx` (tabela 3 colunas):
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Retorno({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Cenários de retorno">
      <table className="apr-usina__tabela">
        <thead><tr><th></th><th>Capital próprio</th><th>Com financiamento</th></tr></thead>
        <tbody>
          {dados.retorno.cenarios.map((c) => (
            <tr key={c.rotulo}><td>{c.rotulo}</td><td>{c.proprio}</td><td>{c.financiado}</td></tr>
          ))}
        </tbody>
      </table>
    </Secao>
  )
}
```

`Projecao.tsx` (SVG + tabela ano a ano):
```tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Projecao({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Projeção de 25 anos">
      <div className="apr-usina__grafico-wrap" dangerouslySetInnerHTML={{ __html: dados.projecao.svg }} />
      <div className="apr-usina__tabela-scroll">
        <table className="apr-usina__tabela">
          <thead><tr><th>Ano</th><th>Produção (kWh)</th><th>Receita</th><th>OPEX</th><th>Fluxo próprio</th><th>Acumulado</th></tr></thead>
          <tbody>
            {dados.projecao.tabela.map((l) => (
              <tr key={l.ano}><td>{l.ano}</td><td>{l.producao}</td><td>{l.receita}</td><td>{l.opex}</td><td>{l.fluxoProprio}</td><td>{l.acumulado}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Secao>
  )
}
```

`Empresa.tsx` e `Contato.tsx`:
```tsx
// Empresa.tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Empresa({ dados }: { dados: ApresentacaoUsinaData }) {
  const e = dados.empresa
  return (
    <Secao titulo="Sobre a empresa">
      <p className="apr-usina__empresa-nome">{e.nome}</p>
      <p className="apr-usina__empresa-info">
        {[e.cnpj ? `CNPJ ${e.cnpj}` : null, e.telefone, e.email].filter(Boolean).join(' · ')}
      </p>
    </Secao>
  )
}
```
```tsx
// Contato.tsx
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Contato({ dados }: { dados: ApresentacaoUsinaData }) {
  const tel = dados.empresa.telefone
  const zap = tel ? tel.replace(/\D/g, '') : null
  return (
    <Secao titulo="Fale com a gente">
      {zap
        ? <a className="apr-usina__cta" href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        : <p>{dados.empresa.email ?? 'Entre em contato com a empresa.'}</p>}
    </Secao>
  )
}
```

- [ ] **Step 2: Escrever o orquestrador**

```tsx
// web/components/apresentacao-usina/ApresentacaoUsina.tsx
import '@/components/apresentacao/tema.css'
import { BarraAcoes } from '@/components/apresentacao/BarraAcoes'
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Capa } from './blocos/Capa'
import { Indicadores } from './blocos/Indicadores'
import { Usina } from './blocos/Usina'
import { Premissas } from './blocos/Premissas'
import { Custos } from './blocos/Custos'
import { Financiamento } from './blocos/Financiamento'
import { Retorno } from './blocos/Retorno'
import { Projecao } from './blocos/Projecao'
import { Empresa } from './blocos/Empresa'
import { Contato } from './blocos/Contato'

const BLOCOS = [Capa, Indicadores, Usina, Premissas, Custos, Financiamento, Retorno, Projecao, Empresa, Contato]

export function ApresentacaoUsina({ dados, token }: { dados: ApresentacaoUsinaData; token?: string }) {
  return (
    <div
      className="apr"
      data-tema="minimal-white"
      style={{
        '--apr-destaque': dados.tema.cor_texto,
        '--apr-destaque-cheia': dados.tema.cor_principal,
        '--apr-contraste': dados.tema.cor_secundaria,
      } as React.CSSProperties}
    >
      <div className="apr__wrap">
        {BLOCOS.map((B, i) => <B key={i} dados={dados} />)}
      </div>
      {token && <BarraAcoes token={token} totalBlocos={BLOCOS.length} pdfEndpoint="/api/proposta-usina" />}
    </div>
  )
}
```

- [ ] **Step 3: Adicionar os estilos específicos ao final de `web/components/apresentacao/tema.css`**

```css
/* ── Proposta de usina ─────────────────────────────────────────── */
.apr-usina__lista { display: grid; gap: .35rem; }
.apr-usina__linha { display: flex; justify-content: space-between; gap: 1rem; padding: .35rem 0; border-bottom: 1px solid rgba(0,0,0,.06); }
.apr-usina__linha dt { color: var(--apr-texto-suave, #667); }
.apr-usina__linha dd { font-weight: 600; text-align: right; }
.apr-usina__resumo { font-weight: 700; color: var(--apr-destaque); margin-bottom: .5rem; }
.apr-usina__tabela { width: 100%; border-collapse: collapse; font-size: .8rem; }
.apr-usina__tabela th, .apr-usina__tabela td { padding: .3rem .5rem; text-align: right; border-bottom: 1px solid rgba(0,0,0,.06); }
.apr-usina__tabela th:first-child, .apr-usina__tabela td:first-child { text-align: left; }
.apr-usina__tabela-scroll { overflow-x: auto; }
.apr-usina__grafico { width: 100%; height: auto; }
.apr-usina__cta { display: inline-block; padding: .6rem 1.2rem; border-radius: .5rem; background: var(--apr-destaque-cheia); color: #fff; font-weight: 700; text-decoration: none; }
@media print { .apr-usina__grafico { break-inside: avoid; } }
```

- [ ] **Step 4: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/apresentacao-usina web/components/apresentacao/tema.css
git commit -m "feat(viabilidade): blocos e orquestrador da proposta de usina"
```

---

## Task 9: Página pública + rota JSON

**Files:**
- Create: `web/app/proposta-usina/[token]/page.tsx`
- Create: `web/app/proposta-usina/[token]/PropostaUsinaView.tsx`
- Create: `web/app/api/proposta-usina/[token]/route.ts`

**Contexto:** espelha `/proposta/[token]`. A rota JSON usa `createAdminClient` (service-role) para ler por token+active sem sessão, monta os dados com `montarApresentacaoUsina` (buscando empresa e config da org do snapshot) e devolve `{ dados }`.

- [ ] **Step 1: Rota JSON pública**

```ts
// web/app/api/proposta-usina/[token]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data: apr } = await (supabase as any)
    .from('simulador_viabilidade_apresentacoes')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()
  if (!apr) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })

  const { data: org } = await (supabase as any)
    .from('org_config')
    .select('nome_fantasia, razao_social, cnpj, telefone, email, logo_url, cor_principal, cor_secundaria')
    .eq('organization_id', apr.organization_id)
    .maybeSingle()

  const empresa = {
    nome: (org?.nome_fantasia?.trim() || org?.razao_social?.trim() || 'Empresa') as string,
    cnpj: org?.cnpj ?? null, telefone: org?.telefone ?? null, email: org?.email ?? null,
    logoBase64: org?.logo_url ?? null,
  }
  const dados = montarApresentacaoUsina({
    input: apr.input, resultado: apr.resultado, empresa,
    clienteNome: apr.cliente_nome, clienteCidade: apr.cliente_cidade,
    concessionariaNome: apr.concessionaria_nome,
    modeloPainel: apr.modelo_painel ?? '', modeloInversor: apr.modelo_inversor ?? '',
    config: { cor_principal: org?.cor_principal ?? '#0a0e1a', cor_secundaria: org?.cor_secundaria ?? '#0a0e1a' },
  })
  return NextResponse.json({ dados })
}
```

- [ ] **Step 2: Página + view (client fetch, espelho de PropostaView)**

```tsx
// web/app/proposta-usina/[token]/page.tsx
export const metadata = { title: 'Proposta de Investimento' }
import PropostaUsinaView from './PropostaUsinaView'
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <PropostaUsinaView paramsPromise={params} />
}
```

```tsx
// web/app/proposta-usina/[token]/PropostaUsinaView.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { ApresentacaoUsina } from '@/components/apresentacao-usina/ApresentacaoUsina'
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'

export default function PropostaUsinaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [dados, setDados] = useState<ApresentacaoUsinaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/proposta-usina/${token}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Link inválido'); return r.json() })
      .then((d) => { setDados(d.dados); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [token])
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-500">Carregando sua proposta...</p></div>
  if (error || !dados) return <div className="min-h-screen flex items-center justify-center p-6"><div className="text-center"><div className="text-4xl mb-3">🔒</div><p className="text-sm text-gray-500">{error ?? 'Link inválido.'}</p></div></div>
  return <ApresentacaoUsina dados={dados} token={token} />
}
```

- [ ] **Step 3: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/app/proposta-usina web/app/api/proposta-usina/[token]/route.ts
git commit -m "feat(viabilidade): pagina publica e rota JSON da proposta de usina"
```

---

## Task 10: Rota de PDF

**Files:**
- Create: `web/app/api/proposta-usina/[token]/pdf/route.ts`

**Contexto:** espelha `/api/proposta/[token]/pdf/route.ts`, trocando a tabela lida, o caminho de cache no Storage e a URL alvo. Reusa `gerarPdfDaApresentacao` (que espera o seletor `.apr__card` — presente, pois reusamos os primitivos).

- [ ] **Step 1: Escrever a rota** (cópia adaptada da rota do CRM)

Copiar `web/app/api/proposta/[token]/pdf/route.ts` e alterar:
- ler de `simulador_viabilidade_apresentacoes` por `token`+`active`, selecionando `organization_id, id`;
- `const caminho = ` `${link.organization_id}/usina-${link.id}.pdf` ``;
- `const url = ` `${proto}://${host}/proposta-usina/${token}` ``;
- `guardPublicToken('proposta-usina-pdf')`.
Manter `maxDuration = 60`, o cache no bucket `proposals`, o tratamento de erro e os headers idênticos.

- [ ] **Step 2: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/proposta-usina/[token]/pdf/route.ts
git commit -m "feat(viabilidade): rota de PDF da proposta de usina"
```

---

## Task 11: Middleware + next.config (rota pública e tracing)

**Files:**
- Modify: `web/middleware.ts`
- Modify: `web/next.config.mjs`
- Test: `web/__tests__/apresentacao-usina-fiacao.test.ts`

- [ ] **Step 1: Teste de fiação (rota pública + tracing)**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
describe('fiação da proposta de usina', () => {
  it('middleware trata /proposta-usina como rota pública', () => {
    const src = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf-8')
    expect(src).toContain("'/proposta-usina'")
    expect(src).toContain("'/api/proposta-usina'")
  })
  it('next.config inclui o Chromium no bundle da rota de PDF', () => {
    const src = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf-8')
    expect(src).toContain('/api/proposta-usina/**')
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-fiacao.test.ts`
Expected: FAIL.

- [ ] **Step 3: Editar `middleware.ts`** — adicionar em `PUBLIC_ROUTES`, junto de `/proposta`:

```ts
  '/proposta',
  '/proposta-usina',
  '/api/proposta',
  '/api/proposta-usina',
```

- [ ] **Step 4: Editar `next.config.mjs`** — estender `outputFileTracingIncludes`:

```js
  outputFileTracingIncludes: {
    '/api/proposta/**': ['./node_modules/@sparticuz/chromium/**'],
    '/api/proposta-usina/**': ['./node_modules/@sparticuz/chromium/**'],
  },
```

- [ ] **Step 5: Rodar para ver passar**

Run: `cd web && ./node_modules/.bin/vitest run __tests__/apresentacao-usina-fiacao.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/middleware.ts web/next.config.mjs web/__tests__/apresentacao-usina-fiacao.test.ts
git commit -m "feat(viabilidade): rota publica e tracing do PDF de usina"
```

---

## Task 12: Server action `gerarPropostaUsina`

**Files:**
- Create: `web/lib/apresentacoes-usina/actions.ts`

**Contexto:** recebe o snapshot montado na tela (input serializável, resultado, cliente, concessionária, modelos), persiste na tabela com um token novo e devolve `{ token }`. Guard de plano via `requireSimuladoresOrg`. `input`/`resultado` já são objetos JSON-serializáveis.

- [ ] **Step 1: Implementar**

```ts
// web/lib/apresentacoes-usina/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { requireSimuladoresOrg } from '@/lib/simuladores/access'
import type { ViabilidadeInput, ViabilidadeResultado } from '@/lib/simuladores/viabilidade/types'
import type { ActionResult } from '@/lib/crm/types'

export async function gerarPropostaUsina(payload: {
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
}): Promise<ActionResult & { token?: string }> {
  const ctx = await requireSimuladoresOrg()
  if ('error' in ctx) return ctx

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('simulador_viabilidade_apresentacoes')
    .insert({
      organization_id: ctx.orgId,
      token,
      cliente_nome: payload.clienteNome,
      cliente_cidade: payload.clienteCidade,
      concessionaria_nome: payload.concessionariaNome,
      modelo_painel: payload.modeloPainel || null,
      modelo_inversor: payload.modeloInversor || null,
      input: payload.input,
      resultado: payload.resultado,
    })
  if (error) return { error: 'Erro ao gerar proposta: ' + error.message }
  return { success: 'Proposta gerada.', token }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/lib/apresentacoes-usina/actions.ts
git commit -m "feat(viabilidade): action gerarPropostaUsina"
```

---

## Task 13: Trocar "Gerar PDF" por "Gerar proposta" na tela

**Files:**
- Modify: `web/components/simuladores/SimuladorViabilidade.tsx`

**Contexto:** o botão "Gerar PDF" (que chamava `pdf()` → `gerarPropostaPdf`, jsPDF) passa a chamar `gerarPropostaUsina` e, no sucesso, mostrar o link (copiar + abrir). Remover o import e o uso de `gerarPropostaPdf`. Reaproveitar o `start`/`pending`/`msg` já existentes.

- [ ] **Step 1: Trocar o import**

Remover:
```tsx
import { gerarPropostaPdf } from '@/lib/simuladores/viabilidade/proposta-pdf'
```
Adicionar:
```tsx
import { gerarPropostaUsina } from '@/lib/apresentacoes-usina/actions'
```

- [ ] **Step 2: Substituir a função `pdf()` por `gerarProposta()` e um estado de link**

Adicionar estado perto dos outros `useState`:
```tsx
const [propostaUrl, setPropostaUrl] = useState<string | null>(null)
```
Substituir a função `pdf()`:
```tsx
  function gerarProposta() {
    if (!conc || !resultado || !input) return
    setPropostaUrl(null)
    start(async () => {
      const res = await gerarPropostaUsina({
        input, resultado,
        clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
        concessionariaNome: conc.nome, modeloPainel, modeloInversor,
      })
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      const url = `${window.location.origin}/proposta-usina/${res.token}`
      setPropostaUrl(url)
      setMsg({ text: 'Proposta gerada.', erro: false })
    })
  }
```

- [ ] **Step 3: Trocar o botão e mostrar o link**

Trocar o botão "Gerar PDF":
```tsx
<button onClick={gerarProposta} disabled={pending || !resultado} className="rounded border text-sm px-3 py-1.5">
  {pending ? 'Gerando...' : 'Gerar proposta'}
</button>
```
Logo abaixo dos botões, quando houver `propostaUrl`:
```tsx
{propostaUrl && (
  <div className="mt-2 text-xs break-all">
    <a href={propostaUrl} target="_blank" rel="noopener noreferrer" className="underline text-[#1a2340]">Abrir proposta</a>
    <button type="button" className="ml-3 underline" onClick={() => navigator.clipboard.writeText(propostaUrl)}>Copiar link</button>
  </div>
)}
```

- [ ] **Step 4: Verificar compilação + testes**

Run: `cd web && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run`
Expected: PASS. Se algum teste importava `proposta-pdf`, ele não deve mais — a função ficou órfã (mantida no arquivo, só não é mais chamada).

- [ ] **Step 5: Commit**

```bash
git add web/components/simuladores/SimuladorViabilidade.tsx
git commit -m "feat(viabilidade): Gerar proposta (link) no lugar de Gerar PDF"
```

---

## Task 14: Atualizar tipos gerados do banco

**Files:**
- Modify: `web/types/database.types.ts`

**Contexto:** só necessário para o typecheck reconhecer a tabela nova em consultas tipadas. As consultas usam `(supabase as any)`, então isto é opcional para compilar, mas recomendado para consistência. Adicionar a entrada `simulador_viabilidade_apresentacoes` com `Row`/`Insert`/`Update` espelhando as colunas da Task 1 (`input`/`resultado` como `Json`).

- [ ] **Step 1: Adicionar o bloco da tabela** seguindo o padrão de outra tabela do arquivo (copiar a forma de `simulador_concessionarias`, trocando colunas).

- [ ] **Step 2: Verificar compilação**

Run: `cd web && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/types/database.types.ts
git commit -m "chore(viabilidade): tipos da tabela de apresentacoes de usina"
```

---

## Task 15: Verificação final e revisão

- [ ] **Step 1: Suite completa + typecheck**

Run: `cd web && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run`
Expected: PASS (todos, incluindo os ~5 arquivos novos de teste).

- [ ] **Step 2: Smoke no navegador (dev server)** — logar numa org com Simuladores, abrir Viabilidade, gerar proposta, abrir o link, conferir os 10 blocos e o gráfico, testar "Baixar PDF".

- [ ] **Step 3: Revisão de código do conjunto** — usar `superpowers:requesting-code-review`.

- [ ] **Step 4: Finalizar** — `superpowers:finishing-a-development-branch`.

> **Deploy:** migration da Task 1 aplicada por Iago ANTES do push. O smoke do PDF só se confirma em produção (o Chromium serverless não roda no Windows do dev). "Baixar PDF" em dev usa o Chrome local.

---

## Notas de auto-revisão (checadas)

- **Cobertura do spec:** persistência (T1), tipos (T2), custos com O&M omitido documentado (T3), gráfico SVG (T4), montagem pura + golden (T5), segurança/vazamento (T6), reuso da BarraAcoes (T7), blocos+orquestrador (T8), rota pública+JSON (T9), PDF (T10), middleware+tracing (T11), action de persistir+link (T12), troca do botão na tela (T13), tipos do banco (T14), verificação (T15). Todos os itens do design têm task.
- **Consistência de tipos:** `montarApresentacaoUsina(SnapshotUsina)` usado igual em T5, T9; `gerarPropostaUsina(payload)` retorna `{ token }` usado em T13; `BarraAcoes` com `pdfEndpoint` (T7) consumido em T8.
- **O&M Acumulado:** decisão de omitir tomada por evidência numérica; custos = CAPEX + reestruturação + vida útil, como o PDF atual.
