# Simulador Híbrido / Off-grid — Fase 2b: Motor financeiro

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 2b de 4 do simulador Híbrido / Off-grid

## Contexto

A Fase 1 (cadastro de equipamentos) e a Fase 2a (motor de cálculo físico)
estão entregues e em produção. Esta fase constrói o **motor financeiro**:
CAPEX, economia anual, fluxo de caixa de 25 anos e indicadores de viabilidade
(VPL, TIR, payback simples e descontado, LCOE, ROI).

Fonte: aba **Financeiro** da planilha de referência
(`C:\Users\PC\Desktop\Simulador de sistemas hibridos. - Copia.xlsx`).

Fases restantes depois desta: **3.** Tela do simulador · **4.** PDFs.
A aba Temporal foi descartada do produto.

## Decisões (definidas no brainstorming)

1. **Preços do CAPEX ficam por simulação, com defaults no motor.** Constantes
   `PRECOS_CAPEX_PADRAO`, sobrescritíveis por simulação na tela da Fase 3. Sem
   tabela de preços por empresa nesta fase.
2. **BDI é editável, padrão 15%.** A planilha se contradiz (aba Premissas diz
   25%, aba Financeiro aplica 15%); 15% é o valor que produz os golden values.
3. **A rampa do Fio B da Lei 14.300 é aplicada** (`[0,6, 0,75, 0,9, 1, …]`),
   como o simulador de viabilidade já faz — e não o Fio B cheio da planilha.
4. **`npv`/`irr` viram módulo compartilhado**, movidos de
   `web/lib/simuladores/viabilidade/finance.ts` para
   `web/lib/simuladores/finance.ts`.

## Consequência da decisão 3 — e como os testes lidam com ela

A planilha calcula a economia líquida do ano 1 e depois apenas a escala:
`economia_t = economia_ano1 × (1−degradação)^(t−1) × (1+inflação)^(t−1)`.
Esse atalho degrada **tudo** pela degradação dos módulos — inclusive a parcela
de autoconsumo e o custo de disponibilidade, que não degradam.

Com a rampa, o Fio B muda a cada ano, então a economia precisa ser recomposta
ano a ano (autoconsumo, excedente, tarifa, TUSD). Isso é mais correto, mas
**a planilha deixa de ser oráculo independente para o fluxo de 25 anos**.

Estratégia de validação, para não cair em golden circular (um teste que apenas
afirma o que o próprio código produz):

| O que | Como é validado |
|---|---|
| CAPEX completo | Golden da planilha — não muda |
| Componentes da economia do ano 1, com `fioBSchedule` todo 1 | Golden da planilha |
| Economia dos anos 1 e 2 **com a rampa** | Valores calculados à mão neste spec |
| `npv`, `irr`, payback, LCOE | Fluxos sintéticos calculáveis à mão |
| Projeção de 25 anos com a rampa | Asserções de propriedade (sinais, monotonicidade, faixas), não golden fixo |

Não haverá teste de golden fixo para VPL/TIR do caso real com rampa: não existe
oráculo externo para ele, e travar o número que o próprio código gera não
provaria nada.

## Arquitetura

**Refactor pontual (decisão 4):** mover `web/lib/simuladores/viabilidade/finance.ts`
para `web/lib/simuladores/finance.ts`, atualizando os dois importadores
existentes (`viabilidade/engine.ts` e `__tests__/viabilidade-finance.test.ts`).
Nenhuma mudança de comportamento; os testes existentes cobrem o módulo.

**Novos módulos** em `web/lib/simuladores/hibrido/`:

| Arquivo | Responsabilidade |
|---|---|
| `capex.ts` | Composição do investimento: 8 itens → custo direto → BDI → margem/impostos → investimento total |
| `economia.ts` | Economia de **um** ano: autoconsumo, excedente, Fio B com rampa, custo de disponibilidade |
| `financeiro.ts` | Projeção de 25 anos + indicadores; orquestra `capex` e `economia` |

**Tipos e defaults** entram nos arquivos já existentes: os tipos em `types.ts`,
e `PRECOS_CAPEX_PADRAO` / `PREMISSAS_FINANCEIRAS_PADRAO` em `premissas.ts`
(mantendo todos os defaults do motor num lugar só).

**Interface com o motor físico.** `calcularFinanceiro()` **não** chama
`calcularHibrido()`. Recebe os números físicos de que precisa como entrada
simples, o que o mantém testável isoladamente e evita que o motor físico passe
a depender de entradas financeiras:

```ts
export type FisicoParaFinanceiro = {
  numModulos: number
  numInversores: number
  numBaterias: number
  potenciaInstaladaKwp: number
  producaoAnualKwh: number
  consumoAnualKwh: number
}
```

A tela da Fase 3 chama `calcularHibrido()` e depois `calcularFinanceiro()`,
passando os campos acima a partir do resultado físico.

## Tipos de entrada

```ts
export type PrecosCapex = {
  moduloUnitario: number        // R$ por módulo
  inversorUnitario: number      // R$ por inversor
  bateriaUnitaria: number       // R$ por bateria
  estruturaPorModulo: number    // R$ por módulo
  cabeamentoPorKwp: number      // R$ por kWp
  projetoArt: number            // R$ valor único
  maoDeObraPorKwp: number       // R$ por kWp
  freteImprevistos: number      // R$ valor único
}

export type PremissasFinanceiras = {
  bdi: number                   // fração
  margemLucro: number           // fração, sobre o preço de venda
  impostos: number              // fração, sobre o preço de venda
  tma: number                   // taxa mínima de atratividade a.a.
  inflacaoTarifa: number        // reajuste anual da tarifa
  degradacaoAnual: number       // degradação dos módulos
  omAnual: number               // O&M como fração do investimento
  horizonteAnos: number
  fioBSchedule: number[]        // fração do TUSD Fio B cobrada por ano
}

export type TarifasInput = {
  tarifaKwh: number
  tusdFioBKwh: number
  disponibilidadeKwhMes: number
}
```

Defaults (`premissas.ts`):

- `PRECOS_CAPEX_PADRAO`: módulo 780 · inversor 11.000 · bateria 9.800 ·
  estrutura 180/módulo · cabeamento 400/kWp · projeto e ART 2.500 ·
  mão de obra 250/kWp · frete e imprevistos 2.800
- `PREMISSAS_FINANCEIRAS_PADRAO`: bdi 0,15 · margem 0,20 · impostos 0,06 ·
  tma 0,08 · inflação 0,08 · degradação 0,005 · O&M 0,01 · horizonte 25 ·
  `fioBSchedule` `[0.6, 0.75, 0.9, …1 até completar 25]`

## capex.ts

Itens e quantidades (quantidade vem do motor físico):

| Item | Quantidade | Preço |
|---|---|---|
| Módulos fotovoltaicos | `numModulos` | `moduloUnitario` |
| Inversor / híbrido | `numInversores` | `inversorUnitario` |
| Banco de baterias | `numBaterias` | `bateriaUnitaria` |
| Estrutura de fixação | `numModulos` | `estruturaPorModulo` |
| Cabeamento, conectores e proteções | `potenciaInstaladaKwp` | `cabeamentoPorKwp` |
| Projeto, ART e homologação | 1 | `projetoArt` |
| Mão de obra / instalação | `potenciaInstaladaKwp` | `maoDeObraPorKwp` |
| Frete, deslocamento e imprevistos | 1 | `freteImprevistos` |

Cálculo:

- `custoDireto` = Σ dos subtotais
- `valorBdi` = `custoDireto × bdi`
- `custoComBdi` = `custoDireto + valorBdi`
- `denominador` = `1 − margemLucro − impostos`
- `investimentoTotal` = `denominador > 0 ? custoComBdi / denominador : custoComBdi`
- `valorMargem` = `investimentoTotal × margemLucro`
- `valorImpostos` = `investimentoTotal × impostos`
- `investimentoPorKwp` = `potenciaInstaladaKwp > 0 ? investimentoTotal / potenciaInstaladaKwp : 0`

Margem e impostos incidem sobre o **preço de venda**, não sobre o custo — daí o
*gross-up* pelo denominador. A guarda `denominador > 0` reproduz a da planilha
e evita divisão por zero ou negativa quando margem + impostos ≥ 100%.

O resultado expõe também a lista de itens (`descricao`, `quantidade`,
`custoUnitario`, `subtotal`) para a tela e o PDF montarem a tabela.

## economia.ts

`calcularEconomiaAno(ano, params)` — `ano` é 1-indexado.

- `fatorInflacao` = `(1 + inflacaoTarifa)^(ano−1)`
- `geracaoKwh` = `producaoAnualKwh × (1 − degradacaoAnual)^(ano−1)`
- `autoconsumoKwh` = `min(geracaoKwh, consumoAnualKwh)`
- `excedenteKwh` = `max(0, geracaoKwh − consumoAnualKwh)`
- `tarifaAno` = `tarifaKwh × fatorInflacao`
- `fatorFioB` = `fioBSchedule[ano−1] ?? 1`
- `tusdAno` = `tusdFioBKwh × fatorInflacao × fatorFioB`
- `economiaAutoconsumo` = `autoconsumoKwh × tarifaAno`
- `creditoExcedente` = `excedenteKwh × max(0, tarifaAno − tusdAno)`
- `custoDisponibilidade` = `disponibilidadeKwhMes × 12 × tarifaAno`
- `economiaLiquida` = `max(0, economiaAutoconsumo + creditoExcedente − custoDisponibilidade)`

O `max(0, …)` na economia líquida e no crédito reproduz a planilha: a economia
nunca é negativa, e o crédito por excedente é zero se o Fio B superar a tarifa.

## financeiro.ts

`calcularFinanceiro(params)` produz a projeção e os indicadores.

**Ano 0:** `fluxoLiquido = −investimentoTotal`; acumulado, descontado e VPL
acumulado iguais a ele.

**Ano t (1..horizonte):**

- `geracaoKwh`, `economiaLiquida` — de `calcularEconomiaAno(t, …)`
- `custoOm` = `omAnual × investimentoTotal × (1 + inflacaoTarifa)^(t−1)`
- `fluxoLiquido` = `economiaLiquida − custoOm`
- `fluxoAcumulado` = acumulado anterior + `fluxoLiquido`
- `fluxoDescontado` = `fluxoLiquido / (1 + tma)^t`
- `vplAcumulado` = VPL acumulado anterior + `fluxoDescontado`

**Indicadores:**

- `vpl` = `vplAcumulado` do último ano
- `tir` = `irr([fluxo0, fluxo1, …, fluxoN])` (módulo compartilhado)
- `paybackSimplesAnos` — interpolação no `fluxoAcumulado`
- `paybackDescontadoAnos` — mesma interpolação no `vplAcumulado`
- `lcoe` = `(investimentoTotal + Σ custoOm_t/(1+tma)^t) / Σ geracaoKwh_t/(1+tma)^t`
- `economiaAcumulada` = `Σ economiaLiquida_t`
- `roi` = `Σ fluxoLiquido_t (t ≥ 1) / investimentoTotal`
- `indiceVplInvestimento` = `vpl / investimentoTotal`

**Fórmula do payback** (a planilha tinha o número digitado, não fórmula; esta
fórmula foi deduzida e confere com os valores dela — ver "Origem das fórmulas"):

Seja `n` o último ano cujo acumulado ainda é negativo, considerando o ano 0
(cujo acumulado é `−investimentoTotal`, sempre negativo quando há
investimento). Então:

`payback = n + |acumulado_n| / fluxo_{n+1}`

Com `n = 0` a fórmula já dá o caso "se paga dentro do primeiro ano"
(`investimentoTotal / fluxo_1`), sem precisar de regra especial.

Casos de borda:
- Nunca cruza zero dentro do horizonte → `null`
- `fluxo_{n+1} <= 0` → `null` (não há como interpolar)
- `investimentoTotal === 0` → `0`

Tipo de retorno: `number | null`, e a tela mostra "não se paga no horizonte"
quando `null`.

## Origem das fórmulas de payback e LCOE

Na planilha, `Financeiro!L40` (payback simples), `L41` (descontado) e `L42`
(LCOE) são **valores digitados, não fórmulas**. As fórmulas acima foram
deduzidas e conferidas contra esses valores:

- Payback simples: acumulado do ano 6 = −13.232,08; fluxo do ano 7 =
  16.243,96 → `6 + 13.232,08/16.243,96 = 6,814584642`, igual ao valor da
  planilha (6,814584642371175).
- Payback descontado: VPL acumulado do ano 9 = −3.434,96; fluxo descontado do
  ano 10 = 9.324,34 → `9 + 3.434,96/9.324,34 = 9,368386334`, igual ao da
  planilha (9,368386334054449).
- LCOE: `(89.681,35 + Σ O&M descontado) / Σ geração descontada ≈ 0,76156`,
  contra 0,7615572174424095 na planilha.

## Testes

Arquivos: `web/__tests__/hibrido-capex.test.ts`,
`hibrido-economia.test.ts`, `hibrido-financeiro.test.ts`.
Fixture reutilizada: `web/__tests__/fixtures/hibrido-fixture.ts`, acrescida dos
números físicos do projeto de teste e das tarifas.

### CAPEX — golden da planilha (não muda)

Com `numModulos` 16, `numInversores` 1, `numBaterias` 2,
`potenciaInstaladaKwp` 9,92 e os preços padrão:

| Grandeza | Valor |
|---|---|
| Subtotal módulos | 12.480 |
| Subtotal inversor | 11.000 |
| Subtotal baterias | 19.600 |
| Subtotal estrutura | 2.880 |
| Subtotal cabeamento | 3.968 |
| Subtotal projeto/ART | 2.500 |
| Subtotal mão de obra | 2.480 |
| Subtotal frete | 2.800 |
| `custoDireto` | 57.708 |
| `valorBdi` (15%) | 8.656,199999999999 |
| `custoComBdi` | 66.364,2 |
| `investimentoTotal` | 89.681,35135135135 |
| `valorMargem` | 17.936,27027027027 |
| `valorImpostos` | 5.380,881081081081 |
| `investimentoPorKwp` | 9.040,458805579772 |

Mais um teste de borda: `margemLucro + impostos ≥ 1` faz
`investimentoTotal === custoComBdi` (guarda da planilha).

### Economia do ano 1 sem rampa — golden da planilha

Com `fioBSchedule` todo `1`, tarifa 1,22, TUSD 0,36, disponibilidade 100,
consumo anual 2.135,25 e geração anual 14.149,415366185884:

| Grandeza | Valor |
|---|---|
| `autoconsumoKwh` | 2.135,25 |
| `excedenteKwh` | 12.014,165366185884 |
| `economiaAutoconsumo` | 2.605,005 |
| `creditoExcedente` | 10.332,18221491986 |
| `custoDisponibilidade` | 1.464 |
| `economiaLiquida` | 11.473,18721491986 |

### Economia com a rampa — calculada à mão neste spec

**Ano 1** (Fio B a 60% → TUSD efetivo 0,216; tarifa 1,22):
- `creditoExcedente` = 12.014,165366185884 × (1,22 − 0,216) = **12.062,222027650628**
- `economiaLiquida` = 2.605,005 + 12.062,222027650628 − 1.464 = **13.203,227027650628**

**Ano 2** (Fio B a 75%; fator de inflação 1,08 → tarifa 1,3176, TUSD 0,2916;
geração 14.149,415366185884 × 0,995 = 14.078,668289354954; excedente
11.943,418289354954):
- `economiaAutoconsumo` = 2.135,25 × 1,3176 = **2.813,4054**
- `creditoExcedente` = 11.943,418289354954 × 1,026 = **12.253,947164878183**
- `custoDisponibilidade` = 1.200 × 1,3176 = **1.581,12**
- `economiaLiquida` = **13.486,232564878183**

Mais um teste: com o schedule padrão, o Fio B do ano 4 em diante é integral
(fator 1).

### Indicadores — fluxos sintéticos calculáveis à mão

- `irr([-1000, 500, 500, 500])` ≈ 0,2337 (conferir com `toBeCloseTo(…, 3)`)
- `irr([-100, 110])` = 0,10 exato
- Payback simples de `[-1000, 400, 400, 400]` = `2 + 200/400` = 2,5
- Payback que nunca cruza zero → `null`
- Payback com fluxo seguinte ≤ 0 → `null`
- LCOE de um caso trivial (investimento 1.000, sem O&M, geração 1.000 kWh/ano
  por 1 ano, TMA 0) = 1,0 R$/kWh

### Projeção real com a rampa — asserções de propriedade

Sem golden fixo (não há oráculo externo). O teste afirma:
- a projeção tem `horizonteAnos + 1` linhas, começando no ano 0
- ano 0: `fluxoLiquido === −investimentoTotal`
- geração é estritamente decrescente ao longo dos anos (degradação)
- economia líquida cresce do ano 1 ao 2 e do 2 ao 3 (inflação supera a rampa)
- `vpl > 0` e `0 < tir < 1` para o projeto de teste
- `paybackSimplesAnos` fica entre 1 e 25 e é menor que `paybackDescontadoAnos`
- `roi > 0` e `indiceVplInvestimento === vpl / investimentoTotal`

## Tratamento de erros

Como na Fase 2a, o motor **nunca lança exceção**:
- toda divisão é guardada (investimento zero, geração zero, horizonte zero)
- `fioBSchedule` mais curto que o horizonte → anos faltantes usam fator 1
- `horizonteAnos <= 0` → projeção só com o ano 0 e indicadores zerados/`null`
- entradas físicas zeradas (nenhum módulo) → CAPEX só com os itens de valor
  fixo, sem NaN

## Fora de escopo

- Financiamento / parcelamento do investimento (o simulador de parcelamento no
  cartão já cobre esse caso separadamente)
- Tabela de preços por empresa (decisão 1 — os preços são por simulação)
- Persistência de simulações — Fase 3
- Qualquer UI — Fase 3
- PDFs — Fase 4
