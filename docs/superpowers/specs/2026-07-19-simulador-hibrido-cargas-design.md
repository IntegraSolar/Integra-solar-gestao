# Simulador Híbrido / Off-grid — Fase 3a: Construtor de cargas

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 3a de 4 do simulador Híbrido / Off-grid

## Contexto

Fases 1, 2a e 2b estão em produção: cadastro de equipamentos, motor de cálculo
físico e motor financeiro. Falta a interface.

A Fase 3 (tela) é grande demais para um ciclo só — a tela de viabilidade tem
195 linhas e ~10 inputs, enquanto a do híbrido precisa de identificação, clima,
12 valores de HSP mensal, tarifas, lista de cargas, seleção de equipamentos,
campos editáveis e todos os resultados. Por isso foi decomposta em:

- **3a — Construtor de cargas** (este spec)
- **3b — Tela do simulador** (projeto, clima, tarifas, equipamentos, editáveis, resultados)
- **3c — Persistência** (salvar, listar e excluir simulações)

Depois vem a **Fase 4 — PDFs** (Memorial descritivo e Relatório executivo).

## Objetivo desta fase

Uma tela de levantamento de carga utilizável por si só, em
`/simuladores/hibrido-offgrid/cargas`: o usuário monta a lista de cargas da
instalação, apoiado por uma biblioteca de cargas típicas mantida pela empresa,
e vê o consumo consolidado e a curva de demanda de 24 horas.

Na 3b esta tela vira componente embutido no simulador; o levantamento passa a
alimentar o dimensionamento.

## Decisões (definidas no brainstorming)

1. **Rota própria** — a 3a é verificável no navegador sozinha, não só um
   componente que espera a 3b.
2. **Biblioteca de cargas editável por empresa**, persistida no banco.
3. **Semeada em cada empresa** com ~25 cargas típicas, pelo padrão de seed
   preguiçoso já usado em `seedConcessionarias()`: upsert idempotente disparado
   no primeiro acesso, quando a lista está vazia. Sem migration de dados e sem
   gancho na criação de organização.
4. **Gestão da biblioteca inline** na própria tela de cargas, não em sub-rota.
5. **Sem persistência do levantamento nesta fase**, mas com **aviso visível** na
   tela. A 3c resolve.
6. **Infraestrutura de teste de componente adicionada** (jsdom +
   testing-library), sem alterar o ambiente dos testes existentes.

## Modelo de dados

Duas coisas distintas, deliberadamente separadas:

- **Biblioteca** — modelos reutilizáveis de carga, persistidos por empresa.
  Tem os campos de uma carga **menos a quantidade**, que é do uso e não do
  modelo.
- **Levantamento** — a lista de cargas desta simulação. Estado em memória no
  componente; na 3c passa a ser salvo como parte do input da simulação.

Adicionar da biblioteca cria uma carga no levantamento com `quantidade = 1` e
os demais campos pré-preenchidos, editáveis a partir daí.

### Migration `simulador_cargas_biblioteca`

No molde de `simulador_equip_*`: `id uuid PK`, `organization_id uuid NOT NULL
REFERENCES organizations(id) ON DELETE CASCADE`, `created_at`/`updated_at`,
índice em `organization_id`, RLS com a política
`"org members can manage simulador cargas biblioteca"` (FOR ALL, subquery em
`organization_members`).

| coluna | tipo | obrigatório | observação |
|---|---|---|---|
| nome | text | sim | |
| categoria | text | não | Iluminação, Refrigeração, Aquecimento, Eletrônico, Motor, Outro |
| potencia_unit_w | numeric | sim | |
| potencia_partida_w | numeric | sim | ≥ potência nominal; motores/compressores têm partida maior |
| tensao_v | numeric | sim | |
| fator_potencia | numeric | sim | 0 < FP ≤ 1 |
| horas_dia | numeric | sim | 0–24 |
| dias_semana | integer | sim | 1–7 |
| hora_inicio | numeric | sim | horas decimais (19.5 = 19:30) |
| hora_fim | numeric | sim | horas decimais |
| prioridade | text | não | Alta, Média, Baixa |
| critica | boolean | sim | default false |

**Constraint única em `(organization_id, nome)`** — necessária para o
`onConflict` do seed idempotente.

### Seed

`web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts` com ~25 cargas típicas
residenciais e rurais. Requisito de qualidade dos dados: **potência de partida
realista**, maior que a nominal em motores e compressores (geladeira, freezer,
ar-condicionado, bomba d'água, máquina de lavar). Esse campo alimenta a
verificação de surge do inversor no motor da 2a — preenchê-lo igual à nominal
tornaria a verificação inútil.

Horários (`hora_inicio`/`hora_fim`) devem refletir uso plausível, já que
alimentam a curva de 24 h: iluminação à noite, chuveiro em janelas curtas,
geladeira nas 24 h.

## Server actions

`web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts` (`'use server'`), no
padrão de `equipamentos-actions.ts`:

- `listCargasBiblioteca()` — org-scoped, ordenada por nome, `[]` em erro
- `createCargaBiblioteca(data)` — Zod, teto de 200 por empresa, `logAction`, `revalidatePath`
- `updateCargaBiblioteca(id, data)` / `deleteCargaBiblioteca(id)` — sempre com
  `.eq('organization_id', ...)` além do `id`
- `seedCargasBiblioteca()` — upsert com
  `{ onConflict: 'organization_id,nome', ignoreDuplicates: true }`.
  **Sem `revalidatePath`**: é chamada durante o render da página, e revalidar
  durante o render lança erro no Next (bug já corrigido no commit `10db9ca`
  para as concessionárias).

Schemas e mapeadores ficam em `cargas-biblioteca-schemas.ts` (módulo puro,
testável sem código server-only), espelhando a separação feita na Fase 1.

Validações relevantes: `potenciaPartidaW >= potenciaUnitW`,
`0 < fatorPotencia <= 1`, `0 <= horasDia <= 24`, `1 <= diasSemana <= 7`,
`0 <= horaInicio < 24`, `0 <= horaFim < 24`.

## Tela e componentes

Rota: `web/app/(dashboard)/simuladores/hibrido-offgrid/cargas/page.tsx` — guard
`isSimuladoresEnabled()` → `redirect('/simuladores')`; seed no primeiro acesso
(lista vazia → `seedCargasBiblioteca()` → relista), no padrão exato da página de
concessionárias.

Cinco componentes focados, em vez de um monolito:

| Componente | Responsabilidade |
|---|---|
| `CargasBuilder` | Orquestra; dona do estado do levantamento; chama `calcularCargas()` |
| `CargasTabela` | Lista editável do levantamento: adicionar da biblioteca, adicionar em branco, editar, remover |
| `CargasResumo` | Consumo diário/mensal/anual, consumo crítico, potências conectada/simultânea/partida, pico |
| `CargasCurva24h` | Curva de demanda com recharts, no padrão dos gráficos do dashboard |
| `BibliotecaCargasPanel` | Gestão inline da biblioteca (recolhível): CRUD dos modelos |

**Os cálculos não são reimplementados.** `CargasBuilder` chama
`calcularCargas(cargas, PREMISSAS_PADRAO)` do motor da Fase 2a via `useMemo`. A
tela coleta entrada e exibe resultado; nenhuma fórmula vive na UI.

**Aviso de não-persistência:** um aviso visível informa que o levantamento não é
salvo ainda e será perdido ao recarregar a página.

**Ponte biblioteca → levantamento:** função pura
`bibliotecaParaCarga(modelo)` em `cargas-biblioteca-schemas.ts`, que devolve uma
`Carga` (tipo do motor da 2a) com `quantidade: 1`. Fica isolada e testável.

## Infraestrutura de teste de componente

Verificado empiricamente nesta versão (vitest 4.1.10): o docblock
`// @vitest-environment jsdom` **é** honrado por arquivo.

- **`vitest.config.ts` não muda.** O ambiente global segue `node`, e os 318
  testes puros existentes continuam rápidos e intocados.
- Novas devDependencies: `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/jest-dom`.
- Os matchers do jest-dom são importados **dentro de cada arquivo de teste de
  componente** (`import '@testing-library/jest-dom/vitest'`), não em
  `setupFiles` global — assim nenhum teste puro é afetado.
- Todo arquivo de teste de componente começa com o docblock
  `// @vitest-environment jsdom`.

## Testes

### Puros (ambiente node, como as fases anteriores)

`web/__tests__/hibrido-cargas-biblioteca.test.ts`:
- Schemas Zod: aceita modelo mínimo válido; rejeita `potenciaPartidaW <
  potenciaUnitW`; rejeita `fatorPotencia` fora de (0, 1]; rejeita `horasDia > 24`;
  rejeita `diasSemana` fora de 1–7
- Mapeadores row↔objeto preservam valores e nulos
- `bibliotecaParaCarga()` devolve `quantidade: 1` e copia os demais campos

`web/__tests__/hibrido-cargas-seed.test.ts` — a qualidade do seed importa
porque ele vira dado de produção em toda empresa:
- Todos os itens passam no schema Zod
- Nomes são únicos (a constraint do banco depende disso)
- `potenciaPartidaW >= potenciaUnitW` em todos
- Pelo menos uma carga de motor/compressor tem partida estritamente maior que a
  nominal (senão a verificação de surge do inversor nunca é exercitada)
- Horários dentro de 0–24 e `horasDia` nunca maior que a duração da janela
  `horaInicio → horaFim` (considerando a volta da meia-noite). Não se exige
  igualdade: cargas com ciclo de trabalho, como a geladeira, rodam 8 h/dia
  dentro de uma janela de 24 h.

### De componente (ambiente jsdom)

`web/__tests__/hibrido-cargas-ui.test.tsx`:
- `CargasTabela`: adicionar da biblioteca preenche os campos do modelo;
  alterar a quantidade recalcula o consumo exibido; remover tira a linha
- `CargasResumo`: renderiza os valores devolvidos pelo motor
- `BibliotecaCargasPanel`: criar/editar/excluir chamam as server actions
  (mockadas com `vi.mock`) e refletem o resultado
- `CargasCurva24h`: monta sem lançar

**Escopo deliberado do teste do gráfico:** apenas "renderiza sem quebrar". O
`ResponsiveContainer` do recharts mede largura zero em jsdom e não desenha as
barras, então afirmar sobre o desenho daria atrito alto e valor quase nulo — a
correção da curva já está coberta pelos testes puros de `calcularCargas` na
Fase 2a.

## Tratamento de erros

- Server actions retornam `ActionResult` com mensagem em pt-BR; nunca lançam
- `list*` retorna `[]` em erro (fail-safe, padrão do projeto)
- Levantamento vazio → resumo zerado e curva com 24 zeros, sem quebrar (já
  garantido pelo motor da 2a)
- Falha do seed não impede a tela de abrir: a lista simplesmente vem vazia e o
  usuário cadastra manualmente

## Fora de escopo

- Persistência do levantamento — Fase 3c
- Inputs de projeto, clima, tarifas e equipamentos — Fase 3b
- Resultados de dimensionamento e financeiros — Fase 3b
- PDFs — Fase 4
- Importar levantamento de planilha/CSV — não planejado
