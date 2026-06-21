# Design: Módulo de Geração de Propostas em PDF

**Data:** 2026-06-18
**Status:** Aprovado

---

## Objetivo

Permitir que o usuário gere propostas comerciais em PDF a partir de templates Word (.docx) com substituição de placeholders, motor de precificação baseado na planilha do cliente, e histórico de propostas por lead.

---

## Stack Escolhida

- **docxtemplater** — substituição `{{placeholder}}` em arquivos .docx
- **ConvertFileFast API** (gratuita) — conversão DOCX → PDF via HTTP
- **Next.js API Route** — `/api/proposals/[id]/generate` — orquestra geração
- **Supabase Storage** — armazenamento de templates e PDFs gerados
- **Supabase Postgres** — metadados de templates e extensões na tabela `proposals`

---

## Banco de Dados

### Nova tabela: `proposal_templates`

```sql
CREATE TABLE proposal_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text,                   -- ex: 'residencial', 'comercial'
  file_path    text NOT NULL,          -- caminho no Supabase Storage
  is_default   boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
-- RLS: usuário só acessa templates da própria org
```

### Extensões na tabela `proposals` (existente)

```sql
ALTER TABLE proposals ADD COLUMN template_id       uuid REFERENCES proposal_templates(id);
ALTER TABLE proposals ADD COLUMN preco_total       numeric;
ALTER TABLE proposals ADD COLUMN custo_kit         numeric;
ALTER TABLE proposals ADD COLUMN custo_projeto     numeric;
ALTER TABLE proposals ADD COLUMN custo_instalacao  numeric;
ALTER TABLE proposals ADD COLUMN custo_km          numeric;
ALTER TABLE proposals ADD COLUMN custo_ca          numeric;
ALTER TABLE proposals ADD COLUMN valor_entrada      numeric;
ALTER TABLE proposals ADD COLUMN valor_parcelas     numeric;
ALTER TABLE proposals ADD COLUMN num_parcelas       integer;
ALTER TABLE proposals ADD COLUMN pdf_url            text;
ALTER TABLE proposals ADD COLUMN docx_url           text;
ALTER TABLE proposals ADD COLUMN gerado_em          timestamptz;
```

---

## Supabase Storage

Dois buckets (privados, RLS por org):

| Bucket | Caminho | Conteúdo |
|---|---|---|
| `proposal-templates` | `{org_id}/{template_id}.docx` | Templates enviados pelo usuário |
| `proposals` | `{org_id}/{proposal_id}.pdf` | PDFs gerados |
| `proposals` | `{org_id}/{proposal_id}.docx` | DOCX intermediário |

---

## Motor de Precificação

Baseado na planilha do cliente. Inputs vindos de `org_config` e da proposta:

```
divisor          = 1 - pct_imposto - pct_margem - pct_comissao

custo_kit        = proposals.kit_value
custo_projeto    = proposals.total_power_kwp × org_config.valor_projeto_por_kwp
custo_instalacao = proposals.panel_qty × org_config.valor_instalacao_por_placa
custo_km         = org_config.quilometragem × org_config.valor_km_rodado  (se aplicável)
custo_ca         = proposals.kit_value × org_config.pct_material_ca

soma_custos      = custo_kit + custo_projeto + custo_instalacao + custo_km + custo_ca
preco_total      = soma_custos / divisor
```

`valor_entrada` e `valor_parcelas` são digitados manualmente pelo usuário na tela de revisão.

---

## Fluxo do Usuário

1. CRM → Lead → aba Propostas → seleciona proposta existente
2. **Tela de Revisão de Preço** — exibe breakdown de custos (read-only) + preço total calculado + campos editáveis: Valor de Entrada, Nº de Parcelas, Valor por Parcela
3. Usuário seleciona template (dropdown com templates ativos da org)
4. Clica **"Gerar Proposta PDF"**
5. API Route `/api/proposals/[id]/generate`:
   a. Busca proposta + lead + empresa + org_config
   b. Calcula custos e preço total
   c. Salva campos financeiros na proposta
   d. Baixa template .docx do Storage
   e. docxtemplater substitui placeholders
   f. Faz POST para ConvertFileFast API com o DOCX
   g. Recebe PDF binário
   h. Salva DOCX e PDF no Storage
   i. Atualiza `proposals.pdf_url`, `proposals.docx_url`, `proposals.gerado_em`
   j. Retorna `{ pdf_url }`
6. Frontend inicia download automático do PDF
7. URL fica salva no histórico da proposta (ProposalsList)

---

## Placeholders Disponíveis nos Templates

| Placeholder | Valor |
|---|---|
| `{{cliente_nome}}` | lead.name |
| `{{cliente_cidade}}` | lead.city |
| `{{cliente_telefone}}` | lead.phone (formatado) |
| `{{empresa_nome}}` | org.name |
| `{{empresa_cnpj}}` | org.cnpj |
| `{{empresa_telefone}}` | org.phone |
| `{{paineis_qtd}}` | proposal.panel_qty |
| `{{paineis_potencia}}` | proposal.panel_power_w |
| `{{paineis_marca}}` | proposal.panel_brand_model |
| `{{inversor_qtd}}` | proposal.inverter_qty |
| `{{inversor_potencia}}` | proposal.inverter_power_w |
| `{{inversor_marca}}` | proposal.inverter_brand_model |
| `{{total_kwp}}` | proposal.total_power_kwp |
| `{{geracao_mensal}}` | proposal.monthly_generation_kwh |
| `{{preco_total}}` | preco_total formatado (R$) |
| `{{valor_entrada}}` | valor_entrada formatado (R$) |
| `{{num_parcelas}}` | num_parcelas |
| `{{valor_parcelas}}` | valor_parcelas formatado (R$) |
| `{{data_proposta}}` | data geração (dd/MM/yyyy) |
| `{{validade_proposta}}` | data geração + 15 dias (dd/MM/yyyy) |

---

## Componentes e Arquivos Novos

### API Route
- `web/app/api/proposals/[id]/generate/route.ts`

### Biblioteca
- `web/lib/proposals/pricing.ts` — função `calcularPreco(proposal, orgConfig)`
- `web/lib/proposals/placeholders.ts` — função `buildPlaceholders(proposal, lead, org)`
- `web/lib/proposals/templates.ts` — queries para proposal_templates
- `web/lib/proposals/actions.ts` — server actions (saveProposalFinancials, etc.)

### Componentes UI (CRM)
- `web/components/crm/ProposalPricingReview.tsx` — tela de revisão de preço + seleção de template
- `web/components/crm/ProposalGenerateButton.tsx` — botão + lógica de chamada da API + download

### Configurações
- `web/app/(dashboard)/configuracoes/TemplatesTab.tsx` — aba de gerenciamento de templates
  - Lista templates com nome, categoria, padrão, ativo
  - Upload .docx
  - Editar/excluir

### Migração DB
- `supabase/migrations/YYYYMMDD_proposal_templates.sql`

---

## Arquivos Existentes Modificados

| Arquivo | Mudança |
|---|---|
| `web/components/crm/ProposalsList.tsx` | Exibir `pdf_url` com botão download |
| `web/app/(dashboard)/configuracoes/page.tsx` | Adicionar aba "Templates" |
| `web/lib/crm/types.ts` | Adicionar campos novos em tipo `Proposal` |

---

## ConvertFileFast API

```
POST https://v2.convertapi.com/convert/docx/to/pdf
Headers: Authorization: Bearer {CONVERTAPI_SECRET}
Body: multipart/form-data com o arquivo .docx
Resposta: JSON com URL do PDF ou binário
```

Variável de ambiente necessária: `CONVERTAPI_SECRET` (plano gratuito disponível).

---

## Tratamento de Erros

- Template não encontrado no Storage → erro claro ao usuário
- ConvertFileFast falhou → retornar erro HTTP 502 com mensagem
- Proposta sem kit_value → validar antes de calcular
- Upload de template com extensão errada → validar no frontend (.docx apenas)
