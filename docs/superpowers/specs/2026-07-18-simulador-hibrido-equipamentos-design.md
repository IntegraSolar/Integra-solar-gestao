# Simulador Híbrido / Off-grid — Fase 1: Cadastro de Equipamentos

**Data:** 2026-07-18
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 1 de 4 do simulador Híbrido / Off-grid

## Contexto

O simulador Híbrido / Off-grid (`hibrido-offgrid`, hoje `em_breve` no
registry) será construído a partir de uma planilha de engenharia de 12 abas
(dimensionamento FV, baterias, inversor, cargas, financeiro 25 anos, memorial
e relatório). Dado o tamanho, o trabalho foi decomposto em 4 fases, cada uma
com spec → plano → implementação próprios:

1. **Cadastro de equipamentos** (este spec)
2. Motor de cálculo puro (dimensionamento FV + baterias + inversor + financeiro)
3. Tela do simulador (projeto + cargas + resultados ao vivo)
4. PDFs (Memorial descritivo + Relatório executivo)

A ordem foi escolhida pelo usuário: o cadastro vem primeiro para que o motor
(fase 2) seja validado com specs de equipamentos reais.

Esta fase espelha o padrão já existente no projeto para configuração de
simuladores: `simulador_cartao_tabelas` (cartão) e `simulador_concessionarias`
(viabilidade) — migration org-scoped com RLS, server actions com Zod +
auditoria + `revalidatePath`, e um componente "Manager" de CRUD.

## Objetivo desta fase

Permitir que cada organização mantenha um catálogo próprio de painéis,
inversores e baterias, que alimentará os dropdowns de seleção do simulador nas
fases seguintes. Nesta fase **não há cálculo** — apenas persistência, CRUD e
tela de gestão.

## Decisões (definidas no brainstorming)

- **3 tabelas separadas** (colunas muito distintas entre os tipos).
- **Multi-tenant**, org-scoped, com RLS idêntica ao padrão do cartão.
- **Começa vazio** — sem seed de exemplos por organização.
- **Teto generoso**: 100 itens por tipo por organização (imposto na action).
- Unidades **guardadas exatamente como a planilha** (Efic./DOD/SOC como
  inteiros de percentual; coeficientes térmicos como fração por °C), para que o
  motor da fase 2 reproduza os golden values sem conversões extras.
- Acesso nesta fase: card do hub fica clicável via novo status
  `em_construcao`, abrindo a página do simulador "em construção" que dá acesso
  ao Cadastro de equipamentos.

## 1. Banco de dados

Migration: `web/supabase/migrations/20260718000001_simulador_equipamentos.sql`

Três tabelas, cada uma no molde de `simulador_cartao_tabelas`:
`id uuid PK`, `organization_id uuid NOT NULL REFERENCES organizations(id) ON
DELETE CASCADE`, `created_at`/`updated_at timestamptz NOT NULL DEFAULT now()`,
índice em `organization_id`, RLS habilitada com a política
`"org members can manage ..."` (FOR ALL, `organization_id IN (SELECT
organization_id FROM organization_members WHERE user_id = auth.uid())`).

### `simulador_equip_paineis`

| coluna | tipo | obrigatório | observação |
|---|---|---|---|
| fabricante | text | sim | |
| modelo | text | sim | usado como chave de seleção no motor |
| potencia_wp | numeric | sim | |
| voc | numeric | sim | tensão de circuito aberto (V) |
| vmp | numeric | sim | tensão de máxima potência (V) |
| isc | numeric | sim | corrente de curto (A) |
| imp | numeric | sim | corrente de máxima potência (A) |
| area_m2 | numeric | sim | sem fallback → necessário p/ área total |
| coef_pmp | numeric | não | fração/°C (ex.: -0.0029); fallback nas Premissas |
| coef_voc | numeric | não | fração/°C; fallback -0.003 |
| noct | numeric | não | °C; fallback NOCT padrão |
| eficiencia | numeric | não | percentual inteiro (ex.: 23) |
| peso_kg | numeric | não | |
| garantia_anos | integer | não | |

### `simulador_equip_inversores`

| coluna | tipo | obrigatório | observação |
|---|---|---|---|
| fabricante | text | sim | |
| modelo | text | sim | |
| tipo | text | sim | CHECK IN ('Híbrido','Off-grid','On-grid') |
| pot_ca_nom_w | numeric | sim | potência CA nominal (W) |
| mppt_min_v | numeric | sim | janela MPPT mínima (V) |
| mppt_max_v | numeric | sim | janela MPPT máxima (V) |
| tensao_cc_max_v | numeric | sim | tensão CC máxima FV (V) |
| num_mppt | integer | sim | |
| corr_max_mppt_a | numeric | sim | corrente máx por MPPT (A) |
| pot_fv_max_wp | numeric | sim | potência FV máx (Wp) |
| pot_surge_w | numeric | não | potência de pico/surge (W) |
| tensao_cc_bat_v | numeric | não | tensão CC bateria (V); fallback 48 |
| eficiencia | numeric | não | percentual inteiro (ex.: 97) |
| backup | boolean | não | default false |
| paralelismo | integer | não | nº máx de unidades em paralelo |

### `simulador_equip_baterias`

| coluna | tipo | obrigatório | observação |
|---|---|---|---|
| fabricante | text | sim | |
| modelo | text | sim | |
| tecnologia | text | sim | CHECK IN ('LiFePO4','Lítio NMC','Chumbo-ácido','Gel','AGM') |
| tensao_v | numeric | sim | |
| capacidade_ah | numeric | sim | |
| energia_kwh | numeric | não | se vazia, motor calcula tensao_v×capacidade_ah/1000 |
| corr_max_a | numeric | não | corrente máx de descarga (A) |
| corr_recom_a | numeric | não | corrente recomendada (A) |
| dod | numeric | não | percentual inteiro (ex.: 90); fallback por tecnologia |
| soc_min | numeric | não | percentual inteiro (ex.: 10); fallback Premissas |
| ciclos | integer | não | vida em ciclos |
| eficiencia | numeric | não | percentual inteiro round-trip (ex.: 94) |
| garantia_anos | integer | não | |

CHECK constraints de `tipo` e `tecnologia` no schema. Sem seed.

## 2. Server actions

Arquivo: `web/lib/simuladores/equipamentos/equipamentos-actions.ts`
(`'use server'`), um único módulo com CRUD dos três tipos, no estilo de
`cartao/tabelas-actions.ts`.

- Tipos exportados: `EquipPainel`, `EquipInversor`, `EquipBateria` e seus
  `EquipPainelData` / `EquipInversorData` / `EquipBateriaData` (via
  `z.infer`).
- Um Zod schema por tipo. Obrigatórios/opcionais conforme as tabelas acima;
  campos numéricos com `z.coerce.number()`, percentuais e coeficientes sem
  conversão (guardados como digitados). `tipo`/`tecnologia` como `z.enum(...)`.
- Helper `requireOrg()` (copiado do padrão): resolve `organization_id` do
  usuário atual ou `{ error }`.
- Helpers `rowTo*` / `*ToRow` por tipo (mapeamento snake_case ↔ camelCase).
- Funções por tipo: `listPaineis` / `createPainel` / `updatePainel` /
  `deletePainel`, e equivalentes para inversores e baterias.
  - `list*`: ordena por `created_at asc`, retorna `[]` em erro (fail-safe).
  - `create*`: valida com Zod; conta itens do tipo na org e rejeita se
    `>= 100` (`Máximo de 100 <tipo> por empresa.`); insere; `logAction`;
    `revalidatePath(ROUTE)`.
  - `update*` / `delete*`: sempre com `.eq('organization_id', ctx.orgId)`
    além do `id` (isolamento); `logAction`; `revalidatePath`.
- `ROUTE = '/simuladores/hibrido-offgrid/equipamentos'`.

## 3. Tela de gestão

Componente: `web/components/simuladores/EquipamentosManager.tsx` (client),
recebe `{ paineis, inversores, baterias }` iniciais via props.

- **3 abas** (Painéis / Inversores / Baterias), estado de aba local.
- Cada aba: tabela dos itens cadastrados (colunas principais) + form
  inline de criação/edição, no visual de `CartaoTabelasManager` (mesmas
  classes de tema `var(--theme-*)`, toasts de sucesso/erro a partir do
  `ActionResult`).
- Campos opcionais visualmente marcados (ex.: sufixo "(opcional)").
- Estado vazio por aba com instrução ("Cadastre seu primeiro painel…").
- Ações chamam as server actions; em sucesso, atualizam a lista local e
  exibem toast; em erro, exibem a mensagem retornada.

## 4. Rota e acesso

- `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` — guard
  `isSimuladoresEnabled()` → `redirect('/simuladores')`. Renderiza uma
  página "em construção" que apresenta apenas o card/link para **Cadastro de
  equipamentos** (`/simuladores/hibrido-offgrid/equipamentos`). Os
  resultados/motor chegam nas próximas fases.
- `web/app/(dashboard)/simuladores/hibrido-offgrid/equipamentos/page.tsx` —
  guard `isSimuladoresEnabled()` → `redirect('/simuladores')`; carrega os 3
  `list*` e renderiza `<EquipamentosManager ... />`.
- `web/lib/simuladores/registry.ts` — novo status
  `SimuladorStatus = 'disponivel' | 'em_construcao' | 'em_breve'`; o item
  `hibrido-offgrid` passa a `em_construcao`.
- `web/components/simuladores/SimuladoresHub.tsx` — cards com status
  `disponivel` **ou** `em_construcao` viram `Link`; badge distinta para
  `em_construcao` (ex.: "em construção", cor âmbar). `em_breve` continua não
  clicável.

## 5. Testes

Arquivo: `web/__tests__/equipamentos-actions.test.ts`, no padrão de
`cartao-calculo.test.ts` / `simuladores-registry.test.ts`.

- Validação Zod: rejeita quando falta campo obrigatório; aceita item mínimo
  válido por tipo; rejeita `tipo`/`tecnologia` fora do enum.
- Enforcement do teto de 100 por tipo (mock do count).
- Mapeamento `rowTo*`/`*ToRow` ida-e-volta preserva valores (incluindo
  opcionais nulos e percentuais/coeficientes sem conversão).

Sem golden de cálculo nesta fase (isso pertence ao motor, fase 2).

## Fora de escopo (fases futuras)

- Motor de cálculo (dimensionamento, financeiro) — fase 2.
- Tela de inputs do projeto e simulação de cargas — fase 3.
- Geração de PDFs (Memorial, Relatório) — fase 4.
- Premissas configuráveis (constantes de perda/térmicas/financeiras): por ora
  serão constantes no motor (fase 2); tornar editáveis é decisão futura.
