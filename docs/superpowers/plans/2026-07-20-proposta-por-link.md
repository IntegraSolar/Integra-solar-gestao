# Proposta por Link — Fase 1 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a proposta comercial como uma página web em link público, eliminando a dependência de conversão DOCX→PDF (ConvertAPI, hoje fora do ar por créditos esgotados).

**Architecture:** Segue o padrão de link público já usado pelo Portal do Cliente: tabela com token, rota pública `/proposta/[token]` que consome uma API própria, e dados servidos pelo admin client com `guardPublicToken`. O layout é HTML/CSS nosso, já pintado com `org_config.cor_principal` e `logo_url` — não há conversão de formato em lugar nenhum.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + Storage), TypeScript, Vitest.

**Escopo desta fase:** link funcionando com layout padrão, personalizado por logo e cores que a empresa já cadastrou. Textos editáveis e liga/desliga de seções ficam para a Fase 2 (plano próprio).

**Fora de escopo:** geração de PDF (decisão: só link), remoção do fluxo DOCX/ConvertAPI (fica convivendo até o link ser validado em produção).

---

## File Structure

**Criar:**
- `web/supabase/migrations/20260720000002_proposal_links.sql` — tabela `proposal_links`.
- `web/lib/proposals/proposta-publica.ts` — função pura que monta o conteúdo da proposta a partir dos dados crus. Todo o cálculo/formatação testável vive aqui.
- `web/lib/proposals/link-actions.ts` — server actions: gerar e revogar o link.
- `web/app/api/proposta/[token]/route.ts` — API pública que devolve o JSON da proposta.
- `web/app/proposta/[token]/page.tsx` — rota pública (server component fino).
- `web/app/proposta/[token]/PropostaView.tsx` — o layout em si.
- `web/__tests__/proposta-publica.test.ts` — testes da função pura.

**Modificar:**
- `web/components/crm/ProposalsList.tsx` — botão "Gerar link" e "Copiar link" na lista de propostas.

**Por que assim:** a montagem do conteúdo fica isolada em `proposta-publica.ts` para ser testável sem banco nem rede; a rota e a view só consomem. Mesmo desenho que `lib/financeiro/totais.ts` usa hoje.

---

## Task 1: Migration da tabela de links

**Files:**
- Create: `web/supabase/migrations/20260720000002_proposal_links.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Link público da proposta comercial. Mesmo padrão de client_portal_links.
CREATE TABLE IF NOT EXISTS public.proposal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_links_token ON public.proposal_links(token);
CREATE INDEX IF NOT EXISTS idx_proposal_links_proposal ON public.proposal_links(proposal_id);

ALTER TABLE public.proposal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage proposal links"
  ON public.proposal_links FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/20260720000002_proposal_links.sql
git commit -m "feat(proposta): migration da tabela proposal_links"
```

- [ ] **Step 3: Entregar a migration para o Iago aplicar**

Não aplicar em produção — quem aplica é o Iago (ver memória `deploy-e-migrations`). Avisar que a migration está pronta e qual o caminho do arquivo.

---

## Task 2: Função pura que monta o conteúdo da proposta

**Files:**
- Create: `web/lib/proposals/proposta-publica.ts`
- Test: `web/__tests__/proposta-publica.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect } from 'vitest'
import { montarPropostaPublica, type PropostaRaw } from '@/lib/proposals/proposta-publica'

function raw(over: Partial<PropostaRaw> = {}): PropostaRaw {
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
      cor_principal: '#10B981',
      cor_secundaria: '#1A3A5C',
      logo_url: 'https://exemplo/logo.png',
    },
    ...over,
  }
}

describe('montarPropostaPublica', () => {
  it('usa o nome fantasia da empresa quando existe', () => {
    expect(montarPropostaPublica(raw()).empresa.nome).toBe('Integra Solar')
  })

  it('cai para a razão social quando não há nome fantasia', () => {
    const r = raw()
    r.org.nome_fantasia = null
    expect(montarPropostaPublica(r).empresa.nome).toBe('Integra Solar LTDA')
  })

  it('formata o investimento em reais', () => {
    // formatCurrency usa Intl, que separa "R$" do número com espaço não-quebrável
    // (U+00A0). Comparar com espaço comum falha com mensagem visualmente idêntica.
    expect(montarPropostaPublica(raw()).investimento.valor).toMatch(/^R\$\s*22\.000,00$/)
  })

  it('descreve os painéis com quantidade, potência e marca', () => {
    const s = montarPropostaPublica(raw()).sistema
    expect(s.paineis).toBe('14x Osda MHDRZ — 620 W')
  })

  it('descreve o inversor convertendo W para kW', () => {
    const s = montarPropostaPublica(raw()).sistema
    expect(s.inversores).toBe('1x Deye SUN8k — 8 kW')
  })

  it('omite a marca quando não informada', () => {
    const r = raw()
    r.proposta.panel_brand_model = null
    expect(montarPropostaPublica(r).sistema.paineis).toBe('14x painéis — 620 W')
  })

  it('mostra potência total e geração estimada', () => {
    const s = montarPropostaPublica(raw()).sistema
    expect(s.potencia_kwp).toBe('8,68 kWp')
    expect(s.geracao_mensal).toBe('1.050 kWh/mês')
  })

  it('calcula validade de 15 dias a partir da geração', () => {
    const p = montarPropostaPublica(raw())
    expect(p.datas.emitida_em).toBe('20/07/2026')
    expect(p.datas.valida_ate).toBe('04/08/2026')
  })

  it('usa as cores da empresa e cai no padrão quando ausentes', () => {
    expect(montarPropostaPublica(raw()).tema.cor_principal).toBe('#10B981')
    const r = raw()
    r.org.cor_principal = null
    expect(montarPropostaPublica(r).tema.cor_principal).toBe('#10B981')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd web && npx vitest run __tests__/proposta-publica.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/proposals/proposta-publica'"

- [ ] **Step 3: Implementar**

```ts
// web/lib/proposals/proposta-publica.ts
import { format, addDays } from 'date-fns'
import { formatCurrency } from '@/lib/format'

const VALIDADE_DIAS = 15
const COR_PADRAO = '#10B981'
const COR_SECUNDARIA_PADRAO = '#1A3A5C'

export type PropostaRaw = {
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
    cor_principal: string | null
    cor_secundaria: string | null
    logo_url: string | null
  }
}

export type PropostaPublica = {
  titulo: string
  empresa: { nome: string; cnpj: string | null; telefone: string | null; logo_url: string | null }
  cliente: { nome: string; cidade: string | null }
  sistema: {
    paineis: string
    inversores: string
    potencia_kwp: string
    geracao_mensal: string
  }
  investimento: { valor: string }
  datas: { emitida_em: string; valida_ate: string }
  tema: { cor_principal: string; cor_secundaria: string }
}

function nf(v: number, casas = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function montarPropostaPublica(raw: PropostaRaw): PropostaPublica {
  const { proposta, lead, org } = raw
  const emitida = new Date(proposta.gerado_em)

  const marcaPainel = proposta.panel_brand_model?.trim() || 'painéis'
  const marcaInversor = proposta.inverter_brand_model?.trim() || 'inversor'

  return {
    titulo: proposta.name?.trim() || 'Proposta Comercial',
    empresa: {
      nome: org.nome_fantasia?.trim() || org.razao_social?.trim() || 'Empresa',
      cnpj: org.cnpj,
      telefone: org.telefone,
      logo_url: org.logo_url,
    },
    cliente: { nome: lead.name, cidade: lead.city },
    sistema: {
      paineis: `${proposta.panel_qty}x ${marcaPainel} — ${nf(proposta.panel_power_w)} W`,
      inversores: `${proposta.inverter_qty}x ${marcaInversor} — ${nf(proposta.inverter_power_w / 1000)} kW`,
      potencia_kwp: `${nf(proposta.total_power_kwp, 2)} kWp`,
      geracao_mensal: `${nf(proposta.monthly_generation_kwh)} kWh/mês`,
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

- [ ] **Step 4: Rodar e ver passar**

Run: `cd web && npx vitest run __tests__/proposta-publica.test.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add web/lib/proposals/proposta-publica.ts web/__tests__/proposta-publica.test.ts
git commit -m "feat(proposta): funcao pura que monta o conteudo da proposta publica"
```

---

## Task 3: Server actions de gerar e revogar link

**Files:**
- Create: `web/lib/proposals/link-actions.ts`

- [ ] **Step 1: Implementar**

Espelha `web/lib/clients/portal-actions.ts` (mesmo padrão de token e revogação do anterior).

```ts
// web/lib/proposals/link-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function getProposalLink(proposalId: string): Promise<{ token: string } | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('proposal_links')
    .select('token')
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

export async function generateProposalLink(
  proposalId: string
): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Invalida o link anterior: um link ativo por proposta.
  await (supabase as any)
    .from('proposal_links')
    .update({ active: false })
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  const { error } = await (supabase as any)
    .from('proposal_links')
    .insert({ proposal_id: proposalId, organization_id: orgId, token })

  if (error) return { error: 'Erro ao gerar link: ' + error.message }

  revalidatePath('/leads')
  return { success: 'Link gerado.', token }
}

export async function revokeProposalLink(proposalId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('proposal_links')
    .update({ active: false })
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)

  if (error) return { error: 'Erro ao revogar link: ' + error.message }

  revalidatePath('/leads')
  return { success: 'Link revogado.' }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 3: Commit**

```bash
git add web/lib/proposals/link-actions.ts
git commit -m "feat(proposta): actions de gerar e revogar link publico"
```

---

## Task 4: API pública da proposta

**Files:**
- Create: `web/app/api/proposta/[token]/route.ts`

- [ ] **Step 1: Implementar**

Espelha `web/app/api/cliente/[token]/route.ts`: admin client + `guardPublicToken`.

```ts
import { NextResponse } from 'next/server'
import { guardPublicToken } from '@/lib/security/rate-policies'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarPropostaPublica } from '@/lib/proposals/proposta-publica'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const blocked = await guardPublicToken('proposta')
  if (blocked) return blocked

  const supabase = createAdminClient()

  const { data: link } = await (supabase as any)
    .from('proposal_links')
    .select('proposal_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const { data: proposta } = await (supabase as any)
    .from('proposals')
    .select(`
      name, panel_qty:total_modules, panel_power_w:module_power_wp, panel_brand_model,
      inverter_qty:total_inverters, inverter_power_w, inverter_brand_model,
      total_power_kwp, monthly_generation_kwh, preco_final, preco_total, gerado_em, lead_id
    `)
    .eq('id', link.proposal_id)
    .eq('organization_id', link.organization_id)
    .maybeSingle()

  if (!proposta) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  const [{ data: lead }, { data: org }] = await Promise.all([
    (supabase as any).from('leads').select('name, city, phone').eq('id', proposta.lead_id).maybeSingle(),
    (supabase as any)
      .from('org_config')
      .select('nome_fantasia, razao_social, cnpj, telefone, cor_principal, cor_secundaria, logo_url')
      .eq('organization_id', link.organization_id)
      .maybeSingle(),
  ])

  if (!lead) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  return NextResponse.json(
    montarPropostaPublica({
      proposta: {
        name: proposta.name,
        panel_qty: proposta.panel_qty ?? 0,
        panel_power_w: proposta.panel_power_w ?? 0,
        panel_brand_model: proposta.panel_brand_model,
        inverter_qty: proposta.inverter_qty ?? 0,
        inverter_power_w: proposta.inverter_power_w ?? 0,
        inverter_brand_model: proposta.inverter_brand_model,
        total_power_kwp: Number(proposta.total_power_kwp ?? 0),
        monthly_generation_kwh: Number(proposta.monthly_generation_kwh ?? 0),
        preco_final: Number(proposta.preco_final ?? proposta.preco_total ?? 0),
        gerado_em: proposta.gerado_em ?? new Date().toISOString(),
      },
      lead: { name: lead.name, city: lead.city, phone: lead.phone },
      org: {
        nome_fantasia: org?.nome_fantasia ?? null,
        razao_social: org?.razao_social ?? null,
        cnpj: org?.cnpj ?? null,
        telefone: org?.telefone ?? null,
        cor_principal: org?.cor_principal ?? null,
        cor_secundaria: org?.cor_secundaria ?? null,
        logo_url: org?.logo_url ?? null,
      },
    })
  )
}
```

- [ ] **Step 2: Confirmar o nome do rate policy**

Run: `grep -n "guardPublicToken" -A 10 web/lib/security/rate-policies.ts`
Se `'proposta'` não for uma chave aceita, adicionar seguindo o padrão de `'cliente'`.

- [ ] **Step 3: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/proposta/
git commit -m "feat(proposta): API publica da proposta por token"
```

---

## Task 5: Página pública

**Files:**
- Create: `web/app/proposta/[token]/page.tsx`
- Create: `web/app/proposta/[token]/PropostaView.tsx`

- [ ] **Step 1: Criar a page**

```tsx
// web/app/proposta/[token]/page.tsx
export const metadata = { title: 'Proposta Comercial' }
import PropostaView from './PropostaView'

export default async function PropostaPage({ params }: { params: Promise<{ token: string }> }) {
  return <PropostaView paramsPromise={params} />
}
```

- [ ] **Step 2: Criar a view**

Layout claro (fundo branco), pensado para celular primeiro, com `@media print` para quem quiser imprimir pelo navegador.

```tsx
// web/app/proposta/[token]/PropostaView.tsx
'use client'

import { use, useEffect, useState } from 'react'
import type { PropostaPublica } from '@/lib/proposals/proposta-publica'

export default function PropostaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<PropostaPublica | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/proposta/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Link inválido')
        return r.json()
      })
      .then(setData)
      .catch((e) => setErro(e.message))
  }, [token])

  if (erro) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500 text-sm">{erro}</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-400 text-sm">Carregando proposta...</p>
      </main>
    )
  }

  const { tema } = data

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
        <header className="px-6 py-5 text-white" style={{ background: tema.cor_secundaria }}>
          {data.empresa.logo_url && (
            <img src={data.empresa.logo_url} alt={data.empresa.nome} className="h-10 mb-3 object-contain" />
          )}
          <h1 className="text-lg font-bold">{data.titulo}</h1>
          <p className="text-sm opacity-80">{data.empresa.nome}</p>
        </header>

        <section className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Preparada para</p>
          <p className="text-base font-semibold text-gray-800">{data.cliente.nome}</p>
          {data.cliente.cidade && <p className="text-sm text-gray-500">{data.cliente.cidade}</p>}
        </section>

        <section className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Sistema proposto</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Painéis</dt>
              <dd className="text-gray-800 text-right font-medium">{data.sistema.paineis}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Inversor</dt>
              <dd className="text-gray-800 text-right font-medium">{data.sistema.inversores}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Potência total</dt>
              <dd className="text-gray-800 text-right font-medium">{data.sistema.potencia_kwp}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Geração estimada</dt>
              <dd className="text-gray-800 text-right font-medium">{data.sistema.geracao_mensal}</dd>
            </div>
          </dl>
        </section>

        <section className="px-6 py-6 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Investimento</p>
          <p className="text-3xl font-bold" style={{ color: tema.cor_principal }}>
            {data.investimento.valor}
          </p>
        </section>

        <footer className="px-6 py-4 bg-gray-50 text-xs text-gray-500 flex flex-wrap justify-between gap-2 print:bg-white">
          <span>Emitida em {data.datas.emitida_em} · válida até {data.datas.valida_ate}</span>
          {data.empresa.telefone && <span>{data.empresa.telefone}</span>}
        </footer>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add web/app/proposta/
git commit -m "feat(proposta): pagina publica da proposta"
```

---

## Task 6: Botão de gerar/copiar link no CRM

**Files:**
- Modify: `web/components/crm/ProposalsList.tsx`

- [ ] **Step 1: Ler o arquivo e localizar o bloco de ações da proposta**

Run: `grep -n "pdf_url\|Editar Orçamento\|secureStorageUrl" web/components/crm/ProposalsList.tsx`

Manter o botão de PDF existente (fluxo antigo convive até o link ser validado) e acrescentar as ações de link ao lado.

- [ ] **Step 2: Importar as actions**

```tsx
import { generateProposalLink, getProposalLink } from '@/lib/proposals/link-actions'
```

- [ ] **Step 3: Acrescentar estado e handler no componente da lista**

```tsx
const [linkPorProposta, setLinkPorProposta] = useState<Record<string, string>>({})
const [gerandoLink, setGerandoLink] = useState<string | null>(null)

async function handleGerarLink(proposalId: string) {
  setGerandoLink(proposalId)
  const r = await generateProposalLink(proposalId)
  if (r.token) setLinkPorProposta((prev) => ({ ...prev, [proposalId]: r.token! }))
  setGerandoLink(null)
}
```

- [ ] **Step 4: Acrescentar os botões na linha da proposta**

```tsx
{linkPorProposta[p.id] ? (
  <button
    type="button"
    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/proposta/${linkPorProposta[p.id]}`)}
    className="text-xs px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400"
  >
    Copiar link
  </button>
) : (
  <button
    type="button"
    onClick={() => handleGerarLink(p.id)}
    disabled={gerandoLink === p.id}
    className="text-xs px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400 disabled:opacity-50"
  >
    {gerandoLink === p.id ? 'Gerando...' : 'Gerar link'}
  </button>
)}
```

- [ ] **Step 5: Verificar tipos e testes**

Run: `cd web && npx tsc --noEmit && npx vitest run`
Expected: tsc sem saída; todos os testes passando.

- [ ] **Step 6: Commit**

```bash
git add web/components/crm/ProposalsList.tsx
git commit -m "feat(proposta): botao de gerar e copiar link na lista de propostas"
```

---

## Task 7: Verificação em produção

- [ ] **Step 1: Confirmar que a migration foi aplicada**

Perguntar ao Iago. Sem a tabela `proposal_links`, gerar link retorna erro — não há fallback.

- [ ] **Step 2: Merge e deploy**

```bash
git checkout main
git merge --no-ff feat/proposta-por-link -m "merge: proposta comercial por link publico"
git push origin main
```

- [ ] **Step 3: Teste de ponta a ponta (com o Iago)**

1. Abrir uma proposta no CRM → "Gerar link" → "Copiar link".
2. Abrir o link numa aba anônima (sem sessão) e conferir: logo, cores, dados do cliente, sistema, investimento e validade.
3. Abrir no celular.
4. Ctrl+P e conferir que a impressão sai limpa.
5. Gerar o link de novo e confirmar que o anterior deixa de funcionar.

---

## Fase 2 (plano à parte)

Personalização por empresa: textos de abertura e encerramento, quais seções aparecem, e possivelmente condições comerciais. Depende de decisões de produto que só fazem sentido depois de ver a Fase 1 rodando com dados reais.

Também fica para depois a decisão sobre o fluxo DOCX/ConvertAPI: manter como alternativa, ou remover de vez junto com os 14 templates.
