# Apresentação Comercial — Fase 1 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a proposta por link (hoje uma página simples) na primeira versão da Apresentação Comercial Premium: sistema de blocos, dois temas e um template, sem depender de nenhum dado do módulo Simuladores.

**Architecture:** Três camadas separadas — dados (função pura), composição (template = blocos ordenados + tema) e componentes (um React por bloco). O tema é só um conjunto de CSS custom properties: troca o atributo `data-tema` no elemento raiz e a apresentação inteira muda de identidade, sem recompilar nada. Detalhamento em `docs/arquitetura/2026-07-20-apresentacoes-comerciais.md`.

**Tech Stack:** Next.js (App Router), React, TypeScript, CSS puro com custom properties, Supabase, Vitest.

**Escopo desta fase:**
- 6 blocos: Cover, Resumo Executivo, Sistema Proposto, Equipamentos, Condições Comerciais, Contato.
- 2 temas: Minimal White, Executive Black.
- 1 template: Premium.
- Configuração criada com valores padrão ao gerar o link.

**Fora de escopo (fases seguintes):** blocos de Economia e Comparativo (dependem de decisão comercial sobre Simuladores), exportação PDF via Chromium, seletor de blocos na UI, demais templates e temas, editor visual.

**Regra que não pode ser quebrada:** a rota `/api/proposta/[token]` é pública, sem login. Só pode devolver o que o tipo de saída expõe — nunca custo, margem, comissão, imposto, `preco_calculado` ou ajuste comercial.

---

## File Structure

**Criar:**
- `web/supabase/migrations/20260721000001_proposal_presentations.sql` — configuração da apresentação por proposta.
- `web/lib/apresentacoes/tipos.ts` — `BlocoId`, `TemaId`, `TemplateId`, `ApresentacaoData`, `ApresentacaoConfig`.
- `web/lib/apresentacoes/temas.ts` — catálogo de temas.
- `web/lib/apresentacoes/templates.ts` — catálogo de templates (quais blocos, em que ordem).
- `web/lib/apresentacoes/dados.ts` — `montarApresentacao()`, função pura.
- `web/components/apresentacao/tema.css` — variáveis de todos os temas.
- `web/components/apresentacao/primitivos/Indicador.tsx`
- `web/components/apresentacao/primitivos/Secao.tsx`
- `web/components/apresentacao/blocos/{Cover,Resumo,Sistema,Equipamentos,Condicoes,Contato}.tsx`
- `web/components/apresentacao/Apresentacao.tsx` — orquestrador.
- `web/__tests__/apresentacao-dados.test.ts`
- `web/__tests__/apresentacao-catalogo.test.ts`

**Modificar:**
- `web/app/api/proposta/[token]/route.ts` — devolver `{ dados, config }`.
- `web/app/proposta/[token]/PropostaView.tsx` — renderizar `<Apresentacao>`.
- `web/lib/proposals/link-actions.ts` — criar a configuração padrão ao gerar o link.

**Preservado sem alteração:** `web/lib/proposals/proposta-publica.ts` continua existindo e testado durante a transição; `montarApresentacao` é um superset. Remoção só quando a apresentação estiver validada.

---

## Task 1: Migration da configuração

**Files:**
- Create: `web/supabase/migrations/20260721000001_proposal_presentations.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Configuração da apresentação comercial de cada proposta.
-- Uma proposta tem no máximo uma configuração; ausente = padrões do código.
CREATE TABLE IF NOT EXISTS public.proposal_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'premium',
  tema text NOT NULL DEFAULT 'minimal-white',
  blocos jsonb NOT NULL DEFAULT '["cover","resumo","sistema","equipamentos","condicoes","contato"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_presentations_proposal
  ON public.proposal_presentations(proposal_id);

ALTER TABLE public.proposal_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage presentations"
  ON public.proposal_presentations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: NÃO aplicar em banco nenhum**

Quem aplica em produção é o Iago. Não usar ferramentas de Supabase para executar SQL.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/20260721000001_proposal_presentations.sql
git commit -m "feat(apresentacao): migration da configuracao da apresentacao"
```

---

## Task 2: Tipos e catálogos

**Files:**
- Create: `web/lib/apresentacoes/tipos.ts`
- Create: `web/lib/apresentacoes/temas.ts`
- Create: `web/lib/apresentacoes/templates.ts`
- Test: `web/__tests__/apresentacao-catalogo.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect } from 'vitest'
import { TEMAS, temaValido, TEMA_PADRAO } from '@/lib/apresentacoes/temas'
import { TEMPLATES, templateValido, TEMPLATE_PADRAO, blocosDoTemplate } from '@/lib/apresentacoes/templates'
import { BLOCOS_VALIDOS, normalizarConfig } from '@/lib/apresentacoes/tipos'

describe('catálogo de temas', () => {
  it('tem os dois temas da fase 1', () => {
    expect(Object.keys(TEMAS).sort()).toEqual(['executive-black', 'minimal-white'])
  })

  it('todo tema declara nome e cor de destaque', () => {
    for (const tema of Object.values(TEMAS)) {
      expect(tema.nome.length).toBeGreaterThan(0)
      expect(tema.corDestaque).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('valida ids de tema', () => {
    expect(temaValido('minimal-white')).toBe(true)
    expect(temaValido('rosa-choque')).toBe(false)
  })

  it('o tema padrão existe no catálogo', () => {
    expect(TEMAS[TEMA_PADRAO]).toBeDefined()
  })
})

describe('catálogo de templates', () => {
  it('tem o template premium', () => {
    expect(TEMPLATES['premium']).toBeDefined()
  })

  it('o template padrão existe', () => {
    expect(TEMPLATES[TEMPLATE_PADRAO]).toBeDefined()
  })

  it('premium usa os seis blocos da fase 1, nesta ordem', () => {
    expect(blocosDoTemplate('premium')).toEqual([
      'cover', 'resumo', 'sistema', 'equipamentos', 'condicoes', 'contato',
    ])
  })

  it('todo bloco de todo template é um bloco válido', () => {
    for (const id of Object.keys(TEMPLATES)) {
      for (const bloco of blocosDoTemplate(id as any)) {
        expect(BLOCOS_VALIDOS).toContain(bloco)
      }
    }
  })

  it('valida ids de template', () => {
    expect(templateValido('premium')).toBe(true)
    expect(templateValido('inexistente')).toBe(false)
  })
})

describe('normalizarConfig', () => {
  it('sem configuração, devolve os padrões', () => {
    const c = normalizarConfig(null)
    expect(c.template).toBe(TEMPLATE_PADRAO)
    expect(c.tema).toBe(TEMA_PADRAO)
    expect(c.blocos.length).toBeGreaterThan(0)
  })

  it('descarta tema inválido vindo do banco', () => {
    const c = normalizarConfig({ template: 'premium', tema: 'hackeado', blocos: ['cover'] })
    expect(c.tema).toBe(TEMA_PADRAO)
  })

  it('descarta template inválido vindo do banco', () => {
    const c = normalizarConfig({ template: 'xxx', tema: 'minimal-white', blocos: ['cover'] })
    expect(c.template).toBe(TEMPLATE_PADRAO)
  })

  it('filtra blocos desconhecidos e preserva a ordem dos válidos', () => {
    const c = normalizarConfig({
      template: 'premium',
      tema: 'minimal-white',
      blocos: ['contato', 'inventado', 'cover'],
    })
    expect(c.blocos).toEqual(['contato', 'cover'])
  })

  it('lista de blocos vazia cai para os blocos do template', () => {
    const c = normalizarConfig({ template: 'premium', tema: 'minimal-white', blocos: [] })
    expect(c.blocos).toEqual(blocosDoTemplate('premium'))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npx vitest run __tests__/apresentacao-catalogo.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Criar `web/lib/apresentacoes/tipos.ts`**

```ts
// web/lib/apresentacoes/tipos.ts

/** Blocos disponíveis na Fase 1. Novos blocos entram aqui primeiro. */
export const BLOCOS_VALIDOS = [
  'cover',
  'resumo',
  'sistema',
  'equipamentos',
  'condicoes',
  'contato',
] as const

export type BlocoId = (typeof BLOCOS_VALIDOS)[number]

export type ApresentacaoConfig = {
  template: string
  tema: string
  blocos: BlocoId[]
}

/** Dado exibido na apresentação. Tudo já formatado para leitura. */
export type ApresentacaoData = {
  titulo: string
  empresa: {
    nome: string
    cnpj: string | null
    telefone: string | null
    email: string | null
    cidade: string | null
    logo_url: string | null
  }
  cliente: { nome: string; cidade: string | null }
  sistema: {
    paineis: string
    inversores: string
    potencia_kwp: string
    geracao_mensal: string
  }
  equipamentos: {
    paineis: { marca: string; quantidade: string; potencia: string }
    inversores: { marca: string; quantidade: string; potencia: string }
  }
  investimento: { valor: string }
  datas: { emitida_em: string; valida_ate: string }
  tema: { cor_principal: string; cor_secundaria: string }
}

function ehBlocoValido(v: unknown): v is BlocoId {
  return typeof v === 'string' && (BLOCOS_VALIDOS as readonly string[]).includes(v)
}

/**
 * Sanitiza a configuração vinda do banco.
 *
 * O campo `blocos` é jsonb livre: pode conter bloco removido numa versão
 * anterior, ou valor inválido. Renderizar isso quebraria a página do cliente
 * final, então tudo que não é reconhecido é descartado.
 */
export function normalizarConfig(
  bruta: { template?: unknown; tema?: unknown; blocos?: unknown } | null
): ApresentacaoConfig {
  // Import tardio evita ciclo entre tipos/temas/templates.
  const { temaValido, TEMA_PADRAO } = require('./temas') as typeof import('./temas')
  const { templateValido, TEMPLATE_PADRAO, blocosDoTemplate } =
    require('./templates') as typeof import('./templates')

  const template =
    typeof bruta?.template === 'string' && templateValido(bruta.template)
      ? bruta.template
      : TEMPLATE_PADRAO

  const tema =
    typeof bruta?.tema === 'string' && temaValido(bruta.tema) ? bruta.tema : TEMA_PADRAO

  const brutos = Array.isArray(bruta?.blocos) ? bruta!.blocos : []
  const blocos = brutos.filter(ehBlocoValido)

  return {
    template,
    tema,
    blocos: blocos.length > 0 ? blocos : blocosDoTemplate(template),
  }
}
```

- [ ] **Step 4: Criar `web/lib/apresentacoes/temas.ts`**

```ts
// web/lib/apresentacoes/temas.ts

export type Tema = {
  id: string
  nome: string
  /** Cor usada na pré-visualização do tema na UI de seleção. */
  corDestaque: string
  /** true quando o tema é escuro — usado para escolher variantes de logo/ícone. */
  escuro: boolean
}

export const TEMAS: Record<string, Tema> = {
  'minimal-white': {
    id: 'minimal-white',
    nome: 'Minimal White',
    corDestaque: '#10B981',
    escuro: false,
  },
  'executive-black': {
    id: 'executive-black',
    nome: 'Executive Black',
    corDestaque: '#D4A017',
    escuro: true,
  },
}

export const TEMA_PADRAO = 'minimal-white'

export function temaValido(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMAS, id)
}
```

- [ ] **Step 5: Criar `web/lib/apresentacoes/templates.ts`**

```ts
// web/lib/apresentacoes/templates.ts
import { BLOCOS_VALIDOS, type BlocoId } from './tipos'

export type Template = {
  id: string
  nome: string
  descricao: string
  temaPadrao: string
  blocos: BlocoId[]
}

export const TEMPLATES: Record<string, Template> = {
  premium: {
    id: 'premium',
    nome: 'Premium',
    descricao: 'Apresentação completa, com indicadores em destaque.',
    temaPadrao: 'minimal-white',
    blocos: ['cover', 'resumo', 'sistema', 'equipamentos', 'condicoes', 'contato'],
  },
}

export const TEMPLATE_PADRAO = 'premium'

export function templateValido(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id)
}

export function blocosDoTemplate(id: string): BlocoId[] {
  return TEMPLATES[id]?.blocos ?? [...BLOCOS_VALIDOS]
}
```

- [ ] **Step 6: Rodar os testes**

Run: `cd web && npx vitest run __tests__/apresentacao-catalogo.test.ts`
Expected: PASS — 13 testes.

Se o `require` dentro de `normalizarConfig` causar problema no ambiente de teste, troque por imports estáticos no topo e mova `normalizarConfig` para `templates.ts` (que já importa `tipos.ts`), evitando o ciclo. Não deixe `require` se um import estático resolver.

- [ ] **Step 7: Commit**

```bash
git add web/lib/apresentacoes/ web/__tests__/apresentacao-catalogo.test.ts
git commit -m "feat(apresentacao): tipos, catalogo de temas e templates"
```

---

## Task 3: Montagem dos dados

**Files:**
- Create: `web/lib/apresentacoes/dados.ts`
- Test: `web/__tests__/apresentacao-dados.test.ts`

**Contexto:** `montarApresentacao` é um superset de `montarPropostaPublica` (`web/lib/proposals/proposta-publica.ts`) — leia esse arquivo antes. As diferenças: acrescenta `empresa.email`, `empresa.cidade` e o objeto `equipamentos` com marca/quantidade/potência separadas (o bloco Equipamentos precisa dos campos soltos, não da string pronta).

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect } from 'vitest'
import { montarApresentacao, type ApresentacaoRaw } from '@/lib/apresentacoes/dados'

function raw(over: Partial<ApresentacaoRaw> = {}): ApresentacaoRaw {
  return {
    proposta: {
      name: 'Proposta Residencial',
      panel_qty: 14,
      panel_power_w: 620,
      panel_brand_model: 'Osda MHDRZ',
      inverter_qty: 1,
      inverter_power_w: 8000,
      inverter_brand_model: 'Deye SUN8k',
      total_power_kwp: 8.68,
      monthly_generation_kwh: 1050,
      preco_final: 22000,
      gerado_em: '2026-07-20T12:00:00Z',
    },
    lead: { name: 'Marcílio', city: 'Palmas', phone: '63999998888' },
    org: {
      nome_fantasia: 'Integra Solar',
      razao_social: 'Integra Solar LTDA',
      cnpj: '12345678000199',
      telefone: '6332221111',
      email: 'contato@integrasolar.com.br',
      cidade: 'Palmas',
      cor_principal: '#10B981',
      cor_secundaria: '#1A3A5C',
      logo_url: 'https://exemplo/logo.png',
    },
    ...over,
  }
}

describe('montarApresentacao', () => {
  it('mantém o comportamento da proposta pública para os campos comuns', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.nome).toBe('Integra Solar')
    expect(a.cliente.nome).toBe('Marcílio')
    expect(a.sistema.potencia_kwp).toBe('8,68 kWp')
    expect(a.investimento.valor).toMatch(/^R\$\s*22\.000,00$/)
    expect(a.datas.emitida_em).toBe('20/07/2026')
    expect(a.datas.valida_ate).toBe('04/08/2026')
  })

  it('separa os equipamentos em marca, quantidade e potência', () => {
    const e = montarApresentacao(raw()).equipamentos
    expect(e.paineis).toEqual({ marca: 'Osda MHDRZ', quantidade: '14', potencia: '620 W' })
    expect(e.inversores).toEqual({ marca: 'Deye SUN8k', quantidade: '1', potencia: '8 kW' })
  })

  it('usa rótulo genérico quando a marca não foi informada', () => {
    const r = raw()
    r.proposta.panel_brand_model = null
    r.proposta.inverter_brand_model = '   '
    const e = montarApresentacao(r).equipamentos
    expect(e.paineis.marca).toBe('Painéis solares')
    expect(e.inversores.marca).toBe('Inversor')
  })

  it('expõe e-mail e cidade da empresa para o bloco de contato', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.email).toBe('contato@integrasolar.com.br')
    expect(a.empresa.cidade).toBe('Palmas')
  })

  it('tolera empresa sem e-mail e sem cidade', () => {
    const r = raw()
    r.org.email = null
    r.org.cidade = null
    const a = montarApresentacao(r)
    expect(a.empresa.email).toBeNull()
    expect(a.empresa.cidade).toBeNull()
  })

  it('cai nas cores padrão quando a empresa não configurou', () => {
    const r = raw()
    r.org.cor_principal = null
    r.org.cor_secundaria = null
    const t = montarApresentacao(r).tema
    expect(t.cor_principal).toBe('#10B981')
    expect(t.cor_secundaria).toBe('#1A3A5C')
  })

  it('não expõe nenhum campo de custo interno', () => {
    const a = montarApresentacao(raw())
    const serializado = JSON.stringify(a)
    for (const proibido of ['custo', 'margem', 'comissao', 'imposto', 'preco_calculado', 'ajuste']) {
      expect(serializado.toLowerCase()).not.toContain(proibido)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npx vitest run __tests__/apresentacao-dados.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `web/lib/apresentacoes/dados.ts`**

```ts
// web/lib/apresentacoes/dados.ts
import { format, addDays } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import type { ApresentacaoData } from './tipos'

const VALIDADE_DIAS = 15
const COR_PADRAO = '#10B981'
const COR_SECUNDARIA_PADRAO = '#1A3A5C'

export type ApresentacaoRaw = {
  proposta: {
    name: string | null
    panel_qty: number
    panel_power_w: number
    panel_brand_model: string | null
    inverter_qty: number
    inverter_power_w: number
    inverter_brand_model: string | null
    total_power_kwp: number
    monthly_generation_kwh: number
    preco_final: number
    gerado_em: string
  }
  lead: { name: string; city: string | null; phone: string | null }
  org: {
    nome_fantasia: string | null
    razao_social: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    cidade: string | null
    cor_principal: string | null
    cor_secundaria: string | null
    logo_url: string | null
  }
}

function nf(v: number, casas = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function montarApresentacao(raw: ApresentacaoRaw): ApresentacaoData {
  const { proposta, lead, org } = raw
  const emitida = new Date(proposta.gerado_em)

  const marcaPainel = proposta.panel_brand_model?.trim() || 'Painéis solares'
  const marcaInversor = proposta.inverter_brand_model?.trim() || 'Inversor'
  const potenciaPainel = `${nf(proposta.panel_power_w)} W`
  const potenciaInversor = `${nf(proposta.inverter_power_w / 1000)} kW`

  return {
    titulo: proposta.name?.trim() || 'Proposta Comercial',
    empresa: {
      nome: org.nome_fantasia?.trim() || org.razao_social?.trim() || 'Empresa',
      cnpj: org.cnpj,
      telefone: org.telefone,
      email: org.email,
      cidade: org.cidade,
      logo_url: org.logo_url,
    },
    cliente: { nome: lead.name, cidade: lead.city },
    sistema: {
      paineis: `${proposta.panel_qty}x ${marcaPainel} — ${potenciaPainel}`,
      inversores: `${proposta.inverter_qty}x ${marcaInversor} — ${potenciaInversor}`,
      potencia_kwp: `${nf(proposta.total_power_kwp, 2)} kWp`,
      geracao_mensal: `${nf(proposta.monthly_generation_kwh)} kWh/mês`,
    },
    equipamentos: {
      paineis: {
        marca: marcaPainel,
        quantidade: String(proposta.panel_qty),
        potencia: potenciaPainel,
      },
      inversores: {
        marca: marcaInversor,
        quantidade: String(proposta.inverter_qty),
        potencia: potenciaInversor,
      },
    },
    investimento: { valor: formatCurrency(proposta.preco_final) },
    datas: {
      emitida_em: format(emitida, 'dd/MM/yyyy'),
      valida_ate: format(addDays(emitida, VALIDADE_DIAS), 'dd/MM/yyyy'),
    },
    tema: {
      cor_principal: org.cor_principal?.trim() || COR_PADRAO,
      cor_secundaria: org.cor_secundaria?.trim() || COR_SECUNDARIA_PADRAO,
    },
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `cd web && npx vitest run __tests__/apresentacao-dados.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add web/lib/apresentacoes/dados.ts web/__tests__/apresentacao-dados.test.ts
git commit -m "feat(apresentacao): montagem dos dados da apresentacao"
```

---

## Task 4: Tema em CSS e primitivos

**Files:**
- Create: `web/components/apresentacao/tema.css`
- Create: `web/components/apresentacao/primitivos/Indicador.tsx`
- Create: `web/components/apresentacao/primitivos/Secao.tsx`

- [ ] **Step 1: Criar `tema.css`**

Todas as variáveis dos dois temas em um só arquivo. As cores da organização entram por `style` inline no elemento raiz e vencem as do tema (especificidade).

```css
/* web/components/apresentacao/tema.css */

.apr {
  --apr-fonte-titulo: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --apr-fonte-corpo: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --apr-raio: 20px;
  --apr-gap: 20px;
  --apr-pad-secao: 40px 28px;
  --apr-max-largura: 880px;

  font-family: var(--apr-fonte-corpo);
  background: var(--apr-fundo);
  color: var(--apr-texto);
  min-height: 100vh;
}

.apr[data-tema='minimal-white'] {
  --apr-fundo: #f7f8fa;
  --apr-superficie: #ffffff;
  --apr-texto: #14181f;
  --apr-texto-suave: #6b7480;
  --apr-borda: #e8ebef;
  --apr-destaque: #10b981;
  --apr-contraste: #1a3a5c;
  --apr-sombra: 0 1px 3px rgb(16 24 40 / 0.06), 0 8px 24px rgb(16 24 40 / 0.04);
}

.apr[data-tema='executive-black'] {
  --apr-fundo: #0b0d10;
  --apr-superficie: #14181d;
  --apr-texto: #f2f4f7;
  --apr-texto-suave: #98a2b3;
  --apr-borda: #23282f;
  --apr-destaque: #d4a017;
  --apr-contraste: #0b0d10;
  --apr-sombra: 0 1px 3px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.24);
}

.apr__wrap {
  max-width: var(--apr-max-largura);
  margin: 0 auto;
  padding: 24px 16px 56px;
  display: flex;
  flex-direction: column;
  gap: var(--apr-gap);
}

.apr__card {
  background: var(--apr-superficie);
  border: 1px solid var(--apr-borda);
  border-radius: var(--apr-raio);
  box-shadow: var(--apr-sombra);
  overflow: hidden;
}

.apr__secao-titulo {
  font-family: var(--apr-fonte-titulo);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--apr-texto-suave);
  margin-bottom: 16px;
}

.apr__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

/* Indicador: rótulo pequeno, número grande. */
.apr__ind {
  padding: 16px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--apr-destaque) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--apr-destaque) 16%, transparent);
}
.apr__ind-rotulo {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--apr-texto-suave);
}
.apr__ind-valor {
  font-family: var(--apr-fonte-titulo);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.15;
  margin-top: 4px;
  color: var(--apr-destaque);
}
.apr__ind-nota {
  font-size: 12px;
  color: var(--apr-texto-suave);
  margin-top: 2px;
}

@media (max-width: 480px) {
  .apr { --apr-pad-secao: 28px 18px; }
  .apr__ind-valor { font-size: 22px; }
}

/* Impressão: A4 limpo, sem sombra, sem fundo cinza, sem card partido ao meio. */
@media print {
  .apr { background: #fff; }
  .apr__wrap { max-width: none; padding: 0; gap: 12px; }
  .apr__card {
    box-shadow: none;
    border-color: #d9dde3;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .apr__ind { break-inside: avoid; }
}

@page {
  size: A4;
  margin: 14mm;
}
```

- [ ] **Step 2: Criar `primitivos/Indicador.tsx`**

```tsx
// web/components/apresentacao/primitivos/Indicador.tsx

export function Indicador({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string
  valor: string
  nota?: string | null
}) {
  return (
    <div className="apr__ind">
      <p className="apr__ind-rotulo">{rotulo}</p>
      <p className="apr__ind-valor">{valor}</p>
      {nota && <p className="apr__ind-nota">{nota}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Criar `primitivos/Secao.tsx`**

```tsx
// web/components/apresentacao/primitivos/Secao.tsx

export function Secao({
  titulo,
  children,
}: {
  titulo?: string
  children: React.ReactNode
}) {
  return (
    <section className="apr__card" style={{ padding: 'var(--apr-pad-secao)' }}>
      {titulo && <h2 className="apr__secao-titulo">{titulo}</h2>}
      {children}
    </section>
  )
}
```

- [ ] **Step 4: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add web/components/apresentacao/
git commit -m "feat(apresentacao): tema em CSS custom properties e primitivos"
```

---

## Task 5: Os seis blocos

**Files:**
- Create: `web/components/apresentacao/blocos/Cover.tsx`
- Create: `web/components/apresentacao/blocos/Resumo.tsx`
- Create: `web/components/apresentacao/blocos/Sistema.tsx`
- Create: `web/components/apresentacao/blocos/Equipamentos.tsx`
- Create: `web/components/apresentacao/blocos/Condicoes.tsx`
- Create: `web/components/apresentacao/blocos/Contato.tsx`

Todos recebem a mesma prop: `{ dados }: { dados: ApresentacaoData }`. Nenhum bloco busca dado, conhece rota ou recebe tema — o tema chega por CSS.

- [ ] **Step 1: Cover**

```tsx
// web/components/apresentacao/blocos/Cover.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'

export function Cover({ dados }: { dados: ApresentacaoData }) {
  return (
    <section
      className="apr__card"
      style={{
        padding: '48px 28px',
        background: 'var(--apr-contraste)',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      {dados.empresa.logo_url ? (
        <img
          src={dados.empresa.logo_url}
          alt={dados.empresa.nome}
          style={{ height: 44, objectFit: 'contain', margin: '0 auto 24px' }}
        />
      ) : (
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 24 }}>{dados.empresa.nome}</p>
      )}

      <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.65 }}>
        Proposta Comercial
      </p>
      <h1
        style={{
          fontFamily: 'var(--apr-fonte-titulo)',
          fontSize: 30,
          fontWeight: 700,
          margin: '10px 0 6px',
          lineHeight: 1.2,
        }}
      >
        {dados.cliente.nome}
      </h1>
      {dados.cliente.cidade && (
        <p style={{ fontSize: 14, opacity: 0.75 }}>{dados.cliente.cidade}</p>
      )}
      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 28 }}>
        Emitida em {dados.datas.emitida_em}
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Resumo**

```tsx
// web/components/apresentacao/blocos/Resumo.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Indicador } from '../primitivos/Indicador'

export function Resumo({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Resumo do projeto">
      <div className="apr__grid">
        <Indicador rotulo="Potência instalada" valor={dados.sistema.potencia_kwp} />
        <Indicador rotulo="Geração estimada" valor={dados.sistema.geracao_mensal} />
        <Indicador rotulo="Investimento" valor={dados.investimento.valor} />
      </div>
    </Secao>
  )
}
```

- [ ] **Step 3: Sistema**

```tsx
// web/components/apresentacao/blocos/Sistema.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid var(--apr-borda)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--apr-texto-suave)' }}>{rotulo}</span>
      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

export function Sistema({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Sistema proposto">
      <Linha rotulo="Painéis" valor={dados.sistema.paineis} />
      <Linha rotulo="Inversor" valor={dados.sistema.inversores} />
      <Linha rotulo="Potência total" valor={dados.sistema.potencia_kwp} />
      <Linha rotulo="Geração estimada" valor={dados.sistema.geracao_mensal} />
    </Secao>
  )
}
```

- [ ] **Step 4: Equipamentos**

```tsx
// web/components/apresentacao/blocos/Equipamentos.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

function CardEquip({
  titulo,
  marca,
  quantidade,
  potencia,
}: {
  titulo: string
  marca: string
  quantidade: string
  potencia: string
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        border: '1px solid var(--apr-borda)',
        background: 'var(--apr-fundo)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--apr-texto-suave)',
        }}
      >
        {titulo}
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 2px' }}>{marca}</p>
      <p style={{ fontSize: 13, color: 'var(--apr-texto-suave)' }}>
        {quantidade} un · {potencia}
      </p>
    </div>
  )
}

export function Equipamentos({ dados }: { dados: ApresentacaoData }) {
  const { paineis, inversores } = dados.equipamentos
  return (
    <Secao titulo="Equipamentos">
      <div className="apr__grid">
        <CardEquip
          titulo="Painéis"
          marca={paineis.marca}
          quantidade={paineis.quantidade}
          potencia={paineis.potencia}
        />
        <CardEquip
          titulo="Inversor"
          marca={inversores.marca}
          quantidade={inversores.quantidade}
          potencia={inversores.potencia}
        />
      </div>
    </Secao>
  )
}
```

- [ ] **Step 5: Condicoes**

```tsx
// web/components/apresentacao/blocos/Condicoes.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Condicoes({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Condições comerciais">
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)' }}>Investimento total</p>
        <p
          style={{
            fontFamily: 'var(--apr-fonte-titulo)',
            fontSize: 38,
            fontWeight: 700,
            color: 'var(--apr-destaque)',
            lineHeight: 1.1,
            margin: '6px 0',
          }}
        >
          {dados.investimento.valor}
        </p>
        <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)' }}>
          Proposta válida até {dados.datas.valida_ate}
        </p>
      </div>
    </Secao>
  )
}
```

- [ ] **Step 6: Contato**

```tsx
// web/components/apresentacao/blocos/Contato.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Contato({ dados }: { dados: ApresentacaoData }) {
  const { empresa } = dados
  const linhas = [
    empresa.telefone && { rotulo: 'Telefone', valor: empresa.telefone },
    empresa.email && { rotulo: 'E-mail', valor: empresa.email },
    empresa.cidade && { rotulo: 'Cidade', valor: empresa.cidade },
    empresa.cnpj && { rotulo: 'CNPJ', valor: empresa.cnpj },
  ].filter(Boolean) as { rotulo: string; valor: string }[]

  return (
    <Secao titulo="Fale com a gente">
      <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{empresa.nome}</p>
      <div className="apr__grid">
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--apr-texto-suave)' }}>
              {l.rotulo}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{l.valor}</p>
          </div>
        ))}
      </div>
    </Secao>
  )
}
```

- [ ] **Step 7: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 8: Commit**

```bash
git add web/components/apresentacao/blocos/
git commit -m "feat(apresentacao): seis blocos da fase 1"
```

---

## Task 6: Orquestrador

**Files:**
- Create: `web/components/apresentacao/Apresentacao.tsx`

- [ ] **Step 1: Implementar**

```tsx
// web/components/apresentacao/Apresentacao.tsx
import './tema.css'
import type { ApresentacaoData, ApresentacaoConfig, BlocoId } from '@/lib/apresentacoes/tipos'
import { Cover } from './blocos/Cover'
import { Resumo } from './blocos/Resumo'
import { Sistema } from './blocos/Sistema'
import { Equipamentos } from './blocos/Equipamentos'
import { Condicoes } from './blocos/Condicoes'
import { Contato } from './blocos/Contato'

const REGISTRO: Record<BlocoId, React.FC<{ dados: ApresentacaoData }>> = {
  cover: Cover,
  resumo: Resumo,
  sistema: Sistema,
  equipamentos: Equipamentos,
  condicoes: Condicoes,
  contato: Contato,
}

export function Apresentacao({
  dados,
  config,
}: {
  dados: ApresentacaoData
  config: ApresentacaoConfig
}) {
  return (
    <div
      className="apr"
      data-tema={config.tema}
      // Cores da organização vencem as do tema: identidade da empresa em primeiro lugar.
      style={
        {
          '--apr-destaque': dados.tema.cor_principal,
          '--apr-contraste': dados.tema.cor_secundaria,
        } as React.CSSProperties
      }
    >
      <div className="apr__wrap">
        {config.blocos.map((id) => {
          const Bloco = REGISTRO[id]
          // Bloco desconhecido não derruba a página do cliente final.
          if (!Bloco) return null
          return <Bloco key={id} dados={dados} />
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 3: Commit**

```bash
git add web/components/apresentacao/Apresentacao.tsx
git commit -m "feat(apresentacao): orquestrador de blocos"
```

---

## Task 7: Ligar na rota pública

**Files:**
- Modify: `web/app/api/proposta/[token]/route.ts`
- Modify: `web/app/proposta/[token]/PropostaView.tsx`
- Modify: `web/lib/proposals/link-actions.ts`

- [ ] **Step 1: API passa a devolver `{ dados, config }`**

Em `web/app/api/proposta/[token]/route.ts`:

1. Trocar o import de `montarPropostaPublica` por `montarApresentacao` de `@/lib/apresentacoes/dados`.
2. Acrescentar `email, cidade` ao `select` de `org_config` e repassá-los no objeto `org`.
3. Buscar a configuração:

```ts
const { data: cfg } = await (supabase as any)
  .from('proposal_presentations')
  .select('template, tema, blocos')
  .eq('proposal_id', link.proposal_id)
  .maybeSingle()
```

4. Devolver:

```ts
return NextResponse.json({
  dados: montarApresentacao({ /* ...igual ao que já existe, + email e cidade... */ }),
  config: normalizarConfig(cfg ?? null),
})
```

`normalizarConfig` vem de `@/lib/apresentacoes/tipos`. Proposta sem configuração cai nos padrões — nenhuma proposta existente quebra.

- [ ] **Step 2: View renderiza a apresentação**

Em `web/app/proposta/[token]/PropostaView.tsx`, trocar a marcação atual por:

```tsx
import { Apresentacao } from '@/components/apresentacao/Apresentacao'
import type { ApresentacaoData, ApresentacaoConfig } from '@/lib/apresentacoes/tipos'

type Resposta = { dados: ApresentacaoData; config: ApresentacaoConfig }
```

Manter exatamente os estados de carregando e erro que já existem. No sucesso:

```tsx
return <Apresentacao dados={resposta.dados} config={resposta.config} />
```

- [ ] **Step 3: Criar a configuração ao gerar o link**

Em `generateProposalLink` de `web/lib/proposals/link-actions.ts`, após inserir o link com sucesso:

```ts
// Configuração padrão da apresentação. onConflict evita duplicar quando o
// link é regerado para a mesma proposta.
await (supabase as any)
  .from('proposal_presentations')
  .upsert(
    { proposal_id: proposalId, organization_id: orgId },
    { onConflict: 'proposal_id' }
  )
```

Falha aqui não deve impedir a geração do link: sem configuração, `normalizarConfig` aplica os padrões. Não retorne erro por causa deste upsert.

- [ ] **Step 4: Verificar tipos e suíte**

Run: `cd web && npx tsc --noEmit && npx vitest run`
Expected: tsc sem saída; todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/proposta/ web/app/proposta/ web/lib/proposals/link-actions.ts
git commit -m "feat(apresentacao): rota publica passa a renderizar a apresentacao"
```

---

## Task 8: Verificação

- [ ] **Step 1: Migration aplicada?**

Confirmar com o Iago que `proposal_presentations` existe em produção. Sem ela, o `select` da configuração falha silenciosamente e cai nos padrões — a apresentação funciona, mas nada é persistido.

- [ ] **Step 2: Merge e deploy**

```bash
git checkout main
git merge --no-ff feat/apresentacao-fase-1 -m "merge: apresentacao comercial fase 1"
git push origin main
```

- [ ] **Step 3: Teste de ponta a ponta (com o Iago)**

1. Gerar link de uma proposta e abrir em aba anônima.
2. Conferir os seis blocos, na ordem, com dados corretos.
3. Conferir que as cores da empresa aparecem no destaque e na capa.
4. Abrir no celular.
5. Ctrl+P: conferir A4, sem card partido ao meio, sem fundo cinza.
6. Trocar o tema no banco para `executive-black` e recarregar — deve mudar por completo sem tocar em código:

```sql
update public.proposal_presentations
set tema = 'executive-black'
where proposal_id = '<id-da-proposta>';
```

- [ ] **Step 4: Registrar o que ficou para a Fase 2**

Blocos de Economia e Comparativo dependem da decisão comercial sobre o módulo Simuladores (seção 8.2 do documento de arquitetura).
