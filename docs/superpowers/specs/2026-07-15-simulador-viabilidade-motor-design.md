# Simulador de Viabilidade (Usinas de Investimento) — Peça 1: Motor de Cálculo

**Data:** 2026-07-15
**Branch:** `feat/simuladores`
**Sub-projeto:** 1 de 3 (motor → concessionárias → tela/PDF). Ver [fundação](2026-07-15-simuladores-fundacao-design.md).
**Fonte da verdade:** planilha `Tabela de viabilidade usinas de investimento.xlsx` (abas Dados Técnicos, Dados Projeto, Premissas Básicas, Viabilidade).

## Objetivo

Portar **fielmente** o cálculo de viabilidade da planilha Excel para um **motor puro em TypeScript** — função sem UI e sem banco que recebe os parâmetros e devolve a projeção de 25 anos e as métricas (TIR, VPL, Payback) para dois cenários (capital próprio × com financiamento). Fidelidade comprovada por **golden tests** ancorados nos números da planilha.

## Escopo

### Dentro (Peça 1)
- Motor de cálculo puro em `web/lib/simuladores/viabilidade/`.
- Implementação de `IRR` (TIR) e `NPV` (VPL) validadas contra o Excel.
- Golden tests com o cenário RGE da planilha.

### Fora (outras peças / decidido)
- **Tabela de concessionárias** (CRUD + seed) — Peça 2. O motor recebe os valores da concessionária como input (números); de onde vêm é problema da Peça 2.
- **Tela, Salvar, PDF** — Peça 3.
- Sem alterar produção; tudo na branch `feat/simuladores`. Validação = `tsc` + `vitest` (o motor é 100% testável localmente, não depende do Preview).

## Arquitetura

Arquivos (todos novos):
- `web/lib/simuladores/viabilidade/types.ts` — tipos de entrada/saída.
- `web/lib/simuladores/viabilidade/finance.ts` — `irr()` e `npv()` puros (+ testes próprios).
- `web/lib/simuladores/viabilidade/engine.ts` — `calcularViabilidade(input): ViabilidadeResultado`.
- `web/__tests__/viabilidade-finance.test.ts` — testes de IRR/NPV.
- `web/__tests__/viabilidade-engine.test.ts` — golden test do cenário RGE.

### Contrato de entrada (`ViabilidadeInput`)
Agrupado por origem (na Peça 3, cada grupo vira campo/premissa/tabela):

```ts
type ModalidadeGD = 'GD1' | 'GD2' | 'GD3'

type ViabilidadeInput = {
  tecnico: {
    numPaineis: number          // ex.: 150
    potenciaPainelWp: number     // ex.: 600  → kWp = num*Wp/1000
    numInversores: number        // ex.: 1
    potenciaInversorKw: number   // ex.: 75
    fatorCapacidade: number      // ex.: 0.14
    modalidade: ModalidadeGD     // ex.: 'GD2'
  }
  concessionaria: {              // valores hoje obtidos por VLOOKUP em "Premissas Básicas"
    tusdFioB: number             // R$/kWh aplicado (C25 na planilha)
    tusdFioA: number             // GD3
    tusdPeD: number              // GD3
    tusdTfsee: number            // GD3
    // (demais campos usados só em GD3 / dimensionamento; enumerados no plano)
  }
  comercial: {
    valorInvestimento: number    // C27, ex.: 154413.82
    tarifaLocacaoBase: number    // C19, ex.: 0.8222 (R$/kWh)
    reajusteTarifaAnual: number  // C33, ex.: 0.08
    degradacaoAnual: number      // C34/curva, ex.: 0.015 (1º ano) + ~0.675%/ano
    tma: number                  // C35, ex.: 0.10
    descontoLocacao: number      // C20, ex.: 0.20
    opexPct: number              // C29, ex.: 0.0812 (× investimento)
    impostoPct: number           // C45, ex.: 0.045 (× receita)
    // arrendamento, disponibilidade, SUNNE/gestão: enumerados no plano
  }
  financiamento: {
    pctFinanciado: number        // C47, ex.: 0 (0 = sem financiamento)
    jurosAnual: number           // C48, ex.: 0.10
    carenciaMeses: number        // C49, ex.: 6
    prazoMeses: number           // C50, ex.: 12
  }
  fioBSchedule: number[]         // % da TUSD Fio B por ano (Lei 14.300): [0.6,0.75,0.9,1.0,...]
  horizonteAnos: number          // 25
  anoInicial: number             // 2025 (default = ano corrente na Peça 3)
}
```

### Contrato de saída (`ViabilidadeResultado`)

```ts
type LinhaProjecao = {
  ano: number
  producaoKwh: number
  tarifaLiquida: number     // R$/kWh (col N)
  receitaBruta: number      // col O
  prestacao: number         // col S (financiamento)
  opex: number              // col Y
  imposto: number           // col AA
  fluxoProprio: number      // col AB
  fluxoProprioAcum: number  // col AC
  fluxoFinanciado: number   // col AD
  fluxoFinanciadoAcum: number // col AE
}

type MetricasCenario = { tir: number; vpl: number; paybackAnos: number }

type ViabilidadeResultado = {
  kwp: number
  geracaoAnualKwh: number
  tipoUsina: 'Microusina' | 'Miniusina'   // <=75 kWp → micro
  projecao: LinhaProjecao[]                // horizonteAnos linhas
  capitalProprio: MetricasCenario          // TIR/VPL/Payback do fluxo AB
  comFinanciamento: MetricasCenario        // TIR/VPL/Payback do fluxo AD
}
```

## Golden fixture (âncora de fidelidade)

Cenário RGE exato da planilha (GD2, 90 kWp, investimento R$ 154.413,82, financiamento 0%, TMA 10%):
- **TIR (capital próprio)** = `0.21410107123012923` (21,41%)
- **VPL (capital próprio)** = `226670.96975404624`
- **Payback** = `5` anos
- Com financiamento 0% → métricas idênticas às de capital próprio.

O golden test alimenta o motor com esses inputs e exige as saídas acima (tolerância ≤ 1e-6 nas métricas; a projeção anual confere alguns anos-chave contra os valores do dump). Se bater, o motor é matematicamente idêntico ao Excel.

## Testes
- `finance.ts`: `npv` e `irr` testados contra casos conhecidos (incl. o vetor AB da planilha → 21,41%).
- `engine.ts`: golden test do cenário RGE (métricas + linhas 2025/2026/2027 conferidas).
- TDD: escrever o golden test primeiro (falha), depois implementar até passar.

## Apêndice — Mapa de fórmulas (aba "Viabilidade", fiel ao Excel)

Notação: `E` = índice do ano (0,1,2…); `^E` = potência pelo índice do ano.

**Derivados (bloco de parâmetros):**
- `kWp = numPaineis*potenciaPainelWp/1000` ; `tipoUsina = kWp<=75 ? Micro : Mini`
- `geracaoAnualBase (C9) = kWp*8760*fatorCapacidade*0.99`
- `C30 (OPEX base) = opexPct*valorInvestimento`
- `C37 = -valorInvestimento` ; `C51 = -valorInvestimento*(1-pctFinanciado)` ; `C52 = -valorInvestimento*pctFinanciado`

**Recorrência anual (colunas):**
- **F Produção:** ano1 `= C9*(1-degradacaoAnual)`; anos seguintes `= F1 * 0.993251254^E`
- **G Tarifa locação:** `= tarifaLocacaoBase*(1+reajusteTarifaAnual)^E`
- **H % Fio B:** vetor `fioBSchedule` (0.6, 0.75, 0.9, 1.0, …)
- **I TUSD Fio B:** `= modalidade=='GD1' ? 0 : tusdFioB*H*G`
- **J/K/L (GD3):** `= modalidade=='GD3' ? tusd{A,PeD,Tfsee}*fatorEscala*G : 0`
- **M:** `= SUM(I:L)`
- **N Tarifa líquida:** `= (G - M)*(1 - descontoLocacao)`
- **O Receita bruta:** `= F * N`
- **Financiamento (Price):** `R saldo = ROUND(IF((R_ant - T_ant)<=0, R_ant - T_ant, 0),5)`; `T amort = R==0?0:C52/prazoMeses`; `U juros = R*jurosAnual`; `S prestação = T+U`
- **V disponibilidade (micro):** `= micro ? -100*12*(1+reajuste)^E : 0`
- **W demanda (mini):** `= micro ? 0 : -inversorKw*12*C24*(1+reajuste)^E`
- **X arrendamento:** `= C28*-12*(1+reajuste)^E` (C28 default 0)
- **Y OPEX:** `= -C30*(1+reajuste)^E`
- **Z SUNNE/gestão:** `= (-O/12)*2 - D23*O - (micro?G24:G25)`
- **AA imposto:** `= -impostoPct*O`
- **AB fluxo próprio:** `= O+Q+W+Y+Z+AA+X`
- **AC acum próprio:** `= AB + AC_ant`
- **AD fluxo financiado:** `= O+Q+S+W+Y+Z+AA+X`
- **AE acum financiado:** `= AD + AE_ant`
- **Payback flags AG/AH:** `= acum<0 ? 1 : 0`

**Métricas:**
- `TIR próprio = IRR(AB[ano0..anoN])`
- `VPL próprio = NPV(tma, AB[ano1..anoN]) + AB[ano0]`
- `Payback próprio = SUM(AG[ano1..anoN])`
- Idem para financiado com o vetor AD.

> Nota: constantes "chumbadas" na planilha (`0.993251254` de degradação, `86.77`, fatores GD3, `D23`, `G24/G25`) serão extraídas e nomeadas no plano de implementação, com comentário citando a célula de origem.
