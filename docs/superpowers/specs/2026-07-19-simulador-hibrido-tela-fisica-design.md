# Simulador Híbrido / Off-grid — Fase 3b: Tela do simulador (parte física)

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 3b de 4 do simulador Híbrido / Off-grid

## Contexto

Já estão em produção: cadastro de equipamentos (Fase 1), motor de cálculo
físico (2a), motor financeiro (2b) e o construtor de cargas (3a).

Esta fase constrói a **tela do simulador na parte física**: coleta os dados de
projeto, a seleção de equipamentos e o levantamento de cargas, e mostra
dimensionamento, strings, baterias, inversor e alertas — tudo ao vivo.

Fases restantes: **3b2** (preços do CAPEX editáveis + resultados financeiros),
**3c** (persistência de simulações) e **4** (PDFs).

## Decisões (definidas no brainstorming)

1. **A Fase 3b foi dividida em 3b (física) e 3b2 (financeira)**, espelhando a
   divisão dos motores.
2. **Nenhum campo de tarifa nesta fase.** O motor físico não usa tarifa, TUSD
   Fio B nem custo de disponibilidade — são entradas puramente financeiras e vão
   inteiras para a 3b2.
3. **Tarifas serão digitadas manualmente na 3b2**, sem acoplar o híbrido ao
   cadastro de concessionárias da viabilidade.
4. **HSP mensal: 12 campos + caixa de colar do CRESESB/PVGIS.** Nenhuma tabela
   de HSP por estado será embutida — seria dado de engenharia fabricado, capaz
   de produzir dimensionamento errado sem sinal visível para o usuário.
5. **Campos de identificação (cliente, cidade, UF, concessionária, responsável)
   ficam para a 3c**, onde passam a ter função (salvar) — não afetam nenhum
   cálculo.
6. **`/simuladores/hibrido-offgrid` deixa de ser placeholder e vira o
   simulador.** Os acessos a equipamentos e cargas viram links dentro dela.
7. **Perda por sujeira não é exposta** no painel avançado; permanece em
   `PREMISSAS_PADRAO`.

## Campos que NÃO entram (e por quê)

- **Azimute e inclinação dos módulos.** Aparecem na planilha, mas nenhuma
  fórmula do motor os consome — o desvio da condição ótima entra como
  `perdaOrientacao`, digitada diretamente. Incluí-los aqui seria decoração.
  Voltam na Fase 4, onde o Memorial descritivo os imprime.
- **Dias por mês.** São calendário, não entrada: constante `[31,28,31,…]`.

## Arquitetura

**Rota:** `web/app/(dashboard)/simuladores/hibrido-offgrid/page.tsx` passa a
renderizar o simulador. Carrega, em paralelo, `listPaineis()`,
`listInversores()`, `listBaterias()` (Fase 1) e `listCargasBiblioteca()`
(Fase 3a), e os repassa. Guard `isSimuladoresEnabled()` → `redirect`.

O status do simulador no registry continua `em_construcao` até a 3b2 entregar
os resultados financeiros.

**A ponte pura — onde mora a cobertura de teste desta fase:**

`web/lib/simuladores/hibrido/montar-input.ts`

- `CamposHibrido` — o que a tela coleta
- `CAMPOS_INICIAIS` — valores de partida razoáveis
- `montarHibridoInput(campos, equipamentos, cargas): HibridoInput`
- `parseHspColado(texto): number[] | null`

Assim a fiação entre formulário e motor é testada sem UI, e a tela fica sendo
só coleta e exibição.

**Componentes** (`web/components/simuladores/`):

| Componente | Responsabilidade |
|---|---|
| `SimuladorHibrido` | Orquestra; dona de `campos` e `cargas`; chama `calcularHibrido` via `useMemo` |
| `HibridoInputsProjeto` | Temperaturas, 12 HSP + colar, perdas, critério de geração |
| `HibridoSelecaoEquipamentos` | Três seletores alimentados pelo cadastro |
| `HibridoAvancado` | Recolhível: overrides de arranjo, banco e premissas |
| `HibridoResultadosFV` | Dimensionamento + strings |
| `HibridoResultadosArmazenamento` | Baterias + inversor |
| `HibridoAlertas` | Checklist dos 15 alertas |
| `HibridoProducaoMensal` | Gráfico de produção mensal (recharts) |

**Refactor necessário:** `CargasBuilder` (Fase 3a) foi escrito como componente
de página — dono do estado das cargas, com título e aviso de não-persistência
próprios. Para ser embutido no simulador ele passa a ser **controlado**:

```ts
{ cargas: Carga[]; onCargasChange: (c: Carga[]) => void;
  biblioteca: CargaBiblioteca[]; onBibliotecaChange: (b: CargaBiblioteca[]) => void;
  mostrarCabecalho?: boolean }
```

A página `/cargas` passa a ser a dona do estado e continua existindo como
ferramenta autônoma de levantamento. É o mesmo movimento já aplicado ao
`BibliotecaCargasPanel`, então o padrão fica consistente: componentes
controlados, estado no topo.

## Entradas

### Principais

- **Temperaturas:** média, máxima, mínima (°C)
- **HSP mensal:** 12 campos (kWh/m²·dia) + caixa de colar
- **Perdas:** sombreamento e orientação (frações)
- **Critério de geração:** mês crítico | média anual
- **Equipamentos:** painel, inversor, bateria

### Avançado (recolhível)

*Arranjo e banco:* nº de módulos, módulos por string, nº de strings, tensão do
banco (V), dias de autonomia, base da energia (consumo total | só cargas
críticas), tipo de sistema (Híbrido | Off-grid | On-grid).

*Premissas:* fator de simultaneidade, margem do inversor, DC/AC máximo, DC/AC
mínimo.

As demais premissas permanecem em `PREMISSAS_PADRAO`.

**Regra dos overrides:** um campo avançado em branco **não** é enviado ao motor
— `montarHibridoInput` o omite, e o motor aplica seu próprio default (por
exemplo, nº de módulos cai no recomendado, e módulos por string no máximo que a
tensão permite). Enviar `0` no lugar de omitir produziria dimensionamento
absurdo, então a distinção entre "vazio" e "zero" é obrigatória.

### `parseHspColado`

Aceita a linha de 12 valores copiada do CRESESB/PVGIS:
- decimal com vírgula ou ponto
- separadores: espaço, tabulação, quebra de linha, ponto-e-vírgula, vírgula
  usada como separador de lista
- devolve `number[]` **apenas** quando encontra exatamente 12 números válidos;
  caso contrário devolve `null` e a tela mostra o erro sem alterar os campos

**A ambiguidade da vírgula** (decimal ou separador de lista) é resolvida por uma
regra determinística, que se apoia numa propriedade do domínio: HSP no Brasil
fica entre ~3 e ~7 kWh/m²·dia, sempre com **um único dígito antes do decimal** e
nunca com separador de milhar. Então:

| Texto contém | Interpretação |
|---|---|
| Só vírgula | vírgula é decimal; separadores são espaço, tab, nova linha, `;` |
| Só ponto | ponto é decimal; separadores são espaço, tab, nova linha, `;`, `,` |
| Ponto **e** vírgula | ponto é decimal e vírgula é separador de lista (caso `4.75, 4.71, …`) |
| Nenhum dos dois | inteiros separados por espaço/tab/nova linha/`;` |

Sem tentativa e erro: a decisão sai da composição do texto, uma vez só.

## Resultados exibidos

- **Dimensionamento:** PR base, PR efetivo, temperatura de célula, fator de
  temperatura, PR total, HSP de dimensionamento, mês crítico, energia por
  módulo, nº recomendado, nº definido, potência instalada (kWp), área,
  produção diária, produção anual, oversizing DC/AC
- **Strings:** Voc@Tmin, Vmp@Tmax, mín/máx módulos por string, módulos por
  string, nº de strings, tensões da string, corrente de projeto, corrente por
  MPPT, módulos configurados
- **Baterias:** energia nominal do banco, nº de baterias, série × paralelo,
  energia instalada, capacidade (Ah), energia útil real, autonomia real,
  C-rate, tempo de recarga, vida útil
- **Inversor:** potência CA mínima, folga, utilização contínua, relação
  surge/partida, uso da entrada FV, nº em paralelo, potência CA total
- **Alertas:** os 15 códigos, com tratamento visual distinto para `erro`,
  `aviso` e `ok`
- **Produção mensal:** gráfico de 12 barras

## Estados vazios e parciais

- **Empresa sem equipamentos cadastrados:** os seletores ficam vazios e nada
  calcula. A tela mostra um aviso com link direto para
  `/simuladores/hibrido-offgrid/equipamentos`, em vez de parecer quebrada.
- **Sem cargas ou sem equipamento selecionado:** o motor já devolve zeros e o
  alerta `DADOS_INSUFICIENTES` (Fase 2a, que nunca lança). A tela renderiza os
  resultados zerados normalmente e destaca o alerta.
- **HSP toda zero:** produção zerada, sem `NaN` — também já garantido pelo motor.

## Testes

### Puros (ambiente node)

`web/__tests__/hibrido-montar-input.test.ts`:
- mapeia os campos da tela para `HibridoInput` com os nomes certos
- **overrides em branco são omitidos**, e o motor aplica seus defaults (o teste
  compara o resultado com e sem override para provar a diferença)
- overrides preenchidos chegam ao motor
- premissas customizadas (simultaneidade, margem, DC/AC) sobrepõem as padrão e
  não alteram as demais

`web/__tests__/hibrido-parse-hsp.test.ts`:
- decimal com vírgula e com ponto
- separadores: espaço, tabulação, nova linha, ponto-e-vírgula
- vírgula como separador de lista (`4.75, 4.71, …`)
- rejeita 11 ou 13 números → `null`
- rejeita texto não numérico → `null`
- espaços extras nas pontas não atrapalham

### De componente (ambiente jsdom)

`web/__tests__/hibrido-simulador-ui.test.tsx`:
- `HibridoInputsProjeto`: colar 12 valores preenche os 12 campos; colagem
  inválida exibe erro e **não altera** os valores já digitados
- `HibridoSelecaoEquipamentos`: escolher um painel dispara `onChange` com o id;
  lista vazia mostra o aviso com link para o cadastro
- `HibridoAlertas`: renderiza `erro`, `aviso` e `ok` com tratamento distinto
- `SimuladorHibrido`: com equipamentos de fixture e uma carga, os valores
  exibidos (kWp, produção anual, nº de baterias) **conferem com o que
  `calcularHibrido` devolve para o mesmo input** — prova que a tela exibe o que
  o motor calculou, sem recálculo próprio na UI

Os testes de componente seguem a infraestrutura da Fase 3a: docblock
`// @vitest-environment jsdom` e `@testing-library/jest-dom/vitest` importado no
próprio arquivo; `vitest.config.ts` permanece intocado.

## Fora de escopo

- Preços do CAPEX, tarifas e resultados financeiros — Fase 3b2
- Identificação do cliente e persistência — Fase 3c
- PDFs — Fase 4
- Azimute e inclinação — Fase 4 (Memorial)
- Buscar HSP automaticamente de PVGIS/CRESESB — não planejado
- Tornar `simuladores` `disponivel` no registry — acontece ao fim da 3b2
