# Apresentações Comerciais Premium — Diagnóstico e Plano Técnico

**Data:** 2026-07-20
**Status:** proposta técnica, nada implementado
**Autor:** análise a pedido de Iago

---

## 1. Diagnóstico da implementação atual

### O fluxo, ponta a ponta

```
Template .docx (Supabase Storage, bucket "proposals")
   ↓  download
PizZip abre o .docx como zip de XMLs
   ↓
processDocxPlaceholders() — parser XML artesanal (~120 linhas)
   ↓  substitui {{cliente_nome}}, {{preco_final}}, ...
zip.generate() → Buffer do .docx preenchido
   ↓  upload
Storage: proposals/{orgId}/{proposalId}.docx
   ↓  POST multipart
ConvertAPI (serviço externo, docx → pdf)
   ↓  download do PDF convertido
Storage: proposals/{orgId}/{proposalId}.pdf
   ↓
proposals.pdf_url / docx_url apontam para /api/storage/download
```

Tudo isso vive em um único arquivo: `web/app/api/proposals/[id]/generate/route.ts` (~430 linhas), que também calcula preços, aplica ajuste comercial e grava a proposta.

### Como os placeholders são substituídos

`processDocxPlaceholders` (mesmo arquivo, linhas 23–150) percorre cada XML do .docx procurando `{{`. O problema que ele resolve: **o Word fragmenta o texto em múltiplos `<w:r>` (runs)**, então `{{cliente_nome}}` frequentemente vira algo como `{{cli` + `ente_` + `nome}}` espalhado por três nós. O parser precisa juntar os pedaços, identificar o placeholder, escrever o valor no primeiro nó e limpar os demais.

Os valores vêm de `web/lib/proposals/placeholders.ts` — **24 campos**, montados por `buildPlaceholders(lead, org, proposal)`.

### O que depende do Word hoje

| Componente | Dependência |
|---|---|
| `processDocxPlaceholders` | total — parser de OOXML |
| `pizzip` | manipulação do .docx |
| ConvertAPI | converte .docx → .pdf |
| `proposal_templates` (tabela) | guarda o caminho do .docx |
| `TemplatesTab.tsx` | upload e diagnóstico de templates .docx |
| `/api/templates/[id]/diagnose` | valida placeholders dentro do .docx |
| `placeholders.ts` | formata valores para injeção no XML |

### Estado atual: o fluxo está parado

A ConvertAPI ficou sem créditos (trial expira por tempo, ~1 mês). **Hoje nenhuma proposta em PDF é gerada.** O caminho que funciona é a proposta por link, implementada nesta mesma data.

### Números que importam

- **14 templates .docx** distribuídos por **10 organizações** — nenhuma delas controlada por nós.
- **35 propostas** com PDF gerado historicamente.
- Volume: ~20 propostas/mês.

---

## 2. O que pode ser reaproveitado

Mais do que parece. A base já existe.

### 2.1 A proposta por link (implementada hoje) é a fundação exata

`feat/proposta-por-link` entregou, nesta data:

- `web/lib/proposals/proposta-publica.ts` — função pura que monta o conteúdo (testada).
- `web/app/api/proposta/[token]/route.ts` — API pública com `guardPublicToken`.
- `web/app/proposta/[token]/PropostaView.tsx` — a página em si, tema claro, mobile-first, com estilos de impressão.
- Tabela `proposal_links` — token público, revogável.

**Isto já é o "modo apresentação" e o "compartilhamento por link" do projeto novo, em versão mínima.** O trabalho não começa do zero: começa por evoluir esta base.

### 2.2 Theme system: metade já existe

`org_config` já guarda, por organização:
- `cor_principal`, `cor_secundaria`
- `logo_url`
- razão social, nome fantasia, CNPJ, telefone, endereço completo

A proposta por link já lê esses campos. Um theme system completo (tipografia, ícones, variações de card) é uma extensão disso, não uma construção nova.

### 2.3 Os dados de impacto já são calculados — em outro módulo

**Este é o achado mais valioso do diagnóstico.**

Os indicadores que a apresentação premium exige (economia mensal, economia em 25 anos, payback, comparativo antes/depois, projeções) **já existem no código**:

- `web/lib/simuladores/viabilidade/engine.ts` — projeção 25 anos, `paybackAnos`.
- `web/lib/simuladores/hibrido/financeiro.ts` — `calcularPaybackAnos`, economia acumulada, fluxo de caixa, VPL.
- `web/lib/simuladores/hibrido/economia.ts` — economia por autoconsumo, crédito excedente, custo de disponibilidade.
- `web/lib/simuladores/fio-b.ts` — regra do Fio B (com alerta de validade a partir de 2027).

**Porém:** esses cálculos vivem no módulo **Simuladores**, que é um recurso pago liberado por empresa no backoffice. A proposta do CRM não tem acesso a eles hoje. Ver seção 8 (riscos) — há uma implicação comercial séria aqui.

### 2.4 Geração de PDF sem serviço externo já é praticada

Dois precedentes funcionando com `jspdf` + `jspdf-autotable`:
- `web/lib/financeiro/receipt-pdf.ts` — recibos de pagamento.
- `web/lib/simuladores/viabilidade/proposta-pdf.ts` — proposta do simulador, A4, com tabelas.

Não é a rota recomendada para o design premium (jsPDF desenha, não renderiza HTML), mas prova que a organização não precisa de fornecedor externo para produzir PDF.

### 2.5 Infraestrutura transversal

- **Padrão de link público** implementado 4 vezes (portal do cliente, instalador, projetista, proposta) — token, `active`, RLS, rate limit por IP via `guardPublicToken`.
- **Storage + download autenticado** (`/api/storage/download`, com validação de organização).
- **Pipeline de precificação** (`route.ts`, cálculo de custos, ajuste comercial) — independente do formato de saída.
- **Sistema de permissões e RLS** multi-tenant.

---

## 3. O que precisa ser substituído

| Item | Destino |
|---|---|
| `processDocxPlaceholders` (parser XML) | descartar — dívida técnica de 120 linhas |
| `pizzip` | descartar |
| ConvertAPI | descartar |
| `proposal_templates` apontando para .docx | evoluir para templates HTML versionados em código |
| `/api/templates/[id]/diagnose` | substituir por validação de dados do template HTML |
| `TemplatesTab.tsx` (upload de .docx) | virar seletor de template + tema + blocos |
| `placeholders.ts` (24 campos planos) | evoluir para um modelo de dados tipado e mais rico |

**Nada disso deve ser removido de imediato** — ver estratégia de migração (seção 6).

---

## 4. Arquitetura proposta

### 4.1 Princípio central

> O dado é a fonte da verdade. Apresentação, PDF e impressão são apenas renderizações do mesmo dado.

Hoje é o inverso: o .docx é o artefato e o PDF é derivado dele. Invertendo isso, PDF vira consequência — exatamente o que você descreveu.

### 4.2 Camadas

```
┌─ Camada de dados ────────────────────────────────────────┐
│ montarApresentacao(proposalId) → ApresentacaoData        │
│   • dados do cliente, empresa, sistema, preços           │
│   • indicadores (economia, payback, projeção)            │
│   • função pura, testável, sem React                     │
└──────────────────────────────────────────────────────────┘
                          ↓
┌─ Camada de composição ───────────────────────────────────┐
│ Template = lista ordenada de blocos + tema               │
│   { template: 'premium', tema: 'solar-gold',             │
│     blocos: ['cover','resumo','economia', ...] }         │
│ Guardado em proposal_presentations (JSONB)               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌─ Camada de componentes ──────────────────────────────────┐
│ Um componente React por bloco. Recebe ApresentacaoData   │
│ e o tema. Não busca dado, não conhece a rota.            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌─ Camada de saída ────────────────────────────────────────┐
│ /proposta/[token]         → modo apresentação            │
│ /proposta/[token]?print=1 → layout A4 para impressão     │
│ /api/proposta/[token]/pdf → Chromium renderiza o print   │
└──────────────────────────────────────────────────────────┘
```

**Por que essa separação importa:** o PDF renderiza *a mesma página* que o cliente vê no navegador. Não existem dois layouts para manter em sincronia — a causa clássica de "o PDF saiu diferente do site".

### 4.3 Tema como CSS custom properties

```css
[data-tema="solar-gold"] {
  --cor-primaria: #D4A017;
  --cor-superficie: #FFFDF7;
  --fonte-titulo: 'Sora', sans-serif;
  --raio-card: 20px;
  --sombra-card: 0 1px 3px rgb(0 0 0 / 0.06);
}
```

Trocar tema = trocar um atributo no elemento raiz. Zero JavaScript, zero recompilação, funciona igual na tela e no PDF. Os temas por organização (`org_config.cor_principal`) entram como override em cima do tema escolhido.

### 4.4 Estrutura de arquivos proposta

```
web/lib/apresentacoes/
├── dados.ts                 # montarApresentacao() → ApresentacaoData (pura)
├── indicadores.ts           # economia, payback, projeção (pura)
├── temas.ts                 # catálogo de temas + tokens CSS
├── templates.ts             # catálogo: quais blocos, em que ordem, tema padrão
└── tipos.ts                 # ApresentacaoData, BlocoId, TemaId, TemplateId

web/components/apresentacao/
├── Apresentacao.tsx         # orquestra: recebe dados + config, renderiza blocos
├── blocos/
│   ├── Cover.tsx
│   ├── ResumoExecutivo.tsx
│   ├── Economia.tsx
│   ├── ComparativoAntesDepois.tsx
│   ├── SistemaProposto.tsx
│   ├── Equipamentos.tsx
│   ├── Garantias.tsx
│   ├── LinhaDoTempo.tsx
│   ├── ComoFunciona.tsx
│   ├── Empresa.tsx
│   ├── CondicoesComerciais.tsx
│   ├── Assinatura.tsx
│   └── Contato.tsx
├── primitivos/
│   ├── Indicador.tsx        # rótulo + número grande + unidade
│   ├── Card.tsx
│   ├── Grafico.tsx          # SVG puro, sem biblioteca
│   ├── Timeline.tsx
│   └── Icone.tsx            # SVG inline, sem pacote de ícones
└── tema.css                 # todas as variáveis, um arquivo

web/app/proposta/[token]/
├── page.tsx
├── ApresentacaoView.tsx     # modo tela
└── print.css                # @page A4, quebras, sem sombras
```

**Contrato de cada bloco** — o que torna o editor visual possível depois:

```ts
export type Bloco = {
  id: BlocoId
  nome: string                    // "Economia"
  descricao: string               // aparece no seletor
  camposUsados: (keyof ApresentacaoData)[]  // valida se há dado para ele
  opcional: boolean               // Cover não é; Depoimentos é
  Componente: React.FC<BlocoProps>
}
```

Declarar `camposUsados` resolve um problema real: se a proposta não tem dados de economia, o bloco "Economia" some do seletor em vez de renderizar vazio.

---

## 5. Estrutura de componentes (blocos)

| Bloco | Dados que consome | Obrigatório | Depende de simulador |
|---|---|---|---|
| Cover | cliente, empresa, data | sim | não |
| Resumo Executivo | potência, geração, investimento, payback | não | **parcial** |
| Economia | economia mensal/anual/25 anos, gráfico | não | **sim** |
| Comparativo Antes×Depois | conta atual vs. conta com solar | não | **sim** |
| Sistema Proposto | painéis, inversor, potência, geração | sim | não |
| Equipamentos | marcas, modelos, quantidades | não | não |
| Como Funciona | conteúdo fixo por template | não | não |
| Fluxo da Instalação | conteúdo fixo + prazos da org | não | não |
| Garantias | prazos (equipamento/instalação) | não | não |
| Linha do Tempo | etapas do projeto | não | não |
| Empresa | org_config completo | não | não |
| Depoimentos | conteúdo cadastrado pela empresa | não | não |
| Condições Comerciais | preço, formas de pagamento | sim | não |
| Assinatura | espaço para aceite | não | não |
| Contato | telefone, e-mail, endereço | sim | não |

**Leitura importante:** os blocos de maior impacto visual — Economia e Comparativo, justamente os que "vendem" — são os que dependem de dados que hoje só o módulo Simuladores calcula.

---

## 6. Estratégia de migração sem quebrar o sistema atual

### Princípio: coexistência real, não paralela

Os dois modelos convivem no mesmo registro de proposta. A escolha é por proposta, não por empresa — assim uma mesma organização pode testar o novo formato em um cliente sem migrar todos.

### Fases

**Fase 0 — já concluída (2026-07-20)**
Proposta por link funcionando, com dados reais e tema por organização. É a prova de conceito da camada de saída.

**Fase 1 — modelo de dados e um template**
- `montarApresentacao()` substituindo `montarPropostaPublica` (superset).
- Tabela `proposal_presentations`: `proposal_id`, `template`, `tema`, `blocos jsonb`, `versao`.
- Um template ("Premium") com 6 blocos: Cover, Resumo, Sistema, Equipamentos, Condições, Contato.
- Dois temas: Minimal White e Executive Black.
- **Nenhum bloco que dependa de simulador.** Entrega valor visual sem abrir a caixa de integração.

**Fase 2 — indicadores de impacto**
- `indicadores.ts`: extrair de `simuladores/viabilidade/engine.ts` e `hibrido/financeiro.ts` a lógica de economia/payback para um módulo **compartilhado**, sem dependência do módulo pago.
- Blocos Economia, Comparativo e gráficos.
- Decisão comercial obrigatória antes desta fase (ver risco 8.2).

**Fase 3 — exportação PDF**
- Rota `/api/proposta/[token]/pdf` com `puppeteer-core` + `@sparticuz/chromium`.
- Renderiza `?print=1` da própria apresentação.
- Cache do PDF no Storage (o mesmo padrão já corrigido hoje: gerar uma vez, guardar, servir do nosso domínio).

**Fase 4 — biblioteca e modularidade**
- Demais templates e temas.
- Seletor de blocos com reordenação na UI de geração.
- Blocos restantes (Garantias, Timeline, Depoimentos, Como Funciona).

**Fase 5 — desativação do Word**
- Só quando: (a) todas as 10 organizações tiverem migrado, e (b) 60 dias sem geração via .docx.
- Remover parser, pizzip, ConvertAPI, diagnose.
- Manter os .docx antigos no Storage (histórico).

### Regras de segurança da migração

1. **Nunca remover o caminho .docx antes da Fase 5.** Se o novo falhar, o antigo é o fallback.
2. **Cada fase entrega software utilizável** — nada de "metade do sistema novo".
3. **Nenhuma migração forçada de organização.** Cada empresa escolhe quando adotar.
4. **Rota pública sempre com o filtro de dados atual:** nunca expor custo, margem, comissão, imposto, `preco_calculado` ou ajuste comercial.

---

## 7. Cronograma por fases

Estimativas de esforço de desenvolvimento, sem contar validação com clientes reais.

| Fase | Escopo | Esforço | Entrega |
|---|---|---|---|
| 1 | Dados + 1 template + 2 temas + 6 blocos | 3–5 dias | apresentação premium utilizável |
| 2 | Indicadores + Economia + Comparativo + gráficos | 4–6 dias | os blocos que vendem |
| 3 | PDF via Chromium + cache | 2–3 dias | exportação A4 |
| 4 | +4 templates, +4 temas, +7 blocos, seletor | 6–10 dias | biblioteca completa |
| 5 | Remoção do Word | 1 dia | dívida técnica quitada |

**Total: 16–25 dias de desenvolvimento**, distribuídos. As fases 1 e 3 sozinhas já entregam "apresentação bonita + PDF", que é o núcleo da proposta de valor.

Recomendação: fazer 1 → 3 → 2 → 4. Ter PDF cedo reduz a resistência de quem ainda quer anexar arquivo em e-mail.

---

## 8. Riscos técnicos

### 8.1 Explosão combinatória (risco alto)

10 templates × 6 temas × 16 blocos = 960 combinações visuais. Cada bloco precisa funcionar em todo tema, em quatro tamanhos de tela e em A4.

**Mitigação:** temas restritos a *tokens* (cor, fonte, raio, sombra) — nunca layouts alternativos por tema. Um bloco tem um layout; o tema pinta. Isso derruba a combinatória de multiplicativa para aditiva.

### 8.2 Dependência do módulo pago (risco alto — e é comercial, não técnico)

Os cálculos de economia e payback vivem em **Simuladores**, um recurso pago liberado por empresa no backoffice. Se a apresentação premium exibir esses números, uma de três coisas acontece:

1. A apresentação premium só funciona para quem paga Simuladores.
2. Os cálculos são extraídos para um módulo comum, e o valor do Simulador diminui.
3. Os blocos de economia ficam de fora, e a apresentação perde justamente o que mais vende.

**Esta decisão precisa ser sua, antes da Fase 2.** É a única do plano que eu não posso resolver tecnicamente.

### 8.3 Fidelidade de impressão A4 (risco médio)

CSS de impressão é traiçoeiro: quebras de página no meio de cards, cores de fundo suprimidas por padrão, `position: sticky` que se comporta diferente, gráficos SVG que reescalam.

**Mitigação:** `print.css` desde a Fase 1, com `break-inside: avoid` nos cards e `@page { size: A4; margin: ... }`. Testar impressão a cada bloco novo, não no fim.

### 8.4 Chromium em serverless (risco médio — recém-reduzido)

**Novidade relevante:** a Vercel elevou o limite de bundle de 250 MB para 5 GB em 30/06/2026, o que torna Puppeteer viável ali — não era antes. Ainda assim:
- Cold start de centenas de milissegundos a alguns segundos.
- Consumo de memória alto; função precisa de configuração adequada.
- `@sparticuz/chromium-min` baixa o binário em runtime na primeira execução.

**Mitigação:** gerar o PDF sob demanda e **cachear no Storage** (padrão já adotado hoje). A 20 propostas/mês, cold start é irrelevante.

### 8.5 Perda de personalização das organizações (risco médio)

10 empresas têm hoje templates .docx próprios, editáveis por elas no Word. O modelo novo troca isso por templates que só nós escrevemos. Já discutido — sua decisão foi "layout nosso, com bastante personalização".

**Mitigação:** riqueza de configuração (tema, cores, logo, blocos, textos de abertura/encerramento) e, no futuro, o editor visual.

### 8.6 Templates como código (risco médio)

Cada template novo passa a exigir deploy. A empresa não consegue mais "só trocar o arquivo".

**Mitigação:** é o preço da qualidade visual — e é o modelo de Stripe, Linear e Notion. O editor visual futuro devolve parte dessa autonomia.

### 8.7 Manutenção de dois sistemas durante a transição (risco baixo, mas real)

Fases 1–4 mantêm .docx e HTML vivos. Bug reportado exige saber em qual caminho o cliente estava.

**Mitigação:** registrar em `proposals` qual motor gerou cada proposta; janela de coexistência curta e com data para acabar.

---

## 9. Benefícios esperados

**Para a Integra Solar (produto)**
- Diferencial competitivo real e visível em 5 segundos de demonstração.
- Fim da dependência de fornecedor externo de conversão — e do custo associado.
- Fim da dívida técnica do parser OOXML.
- Rastreabilidade: saber quando o cliente abriu a proposta e quanto tempo ficou.

**Para as empresas integradoras (clientes)**
- Percepção de valor maior na frente do cliente final.
- Proposta que funciona no celular — onde a maioria dos clientes abre.
- Atualização sem reenvio: corrigiu o preço, o link já reflete.

**Para o cliente final**
- Material claro, com indicadores em vez de parágrafos.
- Entende a economia em vez de ler sobre ela.

---

## 10. Sugestões para tornar isso difícil de copiar

O visual bonito é copiável em semanas. O que não é copiável:

**10.1 Telemetria da proposta.** Registrar abertura, tempo por bloco, reaberturas, dispositivo. O vendedor recebe: *"Marcílio abriu 3 vezes e passou 2 minutos no bloco de Economia"*. Isso transforma a proposta em instrumento de venda e gera dado que o concorrente não tem. É a funcionalidade de maior retorno sobre esforço da lista.

**10.2 Aceite digital no próprio link.** Botão de aceitar, com registro de IP, data/hora e assinatura desenhada. Encurta o ciclo de venda e prende o fluxo na plataforma.

**10.3 Simulação interativa embutida.** O cliente ajusta a conta de luz e vê a economia recalcular ao vivo. Só é possível porque é HTML — um PDF nunca fará isso. Aproveita os engines de simulação que já existem.

**10.4 Versionamento com comparação.** "Proposta v1 × v2": o cliente vê o que mudou. Transparência que gera confiança.

**10.5 Bloco de prova social automático.** Obras concluídas próximas da cidade do cliente, com fotos que já estão no sistema (`obra_photos`). Prova social gerada sem trabalho manual.

**10.6 Expiração com urgência real.** O link mostra "válida por mais 6 dias" com contagem — e expira de fato. Cria urgência legítima.

**10.7 Modo apresentação para reunião.** Tela cheia, navegação por setas, para o vendedor apresentar ao vivo. Barato de implementar sobre a mesma base.

Destas, **10.1 e 10.3 são as que criam fosso competitivo**: uma gera dado proprietário, a outra depende de engines de cálculo que o concorrente teria de construir do zero.

---

## Recomendação final

Fazer as Fases 1 e 3 primeiro (5–8 dias), validar com clientes reais, e só então decidir sobre a Fase 2 — que depende da questão comercial dos Simuladores.

A base já existe: a proposta por link entregue hoje é a Fase 0 deste plano. Não é um projeto começando do zero; é a evolução natural de algo que já está no ar.
