# Simulador de Viabilidade — Peça 2: Tabela de Concessionárias

**Data:** 2026-07-15
**Branch:** `feat/simuladores`
**Sub-projeto:** 2 de 3 (motor ✅ → **concessionárias** → tela/PDF).
**Fonte da verdade:** aba "Premissas Básicas" da planilha `Tabela de viabilidade usinas de investimento.xlsx`.

## Objetivo

Fornecer, por empresa, a tabela de concessionárias que alimenta o motor de viabilidade
(Peça 1) — editável dentro da plataforma, pré-populada (seed) com os valores da planilha,
seguindo a convenção de cor da planilha (**amarelo = editável; cinza = calculado**).

## Decisões (do brainstorm)
- **Editável = todos os campos brutos por concessionária** (tarifas TUSD/TE/Fio B/A/P&D/TFSEE,
  demanda, ICMS, Pis/Cofins, reajuste). As colunas **calculadas** (cinza) são **recalculadas**
  pela plataforma, não gravadas (opção B).
- **Editor dentro do próprio simulador** (área de Simuladores), não em Configurações.
- **Por empresa (RLS)**, seed com ~30 concessionárias da planilha; cada empresa edita a sua.

## Escopo

### Dentro (Peça 2)
1. Tabela `simulador_concessionarias` (por org) + migration + RLS.
2. **Motor de derivação** puro: campos brutos → valores que o motor de viabilidade consome
   (fração TUSD Fio B, tarifa de locação, tarifa de demanda, etc.), com golden test da linha RGE.
3. Seed das concessionárias da planilha (script/rota de seed por empresa).
4. Rota + tela de CRUD dentro de `/simuladores` (listar, criar, editar, excluir), com a
   convenção visual amarelo/cinza.

### Fora
- Tela do simulador em si + Salvar + PDF (Peça 3) — ela consumirá esta tabela.
- Nada em produção; branch `feat/simuladores`; validação motor por `vitest`, UI no Preview.

## Arquitetura

### 2.1 Dados
- Migration `web/supabase/migrations/2026071500000X_simulador_concessionarias.sql`:
  tabela `simulador_concessionarias` com `id`, `organization_id`, e os **campos brutos**
  (enumerados no plano a partir da planilha: `nome`, `tusd`, `te`, `tarifa_total`,
  `tusd_fio_b`, `tusd_fio_a`, `tusd_ped`, `tusd_tfsee`, `demanda_sem_impostos`, `icms`,
  `pis_cofins`, `reajuste_label`, `aplica_reajuste`, …), `created_at/updated_at`.
- RLS por `organization_id` (padrão `get_my_org_ids()`), como as demais tabelas multi-tenant.
- **[AÇÃO MANUAL]** rodar a migration no SQL Editor.

### 2.2 Motor de derivação (puro, testável)
- `web/lib/simuladores/viabilidade/concessionaria.ts`:
  `derivarConcessionaria(bruto): ConcessionariaDerivada` — porta as colunas calculadas da
  planilha (frações Fio B/A/P&D/TFSEE, tarifas com impostos, demanda com impostos).
- `concessionariaParaInputs(bruto)` devolve os campos que o `ViabilidadeInput` (Peça 1)
  espera: `tusdFioB` (fração), `tarifaLocacaoBase`, `tarifaDemanda`, e (GD3) fioA/peD/tfsee.
- **Golden test** com a linha RGE: entrada bruta da planilha → `tusdFioB≈0.36917`,
  `tarifaLocacaoBase≈0.8222`, `tarifaDemanda≈16.9833` (valores I20/U20/Y20 do Excel).

### 2.3 Seed
- `web/lib/simuladores/viabilidade/concessionarias-seed.ts`: constante com as ~30
  concessionárias e seus campos brutos, extraídos da planilha (B4:AA…).
- Ação/rota que popula `simulador_concessionarias` para uma empresa a partir do seed
  (idempotente; só insere as que faltam). Estratégia de disparo (no primeiro acesso à tela,
  ou botão "restaurar padrão") definida no plano.

### 2.4 UI (dentro de /simuladores)
- Rota `web/app/(dashboard)/simuladores/viabilidade/concessionarias/page.tsx` (ou similar),
  protegida pelo mesmo gate `isSimuladoresEnabled()` da fundação.
- Lista das concessionárias da empresa + formulário de edição: campos **brutos** editáveis
  (destaque amarelo) e campos **derivados** exibidos read-only (cinza), recalculados ao vivo
  por `derivarConcessionaria`.
- Server Actions de CRUD com Zod + escopo de org (padrão do projeto).

## Testes
- `concessionaria.ts`: golden test da derivação (linha RGE) — garante fidelidade ao Excel.
- CRUD: validação Zod (campos numéricos ≥ 0) — testes de unidade nas funções puras.
- UI/seed/RLS: verificação no Preview do Vercel.

## Dependências
- Consome o contrato de `ViabilidadeInput` (Peça 1, pronto).
- É consumida pela Peça 3 (a tela do simulador escolhe uma concessionária → deriva → chama o motor).

## Pendências a pinar no plano
- Lista **exata** dos campos brutos e as **fórmulas de derivação** das colunas calculadas
  (extrair de "Premissas Básicas": I,K,M,O,P frações; S,T,U,V,W,X,Y,Z com impostos), com a
  linha RGE como golden.
- Estratégia de seed (primeiro acesso vs. botão) e de "restaurar padrão".
