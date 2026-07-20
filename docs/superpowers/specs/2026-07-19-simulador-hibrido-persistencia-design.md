# Simulador Híbrido / Off-grid — Fase 3c: Persistência de simulações

**Data:** 2026-07-19
**Status:** Aprovado (aguardando revisão do spec)
**Fase:** 3c de 4 do simulador Híbrido / Off-grid

## Contexto

O simulador está completo em cálculo e já aparece como `disponivel` no hub:
cadastro de equipamentos (Fase 1), motor físico (2a), motor financeiro (2b),
construtor de cargas (3a) e a tela inteira (3b e 3b2).

Falta guardar o trabalho. Esta fase acrescenta salvar, listar, **reabrir** e
excluir simulações, mais os campos de identificação do cliente que foram
adiados da 3b por não afetarem cálculo.

Depois desta vem a **Fase 4** (Memorial descritivo e Relatório executivo em PDF),
que depende de conseguir reabrir uma simulação salva para regerar a proposta.

## Decisões (definidas no brainstorming)

1. **O snapshot guarda o estado da tela E uma cópia dos equipamentos usados.**
2. **Identificação do cliente em texto livre**, sem vínculo com o CRM por ora.
3. **Simulação salva pode ser reaberta**, restaurando a tela inteira.
4. **Reabrir pede confirmação** antes de substituir o que está na tela.
5. Só o simulador híbrido muda; a viabilidade fica como está.

## Duas lacunas do padrão existente que este spec corrige

O simulador de viabilidade é o precedente natural, mas tem dois problemas que
não devem ser herdados.

**Ele salva e nunca reabre.** `simulador_viabilidade` guarda o `input` em JSONB,
e a tela nunca o lê de volta — a lista de "Simulações salvas" é um registro de
TIR/VPL/payback e nada mais. O snapshot é peso morto. No híbrido isso seria pior,
porque a Fase 4 precisa regerar o PDF de uma proposta antiga, o que exige
reabrir.

**O payback é gravado como `integer NOT NULL DEFAULT 0`.** Mas o payback pode
legitimamente não existir: quando o investimento não se paga dentro do
horizonte, o motor da Fase 2b devolve `null`. Guardado como `0`, apareceria na
listagem como "0 anos" — que lê como "se paga imediatamente", exatamente o
oposto. Aqui a coluna é **nullable**, e a listagem mostra "não se paga",
coerente com o que a tela já faz nos indicadores.

## Fidelidade do snapshot

Os equipamentos são referenciados por id do cadastro. Se o vendedor salvar uma
simulação e alguém depois editar o preço de um painel ou excluí-lo, reabrir
recalcularia números diferentes dos que o cliente recebeu — ou zeraria o
dimensionamento, se o id sumisse.

Por isso o snapshot guarda **uma cópia dos equipamentos usados**, e ao reabrir
essa cópia é **mesclada ao catálogo atual** (dedup por id, preservando o
catálogo). O painel excluído volta a aparecer no seletor, `montarHibridoInput`
encontra o id, e os números batem com a proposta entregue.

## Modelo de dados

### Migration `simulador_hibrido_simulacoes`

Org-scoped no molde de `simulador_equip_*`: `id uuid PK`, `organization_id uuid
NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`,
`created_at`/`updated_at`, índice em `organization_id`, RLS com a política
`"org members can manage simulador hibrido simulacoes"`.

| coluna | tipo | obrigatório | observação |
|---|---|---|---|
| nome | text | sim | nome da simulação |
| snapshot | jsonb | sim | estado da tela + equipamentos |
| cliente_nome | text | não | texto livre, só para o PDF |
| cliente_cidade | text | não | |
| cliente_uf | text | não | |
| concessionaria | text | não | |
| responsavel_tecnico | text | não | |
| potencia_kwp | numeric | sim | resumo p/ listagem |
| investimento_total | numeric | sim | resumo |
| vpl | numeric | sim | resumo |
| tir | numeric | sim | resumo |
| payback_anos | numeric | **não** | `null` = não se paga no horizonte |

### Forma do snapshot

```ts
export const VERSAO_SNAPSHOT = 1

export type SnapshotSimulacao = {
  versao: number
  campos: CamposHibrido
  camposFin: CamposFinanceiro
  cargas: Carga[]
  equipamentos: {
    painel: EquipPainel | null
    inversor: EquipInversor | null
    bateria: EquipBateria | null
  }
}
```

**O campo `versao` não é decoração.** Este JSON será lido por código futuro — a
Fase 4 mexe nele, e provavelmente outras fases depois. Sem versão, um snapshot
antigo quebra em silêncio quando a forma mudar, ou pior, restaura pela metade.
Com versão, o código detecta e recusa explicitamente.

Na leitura, o snapshot é validado com Zod. Se falhar — versão desconhecida,
campo faltando, forma corrompida — a tela **avisa e não restaura nada**, em vez
de aplicar um estado parcial que o usuário levaria tempo para perceber que está
errado.

## Server actions

`web/lib/simuladores/hibrido/simulacoes-actions.ts` (`'use server'`), no padrão
das demais actions do projeto (Zod, `requireOrg`, `logAction`, `revalidatePath`,
filtro por `organization_id` em toda mutação):

- `listSimulacoesHibrido()` — devolve **só o resumo**, sem o snapshot. A
  viabilidade manda o `input` inteiro de cada simulação no payload da listagem;
  com dezenas de simulações e um snapshot que inclui a lista de cargas, isso
  cresce sem necessidade. O snapshot vem sob demanda.
- `getSimulacaoHibrido(id)` — busca, ao reabrir, o snapshot **e os campos de
  identificação** (nome da simulação, cliente, cidade, UF, concessionária,
  responsável). A identificação vive em colunas próprias, não dentro do
  snapshot, então precisa vir junto — senão reabrir restauraria o cálculo mas
  esvaziaria o cliente, e o vendedor redigitaria sem perceber o que perdeu.
- `salvarSimulacaoHibrido(data)` — teto de 200 por empresa
- `deleteSimulacaoHibrido(id)`

Schemas e mapeadores ficam em `simulacoes-schemas.ts` (módulo puro, testável
sem código server-only), como nas fases anteriores.

## Módulo puro do snapshot

`web/lib/simuladores/hibrido/snapshot.ts`:

- `VERSAO_SNAPSHOT`, `SnapshotSimulacao` e o schema Zod
- `montarSnapshot(campos, camposFin, cargas, equipamentos): SnapshotSimulacao`
- `lerSnapshot(bruto: unknown): SnapshotSimulacao | null` — valida e recusa
- `mesclarEquipamentos(catalogo, doSnapshot): EquipamentosDisponiveis` — dedup
  por id, preservando a ordem do catálogo e acrescentando ao fim o que só existe
  no snapshot

## Tela

**`HibridoIdentificacao`** — bloco novo com nome da simulação, cliente, cidade,
UF, concessionária e responsável técnico. Todos texto livre; nenhum afeta
cálculo. Só o nome da simulação é obrigatório para salvar.

**`HibridoSimulacoesSalvas`** — tabela com nome, cliente, kWp, investimento,
VPL, TIR, payback e data, com ações de reabrir e excluir. Payback `null`
aparece como "não se paga".

**Botão salvar** no simulador: monta o snapshot e o resumo a partir do que está
na tela e chama a action.

**Reabrir** pede confirmação (`window.confirm`), busca a simulação, valida o
snapshot, mescla os equipamentos ao catálogo e substitui `campos`, `camposFin`,
`cargas` **e os campos de identificação**. Se a validação falhar, mostra erro e
não altera nada.

## Estados vazios e de erro

- **Nenhuma simulação salva:** a tabela não é renderizada (como na viabilidade).
- **Salvar sem nome:** a action recusa com mensagem; o botão não é bloqueado à
  toa.
- **Snapshot inválido ao reabrir:** mensagem de erro e nenhuma alteração de
  estado.
- **Equipamento do snapshot ausente do catálogo:** volta a aparecer via merge,
  sem aviso especial — os números continuam corretos, que é o que importa.

## Testes

### Puros (ambiente node)

`web/__tests__/hibrido-snapshot.test.ts`:
- ida e volta preserva campos, campos financeiros, cargas e equipamentos
- `lerSnapshot` recusa versão desconhecida (`versao: 99`) devolvendo `null`
- `lerSnapshot` recusa objeto malformado, `null` e `undefined`
- `mesclarEquipamentos` acrescenta equipamento que só existe no snapshot
- `mesclarEquipamentos` não duplica o que já está no catálogo
- `mesclarEquipamentos` com snapshot sem equipamentos devolve o catálogo intacto

`web/__tests__/hibrido-simulacoes-schemas.test.ts`:
- schema de salvar aceita o mínimo válido e recusa nome vazio
- payback `null` é aceito (não se paga no horizonte)
- mapeadores row↔objeto preservam valores e nulos

### De componente (jsdom)

`web/__tests__/hibrido-simulacoes-ui.test.tsx`:
- `HibridoSimulacoesSalvas` lista as simulações e mostra "não se paga" quando
  o payback é `null`
- reabrir pede confirmação; ao cancelar, nada muda
- ao confirmar, os campos, as cargas **e a identificação do cliente** passam a
  refletir a simulação salva
- snapshot inválido ao reabrir mostra erro e **não altera** o estado da tela
- salvar chama a action com o nome, o resumo e o snapshot corretos

## Fora de escopo

- Vínculo com o cliente do CRM — avaliado numa fase futura
- PDFs — Fase 4
- Corrigir a mesma lacuna no simulador de viabilidade (salvar sem reabrir)
- Edição de uma simulação salva "no lugar" (salvar sempre cria uma nova)
- Compartilhar simulação entre empresas
