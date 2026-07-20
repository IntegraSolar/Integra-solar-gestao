# Simulador Híbrido / Off-grid — Fase 4: PDFs (Memorial e Relatório)

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 4 de 4 — última do simulador Híbrido / Off-grid

## Contexto

Tudo o mais está em produção: cadastro de equipamentos (Fase 1), motor físico
(2a), motor financeiro (2b), construtor de cargas (3a), tela completa (3b e
3b2) e persistência com reabrir (3c). O simulador já aparece como `disponivel`
no hub.

Falta o que o vendedor entrega. Esta fase gera os dois documentos das abas
finais da planilha:

- **Memorial descritivo** — documento técnico, vai para a concessionária e o
  engenheiro na homologação
- **Relatório executivo** — documento comercial, vai para o cliente

## Decisões (definidas no brainstorming)

1. **Dois PDFs separados**, com botões próprios. Públicos diferentes recebem só
   o que lhes serve.
2. **Gerados a partir do estado atual da tela**, como faz o simulador de
   viabilidade. Para regerar a proposta de uma simulação antiga, o vendedor
   reabre (Fase 3c) e gera — o fluxo já existe.
3. **Conjunto completo de dados descritivos**, para o Memorial servir de fato
   para homologação.
4. **Os descritivos moram em colunas do banco**, junto da identificação — não no
   snapshot. O snapshot permanece em `versao: 1`.
5. **`getEmpresaParaProposta` vira módulo compartilhado.**

## Dados descritivos: por que em colunas, não no snapshot

O Memorial imprime azimute, inclinação, coordenadas, altitude, tipo de ligação,
tensão nominal e modo de operação. **Nenhum deles entra em cálculo** — o desvio
da condição ótima já entra como `perdaOrientacao`, digitada diretamente.

Se entrassem em `CamposHibrido`, o schema Zod do snapshot teria de acompanhar
(as guardas de compilação da Fase 3c forçam isso), e os snapshots `versao: 1` já
salvos deixariam de validar — tornando simulações antigas irreabríveis. Seria
preciso bumpar para `versao: 2` e escrever um upgrade.

Como são descritivos, exatamente como os campos de cliente, moram em colunas
próprias. O snapshot não muda e nenhuma simulação salva corre risco.

## Migration

`simulador_hibrido_simulacoes` ganha 8 colunas, todas nullable:

| coluna | tipo | observação |
|---|---|---|
| azimute | numeric | graus; 0 = Norte |
| inclinacao | numeric | graus |
| latitude | numeric | graus decimais |
| longitude | numeric | graus decimais |
| altitude | numeric | metros |
| tipo_ligacao | text | Monofásico / Bifásico / Trifásico |
| tensao_nominal | numeric | V |
| modo_operacao | text | texto livre (ex.: "Autoconsumo + Backup") |

## Estado da tela

O tipo `Identificacao` da Fase 3c cresce e passa a se chamar **`DadosProjeto`**,
cobrindo identificação e descritivos. `HibridoIdentificacao` ganha um segundo
bloco, "Dados do projeto", separado visualmente do de identificação.

Todos os campos numéricos descritivos são `string` no estado, seguindo a regra
já estabelecida: vazio significa "não informado", e o documento imprime "—".

## Módulo compartilhado da empresa

`web/lib/simuladores/viabilidade/proposta-empresa.ts` move para
`web/lib/simuladores/proposta-empresa.ts`, atualizando os importadores. Dado
cadastral da empresa não pertence a um simulador específico — mesmo movimento
já feito com `npv`/`irr` na Fase 2b.

## Separação entre conteúdo e desenho

Um PDF é difícil de testar de forma útil: asserções sobre chamadas `doc.text()`
custam caro e provam pouco. Mas **o risco real não está no desenho** — está em
imprimir o valor certo na frase errada. Um Memorial afirmando "16 módulos
totalizando 9,92 kWp" com o número de baterias no lugar do de módulos é um
documento que chega à concessionária com dado falso.

Por isso a fase separa:

- **`memorial-conteudo.ts` e `relatorio-conteudo.ts`** — funções puras que
  recebem os resultados e devolvem as seções montadas (título, parágrafos,
  linhas de tabela). **É aqui que ficam os testes.**
- **`memorial-pdf.ts` e `relatorio-pdf.ts`** — apenas desenham no jsPDF o que as
  puras devolveram. Verificados no navegador.

Formato das seções:

```ts
export type SecaoDocumento = {
  titulo: string
  paragrafos?: string[]
  linhas?: { rotulo: string; valor: string }[]
}
```

**A data de emissão entra por parâmetro, nunca de `new Date()` interno.** O
Relatório imprime a data em que foi gerado; se a função de conteúdo lesse o
relógio por conta própria, ela deixaria de ser pura e o teste não teria como
afirmar nada de forma determinística. Quem chama (o gerador do PDF) passa
`new Date()`; os testes passam uma data fixa. Mesma decisão já tomada em
`camposFinanceiroIniciais(anoConexao)` na Fase 3b2.

## Memorial descritivo — as 11 seções

Espelham a aba Memorial da planilha:

1. **Objetivo** — prosa com cliente e cidade/UF
2. **Dados gerais do empreendimento** — cliente, concessionária, tipo de
   sistema, modo de operação, tipo de ligação, tensão nominal, responsável
   técnico
3. **Localização e condições climáticas** — coordenadas, altitude, HSP média,
   mês crítico, temperaturas média/máxima/mínima
4. **Gerador fotovoltaico** — nº de módulos, modelo, potência instalada, área,
   azimute, inclinação
5. **Sistema de conversão** — nº de inversores, modelo, potência CA total
6. **Armazenamento** — nº de baterias, energia nominal, tensão do banco,
   autonomia. **Ramo condicional:** sem bateria selecionada, a seção passa a
   dizer que o sistema não contempla armazenamento (operação conectada à rede),
   em vez de imprimir zeros
7. **Arranjo elétrico e dimensionamento** — strings × módulos por string,
   oversizing DC/AC, HSP de dimensionamento, Performance Ratio
8. **Proteções e aterramento** — texto normativo fixo (DPS, fusíveis,
   seccionadora, disjuntor, aterramento conforme NBR 5410 e 16690)
9. **Estimativa de geração** — geração anual, média diária, percentual do
   consumo
10. **Normas aplicáveis** — texto fixo (NBR 16690, 16149, 16150, 5410, 5419,
    REN ANEEL 1.059/2023, Lei 14.300/2022)
11. **Conclusão** — texto fixo

## Relatório executivo

1. **Identificação** — cliente, nome da simulação, local, concessionária, data
   de emissão, responsável técnico
2. **Sistema proposto** — tipo, modo de operação, potência instalada, nº de
   módulos, área, inversor, potência CA total, banco de baterias
3. **Desempenho energético** — HSP média, consumo anual, geração anual,
   cobertura, produção diária, Performance Ratio, autonomia
4. **Viabilidade financeira** — investimento total, investimento por kWp,
   economia no 1º ano, economia acumulada, payback simples e descontado, VPL,
   TIR, LCOE
5. **Premissas adotadas** — tarifa, TUSD Fio B, inflação da tarifa, TMA,
   degradação, O&M, horizonte, ano de conexão
6. **Conclusão** — **ramo condicional** conforme o sinal do VPL
7. **Gráfico** — fluxo de caixa acumulado ao longo do horizonte

### Honestidade dos números

O Relatório vai para o cliente e influencia uma decisão de compra de dezenas de
milhares de reais. Os indicadores são **projeções de 25 anos** apoiadas em
premissas discutíveis: inflação da tarifa, irradiação informada manualmente,
degradação estimada, tarifa que muda por decisão regulatória.

Apresentar VPL e TIR como se fossem certezas seria enganoso. Por isso:

- O bloco **"Premissas adotadas"** é parte do documento, não nota de rodapé —
  quem lê vê de que suposições os números dependem.
- Uma nota explícita registra que os valores são estimativas baseadas nessas
  premissas e não constituem garantia de resultado.

O vendedor continua podendo recomendar a compra; o que não pode é a projeção
passar por garantia.

### Payback

Coerente com o resto do sistema: `paybackSimplesAnos`/`paybackDescontadoAnos`
`null` são impressos como **"não se paga no horizonte"**, nunca como "0 anos".

## Campos não informados

Todo descritivo vazio é impresso como **"—"**. Um Memorial com "undefined" na
altitude, ou "NaN°" nas coordenadas, é constrangedor num documento que vai para
a concessionária.

## Tela

Dois botões, ao lado do "Salvar simulação": **"Memorial descritivo (PDF)"** e
**"Relatório executivo (PDF)"**. Geram a partir do estado atual, sem exigir
salvamento.

Ambos ficam desabilitados enquanto não houver painel e inversor selecionados —
sem eles não há sistema a descrever, e o documento sairia com zeros.

## Testes

### Puros (ambiente node)

`web/__tests__/hibrido-memorial-conteudo.test.ts`, alimentado por um resultado
real de `calcularHibrido` (não por objeto inventado):
- devolve as 11 seções, na ordem, com os títulos esperados
- **cada valor aparece na frase certa**: a seção do gerador contém o nº de
  módulos e a potência instalada; a de armazenamento contém o nº de baterias —
  provando que os campos não foram trocados entre si
- sem bateria, a seção 6 usa a frase alternativa e **não** contém números de
  banco
- descritivos vazios saem como "—", e nunca como "undefined", "null" ou "NaN"
- seções de texto fixo (8, 10, 11) estão presentes e não vazias

`web/__tests__/hibrido-relatorio-conteudo.test.ts`, alimentado por
`calcularHibrido` + `calcularFinanceiro`:
- devolve os blocos esperados, incluindo "Premissas adotadas"
- VPL positivo e VPL negativo produzem conclusões diferentes
- payback `null` sai como "não se paga no horizonte" e a string "0 anos" não
  aparece
- os indicadores impressos batem com os que o motor devolveu
- a data de emissão impressa é a que foi passada por parâmetro (prova que a
  função não lê o relógio por conta própria)

### Verificação no navegador

Os dois PDFs são gerados e abertos, conferindo layout, quebra de página,
logo da empresa e o gráfico.

## Fora de escopo

- Enviar o PDF por e-mail ou anexá-lo ao CRM
- Assinatura digital ou ART
- Personalizar o texto normativo por empresa
- Traduzir os documentos
- Regerar PDF direto da listagem, sem reabrir a simulação
