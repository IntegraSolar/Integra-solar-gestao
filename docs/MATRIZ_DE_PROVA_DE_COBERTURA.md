# MATRIZ DE PROVA DE COBERTURA - INTEGRA SOLAR

Data: 30/03/2026

## Objetivo

Transformar a `MATRIZ_FINA_POR_CONTROLE.md` em mapa de cobertura executável:
- o que já falhou com prova documentada
- o que já foi exercitado, mas ainda sem prova forte
- o que ainda Não foi exercitado de verdade

## Como ler

Colunas:
- `Bloco`
- `Controle`
- `Cobertura atual`
- `Evidencia existente`
- `Proxima prova necessaria`

Legenda:
- `Falha ja documentada`
- `Exercitado sem prova forte`
- `Nao exercitado`

## Consolidacao

### Bloco 1 - Shell, Dashboard e Configurações

| Bloco | Controle | Cobertura atual | Evidencia existente | Próxima prova necessaria |
|---|---|---|---|---|
| Bloco 1 | E-mail (`#le`) | Exercitado sem prova forte | `SCAN FULL` cobre o fluxo de login/Autenticação e credenciais locais, mas Não válida o campo isoladamente. | Digitar valido/invalido, testar Enter, foco, teclado e mobile. |
| Bloco 1 | Senha (`#lp`) | Exercitado sem prova forte | `SCAN FULL` cobre o login como fluxo, mas Não traz prova do comportamento do campo em si. | Validar máscara, preservacao de valor, Enter, foco e mobile. |
| Bloco 1 | Mostrar/ocultar senha (`#btn-toggle-senha`) | Não exercitado | Não achei achado especifico nos scans. | Clique real comprovando troca de visibilidade sem perder foco nem valor. |
| Bloco 1 | E-mail de recuperação (`#le-reset`) | Não exercitado | `SCAN_FASE_6` prova que os atalhos de troca de painel sao mouse-only, mas Não prova o campo de reset. | Abrir recuperação e testar digitação, Validação e teclado. |
| Bloco 1 | Enviar link (`#lbtn-reset`) | Não exercitado | Não achei prova direta do disparo do reset. | Tentar com e-mail valido/invalido e registrar retorno, erro e reload. |
| Bloco 1 | Novo Lead (`#btn-novo-lead`) | Exercitado sem prova forte | `SCAN FULL` cobre o fluxo de novo lead dentro do CRM, mas Não prova este gatilho da topbar. | Clique real na topbar, abrir modal correto e confirmar Permissão/foco. |
| Bloco 1 | Limpar filtros | Exercitado sem prova forte | `SCAN FULL` diz que os filtros do dashboard Não recalculam nada e ficam quase só na limpeza visual, sem prova nominal do Botão. | Aplicar filtros, limpar, confirmar reset de cards/Gráficos e estado após reload. |
| Bloco 1 | Seletor de Gráfico (`#chart-sel`) | Exercitado sem prova forte | `SCAN FULL` documenta dashboard/Gráficos em modo demo, mas Não prova a troca de serie por este select. | Mudar Opção e comprovar alteracao visual e de dados. |
| Bloco 1 | Comparar ano anterior (`#cmp-chk`) | Não exercitado | Não achei mencao direta ao checkbox comparativo. | Marcar/desmarcar e validar mudanca no Gráfico/KPI e persistência do estado. |
| Bloco 1 | Frequencias de alertas (`#alrt-cfg`) | Não exercitado | Os scans cobrem Notificações do topo, Não o grupo de frequencias em Configurações. | Abrir `Alertas`, alterar frequencias/estados, salvar e recarregar. |
| Bloco 1 | Metas por área (`#metas-form`) | Exercitado sem prova forte | `SCAN FULL` prova problema em `Salvar Metas` e no Cálculo da mini-meta, mas Não o formulario campo a campo. | Editar metas por área, validar reflexo no dashboard, salvar e reload. |
| Bloco 1 | + Convidar Usuário | Exercitado sem prova forte | `SCAN FULL` cobre `Usuarios > Novo usuario > Cadastrar`, mas Não prova este Botão de abertura. | Clique real, modal com foco correto, submissao e contexto da linha/tela. |
| Bloco 1 | Restaurar Padrões | Não exercitado | Ha achados sobre carga/salvamento de defaults, mas Não sobre o Botão de restauracao. | Alterar defaults, restaurar e comprovar rollback visual e persistido. |
| Bloco 1 | Projeto (`#pd-proj`) | Exercitado sem prova forte | `SCAN FULL` mostra que defaults/custos/prazos usam estrutura errada, sem prova do campo isolado. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | Instalacao (`#pd-inst`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | KM (`#pd-km`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | CA (`#pd-ca`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | Comissão (`#pd-com`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | Imprevistos (`#pd-imp`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | Margem (`#pd-mg`) | Exercitado sem prova forte | Mesma evidencia estrutural dos defaults, sem prova direta do campo. | Editar, salvar, recarregar e checar reflexo no Cálculo. |
| Bloco 1 | Simular impacto | Não exercitado | Não achei achado especifico do Botão de simulacao. | Alterar defaults, clicar simular e validar recalculo coerente. |
| Bloco 1 | Prazo medio de contrato (`#pd-prazo-cont`) | Exercitado sem prova forte | `SCAN FULL` prova falha estrutural em carga/salvamento de prazos, mas Não no campo isolado. | Editar, salvar, recarregar e confirmar efeito nos fluxos dependentes. |

### Bloco 2 - CRM e Clientes

| Bloco | Controle | Cobertura atual | Evidencia existente | Próxima prova necessaria |
|---|---|---|---|---|
| Bloco 2 | CRM > Cabeçalho > Etapas | Exercitado sem prova forte | O Funil CRM foi exercitado em renomear/cor/excluir etapa, mas sem prova de que a entrada foi por este Botão. | Clicar no Botão a partir do CRM e comprovar abertura correta em `Configuracoes > Funil CRM`, Permissão e foco. |
| Bloco 2 | CRM > Cabeçalho > + Adicionar Lead | Exercitado sem prova forte | O fluxo de novo lead foi usado e a Fase 6 revisou modais em geral, mas Não isolou este gatilho. | Acionar pelo cabeçalho, confirmar abertura, foco inicial, cancelamento e retorno ao gatilho. |
| Bloco 2 | CRM > Kanban > Card > Opções | Exercitado sem prova forte | Itens internos do menu foram usados, mas a abertura/fechamento do menu em si Não foi comprovada isoladamente. | Abrir/fechar por mouse e teclado, validar foco, dismiss e item correto. |
| Bloco 2 | CRM > Kanban > Card > Opções > Gerar Proposta | Exercitado sem prova forte | A Geração de proposta foi analisada, mas Não ha prova de que esta Opção abre a proposta já Pré-preenchida a partir do lead. | Acionar do card e conferir pre-preenchimento, Vínculo do lead e persistência do contexto. |
| Bloco 2 | CRM > Kanban > Card > Opções > Cadastrar Cliente | Exercitado sem prova forte | O fluxo `CRM > Cadastrar Cliente` foi explorado nas etapas internas, mas Não ha prova direta do item abrindo com os dados do lead já carregados. | Abrir pelo card e validar Pré-carga correta antes de navegar no wizard. |
| Bloco 2 | CRM > Modal Adicionar Lead > Dados basicos (`Nome`, `Telefone`, `Cidade`) | Exercitado sem prova forte | O cadastro de lead foi usado, mas as falhas registradas focam em ID/persistência/Pré-cadastro, Não nesses 3 campos especificamente. | Criar lead e conferir os valores salvos na UI e no banco após reload. |
| Bloco 2 | CRM > Modal Observações do Lead > Nova Observação | Exercitado sem prova forte | O modal foi exercitado e falha no salvar/normalizar, mas o recebimento do campo Não foi medido isoladamente. | Digitar Observação em lead local e lead vindo do banco, salvar, recarregar e reabrir. |
| Bloco 2 | Clientes > Barra de filtros > Todas cidades | Não exercitado | Não ha mencao especifica nos scans; só existe prova de falha na busca por telefone e nos ícones da lista. | Filtrar por cidade, combinar com busca/reload e validar resultado vazio e Não vazio. |
| Bloco 2 | Clientes > Barra de filtros > Todos tipos | Não exercitado | Não ha mencao especifica nos scans. | Filtrar por tipo, combinar com cidade/busca e validar persistência após reload. |
| Bloco 2 | Clientes > Modal Criar Acesso do Cliente > Nome, Telefone, E-mail, Senha | Exercitado sem prova forte | O ícone de portal abriu modal sem contexto do cliente; Não ha prova forte de preenchimento, Validação e Vínculo desses campos. | Abrir com cliente correto, validar Pré-carga, editar campos, salvar e testar login. |
| Bloco 2 | Clientes > Modal Criar Acesso do Cliente > Cadastrar Acesso | Não exercitado | Ha prova de abertura ruim do modal, mas Não de clique bem-sucedido no submit. | Submeter, verificar Criação real do acesso, bloqueios de Permissão e login do cliente. |
| Bloco 2 | Clientes > Modal Cadastro do Cliente > Voltar / Salvar e Avancar / Finalizar Cadastro | Exercitado sem prova forte | O cadastro profundo foi percorrido em Vários passos, mas os Botões de Navegação Não foram medidos isoladamente. | Percorrer todo o wizard, usar voltar/avancar/finalizar, recarregar e conferir persistência por etapa. |
| Bloco 2 | Clientes > Cadastro > Etapa 2 > Equipamentos (`Modulos`, `Inversor`, `Fornecedor`) | Exercitado sem prova forte | O passo 2 foi explorado pelo bloco de proposta/sistema, mas este grupo de equipamentos Não teve prova Própria. | Preencher os 3 campos, finalizar, recarregar e conferir contrato/cliente/banco. |
| Bloco 2 | Clientes > Cadastro > Etapa 3 > + Adicionar Parcela | Exercitado sem prova forte | Ha falha documentada no parcelamento final, mas Não no clique de adicionar linha em si. | Inserir Várias parcelas, validar soma, Edição, remocao, persistência e reflexo no financeiro. |
| Bloco 2 | Clientes > Cadastro > Etapa 3 > Pagamento de Comissão | Não exercitado | Não ha prova especifica do seletor que liga/desliga o bloco de Comissão. | Alternar sim/Não, validar exibicao do bloco, persistência e impacto no fechamento. |
| Bloco 2 | Clientes > Cadastro > Etapa 3 > Comissão (`Beneficiario`, `Percentual`, `Valor`, `Observacao`, `Preview`) | Não exercitado | Os scans tratam Comissões depois da venda, Não o preenchimento deste bloco no cadastro. | Preencher o bloco, finalizar e confirmar Criação/Vínculo correto no Módulo de Comissões. |
| Bloco 2 | Clientes > Cadastro > Etapa 4 > Vistoria inicial (`Vistoria Realizada`, `Obras de Adequacao`) | Exercitado sem prova forte | O cadastro profundo chegou nas etapas avancadas, mas este grupo Não aparece isolado nas evidencias. | Preencher, finalizar, recarregar e conferir impacto nas etapas seguintes. |
| Bloco 2 | Clientes > Cadastro > Etapa 4 > Obras de adequacao (`Descricao`, `Responsavel`, `Observacoes`) | Exercitado sem prova forte | A etapa 4 foi tocada, porem esse subbloco Não recebeu evidencia Própria. | Salvar dados completos, recarregar e verificar persistência e uso operacional. |
| Bloco 2 | Clientes > Cadastro > Etapa 4 > Dados Técnicos do local (`Tipo de Telha`, `Disjuntor`, `Cabo`, `Ramal`, `Google Maps`) | Exercitado sem prova forte | Ha indicio parcial de descarte de campos secundarios, incluindo `Maps`, mas sem prova concreta de todo o grupo Técnico. | Preencher o bloco inteiro, finalizar e conferir persistência integral após reload. |
| Bloco 2 | Clientes > Cadastro > Etapa 4 > Notas de instalacao (`Observacoes do Cliente`, `Prometeu algo ao Cliente`) | Exercitado sem prova forte | O wizard foi exercitado, mas este subbloco Não aparece isolado nas evidencias. | Preencher ambas as notas, salvar e verificar reabertura/uso posterior. |
| Bloco 2 | Clientes > Cadastro > Etapa 6 > Origem da venda e Observações gerais | Exercitado sem prova forte | Ha indicios gerais de cadastro profundo e descarte de campos, mas Não prova especifica desta etapa. | Preencher, finalizar e conferir se os dados sobrevivem ao reload e alimentam etapas posteriores. |
| Bloco 2 | Clientes > Visualizador de Docs > Ver | Não exercitado | O modal de docs falhou na carga por `client_id` invalido antes de chegar ao preview. | Fazer a lista carregar com ID válido e provar preview do arquivo certo. |
| Bloco 2 | Clientes > Visualizador de Docs > Baixar | Não exercitado | O mesmo bloqueio do visualizador impediu prova da Ação de download. | Fazer a lista carregar e validar download do arquivo certo, nome e MIME. |

### Bloco 4 - Financeiro, Compras e Comissões

| Bloco | Controle | Cobertura atual | Evidencia existente | Próxima prova necessaria |
|---|---|---|---|---|
| Bloco 4 | Financeiro > KPIs > Pago | Exercitado sem prova forte | `SCAN FULL` mostrou Financeiro explorado e que os filtros superiores falham, mas Não provou clique/efeito do card `Pago`. | Clicar no KPI e comprovar que a grade fica só com pagos, inclusive combinado com busca/data/mes. |
| Bloco 4 | Financeiro > KPIs > A Vencer | Exercitado sem prova forte | Ha evidencia de exploracao do Financeiro, sem prova isolada da regra do card `A Vencer`. | Validar clique no card e regra de data para vencimentos futuros/pendentes. |
| Bloco 4 | Financeiro > KPIs > Vencido | Exercitado sem prova forte | Ha evidencia de exploracao do Financeiro, sem prova isolada da regra do card `Vencido`. | Validar clique no card e regra real de atraso na grade. |
| Bloco 4 | Financeiro > Filtros rapidos > Todos | Exercitado sem prova forte | `SCAN FULL` indica que o Financeiro ainda filtra de algum modo por status, mas Não prova o reset pelo chip `Todos`. | Acionar `Todos` depois de outros filtros e comprovar retorno da grade completa e sincronizacao com KPIs. |
| Bloco 4 | Financeiro > Listagem > Dar Baixa | Exercitado sem prova forte | O modal de baixa foi investigado (`Valor Recebido` ignorado; upload pode apontar para entidade errada), mas sem prova forte de que o Botão abre sempre a linha correta. | Clicar `Dar Baixa` em linhas diferentes e comprovar bind correto do item, status e Permissão. |
| Bloco 4 | Financeiro > Modal Parcelas > X / Fechar | Exercitado sem prova forte | `SCAN_FASE_6` documentou falha geral de modais em foco/Esc/retorno, mas Não provou descarte de estado neste modal especifico. | Abrir, alterar campos, fechar por `X`, `Fechar` e `Esc`, e verificar descarte limpo do estado. |
| Bloco 4 | Financeiro > Modal Parcelas > Descrição | Exercitado sem prova forte | O modal de parcelas foi aberto zerado/ID invalido, mas Não ha prova concreta de digitação/Validação desse campo. | Preencher `Descricao`, salvar e validar persistência, limite de texto e reabertura correta. |
| Bloco 4 | Financeiro > Modal Parcelas > Valor (R$) | Exercitado sem prova forte | Ha prova de problema estrutural no modal, Não do comportamento isolado do campo monetario. | Testar máscara, zero/negativo, Cálculo e persistência do valor da parcela. |
| Bloco 4 | Financeiro > Modal Parcelas > Vencimento | Exercitado sem prova forte | O modal foi exercitado, mas Não ha prova do campo de data em si. | Testar data válida/Inválida, timezone e reflexo na lista/resumo. |
| Bloco 4 | Financeiro > Modal Baixa > X / Cancelar | Exercitado sem prova forte | `SCAN_FASE_6` pegou falha geral de modais, mas Não provou cancelamento limpo neste fluxo. | Abrir baixa, mexer em campos/upload, cancelar e confirmar que nada fica sujo na Próxima abertura. |
| Bloco 4 | Financeiro > Modal Baixa > Confirmar pagamento | Exercitado sem prova forte | O fluxo de baixa foi analisado, mas Não ha prova especifica do radio/estado inicial/obrigatoriedade. | Testar estado Padrão, Navegação por teclado e dependencia desse radio para concluir a baixa. |
| Bloco 4 | Financeiro > Modal Baixa > Observações | Exercitado sem prova forte | Ha evidencia do modal, sem prova concreta de persistencia/limite/acessibilidade desse campo. | Preencher Observações, efetuar baixa e reabrir para verificar gravacao correta. |
| Bloco 4 | Compras > Cabeçalho > + Registrar | Exercitado sem prova forte | `SCAN FULL` provou que o cadastro de compra falha ao registrar, o que indica uso da tela, mas Não isolou o gatilho `+ Registrar`. | Clicar `+ Registrar` e validar abertura consistente do modal, foco inicial e Permissão. |
| Bloco 4 | Compras > Modal Registrar Compra > X / Cancelar | Exercitado sem prova forte | `SCAN_FASE_6` registrou problema geral de modais, sem prova especifica do cancelamento neste modal. | Abrir, preencher parcialmente, cancelar e verificar descarte total do estado. |
| Bloco 4 | Compras > Modal Registrar Compra > Projeto | Exercitado sem prova forte | O modal e o Botão `Registrar` foram exercitados, mas Não ha prova da lista real de projetos nem do Vínculo correto desse select. | Validar populacao real, Opção vazia/default e persistência do projeto escolhido. |
| Bloco 4 | Compras > Modal Registrar Compra > Fornecedor | Exercitado sem prova forte | O fluxo foi aberto, mas o campo Não tem prova isolada de Validação/persistência. | Testar preenchimento, reabertura e gravacao do fornecedor no item correto. |
| Bloco 4 | Compras > Modal Registrar Compra > Kit / Descrição | Exercitado sem prova forte | Ha prova de falha geral no registro da compra, Não do comportamento especifico deste campo. | Validar texto salvo, limite e reapresentacao no detalhe da compra. |
| Bloco 4 | Compras > Modal Registrar Compra > Valor (R$) | Exercitado sem prova forte | O modal foi exercitado, mas sem prova forte da máscara e persistência desse valor. | Testar máscara, zero/negativo e reflexo do valor salvo na listagem. |
| Bloco 4 | Compras > Modal Registrar Compra > No NF | Exercitado sem prova forte | Não ha prova concreta do formato/gravacao do Número da nota no registro. | Testar preenchimento, persistência e reapresentacao do `No NF`. |
| Bloco 4 | Compras > Modal Detalhes da Compra > X / Fechar | Exercitado sem prova forte | `SCAN FULL` provou que o modal de detalhes e generico e Não persiste; `SCAN_FASE_6` provou falha geral de modais, mas Não o fechamento limpo por `X/Fechar`. | Abrir detalhes, alterar dados, fechar sem salvar e verificar descarte total. |
| Bloco 4 | Comissões > KPIs > A Pagar | Exercitado sem prova forte | A tela de Comissões foi exercitada por carga, comprovante e pagamento, mas sem prova especifica do KPI `A Pagar`. | Comparar total do card com a listagem real antes e depois de Quitação/pagamento. |
| Bloco 4 | Comissões > KPIs > Pago | Exercitado sem prova forte | Ha evidencia da tela, mas Não do Cálculo/atualização do KPI `Pago`. | Validar se o card atualiza com base em pagamentos reais e reload. |
| Bloco 4 | Comissões > KPIs > Média/Contrato | Exercitado sem prova forte | Não apareceu prova concreta do Cálculo desse indicador nos scans. | Recalcular contra dataset real e confirmar formula, base e atualizacao após novas Comissões. |

### Bloco 5 - Projetos, Obras, Pós-Obra, Empresas, Backend, Banco e Pacote

| Bloco | Controle | Cobertura atual | Evidencia existente | Próxima prova necessaria |
|---|---|---|---|---|
| Bloco 5 | Obras > Topo > Mapa | Não exercitado | Nenhuma ocorrencia util em `SF/F6`. | Clicar no mapa e comprovar abertura real, links/dados e comportamento mobile. |
| Bloco 5 | Obras > Topo > + Adicionar | Exercitado sem prova forte | `SF L65` e `F6 L29` mostram o modal Nova Obra inspecionado, mas Não fecham prova do Botão do topo. | Acionar `+ Adicionar` e comprovar abertura, foco e Permissão. |
| Bloco 5 | Obras > Modal Adicionar Obra > Cliente / Data / Equipe / Lider | Exercitado sem prova forte | `F6 L29` só fala de Identificação fraca dos campos; `SF L65` só prova problema no submit. | Preencher os 4 campos, validar obrigatoriedade, persistência e reload. |
| Bloco 5 | Pós-Obra > Topo > Exportar CSV | Não exercitado | Nenhuma evidencia direta; `SF L74` e CSV de Dashboard/Relatorios, Não de Pós-Obra. | Exportar CSV com filtro aplicado e conferir arquivo gerado. |
| Bloco 5 | Pós-Obra > Filtros > Cidade | Exercitado sem prova forte | `SF L41` mostra que `filterPos()` le cidade/tipo/prazo, mas a falha comprovada foi só no Período. | Filtrar por cidade e conferir lista antes/depois do reload. |
| Bloco 5 | Pós-Obra > Filtros > Tipo | Exercitado sem prova forte | `SF L41` indica leitura do campo, sem prova de resultado correto. | Filtrar por tipo com base mista e validar retorno. |
| Bloco 5 | Pós-Obra > Filtros > Prazo | Exercitado sem prova forte | `SF L41` indica leitura do campo, sem prova de consistencia do Cálculo. | Filtrar por prazo com casos vencido/no prazo e validar lista. |
| Bloco 5 | Empresas > Topo > + Nova Empresa | Exercitado sem prova forte | `SF L27` analisa `criarEmpresa()`, mas Não prova o gatilho de abertura do modal. | Clicar no Botão e comprovar abertura, foco e Permissão. |
| Bloco 5 | Empresas > Lista > Buscar empresa | Não exercitado | Nenhuma ocorrencia util em `SF/F6`. | Buscar por nome e CNPJ e validar filtro da grade. |
| Bloco 5 | Empresas > Modal Nova Empresa > Nome Fantasia / Razao Social / CNPJ | Não exercitado | `SF L27` cobre Criação do admin, Não esses campos. | Preencher, validar máscara/obrigatoriedade e conferir persistência. |
| Bloco 5 | Empresas > Modal Nova Empresa > Telefone / E-mail / Cidade / Estado | Não exercitado | Nenhuma ocorrencia especifica. | Preencher, validar formato e conferir persistência. |
| Bloco 5 | Backend > Upload > fileSize=50MB | Não exercitado | `SF/F6` tratam tipo de arquivo, Não limite de tamanho. | Enviar arquivo acima de 50MB e validar bloqueio/mensagem. |
| Bloco 5 | Backend > API > POST /api/testar-template | Exercitado sem prova forte | `SF L78` só confirma a rota na lista implementada; Não ha request/response real documentado. | Fazer POST multipart válido e confirmar retorno PDF/erro. |
| Bloco 5 | Backend > API > template_file | Exercitado sem prova forte | `F6 L33` questiona a Validação do upload, mas Não prova Geração ponta a ponta via `template_file`. | Enviar DOCX válido por request e validar PDF de saida. |
| Bloco 5 | Banco > Schema > inspections | Exercitado sem prova forte | `SF L319` mostra dependencia de vistoria, mas Não prova contrato da tabela `inspections`. | Ler/gravar vistoria real e validar Vínculo com projeto/obra. |
| Bloco 5 | Banco > Schema > material_deliveries | Exercitado sem prova forte | `SF L165`, `SF L166`, `SF L227` exercitam a etapa Entrega, mas Não fecham prova da tabela. | Validar CRUD real e Vínculo com compra via chave formal. |
| Bloco 5 | Banco > Schema > works | Exercitado sem prova forte | `SF L65`, `SF L228`, `SF L229` exercitam Obras, mas sem prova direta do contrato da tabela. | Criar/editar obra real e conferir persistencia/reload na tabela. |
| Bloco 5 | Banco > Schema > work_teams | Exercitado sem prova forte | `SF L170` só mostra que a aba Por Equipe ignora alocacao real. | Validar associacao Usuário-obra-papel e reflexo na visao. |
| Bloco 5 | Banco > Schema > deadlines | Exercitado sem prova forte | `SF L171` e `SF L41` mostram problemas de prazo na UI, Não da tabela `deadlines`. | Validar leitura/gravacao de prazos operacionais e recalculo. |
| Bloco 5 | Pacote > Raiz > frontend / backend / backend:test | Exercitado sem prova forte | `SF L7-L8` mostra frontend/backend no ar; `SF L81` revisa `test.js`, mas sem provar os scripts do pacote raiz. | Executar os scripts da raiz e confirmar subida dos 3 fluxos. |
| Bloco 5 | Pacote > Scripts > scripts/serve-frontend.js | Exercitado sem prova forte | `SF L8` prova frontend local respondendo, mas Não identifica qual script subiu o frontend. | Executar `scripts/serve-frontend.js` e validar porta/rotas. |
| Bloco 5 | Pacote > Scripts > open-crm-chrome.cmd | Não exercitado | Nenhuma ocorrencia util em `SF/F6`. | Rodar o script e comprovar abertura do CRM no Chrome correto. |
| Bloco 5 | Pacote > Scripts > open-crm-edge.cmd | Não exercitado | Nenhuma ocorrencia util em `SF/F6`. | Rodar o script e comprovar abertura do CRM no Edge correto. |
| Bloco 5 | Pacote > Backend > .env.example | Exercitado sem prova forte | `SF L77` cita `SUPABASE_KEY` em `.env.example`, mas Não prova que o arquivo cobre a Configuração Mínima completa. | Subir backend usando só `.env.example` preenchido e validar boot limpo. |
| Bloco 5 | Pacote > Backend > Dockerfile e railway.toml | Exercitado sem prova forte | `SF L76` toca no `Dockerfile` por causa do LibreOffice; Não ha prova de build/deploy do conjunto. | Buildar imagem e validar startup/healthcheck/deploy. |

### Bloco 3 - Propostas, Templates e Contratos

| Bloco | Controle | Cobertura atual | Evidencia existente | Próxima prova necessaria |
|---|---|---|---|---|
| Bloco 3 | Propostas > Cabeçalho > + Nova Proposta | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Clique real no Botão, abertura do passo 1 e snapshot do estado inicial. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Cliente | Exercitado sem prova forte | `SCAN FULL #40` mostra proposta salvando com `client_id:null`, mas sem prova direta do campo sendo preenchido e carregado corretamente. | Preencher cliente válido, avancar e confirmar reflexo no Histórico/backend. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Cidade | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Preencher cidade, avancar e validar persistência e reflexo no documento. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Tipo de Sistema | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Trocar Opções e validar impacto na Cotação e no documento final. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Qtde Módulos (+/-) | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Variar quantidade e validar recalculo, persistência e documento. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Potencia Módulos (W) | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Alterar valor e validar recalculo/persistencia. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Qtde Inversores (+/-) | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Variar quantidade e validar recalculo/persistencia. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Potencia Inversor (kW) | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Alterar valor e validar recalculo/persistencia. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Valor do KIT (R$) | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Alterar valor e conferir totais, Histórico e documento. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Fornecedor | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Preencher fornecedor e conferir persistencia/reuso na proposta. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Cancelar | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Abrir fluxo e validar fechamento sem avancar nem sujar estado. |
| Bloco 3 | Propostas > Nova Proposta > Passo 1 > Prosseguir | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Validar avancar para o passo 2 com bloqueio quando dados obrigatorios faltarem. |
| Bloco 3 | Propostas > Nova Proposta > Passo 2 > Parâmetros de Cálculo | Exercitado sem prova forte | `SCAN FULL #42/#43` aponta problemas nos defaults e na divergencia entre Cotação e documento, mas sem clique real da grade de Parâmetros. | Alterar cada Parâmetro e comparar Cotação antes/depois com persistência. |
| Bloco 3 | Propostas > Nova Proposta > Passo 2 > Tabela de composição/Cotação | Exercitado sem prova forte | `SCAN FULL #43` prova divergencia entre Cotação e documento final, sem prova visual da tabela reagindo corretamente aos inputs. | Snapshot antes/depois do recalculo e conferencia linha a linha com o documento gerado. |
| Bloco 3 | Propostas > Nova Proposta > Passo 2 > Voltar | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Voltar ao passo 1 e confirmar preservacao integral dos dados. |
| Bloco 3 | Propostas > Nova Proposta > Passo 2 > Prosseguir | Não exercitado | Os scans só registram problemas na etapa de Geração, sem prova do clique desse Botão. | Avancar ao passo 3 e validar preservacao do estado. |
| Bloco 3 | Propostas > Gerar Proposta > Nome da Proposta | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Preencher nome e conferir nome final no Histórico e no arquivo baixado. |
| Bloco 3 | Propostas > Gerar Proposta > Selecao do template | Exercitado sem prova forte | `SCAN FULL #38/#65/#68` mostra persistencia/reuso de template quebrados, mas sem prova direta da escolha do template no radio. | Selecionar templates distintos e confirmar que o arquivo gerado usa o escolhido. |
| Bloco 3 | Propostas > Gerar Proposta > Campos dinamicos do documento | Exercitado sem prova forte | `SCAN FULL #43/#66` mostra campos/valores finais incoerentes ou preenchidos com DEMO, sem prova visual da Edição da grade dinamica. | Editar campos, gerar DOCX/PDF e comparar valor final no arquivo. |
| Bloco 3 | Propostas > Gerar Proposta > Voltar | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Voltar ao passo 2 e confirmar preservacao do estado. |
| Bloco 3 | Templates > Cabeçalho > + Upload Template .docx | Exercitado sem prova forte | `SCAN FULL Fase 3 #13` e `SCAN FULL #38` mostram upload local/persistencia fraca, mas sem prova direta do clique no Botão de cabeçalho. | Clique real no Botão, abertura do seletor e retorno visual do template na lista. |
| Bloco 3 | Templates > Lista > Testar | Não exercitado | A área de templates foi coberta por upload/recarga/download, mas esse Botão Não aparece exercitado diretamente. | Clicar em Testar e validar preview/arquivo de saida. |
| Bloco 3 | Templates > Lista > Remover | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Remover template e confirmar saida da lista e da persistência. |
| Bloco 3 | Templates > Testar Template > Selecionar template | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Abrir teste demo e validar selecao entre templates diferentes. |
| Bloco 3 | Templates > Testar Template > Testar com Dados Demo | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Executar teste demo e validar preview/arquivo sem fallback silencioso. |
| Bloco 3 | Configurações > Propostas > Valores Padrão > Restaurar Padrões | Não exercitado | A área de defaults tem falhas documentadas, mas esse Botão Não aparece exercitado diretamente. | Alterar defaults, restaurar e conferir valores restaurados com reload. |
| Bloco 3 | Configurações > Propostas > Valores Padrão > Simular impacto | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Clicar e validar recalculo visível coerente com os defaults atuais. |
| Bloco 3 | Configurações > Propostas > Prazos > Prazo medio para entrega de contratos (dias) | Exercitado sem prova forte | `SCAN FULL #6` e `#44` mostram a área de prazos fora das tabs reais e `savePrazos()` falhando, mas sem prova direta do campo em si. | Editar o prazo, salvar, recarregar e conferir reflexo operacional. |
| Bloco 3 | Contratos > Barra de filtros > Todos / Aprovados / Pendentes / Reprovados | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Alternar filtros e validar recorte correto da listagem. |
| Bloco 3 | Contratos > Listagem > Linha > Docs > Ver procuracao | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`; os scans só falam claramente de contrato, Não de procuracao. | Clique real no ícone e abertura do arquivo correto. |
| Bloco 3 | Contratos > Listagem > Linha > Docs > Baixar procuracao | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`; os scans só falam claramente de contrato, Não de procuracao. | Clique real no ícone e download do arquivo correto. |
| Bloco 3 | Contratos > Listagem > Linha > Editar > Editar Situação | Exercitado sem prova forte | `SCAN FULL Fase 2/Fase 5` documenta falhas dentro do fluxo de alteracao de status, mas sem prova forte do clique no ícone que abre o modal. | Clique real no ícone e Validação da abertura do modal com a linha correta. |
| Bloco 3 | Contratos > Atualizar Situação do Contrato > Cancelar | Não exercitado | Nenhuma mencao direta em `SCAN FULL` / `Fase 6`. | Abrir modal e cancelar sem aplicar alteracao nem sujar estado. |

## Prioridade imediata

Provas que mais fecham lacuna com menos cliques:
- `Mostrar/ocultar senha`
- `Enviar link` de recuperação
- `+ Nova Proposta`
- `Templates > Testar`
- `Contratos > filtros de status`
- `Clientes > Todas cidades`
- `Clientes > Todos tipos`
- `Clientes > Cadastrar Acesso`
- `Clientes > Docs > Ver`
- `Obras > Mapa`
- `Pos-Obra > Exportar CSV`
- `Empresas > Buscar empresa`
- `Backend > POST /api/testar-template`
- `Backend > limite de upload 50MB`
- `open-crm-chrome.cmd`
