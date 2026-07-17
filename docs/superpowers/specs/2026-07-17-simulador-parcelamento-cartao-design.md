# Simulador de Parcelamento no Cartão — Design

**Data:** 2026-07-17
**Branch:** `feat/simuladores` (continua na mesma frente dos simuladores).
**Fonte da verdade:** planilha de parcelamento do usuário (fórmulas `=$B$5*(1+D9)` e `=E9/(LIN()-3)`).

## Objetivo

Simulador que, a partir do valor de uma proposta e de uma entrada, mostra ao cliente as
opções de parcelamento no cartão de crédito (1x…Nx) com taxa, valor total e valor da
parcela — em até 3 tabelas comparáveis (ex.: Visa/Amex × Master/Elo) — e gera um PDF.
As tabelas de taxa são configuradas uma vez por empresa e reutilizadas.

## Decisões (do brainstorm)
- **Cálculo (confirmado contra a planilha do usuário):**
  - Repassando a taxa: `valorTotal = valorParcelar × (1 + taxa)`; `valorParcela = valorTotal ÷ parcelas`.
  - Sem repassar: `valorTotal = valorParcelar`; `valorParcela = valorParcelar ÷ parcelas` (taxa só como referência).
  - `valorParcelar = max(0, proposta − entrada)`.
- **Tabelas de taxa salvas por empresa** (reutilizáveis), **máximo 3**.
- **Sem histórico de simulações** — a simulação apenas gera PDF; só as tabelas de taxa são persistidas.
- **Repasse = 1 toggle único** por simulação (vale para todas as tabelas exibidas).
- **Layout: tabelas lado a lado** (empilha em telas pequenas).
- **Máx. de parcelas por tabela: 24.**
- **PDF** reaproveita `getEmpresaParaProposta` (loader de `org_config` + logo, já pronto da Viabilidade).

## Escopo

### Dentro
1. Cálculo puro `calcularTabelaCartao` + golden test.
2. Tabela `simulador_cartao_tabelas` (por org, máx. 3) + migration + RLS + tipos.
3. Server actions CRUD das tabelas (Zod + escopo de org + `logAction`).
4. Tela de configuração das tabelas (CRUD com grid de taxas).
5. Tela do simulador (inputs + tabelas lado a lado ao vivo + PDF).
6. PDF client-side (jsPDF + autotable).
7. Registry: `parcelamento-cartao` → `disponivel`.

### Fora
- Histórico de simulações (só-PDF).
- Split real entre 2 cartões (é só texto na observação).
- Nada em produção; validação por `vitest` (cálculo) e no app rodando (UI/PDF/RLS).

## Arquitetura

### 3.1 Cálculo (puro, testável)
`web/lib/simuladores/cartao/calculo.ts`:
```
type OpcaoParcelamento = { parcelas: number; taxa: number; valorTotal: number; valorParcela: number }
calcularTabelaCartao(valorParcelar: number, taxas: Record<number, number>, repassar: boolean): OpcaoParcelamento[]
```
- `taxas` é `{ 1: 0.031, 6: 0.0669, ... }` — **taxa em fração** (0.0669 = 6,69%). Chaves = nº de parcelas.
- Retorna uma linha por chave de `taxas`, em ordem crescente de parcelas.
- **Golden:** `valorParcelar = 1000`, `taxas = { 6: 0.0669 }`, `repassar = true` →
  `valorTotal = 1066.90`, `valorParcela = 177.8166…`; com `repassar = false` →
  `valorTotal = 1000`, `valorParcela = 166.666…`. (Mesma fórmula do print: `V×(1+0,0669)` e `÷6`.)

### 3.2 Dados
Migration `web/supabase/migrations/2026071700000X_simulador_cartao_tabelas.sql`:
- Tabela `simulador_cartao_tabelas`: `id`, `organization_id`, `nome` (text, cabeçalho da tabela),
  `max_parcelas` (int, 1–24), `observacao` (text, nullable), `taxas` (jsonb — `{ "N": fração }`),
  `ordem` (int, para dispor as até 3), `created_at`/`updated_at`.
- Índice por `organization_id`. RLS por org (padrão `organization_id IN (SELECT organization_id
  FROM organization_members WHERE user_id = auth.uid())`).
- Limite de 3 por empresa é imposto na server action (não no schema).
- **[AÇÃO MANUAL]** rodar a migration no SQL Editor; depois regenerar `database.types.ts`.

### 3.3 Server actions
`web/lib/simuladores/cartao/tabelas-actions.ts` (`'use server'`), padrão da Peça 2:
- `listCartaoTabelas()` → tabelas da org (ordenadas por `ordem`).
- `createCartaoTabela(data)` — valida (Zod), **recusa se já houver 3**, escopo de org, `logAction`.
- `updateCartaoTabela(id, data)` / `deleteCartaoTabela(id)` — escopo de org, `logAction`.
- Zod: `nome` obrigatório, `max_parcelas` 1–24, `taxas` objeto de frações ≥ 0, `observacao` opcional.

### 3.4 Telas (dentro de /simuladores)
Ambas protegidas por `isSimuladoresEnabled()`.
- **Config** `web/app/(dashboard)/simuladores/parcelamento-cartao/tabelas/page.tsx` + client component:
  lista + formulário (nome, máx. parcelas, observação, **grid de taxas 1x…máx** com uma taxa % por linha).
  Botão "Adicionar" desabilitado ao atingir 3 tabelas.
- **Simulador** `web/app/(dashboard)/simuladores/parcelamento-cartao/page.tsx` + client component:
  carrega `listCartaoTabelas()`; inputs (Valor da proposta, Entrada, Valor a parcelar read-only,
  switch Repassar taxa, cliente opcional nome/cidade); renderiza as tabelas **lado a lado** com
  `calcularTabelaCartao` ao vivo (colunas Plano · Taxa · Valor total · Valor da parcela). Botão
  Gerar PDF. Se não houver tabelas, aviso com link para a config.

### 3.5 PDF
`web/lib/simuladores/cartao/proposta-cartao-pdf.ts` (client-side, jsPDF+autotable):
- Cabeçalho empresa (via `getEmpresaParaProposta`) · cliente (opcional) · resumo (proposta,
  entrada, valor a parcelar, "taxa repassada ao cliente: sim/não") · uma `autoTable` por tabela
  (lado a lado quando couber; senão em sequência) com as 4 colunas · observação no rodapé de cada.

## Testes
- `calculo.ts`: golden (repassa/não repassa) reproduzindo a fórmula do print.
- Server actions: Zod + regra "máx. 3" (unidade nas funções puras de validação).
- Tela/PDF/RLS: verificação no app rodando (com o usuário logado, como na Viabilidade).

## Dependências
- `jsPDF`/`jspdf-autotable` e `getEmpresaParaProposta` já existem (Viabilidade / financeiro).
- Segue os padrões de RLS, server actions e amarelo/cinza já estabelecidos.

## Pendências a pinar no plano
- Nomes exatos de arquivos/colunas e o schema Zod completo.
- Layout preciso do grid de taxas na config (1x…máx) e das tabelas lado a lado.
- Estratégia de "não há tabelas ainda" (aviso + link, sem seed automático — as taxas são
  específicas de cada empresa, não há padrão universal para semear).
