# Novos Módulos — Design Spec

## Goal
Adicionar Estoque, Relatórios e Treinamento ao CRM, reorganizar a sidebar com separador entre módulos de pipeline e suporte, e substituir ícones emoji por ícones monocromáticos (lucide-react).

## Architecture

### Sidebar
- Instalar `lucide-react` para ícones SVG monocromáticos
- Dividir NAV_ITEMS em dois grupos: PIPELINE_ITEMS e SUPPORT_ITEMS
- Renderizar separador visual com label "OUTROS" entre os dois grupos
- Ícones herdam cor do texto via currentColor

**Pipeline items:** Dashboard, CRM/Leads, Clientes, Contratos, Financeiro, Projetos, Compras, Comissões, Entrega do Material, Obra, Entrega da Obra, Pós Obra

**Support items:** Estoque, Relatórios, Treinamento, Configurações

### Estoque

**Tabela `stock_items`:**
```sql
create table public.stock_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  quantity        numeric(12,3) not null default 0,
  unit_value      numeric(12,2) not null default 0,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.stock_items enable row level security;
create policy "stock_items_isolation" on public.stock_items
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
```

`total_value` é calculado na query como `quantity * unit_value` — sem coluna extra.

**Página `/estoque`:**
- Tabela com colunas: Nome, Descrição, Quantidade, Valor Unitário, Valor Total
- Botão "Adicionar Item" abre modal com formulário
- Cada linha tem ações: Editar (abre modal) e Excluir (confirmação inline)
- Server actions: `createStockItem`, `updateStockItem`, `deleteStockItem`

### Relatórios

**Página `/relatorios`:**
- Tabs: Comercial | Leads | Financeiro | Técnico
- Cada relatório tem: filtro de período (data_inicio, data_fim), tabela de resultados, botão "Baixar PDF"
- PDF via `window.print()` com CSS @media print — zero dependências extras
- Dados buscados via server actions ao submeter filtro

**Aba Comercial:**
- Vendas por período (tabela: mês, qtd contratos, valor total, ticket médio)
- Quantidade de propostas (clientes criados no período)
- Quantidade de contratos fechados (client_sale no período)
- Valor vendido total
- Ticket médio
- Taxa de conversão (contratos / propostas %)
- Margem média (pct_margem médio dos contratos)
- Distribuição Residencial / Comercial / Rural (por client_type)

**Aba Leads:**
- Leads por origem: nome da origem, total de leads, leads convertidos, taxa de conversão
- Ranking dos vendedores: nome, qtd leads, qtd contratos, valor vendido

**Aba Financeiro:**
- Comissões por vendedor: nome, qtd contratos, valor total vendido, comissão (%)

**Aba Técnico:**
- Tempo médio de implantação (dias entre contract_date e data conclusão da obra)
- Módulos por fabricante (de client_project.modules_brand)
- Inversores por fabricante (de client_project.inverter_brand)
- Total de kWh projetados (soma de client_project.estimated_production)
- Economia financeira estimada (soma de client_project.estimated_savings)

### Treinamento

**Página `/treinamento`:**
- Array estática no código: VIDEOS com campos title, description, youtubeId
- Grade de cards (3 colunas desktop, 1 mobile)
- Cada card: thumbnail YouTube (https://img.youtube.com/vi/{id}/hqdefault.jpg), título, descrição, botão "Assistir"
- Clique abre modal com iframe embed do YouTube
- Por enquanto: 3 cards placeholder com youtubeId vazio e título "Em breve"

---

## Tech Stack
- Next.js 14 App Router, TypeScript, Supabase, glassmorphism theme
- lucide-react para ícones
- window.print() + @media print CSS para PDF de relatórios
- (supabase as any) para tabelas novas
- Server Actions com 'use server', useTransition no client

## Módulos de permissão adicionados
| Chave | Label |
|---|---|
| estoque | Estoque |
| relatorios | Relatórios |
| treinamento | Treinamento |
