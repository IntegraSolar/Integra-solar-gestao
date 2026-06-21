# Spec 3a — Contratos + Financeiro

**Data:** 2026-06-18
**Projeto:** Integra Solar CRM
**Escopo:** Módulos de pipeline Contratos e Financeiro

---

## Contexto

Clientes chegam ao módulo Contratos automaticamente quando o arquivo de contrato é enviado na Tab 7 do cadastro (`pipeline_stage = 'contratos'`). Após confirmação de assinatura, avançam para Financeiro (`pipeline_stage = 'financeiro'`), onde as parcelas são acompanhadas e confirmadas.

---

## Módulo 1 — Contratos

### Objetivo
Acompanhar o status de assinatura do contrato de cada cliente e avançar o pipeline quando assinado.

### Rotas
- `GET /contratos` — lista de clientes no stage `contratos`
- `GET /contratos/[id]` — detalhe do contrato do cliente

### `/contratos` — Lista

Server Component. Busca clientes onde `pipeline_stage = 'contratos'`.

Colunas exibidas:
- Nome do cliente
- Cidade
- Data do contrato (`contract_date` em `clients`)
- Status do contrato (badge colorido)

### `/contratos/[id]` — Detalhe

Server Component que renderiza um Client Component com as ações.

Exibe:
- Link para contrato assinado (URL já em `client_contracts.contract_url`)
- Link para procuração, se houver (`client_contracts.power_of_attorney_url`)
- Select de status: `aguardando_assinatura` | `assinado` | `distratado`
- Botão **"Confirmar Assinatura"** — marca `signed = true`, `signed_at = now()`, `status = 'assinado'` e avança `pipeline_stage = 'financeiro'`

### Banco de Dados

Adicionar coluna à tabela existente `client_contracts`:

```sql
alter table public.client_contracts
  add column if not exists status text not null default 'aguardando_assinatura';
```

Valores válidos: `aguardando_assinatura`, `assinado`, `distratado`.

### Server Actions

```
updateContractStatus(clientId, status) → ActionResult
  - Atualiza client_contracts.status
  - Se status = 'assinado': signed = true, signed_at = now()
  - Se status = 'assinado': pipeline_stage = 'financeiro' em clients

```

### Pipeline
- Entrada: `pipeline_stage = 'contratos'` (setado pela Tab 7)
- Saída: `pipeline_stage = 'financeiro'` (ao confirmar assinatura)
- `distratado` não avança o pipeline — cliente fica no módulo Contratos

---

## Módulo 2 — Financeiro

### Objetivo
Painel de visão financeira do mês com filtros, e confirmação de pagamento de parcelas individuais por cliente.

### Rotas
- `GET /financeiro` — painel financeiro com cards e lista de parcelas
- `GET /financeiro/[id]` — parcelas do cliente, confirmação individual

### `/financeiro` — Painel

Server Component com filtros por:
- **Mês/Ano** (padrão: mês atual)
- **Vendedor** (usuário atribuído ao lead de origem — `leads.assigned_to_user_id`)

**3 cards de valores** (referentes ao período filtrado):

| Card | Definição |
|------|-----------|
| Faturamento total | Soma de `amount` de todas as parcelas com `due_date` no mês |
| A receber | Soma de parcelas com `status = 'pendente'` e `due_date >= hoje` |
| Em atraso | Soma de parcelas com `status = 'pendente'` e `due_date < hoje` |

Abaixo dos cards: tabela de parcelas do período filtrado com colunas:
- Cliente, Vencimento, Valor, Status (badge), Ação (link para `/financeiro/[id]`)

**Filtro por vendedor:** requer join `clients → leads → profiles` via `lead_id` e `assigned_to_user_id`.

### `/financeiro/[id]` — Parcelas do Cliente

Server Component. Lista todas as parcelas do cliente ordenadas por `position`.

Para cada parcela:
- Posição (Entrada / Parcela N)
- Data de vencimento
- Valor
- Status badge (`pendente` / `confirmada`)
- Botão **"Confirmar Pagamento"** (só aparece se `status = 'pendente'`) → muda para `confirmada`, registra `confirmed_at = now()`

Não há avanço de pipeline automático neste módulo — o avanço para `'projetos'` é manual (botão separado na página).

### Banco de Dados

Nenhuma alteração necessária. Usa tabelas existentes:
- `client_installments` — parcelas (já tem `status`, `confirmed_at`, `amount`, `due_date`)
- `clients` — para filtro por vendedor via `lead_id → leads.assigned_to_user_id`
- `profiles` — nome do vendedor

### Server Actions

```
confirmInstallment(installmentId) → ActionResult
  - status = 'confirmada', confirmed_at = now()

advanceToProjects(clientId) → ActionResult
  - pipeline_stage = 'projetos' em clients
```

### Pipeline
- Entrada: `pipeline_stage = 'financeiro'` (setado pela confirmação do contrato)
- Saída: `pipeline_stage = 'projetos'` (botão manual em `/financeiro/[id]`)

---

## Arquitetura Geral

### Padrão de arquivos (por módulo)

```
web/
  lib/
    contratos/
      queries.ts    — getContratos(), getContratoById()
      actions.ts    — updateContractStatus()
    financeiro/
      queries.ts    — getFinanceiroPainel(), getParcelasByClient()
      actions.ts    — confirmInstallment(), advanceToProjects()
  app/(dashboard)/
    contratos/
      page.tsx                  — lista (server)
      [id]/
        page.tsx                — detalhe (server)
        ContratoDetail.tsx      — ações (client)
    financeiro/
      page.tsx                  — painel (server)
      [id]/
        page.tsx                — parcelas (server)
        ParcelasClient.tsx      — confirmação (client)
```

### Convenções herdadas
- `(supabase as any)` para tabelas/colunas fora dos tipos gerados
- `useFormState` do `react-dom` (React 18)
- Server Actions retornam `{ error?: string; success?: string }`
- Glassmorphism: dark navy, gold accent `#FFD080`, `rgba(255,255,255,0.06)` borders
- `revalidatePath` após cada mutation

---

## Migration SQL

```sql
-- web/supabase/migrations/20260618000003_contratos_financeiro.sql

alter table public.client_contracts
  add column if not exists status text not null default 'aguardando_assinatura';
```

Aplicar via Supabase Dashboard → SQL Editor antes de testar.
