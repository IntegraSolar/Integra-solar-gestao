# Simulador Híbrido / Off-grid — Fase 2a: Motor de cálculo físico

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 2a de 4 do simulador Híbrido / Off-grid

## Contexto

A Fase 1 (cadastro de equipamentos) está entregue e em produção. Esta fase
constrói o **motor de cálculo físico** do simulador: funções puras que
replicam a engenharia da planilha de referência
(`C:\Users\PC\Desktop\Simulador de sistemas hibridos. - Copia.xlsx`, abas
Premissas, Projeto, Cargas, Dim_FV, Baterias, Inversor).

Roadmap atualizado das fases:

1. ~~Cadastro de equipamentos~~ — concluída
2. **2a. Motor de cálculo físico** (este spec) — cargas, dimensionamento FV,
   strings, baterias, inversor, alertas
3. **2b. Motor financeiro** — CAPEX, economia, fluxo de 25 anos, VPL/TIR/
   payback/LCOE
4. **3. Tela do simulador** — inputs de projeto e cargas + resultados ao vivo
5. **4. PDFs** — Memorial descritivo + Relatório executivo

A aba **Temporal** (balanço mensal com cenários) foi **descartada do produto**
por decisão do usuário — não será implementada em nenhuma fase.

Padrão de referência no código: `web/lib/simuladores/viabilidade/engine.ts`
(input tipado → resultado tipado, sem I/O) e `finance.ts`.

## Decisões (definidas no brainstorming)

- Fase 2 dividida em **2a (física)** e **2b (financeiro)**.
- Aba Temporal **descartada**.
- Premissas são **constantes no motor** (`PREMISSAS_PADRAO`), passadas como
  parâmetro com defaults. Alguns campos ficarão editáveis **por simulação** na
  tela da Fase 3 (não persistidos por empresa). O motor não sabe quais — ele
  apenas aceita overrides.
- O motor **reutiliza** os tipos `EquipPainel` / `EquipInversor` /
  `EquipBateria` de `web/lib/simuladores/equipamentos/schemas.ts` como entrada.
- Alertas são **estruturados** (`{ codigo, severidade, mensagem, valor, limite }`),
  não strings com emoji.
- A **curva de demanda 24h é calculada de verdade**, corrigindo um defeito da
  planilha (ver "Divergência proposital").

## Arquitetura

Tudo em `web/lib/simuladores/hibrido/`. Funções puras, sem I/O, sem
`'use server'`.

| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | `Premissas`, `Carga`, `ProjetoInput`, `HibridoInput`, `Alerta`, e os tipos de resultado de cada módulo |
| `premissas.ts` | `PREMISSAS_PADRAO` + `TECNOLOGIAS_BATERIA_PARAMS` (DOD/η/ciclos/C-rate por tecnologia) |
| `cargas.ts` | Agregação da lista de cargas + curva 24h |
| `dimensionamento.ts` | PR, fator térmico, energia por módulo, potência instalada, produção |
| `strings.ts` | Tensões extremas e limites de arranjo série/paralelo |
| `baterias.ts` | Dimensionamento do banco |
| `inversor.ts` | Requisitos e compatibilidade do inversor |
| `alertas.ts` | Verificações normativas → `Alerta[]` |
| `index.ts` | `calcularHibrido(input, premissas?)` orquestrando tudo |

**Fluxo de dados:**

```
cargas ─┬─→ consumo diário / consumo crítico ──→ baterias
        └─→ pot. simultânea / partida / pico ──→ inversor
premissas + projeto + painel ──→ PR total ──→ dimensionamento FV ──→ strings
                                                     └──→ oversizing ──→ alertas
```

## Módulos e fórmulas

Todas as fórmulas abaixo vêm da planilha e são a especificação literal do
comportamento esperado.

### premissas.ts

`PREMISSAS_PADRAO` com os valores da aba Premissas, cada um comentado com sua
referência normativa:

- **Perdas:** soiling 0,03 · mismatch 0,02 · cabeamento CC 0,015 · cabeamento
  CA 0,01 · LID 0,015 · tolerância 0,01 · indisponibilidade 0,02 · eficiência
  do inversor 0,975
- **Térmicos:** NOCT padrão 45 °C · coef. Pmp padrão −0,0035 /°C · T_ref
  25 °C · G_NOCT 800 W/m² · G_projeto 1000 W/m²
- **Operacionais:** dias de autonomia 2 · SOC mín 0,2 · SOC máx 1 · eficiência
  do carregador/MPPT 0,98 · reserva técnica 0,1
- **Inversor/arranjo:** DC/AC alvo 1,15 · DC/AC máx 1,35 · DC/AC mín 1,0 ·
  fator de simultaneidade 0,7 · margem do inversor 0,25 · fator de corrente
  1,25×Isc
- **Coef. Voc padrão:** −0,003 /°C (fallback do `IFERROR` da planilha)

`TECNOLOGIAS_BATERIA_PARAMS`: por tecnologia (LiFePO4, Lítio NMC,
Chumbo-ácido, Gel, AGM), os valores de DOD recomendado, η round-trip, ciclos
de referência e C-rate contínuo, usados como fallback quando a bateria
cadastrada não informa o campo.

### cargas.ts

Entrada: `Carga[]` com `{ nome, categoria, quantidade, potenciaUnitW,
potenciaPartidaW, tensaoV, fatorPotencia, horasDia, diasSemana, horaInicio,
horaFim, prioridade, critica }`.

Saídas:
- `consumoDiarioWh` = Σ `qtd × potUnit × horasDia × (diasSemana/7)`
- `consumoMensalKwh` = `consumoDiarioWh × 30 / 1000`
- `consumoAnualKwh` = `consumoDiarioWh × 365 / 1000`
- `consumoDiarioCriticoWh` = mesma soma, filtrando `critica === true`
- `potenciaConectadaW` = Σ `qtd × potUnit`
- `potenciaSimultaneaW` = `potenciaConectadaW × simultaneidade`
- `potenciaPartidaW` = Σ `qtd × potPartida`
- `correnteA` por carga = `qtd × potUnit / (tensaoV × fatorPotencia)`,
  guardando divisão por zero (retorna 0)
- `curva24h: number[]` (24 posições, watts) — **calculada** somando
  `qtd × potUnit` de cada carga ativa naquela hora, derivado de `horaInicio` e
  `horaFim`. Cargas que atravessam a meia-noite (`horaFim <= horaInicio`, ex.
  18:00→06:00) são tratadas como ativas nas duas pontas. Uma carga cujo
  intervalo cobre parte da hora conta integralmente naquela hora (ex.
  19:00→19:30 conta na hora 19).
- `picoDemandaW` = `Math.max(...curva24h)`

### dimensionamento.ts

- `prBase` = `(1−soiling)(1−mismatch)(1−cabCC)(1−cabCA)(1−lid)(1−tolerancia)(1−indisponibilidade) × eficienciaInversor`
- `prEfetivo` = `prBase × (1−perdaSombreamento) × (1−perdaOrientacao)`
- `tempCelulaC` = `tempMediaC + (noct − 20) / gNoct × gProjeto`
- `fatorTemperatura` = `1 + coefPmp × (tempCelulaC − tempRef)`
- `prTotal` = `prEfetivo × fatorTemperatura`
- `hspDimensionamento` = `criterio === 'media_anual' ? hspMediaAnual : hspMesCritico`
- `energiaPorModuloKwhDia` = `potenciaWp/1000 × hspDimensionamento × prTotal`
- `numModulosRecomendado` = `ceil(consumoDiarioKwh / energiaPorModuloKwhDia)`
- `numModulos` = override do input, senão o recomendado
- `potenciaInstaladaKwp` = `numModulos × potenciaWp / 1000`
- `areaTotalM2` = `numModulos × areaM2`
- `producaoDiariaKwh` = `potenciaInstaladaKwp × hspDimensionamento × prTotal`
- `producaoMensalKwh[12]` = `potenciaInstaladaKwp × hspMes[i] × diasMes[i] × prTotal`
- `producaoAnualKwh` = Σ `producaoMensalKwh`
- `oversizingDcAc` = `potenciaInstaladaKwp × 1000 / potCaNomW`

O `coefPmp` e o `noct` vêm do painel cadastrado; se nulos, caem em
`premissas.coefPmpPadrao` / `premissas.noctPadrao`.

### strings.ts

- `vocTminV` = `voc × (1 + coefVoc × (tempMinC − tempRef))`
- `vmpTmaxV` = `vmp × (1 + coefVoc × ((tempMaxC + (noct−20)/gNoct × gProjeto) − tempRef))`
- `maxModulosPorString` = `floor(tensaoCcMaxV / vocTminV)`
- `minModulosPorString` = `ceil(mpptMinV / vmpTmaxV)`
- `modulosPorString` = override do input, senão `maxModulosPorString`
- `numStrings` = override, senão `ceil(numModulos / modulosPorString)`
- `tensaoStringVocTminV` = `vocTminV × modulosPorString`
- `tensaoStringVmpTmaxV` = `vmpTmaxV × modulosPorString`
- `correnteProjetoA` = `isc × fatorCorrenteIsc`
- `correntePorMpptA` = `ceil(numStrings / numMppt) × isc`
- `modulosConfigurados` = `modulosPorString × numStrings`

O `coefVoc` vem do painel; se nulo, `premissas.coefVocPadrao`.

### baterias.ts

- `dodNominal` = `bateria.dod / 100`, fallback pela tecnologia
- `socMin` = `bateria.socMin / 100`, fallback `premissas.socMin`
- `eficienciaRoundTrip` = `bateria.eficiencia / 100`, fallback pela tecnologia
- `energiaBateriaKwh` = `bateria.energiaKwh`, senão `tensaoV × capacidadeAh / 1000`
- `dodUtil` = `min(dodNominal, socMax − socMin)`
- `etaSistema` = `eficienciaRoundTrip × eficienciaCarregador`
- `energiaDiariaConsideradaKwh` = consumo total ou consumo crítico, conforme
  `baseEnergia: 'total' | 'criticas'`
- `energiaUtilNecessariaKwh` = `energiaDiariaConsideradaKwh × diasAutonomia`
- `energiaNominalBancoKwh` = `energiaUtilNecessariaKwh / (dodUtil × etaSistema)`
- `capacidadeNominalAh` = `energiaNominalBancoKwh × 1000 / tensaoBancoV`
- `bateriasSerie` = `round(tensaoBancoV / bateria.tensaoV)`
- `stringsParalelo` = `ceil(energiaNominalBancoKwh / (energiaBateriaKwh × bateriasSerie))`
- `numBaterias` = `bateriasSerie × stringsParalelo`
- `energiaInstaladaKwh` = `numBaterias × energiaBateriaKwh`
- `capacidadeBancoAh` = `stringsParalelo × capacidadeAh`
- `energiaUtilRealKwh` = `energiaInstaladaKwh × dodUtil × etaSistema`
- `autonomiaRealDias` = `energiaUtilRealKwh / energiaDiariaConsideradaKwh`
- `correnteMaxDescargaA` = `corrMaxA × stringsParalelo`
- `correnteContinuaA` = `corrRecomA × stringsParalelo`
- `cRateDescarga` = `(potenciaSimultaneaW / tensaoBancoV) / capacidadeBancoAh`
- `tempoRecargaH` = `energiaUtilRealKwh / (correnteContinuaA × tensaoBancoV / 1000)`
- `vidaUtilAnos` = `ciclos / 365`

`tensaoBancoV` vem do input; default = `inversor.tensaoCcBatV`, e 48 se nulo.

### inversor.ts

- `potenciaCaMinimaW` = `potenciaSimultaneaW × (1 + margemInversor)`
- `folgaPotenciaW` = `potCaNomW − potenciaCaMinimaW`
- `utilizacaoContinua` = `potenciaSimultaneaW / potCaNomW`
- `relacaoSurgePartida` = `potSurgeW / potenciaPartidaW`
- `usoEntradaFv` = `potenciaInstaladaW / potFvMaxWp`
- `numInversoresParalelo` = `ceil(potenciaCaMinimaW / potCaNomW)`
- `potenciaCaTotalW` = `numInversoresParalelo × potCaNomW`

### alertas.ts

Cada verificação vira um `Alerta`:

| código | condição de erro | severidade |
|---|---|---|
| `SOBRETENSAO` | `tensaoStringVocTminV > tensaoCcMaxV` | erro |
| `SUBTENSAO_MPPT` | `tensaoStringVmpTmaxV < mpptMinV` | erro |
| `CORRENTE_MPPT` | `correntePorMpptA > corrMaxMpptA` | erro |
| `OVERSIZING_ALTO` | `oversizingDcAc > dcAcMax` | aviso |
| `SUBDIMENSIONADO_FV` | `oversizingDcAc < dcAcMin` | aviso |
| `POT_FV_EXCEDE` | `potenciaInstaladaW > potFvMaxWp` | erro |
| `CONFIG_DIVERGE` | `modulosConfigurados !== numModulos` | aviso |
| `GERACAO_INSUFICIENTE` | `producaoDiariaKwh < consumoDiarioKwh` | aviso |
| `POTENCIA_CONTINUA` | `potenciaSimultaneaW > potCaNomW` | erro |
| `SURGE_INSUFICIENTE` | `potSurgeW < potenciaPartidaW` | erro |
| `TENSAO_BANCO` | `tensaoBancoV !== inversor.tensaoCcBatV` | aviso |
| `CRATE_EXCEDIDO` | `potenciaSimultaneaW / tensaoBancoV > correnteContinuaA` | aviso |
| `AUTONOMIA_ABAIXO` | `autonomiaRealDias < diasAutonomia` | aviso |
| `TIPO_INVERSOR` | tipo do inversor incompatível com o tipo de sistema | aviso |
| `DADOS_INSUFICIENTES` | falta painel/inversor/bateria ou HSP/consumo zero | erro |

Regra de emissão, em três casos:

1. **Condição de erro satisfeita** → alerta emitido com a severidade da tabela
   (`erro` ou `aviso`), com `valor` e `limite` preenchidos.
2. **Condição não satisfeita, entradas presentes** → alerta emitido com
   severidade `ok`, para que a tela mostre o checklist completo de
   verificações, como a planilha faz.
3. **Entradas ausentes para avaliar a verificação** (ex.: nenhum inversor
   selecionado, logo não há como checar `SOBRETENSAO`) → o alerta **não é
   emitido**. Nesse caso vale o `DADOS_INSUFICIENTES` geral.

## Divergência proposital em relação à planilha

**Curva de demanda 24h e pico.** Na planilha, `Cargas!U17:U40` são o valor
fixo `240` digitado nas 24 linhas — não há fórmula ligando as cargas às suas
horas de início/fim. Consequência: `Pico de demanda (24h)` = 240 W, número que
alimenta o dimensionamento do inversor e que é claramente incorreto (só o
chuveiro do projeto de teste é 5.500 W).

O motor **calcula a curva de verdade**. No projeto de teste, às 19h coincidem
lâmpadas (240 W, 18h→06h), TV (55 W, 18h→22h) e chuveiro (5.500 W,
19:00→19:30), resultando em **pico = 5.795 W**. O teste correspondente afirma
5.795 W com um comentário explicando a correção.

Nenhuma outra saída diverge da planilha.

## Testes

Arquivo: `web/__tests__/hibrido-motor.test.ts` (vitest, padrão de
`cartao-calculo.test.ts`).

Fixture: o projeto de teste da planilha — Palmas/TO, HSP mensal
`[4.75, 4.71, 4.70, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78]`,
temperaturas 27/38/22 °C, sombreamento 0,03, orientação 0,02; painel OSDA
MHDRZ 620 Wp; inversor DEYE SUN 8K; bateria ZTRON 48 V/150 Ah; três cargas
(TV 55 W 18–22h; chuveiro 5.500 W 19:00–19:30; 20 lâmpadas 12 W 18–06h).

Golden values travados pelos testes:

| Grandeza | Valor |
|---|---|
| `prBase` | 0,8637167691269617 |
| `prEfetivo` | 0,8210491607320898 |
| `tempCelulaC` | 58,25 |
| `fatorTemperatura` | 0,903575 |
| `prTotal` | 0,7418794954084981 |
| `energiaPorModuloKwhDia` | 2,1618368496203635 |
| `numModulosRecomendado` | 3 |
| `potenciaInstaladaKwp` (16 mód.) | 9,92 |
| `areaTotalM2` | 43,2 |
| `producaoDiariaKwh` | 34,589389593925816 |
| `producaoAnualKwh` | 14149,415366185884 |
| `oversizingDcAc` | 1,24 |
| `vocTminV` | 49,448100000000004 |
| `vmpTmaxV` | 36,233137500000005 |
| `maxModulosPorString` | 10 |
| `minModulosPorString` | 4 |
| `tensaoStringVocTminV` (8 mód.) | 395,58480000000003 |
| `correnteProjetoA` | 20,099999999999998 |
| `consumoDiarioWh` | 5850 |
| `consumoDiarioCriticoWh` | 2880 |
| `potenciaConectadaW` | 5795 |
| `potenciaSimultaneaW` | 4056,4999999999995 |
| `picoDemandaW` (corrigido) | 5795 |
| `dodUtil` | 0,9 |
| `etaSistema` | 0,9211999999999999 |
| `energiaNominalBancoKwh` | 14,11202778983934 |
| `numBaterias` | 2 |
| `energiaInstaladaKwh` | 14,4 |
| `energiaUtilRealKwh` | 11,938752 |
| `autonomiaRealDias` | 2,0408123076923075 |
| `cRateDescarga` | 0,2817013888888889 |
| `potenciaCaMinimaW` | 5070,624999999999 |
| `numInversoresParalelo` | 1 |
| `relacaoSurgePartida` | 2,76100086281277 |

Comparações com `toBeCloseTo(valor, 6)` para floats, `toBe` para inteiros.

Testes adicionais de robustez:
- Lista de cargas vazia → todos os agregados 0, curva 24h com 24 zeros, sem crash
- Carga que atravessa a meia-noite conta nas duas pontas
- HSP zero / painel ausente → resultado com zeros e alerta `DADOS_INSUFICIENTES`,
  sem exceção
- Campos opcionais do equipamento nulos → usa o fallback das premissas
  (ex.: painel sem `coefPmp` usa −0,0035)
- Cada alerta dispara na condição correta e fica `ok` fora dela

## Tratamento de erros

O motor **nunca lança exceção**. Toda divisão é guardada contra denominador
zero (retorna 0 no campo afetado). Entradas faltantes ou fisicamente inválidas
produzem o alerta `DADOS_INSUFICIENTES` com severidade `erro`, e os campos
dependentes saem zerados. Isso permite que a tela da Fase 3 renderize
resultados parciais enquanto o usuário ainda preenche o formulário.

## Fora de escopo

- Financeiro: CAPEX, economia, fluxo de 25 anos, VPL/TIR/payback/LCOE — Fase 2b
- Persistência de simulações — Fase 3
- Qualquer UI — Fase 3
- PDFs — Fase 4
- Aba Temporal — descartada do produto
- Premissas configuráveis por empresa — não planejado; os overrides por
  simulação chegam na Fase 3
