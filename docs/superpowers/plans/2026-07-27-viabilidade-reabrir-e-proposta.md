# Viabilidade: reabrir simulação e acessar a proposta — Plano

**Goal:** Cada simulação salva ganha "Reabrir" (recarrega os campos no simulador) e "Proposta" (abre a apresentação comercial daquela simulação), além de excluir.

**Arquitetura:** Reabrir reconstrói `CamposSimulador` do `input` salvo (função pura, sem custo). Proposta é lazy: gera o link a partir do input na primeira vez e guarda o token na linha; reabre o mesmo depois. Migration adiciona `modelo_painel`, `modelo_inversor`, `apresentacao_token` a `simulador_viabilidade`.

---

## Task 1 — Migration
Criar `web/supabase/migrations/20260727000002_viabilidade_reabrir.sql`:
```sql
ALTER TABLE public.simulador_viabilidade
  ADD COLUMN IF NOT EXISTS modelo_painel text,
  ADD COLUMN IF NOT EXISTS modelo_inversor text,
  ADD COLUMN IF NOT EXISTS apresentacao_token text;
```
Aplicada por Iago ANTES do código.

## Task 2 — `camposDoInput` (pura) + teste
Em `web/lib/simuladores/viabilidade/montar-input.ts`, exportar `camposDoInput(input: ViabilidadeInput): CamposSimulador` que devolve os campos por-negócio + `premissas` reconstruídas do input. Teste: `montarViabilidadeInput(campos, conc)` → `camposDoInput` → campos iguais aos originais (round-trip nos campos por-negócio e premissas).

## Task 3 — actions: salvar com modelos, listar token, ação de proposta
- `SalvarSimulacaoData` + `salvarSimulacao`: aceitar/gravar `modeloPainel`, `modeloInversor`.
- `SimulacaoResumo` + `listSimulacoes`: incluir `modeloPainel`, `modeloInversor`, `apresentacaoToken`.
- Nova `abrirPropostaDaSimulacao(id)`: se `apresentacao_token` existir, retorna; senão recomputa `resultado = calcularViabilidade(input)`, resolve o nome da concessionária, insere em `simulador_viabilidade_apresentacoes`, grava o token na linha da simulação, retorna `{ token }`.

## Task 4 — UI (SimuladorViabilidade)
- `salvar()` passa `modeloPainel`/`modeloInversor`.
- `reabrir(s)`: `setCampos(camposDoInput(s.input))`, `setConcId(s.concessionariaId ?? '')`, cliente/modelos, scroll ao topo.
- `abrirProposta(s)`: chama a action, abre `/proposta-usina/{token}` em nova aba.
- Linha da lista: botões **Reabrir · Proposta · excluir**.

## Task 5 — tipos do banco + verificação
Atualizar `database.types.ts` (3 colunas). `tsc --noEmit` + `vitest run` verdes.
