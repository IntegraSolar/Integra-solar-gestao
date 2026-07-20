# Simulador Híbrido / Off-grid — Fase 3b2: Tela do simulador (parte financeira)

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 3b2 de 4 do simulador Híbrido / Off-grid

## Contexto

Estão em produção: cadastro de equipamentos (Fase 1), motor físico (2a), motor
financeiro (2b), construtor de cargas (3a) e a tela com os resultados físicos
(3b).

Esta fase acrescenta à tela as **entradas e os resultados financeiros**: tarifas,
preços do CAPEX, formação de preço, premissas do modelo, e os blocos de CAPEX,
economia, indicadores e projeção de 25 anos. Ao final, o simulador passa de
`em_construcao` para **`disponivel`** no hub.

Fases restantes: **3c** (persistência + identificação do cliente) e **4** (PDFs).

## Decisões (definidas no brainstorming)

1. **A rampa do Fio B passa a ser derivada do ano de conexão**, corrigindo uma
   deriva silenciosa (ver abaixo). O módulo é compartilhado com o simulador de
   viabilidade.
2. **Todos os campos financeiros ficam visíveis** num bloco só, sem painel
   avançado.
3. **Tarifas digitadas manualmente** (decidido na 3b) — sem acoplar ao cadastro
   de concessionárias da viabilidade.
4. **Projeção com gráfico sempre visível e tabela ano a ano recolhível.**
5. **`hibrido-offgrid` vira `disponivel` no registry** ao fim desta fase.

## A correção do Fio B

A Lei 14.300/2022 escalona a cobrança do TUSD Fio B sobre a energia injetada por
**ano-calendário**, não por ano de projeto:

| Ano | 2023 | 2024 | 2025 | 2026 | 2027 | 2028 | 2029+ |
|---|---|---|---|---|---|---|---|
| % do Fio B | 15% | 30% | 45% | 60% | 75% | 90% | 100% |

O código atual (`FIO_B_SCHEDULE_14300`, e o `PREMISSAS_DEFAULT.fioBSchedule` da
viabilidade) fixa `[0,6, 0,75, 0,9, 1, …]`, o que equivale a assumir que **o ano 1
do projeto é 2026**. Isso está correto hoje, mas uma simulação rodada em 2027
continuaria começando em 60% quando deveria começar em 75% — **superestimando a
economia dos primeiros anos**, sem nenhum sinal visível de que está errada.

**Confiança nesta tabela:** os percentuais coincidem com os que já estavam
implementados na viabilidade, o que é uma corroboração independente. Ainda
assim é dado normativo, e vale conferir contra o texto da lei antes de virar
produção — errar aqui desprecifica proposta.

**Fora de escopo:** sistemas conectados **antes** de 2023 têm direito adquirido
à compensação integral até 2045 (regra de transição da própria lei). Este
simulador vende sistemas novos, então não modela esse caso: o ano de conexão é
restrito a 2023 ou posterior na tela.

### Módulo compartilhado

`web/lib/simuladores/fio-b.ts` (puro):

- `PERCENTUAIS_FIO_B_14300` — a tabela acima, de 2023 a 2028
- `percentualFioB(ano)` — 0 antes de 2023, a tabela entre 2023 e 2028, 1 de 2029 em diante
- `fioBSchedule(anoConexao, horizonteAnos)` — o array por ano de projeto

`fioBSchedule(2026, 25)` produz exatamente o array fixo atual, então **nada muda
em 2026** — a correção só se manifesta a partir de 2027.

### Impacto no simulador de viabilidade

`PREMISSAS_DEFAULT.fioBSchedule` (em
`web/lib/simuladores/viabilidade/montar-input.ts`) passa a ser
`fioBSchedule(anoCorrente, 25)`.

Isso é seguro: `web/__tests__/viabilidade-engine.test.ts` passa o
`fioBSchedule` **explicitamente** no input, então os golden values do motor não
dependem do default. Só o teste de `montar-input` afirma o array literal, e será
reescrito para comparar contra `fioBSchedule(anoCorrente, 25)` — determinístico
e sem depender da data.

A viabilidade já faz cópia defensiva do array (`[...p.fioBSchedule]`), então não
há risco de referência compartilhada.

## Entradas

Um bloco visível, `HibridoInputsFinanceiro`, com quatro grupos:

**Tarifas** — tarifa cheia (R$/kWh), TUSD Fio B (R$/kWh), disponibilidade
(kWh/mês). Começam **em branco**: não existe padrão razoável, varia por
concessionária.

Enquanto a tarifa for zero ou vazia, a tela **suprime os blocos de resultado
financeiro** e mostra no lugar um aviso pedindo o preenchimento. Sem tarifa a
economia é zero, o que faria o VPL sair fortemente negativo — um número que
parece análise mas é só a ausência de entrada. Suprimir é mais honesto que
exibir. O CAPEX, que não depende de tarifa, continua visível.

**Preços do CAPEX** — os 8 itens. Começam **pré-preenchidos** com
`PRECOS_CAPEX_PADRAO` (módulo R$ 780, inversor R$ 11.000, bateria R$ 9.800,
estrutura R$ 180/módulo, cabeamento R$ 400/kWp, projeto e ART R$ 2.500, mão de
obra R$ 250/kWp, frete R$ 2.800). Mostrar os números é melhor que campos vazios
onde o usuário não vê o que está sendo usado.

**Formação de preço** — BDI, margem de lucro, impostos. Pré-preenchidos com os
padrões (0,15 / 0,20 / 0,06).

**Modelo** — TMA, inflação da tarifa, degradação anual, O&M anual, horizonte
(anos) e **ano de conexão** (padrão: ano corrente; mínimo 2023).

Todos os campos numéricos são `string`, seguindo a regra já estabelecida na 3b:
**campo em branco usa o default do motor**, e um `0` digitado é respeitado.

## Pontes puras

`web/lib/simuladores/hibrido/montar-financeiro.ts`:

- `CamposFinanceiro` — o que a tela coleta (todos `string`)
- `camposFinanceiroIniciais(anoConexao: number): CamposFinanceiro` — **função,
  não constante**: tarifas vazias, preços e premissas pré-preenchidos, e o ano
  de conexão vindo por parâmetro. Uma constante de módulo teria de chamar
  `new Date().getFullYear()` na carga do módulo, o que tornaria os testes
  dependentes da data. O componente passa o ano corrente; os testes passam um
  ano fixo.
- `fisicoParaFinanceiro(resultado: ResultadoHibrido): FisicoParaFinanceiro` —
  extrai os seis números que o motor financeiro precisa do resultado físico
- `montarFinanceiroInput(campos, fisico): ParamsFinanceiro` — monta preços e
  premissas com fallback campo a campo, e deriva o `fioBSchedule` do ano de
  conexão e do horizonte

`fisicoParaFinanceiro` mapeia:

| Campo financeiro | Origem no resultado físico |
|---|---|
| `numModulos` | `dimensionamento.numModulos` |
| `numInversores` | `inversor.numInversoresParalelo` |
| `numBaterias` | `baterias.numBaterias` |
| `potenciaInstaladaKwp` | `dimensionamento.potenciaInstaladaKwp` |
| `producaoAnualKwh` | `dimensionamento.producaoAnualKwh` |
| `consumoAnualKwh` | `cargas.consumoAnualKwh` |

Esse mapeamento é exatamente o tipo de coisa que erra em silêncio (trocar
`numInversoresParalelo` por outro campo não quebra nada visível), por isso tem
teste próprio.

## Resultados

Quatro componentes de exibição:

- **`HibridoResultadosCapex`** — tabela dos 8 itens (descrição, quantidade,
  custo unitário, subtotal), depois custo direto → BDI → custo com BDI →
  margem → impostos → investimento total → investimento por kWp
- **`HibridoResultadosEconomia`** — ano 1: autoconsumo e excedente (kWh),
  economia por autoconsumo, crédito do excedente, custo de disponibilidade,
  economia líquida anual e mensal
- **`HibridoIndicadores`** — VPL, TIR, payback simples, payback descontado,
  LCOE, economia acumulada em 25 anos, ROI, índice VPL/investimento.
  Paybacks podem vir `null` (não se paga no horizonte) e a tela mostra
  "não se paga no horizonte" em vez de um traço ambíguo.
- **`HibridoProjecao`** — gráfico do fluxo acumulado (nominal e descontado) ao
  longo dos anos, mais um bloco recolhível com a tabela ano a ano (26 linhas:
  ano, geração, economia, O&M, fluxo líquido, acumulado, descontado, VPL
  acumulado)

## Registry

`web/lib/simuladores/registry.ts`: `hibrido-offgrid` passa de `em_construcao`
para `disponivel`. `web/__tests__/simuladores-registry.test.ts` é atualizado —
hoje ele afirma que `hibrido-offgrid` é `em_construcao` e que os demais são
`em_breve`.

O status `em_construcao` continua existindo no tipo e no hub: nenhum simulador o
usa depois desta fase, mas ele volta a ser útil na próxima feature que nascer
incompleta.

## Estados vazios e parciais

- **Sem tarifa informada (ou zero):** os blocos de economia, indicadores e
  projeção são suprimidos e substituídos por um aviso. O CAPEX permanece, por
  não depender de tarifa.
- **Sem equipamentos ou sem cargas:** o resultado físico já vem zerado (Fase
  2a), então o CAPEX cai para os itens de valor fixo e os indicadores ficam
  zerados — sem `NaN`, garantido pelo motor da Fase 2b.
- **Payback `null`:** exibido como "não se paga no horizonte".

## Testes

### Puros (ambiente node)

`web/__tests__/fio-b.test.ts`:
- `percentualFioB` para 2022, 2023, 2025, 2026, 2028, 2029, 2035
- `fioBSchedule(2026, 25)` é exatamente `[0.6, 0.75, 0.9, …1]` — prova que a
  correção não muda nada em 2026
- `fioBSchedule(2027, 25)` começa em 0,75
- `fioBSchedule(2030, 25)` é tudo 1
- horizonte menor que a rampa (ex.: 2 anos) devolve só 2 elementos
- o array devolvido tem exatamente `horizonteAnos` elementos

`web/__tests__/hibrido-montar-financeiro.test.ts`:
- `fisicoParaFinanceiro` extrai os seis campos das origens certas (usando um
  resultado real de `calcularHibrido`, não um objeto inventado)
- campos em branco caem nos defaults do motor; preenchidos sobrepõem
- `fioBSchedule` derivado do ano de conexão chega às premissas
- horizonte customizado muda o tamanho do schedule

`web/__tests__/viabilidade-montar-input.test.ts` (modificado):
- o default passa a ser comparado contra `fioBSchedule(anoCorrente, 25)`
- a cópia defensiva continua verificada

### De componente (jsdom)

`web/__tests__/hibrido-financeiro-ui.test.tsx`:
- `HibridoInputsFinanceiro`: preços vêm pré-preenchidos; editar propaga; tarifas
  começam vazias
- supressão sem tarifa: com tarifa vazia, os blocos de indicadores e projeção
  não são renderizados e o aviso aparece; informar a tarifa faz os blocos surgirem
- `HibridoIndicadores`: payback `null` aparece como "não se paga no horizonte"
- `HibridoResultadosCapex`: soma dos subtotais confere com o custo direto exibido
- integração: com tarifa e equipamentos informados, o **VPL exibido bate com o
  que `calcularFinanceiro` devolve** para os mesmos campos — mesmo padrão da 3b

## Fora de escopo

- Identificação do cliente e persistência — Fase 3c
- PDFs — Fase 4
- Modelagem de direito adquirido (sistemas conectados antes de 2023)
- Financiamento do investimento (o simulador de parcelamento no cartão cobre)
- Puxar tarifa do cadastro de concessionárias — decidido contra na 3b
