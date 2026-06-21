# SCAN COMPLETO FASE 2 INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Segunda onda de varredura, deduplicada contra a Fase 1.
- Navegação visual feita no navegador aberto nas áreas CRM, Relatórios, Entrega da Obra e Configurações.
- Segunda onda paralela com 5 agentes de bronze: Seiya, Shiryu, Hyoga, Shun e Ikki.
- Consolidacao final baseada em interface, Código e schema SQL recuperado.

Regra desta fase:
- Não repetir os 72 problemas da Fase 1.
- Quando um efeito parecia parecido, ele só entrou aqui se apareceu em outro caminho, com outra causa ou com outra quebra.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada |
|---|---|---|---|---|
| 1 | Dashboard > KPIs principais | KPIs tentam atualizar IDs que Não existem | O backend pode responder, mas os cards visíveis continuam sem receber os valores certos porque os IDs procurados Não existem na tela principal. | Os KPIs visíveis devem refletir os dados reais carregados do banco. |
| 2 | Dashboard > Filtros > Período/Cidade/Tipo/Preço | Filtros do dashboard Não fazem nada | Os filtros aparecem, mas Não recalculam cards, KPIs nem Gráficos; na pratica só existe limpeza visual dos campos. | Os filtros devem impactar os indicadores mostrados no dashboard. |
| 3 | CRM > Kanban > Arrastar card entre etapas | Drag and drop falha com UUID | O Kanban converte IDs do banco com `parseInt`; quando vem UUID, o movimento falha silenciosamente. | O arraste deve tratar IDs como string e mover o lead normalmente. |
| 4 | Configurações > Funil CRM > Nova Etapa/Cor/Renomear/Excluir | Gestão de etapas Não persiste | Criar, renomear, trocar cor e excluir etapa altera só o estado local; após reload, tudo volta ao que estava no banco. | As alterações do funil devem ser persistidas antes de dar sucesso. |
| 5 | Configurações > Funil CRM > Excluir etapa | Excluir etapa apaga todos os leads da coluna na interface | Ao remover a etapa, os leads daquela coluna somem junto, sem migracao nem protecao. | O sistema deve bloquear exclusao de etapa com leads ou exigir realocacao previa. |
| 6 | CRM > Kanban > Mover cards repetidamente | Re-render acumula listeners de drag/drop | Cada novo render pode registrar listeners de novo, gerando comportamento duplicado em arrasto e drop. | O Kanban deve montar listeners uma unica vez ou desmontar os antigos. |
| 7 | CRM > Qualquer coluna > Botão "+ Adicionar lead" | Novo lead sempre cai em Prospectos | Mesmo clicando em outra etapa, o lead nasce sempre na primeira coluna. | O lead deve entrar na coluna clicada ou o Botão deve existir só na etapa inicial. |
| 8 | CRM > Modal "Adicionar Lead" > Campo Observação | Observação inicial do lead e descartada | O campo existe, mas o texto digitado Não entra no cadastro final. | A Observação inicial deve ser salva junto com o lead. |
| 9 | CRM > Card do lead > Observações > Abrir/Salvar | Leads do banco podem quebrar o modal de Observações | Em alguns casos a Observação chega como texto, mas o modal tenta tratar como array. | O modal deve normalizar Observações antes de abrir e salvar. |
| 10 | CRM > Cadastrar Cliente > Passo 2 > Proposta aprovada | Dropdown de proposta usa relacao errada | O seletor procura propostas pelo nome do lead, mas os dados reais do banco chegam ligados por ID. | O modal deve relacionar proposta e lead pelo ID correto. |
| 11 | CRM > Cadastrar Cliente > Uploads do cadastro | Anexos podem ficar presos ao ID generico `geral` | O upload nasce sem o `client_id` final e pode ser salvo fora do cliente real. | O cadastro deve usar o ID final ou um staging reconciliado no fechamento. |
| 12 | CRM > Automacoes de etapa | Automacao aponta para etapas que o pipeline Padrão Não cria | O motor tenta mover leads para etapas operacionais que Não existem no funil comercial Padrão. | As automacoes devem usar etapas reais ou criar/mapear esses destinos. |
| 13 | Clientes > Cadastrar Cliente > Dados principais | Validação PF/PJ e frouxa | O formulario aceita seguir sem documento e celular minimamente válidos, mesmo trocando PF/PJ. | O cadastro deve validar documento e celular conforme o tipo de cliente. |
| 14 | Clientes > Cadastrar Cliente > Email/CEP/Endereço/UF/Maps | Campos secundarios sao exibidos e descartados | O Usuário preenche Vários campos, mas o fechamento salva só uma parte curta. | Tudo que a tela pede deve ir para o banco ou sair da tela. |
| 15 | Clientes > Cadastrar Cliente > Passo 2 > Proposta escolhida | Proposta escolhida Não vira `proposal_id` do contrato | O Usuário escolhe a proposta, mas o contrato gerado perde esse Vínculo. | O fechamento deve gravar a proposta selecionada no contrato. |
| 16 | Clientes > Cadastrar Cliente > Passo 3 > Forma de pagamento/parcelas | Forma de pagamento e parcelas sao descartadas | A tela deixa configurar parcelamento, mas no final cria só um lancamento financeiro total. | O financeiro deve respeitar a forma e as parcelas digitadas. |
| 17 | Clientes > Cadastrar Cliente > Salvar novamente cliente existente | Regravar cliente existente duplica cliente, contrato e financeiro | O fluxo local reconhece o cliente, mas a parte remota cria um conjunto novo de registros. | Regravacao deve atualizar os registros existentes, Não duplicar. |
| 18 | Contratos > Alterar status > Aprovar/Pendente/Reprovado | Reverter contrato aprovado Não relocka os Módulos liberados | Depois de aprovado, se o contrato volta para pendente ou reprovado, os Módulos liberados continuam abertos. | A transicao reversa deve recalcular e bloquear novamente os Módulos dependentes. |
| 19 | Contratos > Modal de alteracao > Campo Motivo | Motivo de reprovacao e opcional e pode vazar entre contratos | O campo de motivo pode sobrar de um contrato para outro e Não e exigido de forma consistente na reprovacao. | O motivo deve ser obrigatorio ao reprovar e sempre limpo/carregado por item atual. |
| 20 | Financeiro > Baixa > Upload de comprovante | Comprovante da baixa pode ser anexado na entidade errada | O mesmo componente de upload reaproveitado do cadastro pode continuar apontando para cliente/geral em vez da entrada financeira certa. | O modal de baixa deve ter zona exclusiva ou rebinding obrigatorio para a entrada atual. |
| 21 | Financeiro > Parcelas > Abrir modal/baixar/adicionar | Frontend depende de tabela ausente no schema recuperado | O parcelamento usa `financial_installments`, mas essa tabela Não apareceu no SQL recuperado. | O parcelamento precisa usar tabela real do schema ou o schema deve incluir essa estrutura. |
| 22 | Clientes > Listagem > Badge financeiro | Cliente vira "Fin." com qualquer pagamento isolado | Basta um item pago para a lista marcar o cliente como financeiro concluido, mesmo com saldo pendente. | O badge só deve virar concluido quando todo o recebivel estiver quitado. |
| 23 | Projetos > Liberacao do Módulo | Projetos sao liberados antes da confirmacao do pagamento de entrada | A Própria Página fala em dependencia de contrato e entrada, mas o fluxo abre Projetos cedo demais. | Projetos devem ser liberados só quando as Condições realmente forem atendidas. |
| 24 | Projetos/Compras/Entrega/Obras > Recarregar a Página | Flags de bloqueio somem após reload | Vários Módulos operacionais voltam como liberados sem reconstruir a cadeia real de dependencia. | O bloqueio deve ser refeito a cada carga da aplicacao. |
| 25 | Compras > Lista > Coluna "Dias Atraso" | Atraso de compras e medido pela data da compra, Não pela previsao de entrega | O indicador mostra idade da compra, Não o atraso logistico real. | O atraso deve comparar previsao com entrega real. |
| 26 | Compras > Lista > Botão "Concluir" | Conclusão da compra Não persiste no banco | O clique muda o estado local e libera a Próxima etapa, mas Não grava status nem data real da compra no banco. | Concluir compra deve persistir a mudanca antes de anunciar sucesso. |
| 27 | Entrega de Material > Lista > Coluna "Data Compra/Dias Espera" | Entrega mede espera pela data errada | A espera e calculada pela Própria entrega, Não pela compra original que gerou a entrega. | O tempo de espera deve nascer da compra ligada por `purchase_id`. |
| 28 | Entrega de Material > Botão "Confirmar Entrega" | Confirmar entrega Não abre a etapa Entrega da Obra | A interface promete liberar a Próxima etapa, mas o Código só destrava Obras. | Confirmar entrega deve Também abrir ou destravar Entrega da Obra. |
| 29 | Entrega da Obra > Tela principal | Tela se diz bloqueada, mas já mostra dado editavel | Na Validação visual, a Página exibiu mensagem de bloqueio e ao mesmo tempo uma linha real com controle de status editavel. | Se estiver bloqueada, a tela Não deve expor dados nem controles editaveis. |
| 30 | Entrega da Obra > Lista e alteracao de status | Entrega da Obra ignora `work_completions` e opera só em memoria | A etapa usa estado local e Não conversa com a estrutura real de Conclusão da obra no banco. | A tela deve ler e gravar os dados reais de Conclusão e ligação do sistema. |
| 31 | Obras > Checklist de Instalacao | Checklist de obras esta preso a uma cliente fixa | A tela permanece amarrada a `Ana Costa`, em vez de acompanhar a obra selecionada. | O checklist deve variar por obra/cliente e persistir por registro. |
| 32 | Obras > Aba "Por Equipe" | Visao por equipe ignora as equipes reais do banco | A aba consolida por um campo local simplificado, sem carregar as alocacoes reais de equipe. | A visao por equipe deve usar os dados reais de equipes de obra. |
| 33 | Projetos > Coluna "Lim. Aprovação/Lim. Vistoria" | Projeto grava e consulta colunas que Não existem no schema recuperado | O frontend usa campos de prazo que Não aparecem na tabela `projects` recuperada. | Limites e alertas devem usar colunas reais do schema. |
| 34 | Projetos > Alterar status | Mudanca de status do projeto some após reload | O status muda na tela, mas Não e persistido e desaparece ao recarregar. | O status do projeto deve ser salvo no banco. |
| 35 | Projetos > Delegar projetista | Delegacao mistura nome fixo com UUID e Não persiste | A tela oferece nomes locais, mas a estrutura real do banco trabalha com ID do Usuário responsavel. | A delegacao deve resolver o Usuário real e persistir o ID correto. |
| 36 | Comissões > Carregar dados do banco e liberar por Quitação | Comissões vindas do banco perdem Vínculo e Não liberam direito na Quitação | O mapeamento simplifica demais os dados e atrapalha a liberacao no momento correto da Quitação financeira. | A Comissão deve manter Vínculo consistente com cliente e financeiro para liberar no momento certo. |
| 37 | Comissões > Botão "Pagar" | Pagamento de Comissão Não persiste | O clique muda o status em memoria, mas Não grava o pagamento real nem a data. | O pagamento de Comissão deve ser persistido no banco. |
| 38 | Pós-Obra > Lista principal | Pós-Obra e montado só em memoria | A carga inicial Não busca dataset Próprio; a etapa nasce de `push` local e some ao recarregar. | A etapa deve ser persistida ou reconstruida de consultas reais. |
| 39 | Topo > Sino > Alertas e Pendencias | Modal de Notificações Não tem alvo para a lista dinamica | A interface abriu com alertas estaticos, mas o renderer dinamico procura um elemento que Não existe no modal. | O modal deve ter conteiner real para a lista do banco. |
| 40 | Topo > Sino > Carregamento de Notificações | Frontend depende de view ausente no schema recuperado | O carregamento usa `vw_notificacoes`, mas a view Não apareceu no SQL recuperado. | O frontend deve ler uma estrutura real do banco ou o schema deve trazer essa view. |
| 41 | Topo > Sino > Criar/Ler/Marcar Notificações | Fluxo de Notificações usa colunas diferentes das da tabela `notifications` | O CRUD trabalha com nomes de coluna diferentes dos que existem na tabela recuperada. | O frontend deve usar exatamente as colunas reais da tabela de Notificações. |
| 42 | Configurações > Metas > Botão "Salvar Metas" | Salvar metas e falso positivo | O Botão só rerenderiza a tela e mostra sucesso, sem persistir nada. | O Botão deve gravar as metas reais antes de confirmar sucesso. |
| 43 | Configurações > Permissões > Botão "Salvar Permissões" | Salvar Permissões e falso positivo | A tela anuncia sucesso, mas Não grava a matriz de Permissão em nenhuma tabela real. | O Botão deve persistir as Permissões antes do toast de sucesso. |
| 44 | Configurações > Permissões > Carga inicial | Fonte de Permissões da tela Não existe no schema recuperado | A tela carrega Permissões de uma tabela esperada pelo frontend que Não apareceu no schema recuperado. | O carregamento deve usar as tabelas reais do RBAC recuperado. |
| 45 | Configurações > Permissões > Perfis exibidos | Grade visual de Permissões Não representa o RBAC usado pelo app | Os perfis exibidos na tela Não batem com os grupos realmente usados pelo controle de acesso operacional. | A Configuração visual deve trabalhar com os mesmos perfis do RBAC real. |
| 46 | Sessão multiempresa > Carga inicial de dados | `dbLoadAll()` mistura dados de todas as empresas | O carregamento geral busca registros sem filtrar pela organização atual. | A Sessão deve carregar apenas os dados da empresa logada. |
| 47 | Administrativo > Auditoria | Fluxo administrativo grava em tabela de auditoria diferente da do schema | O frontend tenta gravar em uma estrutura de auditoria que Não bate com a tabela recuperada no SQL. | A auditoria deve usar a tabela e colunas reais do schema. |
| 48 | Uploads/Documentos > Fluxo de anexos em geral | Frontend usa `attachments`, mas o schema recuperado modela documentos de outro jeito | O fluxo de anexos opera sobre uma tabela esperada pelo frontend, enquanto o schema recuperado trouxe outro modelo documental. | O fluxo de anexos deve usar o modelo real do banco ou o schema precisa ser ajustado. |
| 49 | Segurança geral > Browser + Supabase + RLS | Isolamento entre empresas fica aberto por anon key exposta e politicas permissivas | O frontend expoe a chave publica e o SQL recuperado mostra politicas abertas demais em tabelas sensiveis. | O acesso deve ser restringido por Sessão, organização e RLS real. |
| 50 | Pacote do projeto > Scripts/perfis locais | Projeto recuperado inclui perfis reais de navegador dentro da pasta | O material recuperado carrega perfis locais de browser, Histórico e preferencias junto com o projeto. | O pacote deve distribuir perfis limpos ou ignorar totalmente esses diretórios. |

## Leitura Rapida

1. A Fase 2 encontrou problemas novos principalmente em `CRM/Kanban`, `cadastro profundo de cliente`, `modulos operacionais do pos-contrato`, `notificacoes`, `permissoes multiempresa` e `seguranca estrutural`.
2. O Padrão que mais se repetiu foi: a tela promete uma coisa, mas o dado real Não persiste, ou persiste em tabela/coluna diferente da que o schema recuperado trouxe.
3. O segundo Padrão mais forte foi: Vários fluxos dependem de relacoes erradas entre nome de cliente, UUID, etapa visual e chave estrangeira.

## Prioridade Sugerida

1. Corrigir primeiro tudo que causa duplicidade, vazamento entre empresas ou persistência na tabela errada.
2. Depois corrigir a cadeia operacional `Contrato > Financeiro > Projetos > Compras > Entrega > Obras > Entrega da Obra > Pos-Obra`.
3. Por Último, atacar inconsistencias de dashboard, UX e telas administrativas que hoje dao falso positivo de sucesso.
