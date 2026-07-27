# Proposta comercial de usina (Viabilidade) — Design

**Data:** 2026-07-27
**Status:** aprovado (abordagem A)

## Objetivo

Trocar o "Gerar PDF" do simulador de Viabilidade de usina por uma **proposta
comercial de investimento**, no mesmo modelo visual das propostas do CRM:
página web pública por link + botão "Baixar PDF". O conteúdo é fiel à aba
"Proposta" da planilha `Tabela de viabilidade usinas de investimento.xlsx`,
no nível **financeiro completo** (grupo 1) — sem cadastro de investidor, imóvel
ou assinatura (grupos 2 e 3 ficam para uma etapa futura, com spec próprio).

## Escopo

**Inclui (grupo 1):**
- Reaproveita a identidade visual da apresentação comercial (tema, cores, logo)
  vinda de `org_apresentacao_config`.
- Conteúdo de investimento: indicadores (TIR/VPL/payback), UFV, premissas,
  custos totais (incl. O&M Acumulado VP e Total), financiamento, projeção.
- Entrega: link público (`/proposta-usina/[token]`) + PDF por Chromium.
- Cliente identificado por texto livre (nome/cidade), como já é hoje.

**Fora (grupos 2 e 3, etapa futura):**
- Cadastro do investidor (CPF, RG, nascimento, razão social, CNPJ).
- Dados do imóvel da UFV (endereço, CEP, UF, cidade, coordenadas, m²).
- Dados extras da empresa (representante legal, site, vendedor).
- Área de assinatura / "proposta firme de aceite".

## Abordagem escolhida: A (módulo próprio, reuso visual)

Módulo paralelo ao da apresentação do CRM. Modelo de dados e blocos próprios;
importa os primitivos visuais (`tema.css`, `Indicador`, `Secao`, `Icone`), a
barra de ações e o pipeline de PDF por Chromium já existentes. **Não** toca no
sistema de propostas do CRM (em produção, sensível). A identidade visual vem da
mesma `org_apresentacao_config`, então a proposta da usina sai com a cara que a
empresa já configurou.

Rejeitadas: **B** (estender o sistema atual com discriminador de tipo — acopla
dois domínios e arrisca o fluxo do CRM); **C** (só HTML na hora, sem link —
descartada pelo usuário).

## Arquitetura

### Persistência (migration)

Nova tabela `simulador_viabilidade_apresentacoes`:

| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | RLS por org |
| token | text NOT NULL UNIQUE | 24 chars, como proposal_links |
| cliente_nome | text NULL | texto livre |
| cliente_cidade | text NULL | |
| concessionaria_nome | text NOT NULL | nome no momento da geração |
| modelo_painel | text NULL | |
| modelo_inversor | text NULL | |
| input | jsonb NOT NULL | snapshot do ViabilidadeInput |
| resultado | jsonb NOT NULL | snapshot do ViabilidadeResultado |
| active | boolean NOT NULL DEFAULT true | |
| created_at | timestamptz DEFAULT now() | |

O snapshot torna o link independente da lista de simulações salvas (que pode ser
excluída) e garante que o investidor veja exatamente o que foi gerado. RLS:
membros da org gerenciam; leitura pública é feita via service-role na rota (sem
sessão), filtrando por token + active, como em `/api/proposta/[token]`.

### Fluxo na tela

O botão "Gerar PDF" atual vira **"Gerar proposta"**: chama uma server action que
persiste o snapshot e devolve o token/URL (copiar + abrir), no padrão do "Gerar
Orçamento" do CRM. Reaproveita o link ativo se já houver um para a mesma
simulação em memória? Não — cada clique gera uma proposta nova (a viabilidade não
tem entidade persistente estável como a proposal do CRM; o snapshot é o registro).

### Rota pública

- `web/app/proposta-usina/[token]/page.tsx` — server component, lê por token,
  monta os dados e renderiza a apresentação.
- `web/app/api/proposta-usina/[token]/route.ts` — JSON público (se necessário
  para o cliente da barra de ações).
- `web/app/api/proposta-usina/[token]/pdf/route.ts` — PDF por Chromium a partir
  da página pública. Reusa `web/lib/apresentacoes/pdf.ts`.
- Middleware: `/proposta-usina` e `/api/proposta-usina` entram em
  `PUBLIC_ROUTES` (lição do `/proposta`, que sem isso caía no login).

### Módulo de dados e blocos

`web/lib/apresentacoes-usina/`:
- `tipos.ts` — `ApresentacaoUsinaData` (tudo já formatado para leitura).
- `dados.ts` — `montarApresentacaoUsina(snapshot, empresa, config)`: função
  **pura**, sem I/O, testável com golden values da planilha.
- `custos.ts` — cálculo do **O&M Acumulado (VP)** e **Total**, a partir da
  projeção do motor. Golden contra o Excel (-959.820,04 e -1.135.015,93). Se não
  reproduzir, a linha é omitida e o fato é registrado (disciplina das Peças 1/2).
- `grafico.ts` — SVG do fluxo de caixa acumulado gerado no servidor (sem canvas,
  que sai branco no PDF).

`web/components/apresentacao-usina/`:
- `ApresentacaoUsina.tsx` — orquestrador; aplica tema via CSS custom properties.
- Reusa `primitivos/` e `tema.css` de `components/apresentacao/`.
- `blocos/` (10):
  1. Capa — logo, título "Proposta de Investimento em Usina Solar", cliente,
     data de emissão, validade.
  2. Indicadores — TIR, VPL, Payback (capital próprio) em destaque + potência e
     geração anual.
  3. A Usina (UFV) — modelo de compensação, regra GD, concessionária, potência
     pico/nominal, painel FV (Wp × qtd + modelo), inversor(es), fator de
     capacidade, geração anual/mensal, tipo de usina.
  4. Premissas do projeto — desconto do consumidor, tarifa compensável,
     reajuste/IPCA, indisponibilidade, TMA, regime tributário, imposto, receita
     bruta mensal prevista, fator de OPEX anual.
  5. Custos totais — CAPEX, reestruturação do inversor (ano 15), O&M Acumulado
     (VP), Total, vida útil.
  6. Financiamento — % financiada, juros, carência, amortização, recursos
     próprios, recursos financiados. Renderiza sempre; quando % financiada = 0,
     deixa explícito "investimento 100% com recursos próprios".
  7. Retorno / cenários — TIR, VPL, Payback lado a lado: capital próprio ×
     com financiamento.
  8. Projeção — gráfico SVG do fluxo acumulado + tabela ano a ano (produção,
     receita, OPEX, fluxo próprio, acumulado).
  9. Empresa — dados cadastrais da empresa (nome fantasia, CNPJ, contato).
  10. Contato / CTA — telefone/WhatsApp da empresa.

### PDF

Reusa `web/lib/apresentacoes/pdf.ts` (Chromium `@sparticuz/chromium` em produção,
Chrome local em dev), apontando para `/proposta-usina/[token]`. Cacheado no
Storage se o pipeline atual já fizer isso. Sem segundo layout para manter em
sincronia. `next.config.mjs` já declara o tracing do Chromium para
`/api/proposta/**`; estender o glob para cobrir `/api/proposta-usina/**`.

## Segurança

- Rota pública sem login. Só expõe o que o investidor deve ver — **nunca** custo
  interno, margem, comissão ou composição de OPEX além do que a proposta mostra.
- Teste que serializa `ApresentacaoUsinaData` e falha se aparecer campo sensível
  não previsto.
- Leitura por token + `active` via service-role; token de 24 chars aleatórios.

## O que sai

- O caminho jsPDF client-side da viabilidade (`proposta-pdf.ts`) é aposentado.
  jsPDF continua para o híbrido e recibos.

## Testes

- `montarApresentacaoUsina` — golden values da planilha (caso RGE, 150 painéis
  600 Wp, etc.), conferindo cada campo formatado.
- `custos.ts` — golden do O&M Acumulado (VP) e Total contra o Excel.
- `grafico.ts` — SVG contém os pontos esperados do fluxo acumulado.
- Fiação — a rota pública lê a tabela e monta os dados; não vaza campo sensível.
- Middleware — `/proposta-usina` reconhecida como rota pública.

## Migration e ordem de deploy

Migração `simulador_viabilidade_apresentacoes` aplicada **antes** do código
(a rota pública e a action escrevem/leem a tabela). Iago aplica no SQL Editor;
depois `web/types/database.types.ts` é atualizado. Enquanto a tabela não existe,
a action falha de forma controlada e o código não quebra o resto.

## Pendências conhecidas

- Grupos 2 e 3 (investidor, imóvel, assinatura) — etapa futura, spec próprio.
- Confirmar reprodutibilidade do O&M Acumulado (VP) por golden; se não bater, a
  linha "O&M Acumulado (VP)" e o "Total" saem, e a proposta mostra só CAPEX +
  reestruturação + vida útil (como o PDF atual).
