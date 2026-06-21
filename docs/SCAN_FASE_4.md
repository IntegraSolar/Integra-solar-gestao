# SCAN COMPLETO FASE 4 INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Quarta onda de varredura, focada em ícones pequenos, ícones de Configuração, Botões de linha e controles menores.
- Navegação visual reaproveitando o navegador aberto.
- Quando o estado real veio zerado nesta Sessão, a Validação foi complementada em modo demo/local e por leitura de Código.

Regra desta fase:
- Não repetir problema já mapeado nas fases 1, 2 e 3.
- Entrar só quando o controle pequeno revelou uma causa nova, um falso positivo novo ou um fluxo novo quebrado.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada |
|---|---|---|---|---|
| 1 | Propostas > Listagem > Ação Re-gerar (`↻`) | Re-gerar proposta Não regera nada | O ícone chama `reGerarProposta(id)`, que apenas mostra a mensagem "crie uma nova proposta", sem duplicar, recalcular ou abrir um fluxo real de nova versão. Apoio: `frontend/index.html:2805`. | O ícone deveria reabrir a proposta, gerar nova versão ou ser removido. |
| 2 | Financeiro > Parcelas > Modal > Dar Baixa | Baixa de parcela confirma antes de validar o banco | `darBaixaParcela()` marca a parcela como `Pago` no estado local antes da confirmacao remota e sempre exibe `Parcela baixada!`, mesmo que o update falhe. Apoio: `frontend/index.html:5634`. | A parcela só deve virar paga após confirmacao real da gravacao. |
| 3 | Projetos > Colunas Lim. Aprovação / Lim. Vistoria | Datas-limite dao falso positivo de sucesso | `updateProjetoDate()` altera o projeto localmente, chama update assincrono no Supabase e em seguida dispara `Data atualizada`, sem bloquear nem reverter em caso de erro. Apoio: `frontend/index.html:5643`. | A tela deve confirmar sucesso só depois da persistência ou mostrar erro e rollback. |
| 4 | Configurações > Funil CRM > Nome da etapa | Renomear etapa Não sincroniza o Kanban na hora | `renameCol()` atualiza o nome no estado e re-renderiza apenas a grade de Configuração (`renderStageCfg()`), sem chamar `renderKanban()`. Apoio: `frontend/index.html:2680`. | Ao renomear uma etapa, a Configuração e o Kanban devem refletir a mudanca imediatamente. |
| 5 | Configurações > Funil CRM > Botão Cor | Mudanca de cor aceita qualquer texto e pode quebrar o visual | `chgColColor()` usa `prompt()` e grava o valor direto em `col.color`, sem validar se a string e um hex/CSS válido. Apoio: `frontend/index.html:2681`. | O sistema deveria validar a cor antes de aplicar ou usar seletor de cor controlado. |
| 6 | Empresas > Lista > Ativar/Desativar empresa | Ação administrativa confirma sucesso sem checar retorno | `toggleEmpresaAtiva()` faz `await supabase...update(...)`, ignora `error` e sempre mostra toast de ativacao/desativacao, mesmo se a alteracao falhar. Apoio: `frontend/index.html:5133`. | A Ação deve inspecionar o retorno do banco e só anunciar sucesso quando a empresa realmente mudar de estado. |
| 7 | Empresas > Lista > Visualizar como empresa | Impersonacao pode misturar contexto entre empresas | `loginComoEmpresa()` guarda só Usuário/org no backup, troca empresa e chama `init()`. `sairImpersonate()` restaura Usuário/org, mas Não restaura um snapshot isolado dos datasets carregados. Apoio: `frontend/index.html:5141-5155`. | O modo "ver como empresa" deve restaurar contexto completo ou recarregar tudo de forma segura ao sair. |
| 8 | Configurações > Templates > Botão Remover (`✕`) | Exclusao de template some da UI antes da confirmacao externa | `deleteTemplate()` remove o template do store e da tela antes de confirmar remocao em storage/banco; as chamadas remotas Não validam erro. Apoio: `frontend/index.html:4396`. | O template só deve sair definitivamente da lista após exclusao confirmada no backend/storage. |

## Leitura Rapida

1. A Fase 4 encontrou problemas mais "finos": Ações pequenas que passam a impressao de acabamento, mas ainda estao sem transacao segura.
2. O Padrão dominante desta fase foi `falso positivo de sucesso` em controles pequenos.
3. O segundo Padrão foi `edicao local imediata sem sincronizacao garantida` em ícones e Botões de linha.

## Base Técnica Desta Fase

- Evidencia visual de controles pequenos em contratos: `.playwright-cli/page-2026-03-30T18-34-26-101Z.yml`
- Evidencia visual de modal de parcelas/baixa: `.playwright-cli/page-2026-03-30T18-37-19-181Z.yml`
- Evidencia visual de clientes/docs em modo demo: `.playwright-cli/page-2026-03-30T18-38-57-677Z.yml`
