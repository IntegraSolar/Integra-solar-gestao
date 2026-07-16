# Simulador de Viabilidade — Peça 3: Tela + Salvar + PDF

**Data:** 2026-07-16
**Branch:** `feat/simuladores`
**Sub-projeto:** 3 de 3 (motor ✅ → concessionárias ✅ → **tela/Salvar/PDF**).
**Fonte da verdade:** abas "Proposta" / "Dados Projeto" / "Dados Investidor" da planilha `Tabela de viabilidade usinas de investimento.xlsx`.

## Objetivo

Fechar o Simulador de Viabilidade de usinas de investimento: uma tela dentro de
`/simuladores` que coleta os inputs, escolhe uma concessionária (Peça 2), roda o motor
(Peça 1) **ao vivo**, mostra os resultados (TIR/VPL/Payback + projeção), permite **Salvar**
a simulação (histórico standalone) e **gerar um PDF** de proposta comercial fiel à
aba "Proposta".

## Decisões (do brainstorm)
- **Layout A:** coluna de inputs à esquerda, painel de resultados **fixo (sticky) à direita**,
  recalculando a cada mudança.
- **Campos curados:** principais sempre visíveis + seção **"Premissas avançadas" recolhível**
  com defaults do cenário (editáveis).
- **Salvar = persistir standalone**: nova tabela `simulador_viabilidade` por org, **sem**
  vínculo com CRM (campos de cliente são texto livre, só para o PDF).
- **PDF = proposta completa + gráfico**: fiel à aba "Proposta", mais o gráfico do fluxo
  acumulado. Gerado com `jsPDF` + `jspdf-autotable` (padrão do projeto, `lib/financeiro/receipt-pdf.ts`).
- **GD3 "em breve"**: o motor só implementa GD1/GD2; a tela oferece só esses. GD3 entra quando
  o motor ganhar Fio A/P&D/TFSEE (a Peça 2 já deriva as frações).
- **Honestidade nos custos do PDF**: "O&M Acumulado (VP)" só entra se reproduzido por golden
  contra o Excel; senão é omitido (mesma disciplina dos `TODO` das Peças 1 e 2).

## Escopo

### Dentro (Peça 3)
1. Tabela `simulador_viabilidade` (por org) + migration + RLS.
2. Server actions: `salvarSimulacao`, `listSimulacoes`, `deleteSimulacao` (Zod + org + `logAction`).
3. Rota + tela `SimuladorViabilidade` (form curado + avançadas + resultados sticky ao vivo).
4. Geração de PDF client-side (proposta completa + gráfico vetorial).
5. Registry: `viabilidade-usina` → `disponivel`.
6. Golden test de **montagem de input** (RGE + defaults → TIR/VPL/Payback do Excel).

### Fora
- Vínculo com cliente/lead do CRM (Salvar é standalone).
- Modalidade GD3 (depende de estender o motor da Peça 1).
- Linha "O&M Acumulado (VP)" no PDF, salvo se um golden for obtido.
- Nada em produção; branch `feat/simuladores`; motor por `vitest`, UI/PDF/RLS no Preview.

## Arquitetura

### 3.1 Dados
Migration `web/supabase/migrations/20260716000001_simulador_viabilidade.sql`:
- Tabela `simulador_viabilidade`: `id`, `organization_id`, `nome` (rótulo da simulação),
  `concessionaria_id` (FK → `simulador_concessionarias`, `ON DELETE SET NULL`),
  `input` (`jsonb` — snapshot do `ViabilidadeInput`), `cliente_nome`, `cliente_cidade`
  (texto livre, só p/ o PDF), `tir`, `vpl`, `payback_anos` (resumo p/ listagem),
  `created_at`/`updated_at`.
- Índice por `organization_id`. RLS por org (padrão `organization_id IN (SELECT organization_id
  FROM organization_members WHERE user_id = auth.uid())`, como Peça 2).
- **[AÇÃO MANUAL]** rodar a migration no SQL Editor; depois regenerar `web/types/database.types.ts`.

### 3.2 Montagem de input (puro, testável)
`web/lib/simuladores/viabilidade/montar-input.ts`:
- `PREMISSAS_DEFAULT`: constantes do cenário (valores **exatos** do golden da Peça 1):
  `reajusteTarifaAnual 0.08`, `degradacaoAnual 0.015`, `tma 0.10`, `descontoLocacao 0.20`,
  `opexPct 0.081199185409699712`, `impostoPct 0.045`, `d23 0.125`, `sunneSetupMicro 5000`,
  `sunneSetupMini 10000`, `pctFinanciado 0`, `jurosAnual 0.10`, `prazoMeses 12`,
  `horizonteAnos 25`, `anoInicial 2025`,
  `fioBSchedule [0.6,0.75,0.9,1,…]` (1.0 do ano 4 em diante).
- `montarViabilidadeInput(camposTela, concessionariaBruta)`: junta os campos por-negócio
  (numPaineis, potenciaPainelWp, numInversores, potenciaInversorKw, fatorCapacidade,
  modalidade, valorInvestimento, descontoLocacao, pctFinanciado, e quaisquer premissas
  avançadas sobrescritas) com `concessionariaParaInputs(concessionariaBruta)` e os
  `PREMISSAS_DEFAULT`, produzindo um `ViabilidadeInput` completo.
- **Golden:** com concessionária **RGE** (do seed) + campos do cenário (150 painéis, 600 Wp,
  1 inversor de 75 kW, Fc 0.14, GD2, CAPEX 154413.82, desconto 0.20) + defaults →
  `calcularViabilidade` reproduz **TIR 0.21410107123012923 / VPL 226670.96975404624 / Payback 5**.

### 3.3 Server actions
`web/lib/simuladores/viabilidade/simulacoes-actions.ts` (`'use server'`):
- `salvarSimulacao(dados)`: valida (Zod), grava snapshot `input` + resumo `tir/vpl/payback` +
  `nome`/`concessionaria_id`/`cliente_*`, escopo de org, `logAction`, `revalidatePath`.
- `listSimulacoes()`: lista da org (id, nome, tir, vpl, payback, created_at).
- `deleteSimulacao(id)`: exclui com escopo de org + `logAction`.

### 3.4 Tela (dentro de /simuladores)
- Rota `web/app/(dashboard)/simuladores/viabilidade-usina/page.tsx` (Server Component):
  gate `isSimuladoresEnabled()`, carrega `listConcessionarias()` e `listSimulacoes()`,
  passa para o cliente.
- `web/components/simuladores/SimuladorViabilidade.tsx` (Client Component): layout A.
  - **Esquerda (inputs):** select de concessionária; dados técnicos (painéis, Wp, inversores,
    kW, Fc, modalidade GD1/GD2, modelos texto); investimento (CAPEX, desconto, financiamento %);
    **premissas avançadas** recolhíveis (defaults editáveis); cliente opcional (nome, cidade).
  - **Direita (sticky):** cards TIR/VPL/Payback próprio + financiado; kWp, tipo de usina,
    geração anual/mensal; gráfico do fluxo acumulado (25 anos). Recalcula ao vivo chamando
    `calcularViabilidade` (motor puro, roda no browser).
  - **Ações:** Salvar (server action) · Gerar PDF (client-side). Lista das simulações salvas
    (reabrir carrega o snapshot no form; excluir).

### 3.5 PDF
`web/lib/simuladores/viabilidade/proposta-pdf.ts` (client-side, `jsPDF`+`jspdf-autotable`):
- Blocos fiéis à aba "Proposta": cabeçalho (logo da empresa + data + validade) · cliente
  (opcional) · **UFV** (modalidade, regra GD, concessionária, kWp, kW, painel Wp, qtd painéis,
  inversor kW, qtd, Fc, geração anual/mensal, modelos) · **Premissas do projeto** (desconto,
  tarifa compensável, reajuste, indisponibilidade, TMA, imposto, OPEX, regime) · **Custos
  totais** (CAPEX; reestruturação do inversor = `reinvestAno15` do motor; vida útil 25;
  *O&M Acumulado VP só se golden*) · **Resultados** próprio e financiado (TIR/VPL/Payback) ·
  **gráfico** do fluxo de caixa acumulado desenhado com primitivas vetoriais do jsPDF (linhas/
  eixos, sem lib de chart nova) · (pág. 2) tabela de projeção 25 anos (`jspdf-autotable`).
- Logo/dados da empresa vêm da org (mesma fonte do `receipt-pdf.ts`).

## Testes
- `montar-input.ts`: **golden** RGE+defaults → TIR/VPL/Payback do Excel (reaproveita o vetor da
  Peça 1). Garante que a montagem de input da tela é fiel.
- Server actions: validação Zod (unidade nas funções puras de schema).
- Tela/PDF/RLS/Salvar: verificação no Preview do Vercel.

## Dependências
- Consome o motor (Peça 1) e a tabela de concessionárias (Peça 2), ambos prontos.
- `jsPDF`/`jspdf-autotable` já são dependências (usados em `lib/financeiro/receipt-pdf.ts`).

## Pendências a pinar no plano
- Lista **exata** dos campos por-negócio vs. avançados no form, com labels e defaults.
- Layout preciso do PDF (posições/ordem dos blocos) e algoritmo do gráfico vetorial.
- Investigar se "O&M Acumulado (VP)" é reproduzível por golden a partir da projeção do motor;
  se sim, incluir com teste; se não, omitir a linha.
- Estratégia de "reabrir" simulação salva (carregar `input` jsonb de volta no form).
