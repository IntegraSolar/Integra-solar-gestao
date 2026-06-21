# Módulo de Geração de Propostas em PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário gere propostas comerciais em PDF a partir de templates Word (.docx) com precificação automática, histórico por lead e gestão de templates nas Configurações.

**Architecture:** Next.js API Route orquestra a geração: busca proposta + lead + org_config, calcula preços via pricing engine, substitui placeholders no .docx com docxtemplater, converte para PDF via ConvertAPI, salva no Supabase Storage e retorna URL para download. Templates são gerenciados numa aba nova nas Configurações.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Storage), docxtemplater, pizzip, ConvertAPI (free tier), Zod

---

## File Map

**Novos arquivos:**
- `web/lib/proposals/pricing.ts` — função `calcularPreco(proposal, orgConfig)` → breakdown de custos
- `web/lib/proposals/placeholders.ts` — função `buildPlaceholders(proposal, lead, org)` → objeto com todos os `{{placeholders}}`
- `web/lib/proposals/templates.ts` — queries server-side para `proposal_templates`
- `web/lib/proposals/actions.ts` — server actions: upload template, delete template, salvar campos financeiros
- `web/app/api/proposals/[id]/generate/route.ts` — API Route POST: gera DOCX → PDF → retorna como download
- `web/app/(dashboard)/configuracoes/TemplatesTab.tsx` — UI de gerenciamento de templates
- `web/components/crm/ProposalPricingReview.tsx` — tela de revisão de preço + seleção de template + botão gerar

**Arquivos modificados:**
- `web/lib/crm/types.ts` — adicionar campos financeiros em `Proposal`, adicionar tipo `ProposalTemplate`
- `web/lib/crm/queries.ts` — atualizar `getProposalsByLead` para incluir novos campos
- `web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx` — adicionar aba "Templates"
- `web/components/crm/ProposalsList.tsx` — adicionar botão "Gerar PDF" e link de download

---

## Task 1: Instalar dependências

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Instalar docxtemplater, pizzip e @types/pizzip**

No terminal, dentro da pasta `web/`:

```bash
cd web && npm install docxtemplater pizzip
npm install --save-dev @types/pizzip
```

- [ ] **Step 2: Verificar instalação**

```bash
node -e "require('docxtemplater'); require('pizzip'); console.log('OK')"
```

Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore: install docxtemplater and pizzip"
```

---

## Task 2: Migração do banco de dados

**Files:**
- Create: `supabase/migrations/20260618_proposal_templates.sql`

- [ ] **Step 1: Criar arquivo de migração**

Criar `supabase/migrations/20260618_proposal_templates.sql`:

```sql
-- Tabela de templates de proposta
CREATE TABLE IF NOT EXISTS proposal_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text,
  file_path    text NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_templates_org_isolation" ON proposal_templates
  USING (org_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Extensões na tabela proposals existente
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS template_id       uuid REFERENCES proposal_templates(id),
  ADD COLUMN IF NOT EXISTS preco_total       numeric,
  ADD COLUMN IF NOT EXISTS custo_kit         numeric,
  ADD COLUMN IF NOT EXISTS custo_projeto     numeric,
  ADD COLUMN IF NOT EXISTS custo_instalacao  numeric,
  ADD COLUMN IF NOT EXISTS custo_km          numeric,
  ADD COLUMN IF NOT EXISTS custo_ca          numeric,
  ADD COLUMN IF NOT EXISTS valor_entrada      numeric,
  ADD COLUMN IF NOT EXISTS valor_parcelas     numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas       integer,
  ADD COLUMN IF NOT EXISTS pdf_url            text,
  ADD COLUMN IF NOT EXISTS docx_url           text,
  ADD COLUMN IF NOT EXISTS gerado_em          timestamptz;
```

- [ ] **Step 2: Aplicar migração no Supabase**

Abra o Supabase Studio → SQL Editor, cole o conteúdo do arquivo e execute.

Ou via CLI:
```bash
supabase db push
```

- [ ] **Step 3: Criar buckets no Supabase Storage**

No Supabase Studio → Storage → New bucket:

1. Nome: `proposal-templates` → Marcar como **Private**
2. Nome: `proposals` → Marcar como **Public**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260618_proposal_templates.sql
git commit -m "feat: add proposal_templates table and proposals financial columns"
```

---

## Task 3: Atualizar tipos TypeScript

**Files:**
- Modify: `web/lib/crm/types.ts`

- [ ] **Step 1: Adicionar ProposalTemplate e campos financeiros em Proposal**

Abrir `web/lib/crm/types.ts` e adicionar após o tipo `Supplier`:

```typescript
export type ProposalTemplate = {
  id: string
  org_id: string
  name: string
  category: string | null
  file_path: string
  is_default: boolean
  is_active: boolean
  created_at: string
}
```

E substituir o tipo `Proposal` existente por:

```typescript
export type Proposal = {
  id: string
  lead_id: string | null
  name: string
  panel_qty: number
  panel_power_w: number
  panel_brand_model: string | null
  inverter_qty: number
  inverter_power_w: number
  inverter_brand_model: string | null
  kit_value: number
  total_power_kwp: number
  monthly_generation_kwh: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  supplier: Supplier | null
  // Campos financeiros
  template_id: string | null
  preco_total: number | null
  custo_kit: number | null
  custo_projeto: number | null
  custo_instalacao: number | null
  custo_km: number | null
  custo_ca: number | null
  valor_entrada: number | null
  valor_parcelas: number | null
  num_parcelas: number | null
  pdf_url: string | null
  docx_url: string | null
  gerado_em: string | null
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros relacionados a `Proposal` ou `ProposalTemplate`.

- [ ] **Step 3: Commit**

```bash
git add web/lib/crm/types.ts
git commit -m "feat: add ProposalTemplate type and financial fields to Proposal"
```

---

## Task 4: Motor de precificação

**Files:**
- Create: `web/lib/proposals/pricing.ts`

- [ ] **Step 1: Criar o arquivo**

Criar `web/lib/proposals/pricing.ts`:

```typescript
import type { OrgConfig } from '@/lib/configuracoes/queries'

export type PricingBreakdown = {
  custo_kit: number
  custo_projeto: number
  custo_instalacao: number
  custo_km: number
  custo_ca: number
  soma_custos: number
  preco_total: number
}

export type PricingInput = {
  kit_value: number       // valor do kit em R$
  total_power_kwp: number // kWp do sistema
  panel_qty: number       // quantidade de painéis
}

export function calcularPreco(
  input: PricingInput,
  config: OrgConfig
): PricingBreakdown {
  const {
    kit_value,
    total_power_kwp,
    panel_qty,
  } = input

  const pct_imposto   = config.pct_imposto   ?? 0
  const pct_margem    = config.pct_margem    ?? 0
  const pct_comissao  = config.pct_comissao  ?? 0
  const pct_ca        = config.pct_material_ca ?? 0

  const valor_projeto_por_kwp    = config.valor_projeto_por_kwp    ?? 0
  const valor_instalacao_por_placa = config.valor_instalacao_por_placa ?? 0

  const divisor = 1 - pct_imposto - pct_margem - pct_comissao

  const custo_kit       = kit_value
  const custo_projeto   = total_power_kwp * valor_projeto_por_kwp
  const custo_instalacao = panel_qty * valor_instalacao_por_placa
  // quilometragem: sem taxa por km configurada, registra como 0
  const custo_km        = 0
  const custo_ca        = kit_value * pct_ca

  const soma_custos = custo_kit + custo_projeto + custo_instalacao + custo_km + custo_ca

  // Evitar divisão por zero
  const preco_total = divisor > 0 ? soma_custos / divisor : soma_custos

  return {
    custo_kit,
    custo_projeto,
    custo_instalacao,
    custo_km,
    custo_ca,
    soma_custos,
    preco_total,
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros em `pricing.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/lib/proposals/pricing.ts
git commit -m "feat: add proposal pricing engine"
```

---

## Task 5: Builder de placeholders

**Files:**
- Create: `web/lib/proposals/placeholders.ts`

- [ ] **Step 1: Criar o arquivo**

Criar `web/lib/proposals/placeholders.ts`:

```typescript
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, formatPhone } from '@/lib/format'

export type PlaceholderData = {
  // Lead
  cliente_nome: string
  cliente_cidade: string
  cliente_telefone: string
  // Empresa
  empresa_nome: string
  empresa_cnpj: string
  empresa_telefone: string
  // Sistema
  paineis_qtd: string
  paineis_potencia: string
  paineis_marca: string
  inversor_qtd: string
  inversor_potencia: string
  inversor_marca: string
  total_kwp: string
  geracao_mensal: string
  // Preços
  preco_total: string
  valor_entrada: string
  num_parcelas: string
  valor_parcelas: string
  // Datas
  data_proposta: string
  validade_proposta: string
}

type LeadData = {
  name: string
  city: string | null
  phone: string | null
}

type OrgData = {
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  telefone: string | null
}

type ProposalData = {
  panel_qty: number
  panel_power_w: number
  panel_brand_model: string | null
  inverter_qty: number
  inverter_power_w: number
  inverter_brand_model: string | null
  total_power_kwp: number
  monthly_generation_kwh: number
  preco_total: number
  valor_entrada: number
  num_parcelas: number
  valor_parcelas: number
}

export function buildPlaceholders(
  lead: LeadData,
  org: OrgData,
  proposal: ProposalData
): PlaceholderData {
  const today = new Date()
  const fmt = (d: Date) => format(d, 'dd/MM/yyyy', { locale: ptBR })

  return {
    cliente_nome:      lead.name,
    cliente_cidade:    lead.city ?? '',
    cliente_telefone:  lead.phone ? formatPhone(lead.phone) : '',
    empresa_nome:      org.nome_fantasia ?? org.razao_social ?? '',
    empresa_cnpj:      org.cnpj ?? '',
    empresa_telefone:  org.telefone ? formatPhone(org.telefone) : '',
    paineis_qtd:       String(proposal.panel_qty),
    paineis_potencia:  `${proposal.panel_power_w}W`,
    paineis_marca:     proposal.panel_brand_model ?? '',
    inversor_qtd:      String(proposal.inverter_qty),
    inversor_potencia: `${proposal.inverter_power_w}W`,
    inversor_marca:    proposal.inverter_brand_model ?? '',
    total_kwp:         `${proposal.total_power_kwp.toFixed(2)} kWp`,
    geracao_mensal:    `${Math.round(proposal.monthly_generation_kwh)} kWh`,
    preco_total:       formatCurrency(proposal.preco_total),
    valor_entrada:     formatCurrency(proposal.valor_entrada),
    num_parcelas:      String(proposal.num_parcelas),
    valor_parcelas:    formatCurrency(proposal.valor_parcelas),
    data_proposta:     fmt(today),
    validade_proposta: fmt(addDays(today, 15)),
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add web/lib/proposals/placeholders.ts
git commit -m "feat: add proposal placeholder builder"
```

---

## Task 6: Queries para proposal_templates

**Files:**
- Create: `web/lib/proposals/templates.ts`

- [ ] **Step 1: Criar o arquivo**

Criar `web/lib/proposals/templates.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ProposalTemplate } from '@/lib/crm/types'

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  const orgId = await getOrgId()
  if (!orgId) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('proposal_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProposalTemplate[]
}

export async function getActiveProposalTemplates(): Promise<ProposalTemplate[]> {
  const orgId = await getOrgId()
  if (!orgId) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('proposal_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProposalTemplate[]
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/proposals/templates.ts
git commit -m "feat: add proposal templates queries"
```

---

## Task 7: Server actions para templates e proposta financeira

**Files:**
- Create: `web/lib/proposals/actions.ts`

- [ ] **Step 1: Criar o arquivo**

Criar `web/lib/proposals/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

type ActionResult = { error?: string; success?: string }

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

// ── Template Actions ───────────────────────────────────────────────

export async function uploadProposalTemplate(formData: FormData): Promise<ActionResult & { id?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const category = formData.get('category') as string

  if (!file || file.size === 0) return { error: 'Arquivo é obrigatório.' }
  if (!name?.trim()) return { error: 'Nome é obrigatório.' }
  if (!file.name.endsWith('.docx')) return { error: 'Apenas arquivos .docx são aceitos.' }

  const supabase = await createClient()
  const filePath = `${orgId}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('proposal-templates')
    .upload(filePath, file, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  if (uploadError) return { error: 'Erro ao enviar arquivo: ' + uploadError.message }

  const { data, error: insertError } = await (supabase as any)
    .from('proposal_templates')
    .insert({
      org_id: orgId,
      name: name.trim(),
      category: category?.trim() || null,
      file_path: filePath,
    })
    .select('id')
    .single()

  if (insertError) {
    await supabase.storage.from('proposal-templates').remove([filePath])
    return { error: 'Erro ao salvar template: ' + insertError.message }
  }

  revalidatePath('/configuracoes')
  return { success: 'Template enviado com sucesso.', id: data.id }
}

export async function updateProposalTemplate(
  id: string,
  updates: { name?: string; category?: string; is_default?: boolean; is_active?: boolean }
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Se está definindo como padrão, limpar outros padrões primeiro
  if (updates.is_default === true) {
    await (supabase as any)
      .from('proposal_templates')
      .update({ is_default: false })
      .eq('org_id', orgId)
  }

  const { error } = await (supabase as any)
    .from('proposal_templates')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Template atualizado.' }
}

export async function deleteProposalTemplate(id: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('proposal_templates')
    .select('file_path')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!data) return { error: 'Template não encontrado.' }

  await supabase.storage.from('proposal-templates').remove([data.file_path])

  const { error } = await (supabase as any)
    .from('proposal_templates')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Template excluído.' }
}

// ── Proposta: salvar campos financeiros ───────────────────────────

export async function saveProposalFinancials(
  proposalId: string,
  data: {
    template_id: string
    preco_total: number
    custo_kit: number
    custo_projeto: number
    custo_instalacao: number
    custo_km: number
    custo_ca: number
    valor_entrada: number
    valor_parcelas: number
    num_parcelas: number
  }
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('proposals')
    .update(data as any)
    .eq('id', proposalId)

  if (error) return { error: error.message }
  return { success: 'Dados salvos.' }
}

export async function saveProposalPdfUrl(
  proposalId: string,
  pdf_url: string,
  docx_url: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('proposals')
    .update({ pdf_url, docx_url, gerado_em: new Date().toISOString() } as any)
    .eq('id', proposalId)
  if (error) return { error: error.message }
  return { success: 'URL salva.' }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/proposals/actions.ts
git commit -m "feat: add proposal template and financial server actions"
```

---

## Task 8: Atualizar getProposalsByLead para incluir campos financeiros

**Files:**
- Modify: `web/lib/crm/queries.ts` (função `getProposalsByLead`, linhas 83–109)

- [ ] **Step 1: Atualizar o mapeamento na função getProposalsByLead**

Em `web/lib/crm/queries.ts`, substituir a função `getProposalsByLead` (linhas 83-109):

```typescript
export async function getProposalsByLead(leadId: string): Promise<Proposal[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('proposals')
    .select(`*, supplier:suppliers(id, name)`)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  const proposals = (data ?? []) as any[]
  return proposals.map((p) => ({
    id: p.id,
    lead_id: p.lead_id,
    name: p.name ?? 'Proposta',
    panel_qty: p.total_modules ?? 0,
    panel_power_w: p.module_power_wp ?? 0,
    panel_brand_model: p.panel_brand_model ?? null,
    inverter_qty: p.total_inverters ?? 0,
    inverter_power_w: p.inverter_power_w ?? 0,
    inverter_brand_model: p.inverter_brand_model ?? null,
    kit_value: p.kit_value ?? 0,
    total_power_kwp: p.total_power_kwp ?? 0,
    monthly_generation_kwh: p.monthly_generation_kwh ?? 0,
    status: p.status ?? 'draft',
    created_at: p.created_at,
    supplier: p.supplier ?? null,
    template_id: p.template_id ?? null,
    preco_total: p.preco_total ?? null,
    custo_kit: p.custo_kit ?? null,
    custo_projeto: p.custo_projeto ?? null,
    custo_instalacao: p.custo_instalacao ?? null,
    custo_km: p.custo_km ?? null,
    custo_ca: p.custo_ca ?? null,
    valor_entrada: p.valor_entrada ?? null,
    valor_parcelas: p.valor_parcelas ?? null,
    num_parcelas: p.num_parcelas ?? null,
    pdf_url: p.pdf_url ?? null,
    docx_url: p.docx_url ?? null,
    gerado_em: p.gerado_em ?? null,
  })) as Proposal[]
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/crm/queries.ts
git commit -m "feat: include financial fields in getProposalsByLead mapping"
```

---

## Task 9: API Route de geração de proposta

**Files:**
- Create: `web/app/api/proposals/[id]/generate/route.ts`

- [ ] **Step 1: Criar o arquivo**

Criar `web/app/api/proposals/[id]/generate/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { calcularPreco } from '@/lib/proposals/pricing'
import { buildPlaceholders } from '@/lib/proposals/placeholders'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { proposalId } = await req.json() as { proposalId: string }

    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const supabase = await createClient()

    // 1. Buscar proposta (colunas raw do DB)
    const { data: rawProposal } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (!rawProposal) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })

    const p = rawProposal as any

    // 2. Buscar campos de entrada vindos do body
    const body = await req.clone().json().catch(() => ({}))
    const templateId: string = body.templateId ?? p.template_id
    const valorEntrada: number = body.valor_entrada ?? p.valor_entrada ?? 0
    const valorParcelas: number = body.valor_parcelas ?? p.valor_parcelas ?? 0
    const numParcelas: number = body.num_parcelas ?? p.num_parcelas ?? 0

    if (!templateId) return NextResponse.json({ error: 'Selecione um template.' }, { status: 400 })

    // 3. Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('name, city, phone')
      .eq('id', p.lead_id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })

    // 4. Buscar org_config
    const orgConfig = await getOrgConfig()

    // 5. Calcular preços
    const pricing = calcularPreco(
      {
        kit_value: p.kit_value ?? 0,
        total_power_kwp: p.total_power_kwp ?? 0,
        panel_qty: p.total_modules ?? 0,
      },
      orgConfig
    )

    // 6. Buscar template do Storage
    const { data: templateMeta } = await (supabase as any)
      .from('proposal_templates')
      .select('file_path')
      .eq('id', templateId)
      .eq('org_id', orgId)
      .single()

    if (!templateMeta) return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })

    const { data: templateBlob, error: downloadError } = await supabase.storage
      .from('proposal-templates')
      .download(templateMeta.file_path)

    if (downloadError || !templateBlob) {
      return NextResponse.json({ error: 'Erro ao baixar template: ' + downloadError?.message }, { status: 500 })
    }

    // 7. Substituir placeholders com docxtemplater
    const templateBuffer = Buffer.from(await templateBlob.arrayBuffer())
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

    const placeholders = buildPlaceholders(
      lead as any,
      {
        razao_social: orgConfig.razao_social,
        nome_fantasia: orgConfig.nome_fantasia,
        cnpj: orgConfig.cnpj,
        telefone: orgConfig.telefone,
      },
      {
        panel_qty: p.total_modules ?? 0,
        panel_power_w: p.module_power_wp ?? 0,
        panel_brand_model: p.panel_brand_model ?? null,
        inverter_qty: p.total_inverters ?? 0,
        inverter_power_w: p.inverter_power_w ?? 0,
        inverter_brand_model: p.inverter_brand_model ?? null,
        total_power_kwp: p.total_power_kwp ?? 0,
        monthly_generation_kwh: p.monthly_generation_kwh ?? 0,
        preco_total: pricing.preco_total,
        valor_entrada: valorEntrada,
        num_parcelas: numParcelas,
        valor_parcelas: valorParcelas,
      }
    )

    doc.render(placeholders)
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' })

    // 8. Salvar DOCX no Storage
    const docxPath = `${orgId}/${proposalId}.docx`
    await supabase.storage
      .from('proposals')
      .upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    // 9. Converter DOCX → PDF via ConvertAPI
    const convertSecret = process.env.CONVERTAPI_SECRET
    if (!convertSecret) {
      return NextResponse.json({ error: 'CONVERTAPI_SECRET não configurado.' }, { status: 500 })
    }

    const formData = new FormData()
    formData.append('File', new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }), 'proposta.docx')

    const convertResponse = await fetch(
      `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${convertSecret}&StoreFile=true`,
      { method: 'POST', body: formData }
    )

    if (!convertResponse.ok) {
      const errText = await convertResponse.text()
      return NextResponse.json({ error: 'Erro na conversão PDF: ' + errText }, { status: 502 })
    }

    const convertResult = await convertResponse.json()
    const pdfUrl: string = convertResult?.Files?.[0]?.Url ?? ''

    if (!pdfUrl) {
      return NextResponse.json({ error: 'ConvertAPI não retornou URL do PDF.' }, { status: 502 })
    }

    // 10. Salvar campos na proposta
    await supabase.from('proposals').update({
      template_id: templateId,
      preco_total: pricing.preco_total,
      custo_kit: pricing.custo_kit,
      custo_projeto: pricing.custo_projeto,
      custo_instalacao: pricing.custo_instalacao,
      custo_km: pricing.custo_km,
      custo_ca: pricing.custo_ca,
      valor_entrada: valorEntrada,
      valor_parcelas: valorParcelas,
      num_parcelas: numParcelas,
      pdf_url: pdfUrl,
      docx_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/proposals/${docxPath}`,
      gerado_em: new Date().toISOString(),
    } as any).eq('id', proposalId)

    return NextResponse.json({ pdf_url: pdfUrl })

  } catch (err: any) {
    console.error('[generate-proposal]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Adicionar CONVERTAPI_SECRET ao .env.local**

Em `web/.env.local` (ou `.env`), adicionar:

```
CONVERTAPI_SECRET=seu_secret_aqui
```

Obtenha o secret gratuito em https://www.convertapi.com/a/auth — crie uma conta e copie o secret.

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add web/app/api/proposals/
git commit -m "feat: add proposal PDF generation API route"
```

---

## Task 10: TemplatesTab — UI de gestão de templates

**Files:**
- Create: `web/app/(dashboard)/configuracoes/TemplatesTab.tsx`

- [ ] **Step 1: Criar o componente**

Criar `web/app/(dashboard)/configuracoes/TemplatesTab.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import type { ProposalTemplate } from '@/lib/crm/types'
import {
  uploadProposalTemplate,
  updateProposalTemplate,
  deleteProposalTemplate,
} from '@/lib/proposals/actions'

export default function TemplatesTab({ initialTemplates }: { initialTemplates: ProposalTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showUpload, setShowUpload] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 bg-white/5'

  function handleUpload() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (!file) { setError('Selecione um arquivo .docx.'); return }
    if (!file.name.endsWith('.docx')) { setError('Apenas arquivos .docx são aceitos.'); return }

    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('category', category.trim())
      fd.append('file', file)
      const result = await uploadProposalTemplate(fd)
      if (result.error) { setError(result.error); return }
      // Reload
      window.location.reload()
    })
  }

  function handleToggleActive(t: ProposalTemplate) {
    startTransition(async () => {
      const result = await updateProposalTemplate(t.id, { is_active: !t.is_active })
      if (result.error) { setError(result.error); return }
      setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
    })
  }

  function handleSetDefault(t: ProposalTemplate) {
    startTransition(async () => {
      const result = await updateProposalTemplate(t.id, { is_default: true })
      if (result.error) { setError(result.error); return }
      setTemplates((prev) => prev.map((x) => ({ ...x, is_default: x.id === t.id })))
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteProposalTemplate(id)
      if (result.error) { setError(result.error); return }
      setTemplates((prev) => prev.filter((x) => x.id !== id))
      setConfirmDelete(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">
          Templates Word (.docx) usados na geração de propostas em PDF.
        </p>
        <button
          onClick={() => { setShowUpload(true); setError(null) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: '#FFD080', color: '#1A1A1A' }}
        >
          + Novo Template
        </button>
      </div>

      {showUpload && (
        <div
          className="rounded-2xl p-5 border border-white/10 space-y-4"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <h3 className="text-sm font-semibold text-white">Enviar Template</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Nome *</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Proposta Residencial"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Categoria</label>
              <input
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: residencial, comercial"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Arquivo .docx *</label>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ background: '#FFD080', color: '#1A1A1A' }}
            >
              {isPending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showUpload && (
        <p className="text-sm text-white/30 text-center py-8">
          Nenhum template cadastrado. Envie um arquivo .docx para começar.
        </p>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="rounded-xl p-4 border border-white/10 flex items-center justify-between gap-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white truncate">{t.name}</p>
                {t.is_default && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,208,128,0.15)', color: '#FFD080', border: '1px solid rgba(255,208,128,0.3)' }}>
                    Padrão
                  </span>
                )}
                {!t.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-white/40 border border-white/10">
                    Inativo
                  </span>
                )}
              </div>
              {t.category && (
                <p className="text-xs text-white/40 mt-0.5">{t.category}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!t.is_default && (
                <button
                  onClick={() => handleSetDefault(t)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  Definir padrão
                </button>
              )}
              <button
                onClick={() => handleToggleActive(t)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {t.is_active ? 'Desativar' : 'Ativar'}
              </button>
              {confirmDelete === t.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: '#ef4444' }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs px-3 py-1.5 rounded-lg text-white/40"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(t.id)}
                  className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/app/(dashboard)/configuracoes/TemplatesTab.tsx
git commit -m "feat: add TemplatesTab component for proposal template management"
```

---

## Task 11: Integrar TemplatesTab nas Configurações

**Files:**
- Modify: `web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx`
- Modify: `web/app/(dashboard)/configuracoes/page.tsx`

- [ ] **Step 1: Atualizar ConfiguracoesClient.tsx**

Substituir o conteúdo completo de `web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { OrgConfig, LeadOrigin } from '@/lib/configuracoes/queries'
import type { Colaborador } from '@/lib/colaboradores/queries'
import type { AuditLog } from '@/lib/auditoria/queries'
import type { ProposalTemplate } from '@/lib/crm/types'
import EmpresaTab from './EmpresaTab'
import AcessoTab from './AcessoTab'
import AuditoriaTab from './AuditoriaTab'
import TemplatesTab from './TemplatesTab'

const TABS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'acesso', label: 'Acesso' },
  { key: 'templates', label: 'Templates' },
  { key: 'auditoria', label: 'Auditoria' },
] as const

type TabKey = typeof TABS[number]['key']

export default function ConfiguracoesClient({
  config,
  origins,
  colaboradores,
  auditLogs,
  auditTotal,
  proposalTemplates,
}: {
  config: OrgConfig
  origins: LeadOrigin[]
  colaboradores: Colaborador[]
  auditLogs: AuditLog[]
  auditTotal: number
  proposalTemplates: ProposalTemplate[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('empresa')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-white/50 text-sm mt-1">Gerencie sua empresa, equipe e auditoria</p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-xl p-1 w-fit"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={
              activeTab === t.key
                ? { background: '#FFD080', color: '#0a0e1a' }
                : { color: 'rgba(255,255,255,0.5)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa'    && <EmpresaTab config={config} origins={origins} />}
      {activeTab === 'acesso'     && <AcessoTab colaboradores={colaboradores} />}
      {activeTab === 'templates'  && <TemplatesTab initialTemplates={proposalTemplates} />}
      {activeTab === 'auditoria'  && <AuditoriaTab logs={auditLogs} total={auditTotal} />}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar page.tsx das Configurações**

Substituir o conteúdo de `web/app/(dashboard)/configuracoes/page.tsx`:

```typescript
import { getOrgConfig, getLeadOrigins } from '@/lib/configuracoes/queries'
import { getColaboradores } from '@/lib/colaboradores/queries'
import { getAuditLogs } from '@/lib/auditoria/queries'
import { getProposalTemplates } from '@/lib/proposals/templates'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const [config, origins, colaboradores, { logs, total }, proposalTemplates] = await Promise.all([
    getOrgConfig(),
    getLeadOrigins(),
    getColaboradores(),
    getAuditLogs(1, 20),
    getProposalTemplates(),
  ])

  return (
    <ConfiguracoesClient
      config={config}
      origins={origins}
      colaboradores={colaboradores}
      auditLogs={logs}
      auditTotal={total}
      proposalTemplates={proposalTemplates}
    />
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add web/app/(dashboard)/configuracoes/ConfiguracoesClient.tsx web/app/(dashboard)/configuracoes/page.tsx
git commit -m "feat: add Templates tab to Configurações page"
```

---

## Task 12: ProposalPricingReview — tela de revisão de preço e geração

**Files:**
- Create: `web/components/crm/ProposalPricingReview.tsx`

- [ ] **Step 1: Criar o componente**

Criar `web/components/crm/ProposalPricingReview.tsx`:

```typescript
'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Proposal, ProposalTemplate } from '@/lib/crm/types'
import { calcularPreco } from '@/lib/proposals/pricing'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/inputs'
import type { OrgConfig } from '@/lib/configuracoes/queries'

interface ProposalPricingReviewProps {
  proposal: Proposal
  orgConfig: OrgConfig
  templates: ProposalTemplate[]
  onClose: () => void
  onGenerated: (pdfUrl: string) => void
}

export function ProposalPricingReview({
  proposal,
  orgConfig,
  templates,
  onClose,
  onGenerated,
}: ProposalPricingReviewProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    proposal.template_id ??
    templates.find((t) => t.is_default)?.id ??
    templates[0]?.id ??
    ''
  )
  const [valorEntrada, setValorEntrada] = useState<number>(proposal.valor_entrada ?? 0)
  const [numParcelas, setNumParcelas] = useState<number>(proposal.num_parcelas ?? 1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pricing = calcularPreco(
    {
      kit_value: proposal.kit_value,
      total_power_kwp: proposal.total_power_kwp,
      panel_qty: proposal.panel_qty,
    },
    orgConfig
  )

  const valorParcelas = numParcelas > 0
    ? (pricing.preco_total - valorEntrada) / numParcelas
    : 0

  function handleGenerate() {
    if (!selectedTemplateId) { setError('Selecione um template.'); return }
    setError(null)

    startTransition(async () => {
      const res = await fetch(`/api/proposals/${proposal.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          templateId: selectedTemplateId,
          valor_entrada: valorEntrada,
          valor_parcelas: valorParcelas,
          num_parcelas: numParcelas,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao gerar proposta.')
        return
      }

      // Download automático
      window.open(data.pdf_url, '_blank')
      onGenerated(data.pdf_url)
    })
  }

  const labelCls = 'text-xs text-white/50 mb-1 block'
  const valueCls = 'text-sm font-semibold text-white'
  const rowCls = 'flex justify-between items-center py-2'
  const dividerCls = 'border-t border-white/08'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 overflow-y-auto"
        style={{ background: '#0f1424', maxHeight: '90vh' }}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Gerar Proposta PDF</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">×</button>
          </div>

          {/* Breakdown de custos */}
          <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Breakdown de Custos</p>
            <div className={rowCls}>
              <span className="text-sm text-white/60">Kit Solar</span>
              <span className="text-sm text-white/80">{formatCurrency(pricing.custo_kit)}</span>
            </div>
            <div className={`${rowCls} ${dividerCls}`}>
              <span className="text-sm text-white/60">Projeto (engenharia)</span>
              <span className="text-sm text-white/80">{formatCurrency(pricing.custo_projeto)}</span>
            </div>
            <div className={`${rowCls} ${dividerCls}`}>
              <span className="text-sm text-white/60">Instalação</span>
              <span className="text-sm text-white/80">{formatCurrency(pricing.custo_instalacao)}</span>
            </div>
            <div className={`${rowCls} ${dividerCls}`}>
              <span className="text-sm text-white/60">Material CA</span>
              <span className="text-sm text-white/80">{formatCurrency(pricing.custo_ca)}</span>
            </div>
            <div className={`${rowCls} ${dividerCls}`} style={{ borderTopColor: 'rgba(255,255,255,0.12)' }}>
              <span className="text-sm font-semibold text-white">Preço Total</span>
              <span className="text-base font-bold" style={{ color: '#FFD080' }}>{formatCurrency(pricing.preco_total)}</span>
            </div>
          </div>

          {/* Condições de pagamento */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Condições de Pagamento</p>
            <CurrencyInput
              label="Valor de Entrada (R$)"
              value={valorEntrada || null}
              onChange={(v) => setValorEntrada(v)}
            />
            <div>
              <label className={labelCls}>Número de Parcelas</label>
              <input
                type="number"
                min="0"
                value={numParcelas}
                onChange={(e) => setNumParcelas(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 bg-white/5"
              />
            </div>
            {numParcelas > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,208,128,0.06)', border: '1px solid rgba(255,208,128,0.15)' }}>
                <p className="text-xs text-white/50">
                  {numParcelas}x de <span className="font-semibold" style={{ color: '#FFD080' }}>{formatCurrency(valorParcelas)}</span>
                  {' '}= Restante: {formatCurrency(pricing.preco_total - valorEntrada)}
                </p>
              </div>
            )}
          </div>

          {/* Seleção de template */}
          <div>
            <label className={labelCls}>Template da Proposta *</label>
            {templates.length === 0 ? (
              <p className="text-xs text-red-400">
                Nenhum template ativo. Cadastre um em Configurações → Templates.
              </p>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <option value="">— Selecione —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.category ? ` (${t.category})` : ''}{t.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={isPending || templates.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#FFD080', color: '#0a0e1a' }}
            >
              {isPending ? 'Gerando PDF...' : 'Gerar Proposta PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/components/crm/ProposalPricingReview.tsx
git commit -m "feat: add ProposalPricingReview component"
```

---

## Task 13: Atualizar ProposalsList com botão Gerar PDF e histórico

**Files:**
- Modify: `web/components/crm/ProposalsList.tsx`

- [ ] **Step 1: Substituir ProposalsList.tsx**

Substituir o conteúdo completo de `web/components/crm/ProposalsList.tsx`:

```typescript
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ProposalForm } from './ProposalForm'
import { ProposalPricingReview } from './ProposalPricingReview'
import { deleteProposal } from '@/lib/crm/actions'
import type { Lead, Proposal, Supplier, ProposalTemplate } from '@/lib/crm/types'
import type { OrgConfig } from '@/lib/configuracoes/queries'
import { formatCurrency } from '@/lib/format'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'rgba(255,255,255,0.40)',
  sent: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: 'rgba(255,255,255,0.25)',
}

export function ProposalsList({ lead }: { lead: Lead }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [generationFactor, setGenerationFactor] = useState(1.0)
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [reviewProposal, setReviewProposal] = useState<Proposal | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/proposals`)
      .then((r) => r.json())
      .then(({ proposals, suppliers, generationFactor, orgConfig, templates }) => {
        setProposals(proposals)
        setSuppliers(suppliers)
        setGenerationFactor(generationFactor)
        if (orgConfig) setOrgConfig(orgConfig)
        if (templates) setTemplates(templates)
      })
  }, [lead.id])

  function handleDelete(id: string) {
    if (!confirm('Excluir proposta?')) return
    startTransition(async () => {
      await deleteProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleGenerated(proposalId: string, pdfUrl: string) {
    setProposals((prev) =>
      prev.map((p) => p.id === proposalId ? { ...p, pdf_url: pdfUrl } : p)
    )
    setReviewProposal(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {reviewProposal && orgConfig && (
        <ProposalPricingReview
          proposal={reviewProposal}
          orgConfig={orgConfig}
          templates={templates}
          onClose={() => setReviewProposal(null)}
          onGenerated={(url) => handleGenerated(reviewProposal.id, url)}
        />
      )}

      {!showForm ? (
        <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
          + Nova Proposta
        </Button>
      ) : (
        <ProposalForm
          leadId={lead.id}
          suppliers={suppliers}
          generationFactor={generationFactor}
          onSuccess={() => {
            setShowForm(false)
            fetch(`/api/leads/${lead.id}/proposals`)
              .then((r) => r.json())
              .then(({ proposals }) => setProposals(proposals))
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {proposals.length === 0 && !showForm && (
        <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Nenhuma proposta criada ainda.
        </p>
      )}

      {proposals.map((p) => (
        <div
          key={p.id}
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {p.name}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: `${STATUS_COLORS[p.status]}20`,
                color: STATUS_COLORS[p.status],
                border: `1px solid ${STATUS_COLORS[p.status]}40`,
              }}
            >
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sistema</p>
              <p className="text-sm font-medium" style={{ color: '#FFD080' }}>
                {p.total_power_kwp.toFixed(2)} kWp
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Geração/mês</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {p.monthly_generation_kwh.toFixed(0)} kWh
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {p.preco_total ? 'Preço Total' : 'Valor kit'}
              </p>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {p.preco_total
                  ? formatCurrency(p.preco_total)
                  : p.kit_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          {p.supplier && (
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Fornecedor: {p.supplier.name}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {p.pdf_url && (
                <a
                  href={p.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,208,128,0.15)', color: '#FFD080', border: '1px solid rgba(255,208,128,0.3)' }}
                >
                  ↓ PDF
                </a>
              )}
              <button
                onClick={() => setReviewProposal(p)}
                className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {p.pdf_url ? 'Regerar PDF' : 'Gerar PDF'}
              </button>
            </div>
            <button
              onClick={() => handleDelete(p.id)}
              disabled={isPending}
              className="text-xs"
              style={{ color: 'rgba(255,80,80,0.50)' }}
            >
              excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar a API Route /api/leads/[id]/proposals para retornar orgConfig e templates**

Substituir `web/app/api/leads/[id]/proposals/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getProposalsByLead, getSuppliers, getGenerationFactor } from '@/lib/crm/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { getActiveProposalTemplates } from '@/lib/proposals/templates'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [proposals, suppliers, generationFactor, orgConfig, templates] = await Promise.all([
    getProposalsByLead(params.id),
    getSuppliers(),
    getGenerationFactor(),
    getOrgConfig(),
    getActiveProposalTemplates(),
  ])
  return NextResponse.json({ proposals, suppliers, generationFactor, orgConfig, templates })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add web/components/crm/ProposalsList.tsx web/app/api/leads/[id]/proposals/route.ts
git commit -m "feat: integrate PDF generation into ProposalsList with pricing review modal"
```

---

## Task 14: Teste manual e verificação final

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
cd web && npm run dev
```

- [ ] **Step 2: Verificar aba Templates nas Configurações**

1. Acessar `/configuracoes`
2. Clicar em "Templates"
3. Clicar em "+ Novo Template"
4. Preencher nome, categoria, e anexar um arquivo `.docx` de teste com conteúdo: `Olá {{cliente_nome}}, seu sistema de {{total_kwp}} está orçado em {{preco_total}}.`
5. Clicar em "Enviar" → deve aparecer na lista

- [ ] **Step 3: Verificar geração de proposta**

1. Acessar `/leads`, abrir um lead
2. Ir para a aba "Propostas"
3. Criar uma proposta com kit_value > 0
4. Clicar em "Gerar PDF"
5. Modal de revisão de preço deve aparecer com breakdown de custos
6. Selecionar o template criado no Step 2
7. Preencher entrada e parcelas
8. Clicar "Gerar Proposta PDF"
9. PDF deve abrir em nova aba (via ConvertAPI)
10. Voltar para a lista de propostas → deve aparecer botão "↓ PDF"

- [ ] **Step 4: Build final para verificar erros de compilação**

```bash
cd web && npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully`

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat: complete proposal PDF generation module"
```
