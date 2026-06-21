# MATRIZ FINA POR CONTROLE - INTEGRA SOLAR

Data: 30/03/2026

## Objetivo

Quebrar as áreas `Parcial` da matriz macro em controles concretos:
- Botão
- ícone
- filtro
- card clicável
- modal
- tab
- campo crítico
- Exportação
- upload
- endpoint
- contrato Técnico

Esta matriz e a ponte entre:
- `SCAN FULL SITE INTEGRA SOLAR.md`
- `MATRIZ_DE_COBERTURA_TOTAL.md`
- e o futuro `PLANO_DE_CORRECAO.md`

## Como ler

Esta fase e de inventario fino.

Colunas:
- `Area`
- `Caminho no Site`
- `Tipo de controle`
- `Controle`
- `Acao esperada`
- `Lentes ainda faltantes`

Regra desta versão:
- ainda Não e lista de problemas
- ainda Não e laudo de aprovado/reprovado
- e o mapa de tudo que precisa ser clicado, preenchido, observado ou verificado

## Inventario Consolidado

### Bloco 1 - Shell, Dashboard, Relatórios e Configurações

| área | Caminho no Site | Tipo de controle | Controle | Ação esperada | Lentes ainda faltantes |
|---|---|---|---|---|---|
| Shell | Login > Tela inicial | Campo | E-mail (`#le`) | Receber credencial de acesso | A11y/teclado, Mobile |
| Shell | Login > Tela inicial | Campo | Senha (`#lp`) | Receber senha de acesso | A11y/teclado, Mobile |
| Shell | Login > Tela inicial | Botão | Mostrar/ocultar senha (`#btn-toggle-senha`) | Alternar visibilidade da senha sem perder foco/valor | Ação detalhada, A11y/teclado |
| Shell | Login > Tela inicial | Botão primario | Entrar (`#lbtn`) | Autenticar e abrir Sessão no Módulo inicial correto | Persistência, Reload, Permissão |
| Shell | Login > Recuperação de acesso | Link/atalho | Recuperar acesso | Trocar do painel de login para o painel de reset | Ação detalhada, A11y/teclado |
| Shell | Login > Recuperação de acesso | Campo | E-mail de recuperação (`#le-reset`) | Receber e-mail para reset | A11y/teclado, Mobile |
| Shell | Login > Recuperação de acesso | Botão | Enviar link (`#lbtn-reset`) | Disparar fluxo de recuperação | Persistência, Reload |
| Shell | Login > Recuperação de acesso | Link/atalho | Voltar ao login | Retornar ao painel inicial de login | Ação detalhada, A11y/teclado |
| Shell | Sidebar > Navegação principal | Item de menu | Dashboard (`.ni[data-pg="dash"]`) | Abrir painel Dashboard | Permissão, A11y/teclado |
| Shell | Sidebar > Navegação principal | Item de menu | CRM (`.ni[data-pg="crm"]`) | Abrir Módulo CRM | Permissão, A11y/teclado |
| Shell | Sidebar > Navegação principal | Item de menu | Relatórios (`.ni[data-pg="relatorios"]`) | Abrir Módulo Relatórios | Permissão, A11y/teclado |
| Shell | Sidebar > Navegação principal | Item de menu | Configurações (`.ni[data-pg="config"]`) | Abrir Módulo Configurações | Permissão, A11y/teclado |
| Shell | Topbar > Ações globais | Botão/ícone | Notificações (`m-notif`) | Abrir modal de alertas e pendencias | Ação detalhada, Persistência, A11y/teclado |
| Shell | Topbar > Ações globais | Botão/ícone | Novo Lead (`#btn-novo-lead`) | Abrir fluxo/modal de novo lead | Permissão, A11y/teclado |
| Shell | Sessão > Usuário | Botão | Logout | Encerrar Sessão e retornar ao login | Persistência, Reload, Permissão |
| Shell | Feedback global > Banco | Banner/Ação | Banner de Configuração de banco (`showCfgDb()`) | Exibir aviso de ambiente e abrir Configuração correspondente | Ação detalhada, A11y/teclado |
| Shell | Feedback global > Mensagens | Toast | Toast global (`#toast`) | Exibir feedback temporario de sucesso/erro/aviso | A11y/teclado, Timing |
| Dashboard | Dashboard > Exportação | Botão | Exportar CSV | Gerar/exportar dados visíveis do dashboard | Persistência, Contrato Técnico |
| Dashboard | Dashboard > Exportação | Botão | Exportar PDF | Gerar/exportar PDF do dashboard | Persistência, Contrato Técnico |
| Dashboard | Dashboard > Filtros | Botão | Limpar filtros | Restaurar estado Padrão dos filtros e visões | Ação detalhada, Reload |
| Dashboard | Dashboard > KPIs | Card clicável | Card Clientes | Navegar para Clientes filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Contratos | Navegar para Contratos filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Financeiro | Navegar para Financeiro filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Compras | Navegar para Compras filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Projetos | Navegar para Projetos filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Obras | Navegar para Obras filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Entrega | Navegar para Entrega filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > KPIs | Card clicável | Card Pós-Obra | Navegar para Pós-Obra filtrado/contextualizado | Ação detalhada, Permissão, A11y/teclado |
| Dashboard | Dashboard > Gráficos | Select | Seletor de Gráfico (`#chart-sel`) | Trocar série/Visualização do Gráfico | Ação detalhada, Reload |
| Dashboard | Dashboard > Gráficos | Checkbox | Comparar ano anterior (`#cmp-chk`) | Incluir/remover comparativo do Período anterior | Ação detalhada, Reload, A11y/teclado |
| Relatórios | Relatórios > Exportação | Botão | Exportar CSV | Gerar/exportar dados do Relatório ativo | Persistência, Contrato Técnico |
| Relatórios | Relatórios > Exportação | Botão | Exportar PDF | Gerar/exportar PDF do Relatório ativo | Persistência, Contrato Técnico |
| Relatórios | Relatórios > Tabs principais | Aba | Leads (`r-leads`) | Ativar visao de Relatório de leads | Ação detalhada, A11y/teclado |
| Relatórios | Relatórios > Tabs principais | Aba | Vendas (`r-vendas`) | Ativar visao de Relatório de vendas | Ação detalhada, A11y/teclado |
| Relatórios | Relatórios > Tabs principais | Aba | Obras (`r-obras-r`) | Ativar visao de Relatório de obras | Ação detalhada, A11y/teclado |
| Relatórios | Relatórios > Tabs principais | Aba | Financeiro (`r-financ`) | Ativar visao de Relatório financeiro | Ação detalhada, A11y/teclado |
| Relatórios | Relatórios > Tabs principais | Aba | Ranking (`r-ranking`) | Ativar visao de ranking | Ação detalhada, A11y/teclado |
| Relatórios | Relatórios > Chamados Técnicos | Botão | + Novo Chamado | Abrir fluxo de abertura de chamado Técnico | Persistência, Contrato Técnico, Permissão |
| Configurações | Configurações > Tabs principais | Aba | Funil CRM (`cfg-crm`) | Exibir Configurações do funil comercial | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Tabs principais | Aba | Permissões (`cfg-perm`) | Exibir matriz de Permissões | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Tabs principais | Aba | Alertas (`cfg-alertas`) | Exibir ajustes de alertas e frequencias | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Tabs principais | Aba | Metas (`cfg-metas`) | Exibir formulario de metas | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Tabs principais | Aba | Templates (`cfg-tpl`) | Exibir templates/documentos configuraveis | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Tabs principais | Aba | Usuários (`cfg-usr`) | Exibir Gestão de Usuários | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Funil CRM | Botão | + Nova Etapa | Criar nova etapa no funil | Persistência, Reload |
| Configurações | Configurações > Permissões | Aba secundaria | Perfil ADM (`perm-adm`) | Carregar Permissões do perfil ADM | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Permissões | Aba secundaria | Perfil Vendedor (`perm-vend`) | Carregar Permissões do perfil Vendedor | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Permissões | Aba secundaria | Perfil Engenharia (`perm-eng`) | Carregar Permissões do perfil Engenharia | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Permissões | Aba secundaria | Perfil Financeiro (`perm-fin`) | Carregar Permissões do perfil Financeiro | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Permissões | Aba secundaria | Perfil Compras (`perm-comp`) | Carregar Permissões do perfil Compras | Ação detalhada, A11y/teclado |
| Configurações | Configurações > Permissões | Botão | Salvar Permissões | Persistir matriz do perfil selecionado | Persistência, Reload, Contrato Técnico |
| Configurações | Configurações > Alertas | Grupo de controles | Frequencias de alertas (`#alrt-cfg`) | Ajustar periodicidade/estado de cada alerta | Persistência, Reload |
| Configurações | Configurações > Metas | Formulario | Metas por área (`#metas-form`) | Editar metas operacionais/comerciais | Persistência, Reload |
| Configurações | Configurações > Metas | Botão | Salvar metas | Persistir metas configuradas | Persistência, Reload, Contrato Técnico |
| Configurações | Configurações > Usuários | Botão | + Convidar Usuário | Abrir modal de Criação/convite de Usuário | Permissão, A11y/teclado |
| Configurações | Configurações > Valores Padrão de proposta | Botão | Restaurar Padrões | Repor Configuração default dos valores | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | Projeto (`#pd-proj`) | Editar valor Padrão de projeto | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | Instalacao (`#pd-inst`) | Editar valor Padrão de instalacao | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | KM (`#pd-km`) | Editar valor Padrão por quilometro | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | CA (`#pd-ca`) | Editar percentual/valor de CA | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | Comissão (`#pd-com`) | Editar percentual de Comissão | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | Imprevistos (`#pd-imp`) | Editar percentual/valor de imprevistos | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Campo numerico | Margem (`#pd-mg`) | Editar margem Padrão | Persistência, Reload |
| Configurações | Configurações > Valores Padrão de proposta | Botão | Salvar valores Padrão | Persistir defaults de proposta | Persistência, Reload, Contrato Técnico |
| Configurações | Configurações > Valores Padrão de proposta | Botão | Simular impacto | Recalcular simulacao com os valores correntes | Ação detalhada, Reload |
| Configurações | Configurações > Prazos operacionais | Campo numerico | Prazo medio de contrato (`#pd-prazo-cont`) | Editar prazo Padrão operacional | Persistência, Reload |
| Configurações | Configurações > Prazos operacionais | Botão | Salvar prazos | Persistir prazos configurados | Persistência, Reload, Contrato Técnico |

### Bloco 2 - CRM e Clientes

| área | Caminho no Site | Tipo de controle | Controle | Ação esperada | Lentes ainda faltantes |
|---|---|---|---|---|---|
| CRM | CRM > Cabeçalho | Botão de Navegação | Etapas | Abrir `Configuracoes > Funil CRM` | Ação, Permissão, A11y |
| CRM | CRM > Cabeçalho | Botão modal | + Adicionar Lead | Abrir o modal de novo lead | Ação, Persistência, A11y |
| CRM | CRM > Kanban > Coluna | área de drop | Zona de soltura da etapa | Receber card e mudar o lead de etapa | Ação, Persistência, Reload, Permissão, A11y, Contrato |
| CRM | CRM > Kanban > Coluna | Botão atalho | + Adicionar lead | Abrir modal de novo lead a partir da coluna | Ação, Persistência, A11y |
| CRM | CRM > Kanban > Coluna | Rotulo editavel | Nome da etapa | Permitir renomear a etapa do funil | Ação, Persistência, Reload, A11y |
| CRM | CRM > Kanban > Coluna | Botão ícone | Cor da etapa | Alterar a cor visual e Lógica da etapa | Ação, Persistência, Reload, A11y |
| CRM | CRM > Kanban > Coluna | Botão ícone | Excluir etapa | Remover a etapa do funil | Ação, Persistência, Reload, Permissão, A11y |
| CRM | CRM > Kanban > Card | Card arrastavel | Card do lead | Iniciar drag e mover lead entre colunas | Ação, Persistência, Reload, A11y, Contrato |
| CRM | CRM > Kanban > Card | Menu contextual | Opções | Abrir menu de Ações do lead | Ação, A11y |
| CRM | CRM > Kanban > Card > Opções | Item de menu | Gerar Proposta | Abrir proposta com lead Pré-preenchido | Ação, Persistência, Reload, Contrato, A11y |
| CRM | CRM > Kanban > Card > Opções | Item de menu | Cadastrar Cliente | Abrir cadastro do cliente com dados do lead | Ação, Persistência, Reload, Contrato, A11y |
| CRM | CRM > Kanban > Card > Opções | Item de menu | Observação | Abrir Histórico e inclusao de Observações do lead | Ação, Persistência, Reload, A11y |
| CRM | CRM > Kanban > Card > Opções | Item de menu | Editar Dados | Abrir Edição do lead atual | Ação, Persistência, Reload, Contrato, A11y |
| CRM | CRM > Kanban > Card > Opções | Item de menu | Excluir Lead | Remover lead do funil | Ação, Persistência, Reload, Permissão, A11y |
| CRM | CRM > Modal Adicionar Lead ao Funil | Grupo de campos | Dados basicos (`Nome`, `Telefone`, `Cidade`) | Capturar Identificação Mínima do lead | Persistência, Reload, Contrato, A11y |
| CRM | CRM > Modal Adicionar Lead ao Funil | Grupo de campos | Dados comerciais (`Origem`, `Tipo de Sistema`, `Potencia`, `Observacoes`) | Compor classificacao inicial do lead | Persistência, Reload, Contrato, A11y |
| CRM | CRM > Modal Adicionar Lead ao Funil | Ação principal | Adicionar Lead | Criar lead e retornar ao CRM | Ação, Persistência, Reload, Contrato, A11y |
| CRM | CRM > Modal Observações do Lead | Campo texto | Nova Observação | Receber uma nova anotacao do lead | Persistência, Reload, A11y |
| CRM | CRM > Modal Observações do Lead | Painel Histórico | Histórico de Observações | Listar Observações existentes do lead | Reload, A11y |
| CRM | CRM > Modal Observações do Lead | Ação principal | Salvar | Gravar a nova Observação e fechar modal | Ação, Persistência, Reload, A11y |
| Clientes | Clientes > Barra de filtros | Campo de busca | Nome ou telefone | Filtrar a listagem por texto | Ação, Reload, A11y |
| Clientes | Clientes > Barra de filtros | Select | Todas cidades | Filtrar a listagem por cidade | Ação, Reload, A11y |
| Clientes | Clientes > Barra de filtros | Select | Todos tipos | Filtrar a listagem por tipo de sistema | Ação, Reload, A11y |
| Clientes | Clientes > Tabela > Ações | Botão de linha | Docs | Abrir documentos/anexos do cliente | Ação, Persistência, Reload, A11y |
| Clientes | Clientes > Tabela > Ações | Botão de linha | Portal / acesso do cliente | Abrir modal de acesso do cliente | Ação, Persistência, Reload, Permissão, Contrato, A11y |
| Clientes | Clientes > Tabela > Ações | Botão de linha | Editar | Abrir cadastro do cliente para revisão/edição | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Modal Criar Acesso do Cliente | Grupo de campos | Nome, Telefone, E-mail, Senha | Montar credencial de portal do cliente | Persistência, Reload, Permissão, Contrato, A11y |
| Clientes | Clientes > Modal Criar Acesso do Cliente | Ação principal | Cadastrar Acesso | Criar acesso utilizável para o cliente | Ação, Persistência, Reload, Permissão, Contrato, A11y |
| Clientes | Clientes > Modal Cadastro do Cliente | Navegação do wizard | Voltar / Salvar e Avancar / Finalizar Cadastro | Navegar entre etapas e concluir cadastro | Ação, Persistência, Reload, A11y |
| Clientes | Clientes > Cadastro > Etapa 1 | Grupo de campos | Identificação cadastral (`Tipo`, `Nome/Razao Social`, `CPF/CNPJ`) | Registrar identidade fiscal do cliente | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 1 | Grupo de campos | Contato e Endereço (`E-mail`, `Celular`, `CEP`, `Endereco`, `Cidade`, `Estado`) | Registrar contato e Localização do cliente | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 2 | Grupo de campos | Proposta e sistema (`Proposta Aprovada`, `Tipo de Sistema`, `Potencia`) | Vincular a venda aprovada ao cadastro | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 2 | Grupo de campos | Equipamentos (`Modulos`, `Inversor`, `Fornecedor`) | Detalhar o kit vendido | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 3 | Grupo de campos | Venda base (`Valor da Venda`, `Forma de Pagamento`) | Registrar dados comerciais da venda | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 3 | Grade dinamica | Parcelas | Registrar composicao financeira da venda | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 3 | Botão dinamico | + Adicionar Parcela | Inserir nova linha de parcela | Ação, Persistência, Reload, A11y |
| Clientes | Clientes > Cadastro > Etapa 3 | Select de decisao | Pagamento de Comissão | Habilitar ou Não o bloco de Comissão | Ação, Persistência, Reload, A11y |
| Clientes | Clientes > Cadastro > Etapa 3 | Grupo de campos | Comissão (`Beneficiario`, `Percentual`, `Valor`, `Observacao`, `Preview`) | Calcular e registrar Comissão vinculada a venda | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 4 | Grupo de campos | Vistoria inicial (`Vistoria Realizada`, `Obras de Adequacao`) | Registrar Situação inicial da vistoria | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 4 | Grupo de campos | Obras de adequacao (`Descricao`, `Responsavel`, `Observacoes`) | Detalhar intervencoes antes da instalacao | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 4 | Grupo de campos | Dados Técnicos do local (`Tipo de Telha`, `Disjuntor`, `Cabo`, `Ramal`, `Google Maps`) | Registrar Condições Técnicas da instalacao | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 4 | Grupo de campos | Notas de instalacao (`Observacoes do Cliente`, `Prometeu algo ao Cliente`) | Guardar contexto operacional/comercial | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 4 | Upload | Print do Layout dos Módulos | Anexar evidencia Técnica da vistoria | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 5 | Grupo de campos | Prazos (`Data de Assinatura`, `Prazo Ideal`, `Data de Inicio`) | Definir marco temporal do contrato | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 6 | Grupo de campos | Origem da venda e Observações gerais | Registrar origem comercial e contexto adicional | Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Print do Layout dos Módulos | Anexar print/layout Técnico | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Conta de Energia | Anexar conta de energia do cliente | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Documento com Foto (RG/CNH) | Anexar documento de Identificação | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Foto do Disjuntor do Padrão | Anexar foto Técnica do Padrão | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Foto do Local | Anexar foto do local de instalacao | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Foto da Frente da Casa | Anexar foto frontal do imovel | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Proposta Formalizada | Anexar proposta formal do cliente | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 7 | Upload | Cotação dos Materiais | Anexar Cotação usada na venda | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 8 | Upload | Contrato Assinado (PDF) | Anexar contrato assinado | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Cadastro > Etapa 8 | Upload | Procuracao Assinada (PDF) | Anexar procuracao assinada | Ação, Persistência, Reload, Contrato, A11y |
| Clientes | Clientes > Visualizador de Docs | Lista de anexos | Lista de arquivos do cliente | Exibir anexos disponiveis com metadados | Reload, A11y |
| Clientes | Clientes > Visualizador de Docs | Ação de arquivo | Ver | Abrir preview do arquivo selecionado | Ação, Reload, A11y |
| Clientes | Clientes > Visualizador de Docs | Ação de arquivo | Baixar | Iniciar download do arquivo selecionado | Ação, Reload, A11y |

### Bloco 3 - Propostas, Templates e Contratos

| área | Caminho no Site | Tipo de controle | Controle | Ação esperada | Lentes ainda faltantes |
|---|---|---|---|---|---|
| Propostas | Propostas > Cabeçalho | Botão | + Nova Proposta | Abrir o fluxo da proposta no passo 1 | Ação, A11y/Mobile |
| Propostas | Propostas > Listagem > Linha > Ações | ícone | Re-gerar | Reabrir, duplicar ou iniciar nova versão da proposta da linha | Ação, Persistência, Reload |
| Propostas | Propostas > Listagem > Linha > Ações | ícone | Visualizar | Abrir preview ou arquivo da proposta selecionada | Ação, Persistência, Reload |
| Propostas | Propostas > Listagem > Linha > Ações | ícone | Aprovar | Aprovar a proposta da linha e refletir o novo status | Persistência, Reload |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo texto | Cliente | Receber o cliente-base da proposta | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo texto | Cidade | Receber a cidade do cliente/projeto | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Select | Tipo de Sistema | Definir o tipo do sistema para Cálculo e documento | Persistência, Contrato Técnico |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Controle numerico | Qtde Módulos (+/-) | Ajustar a quantidade de Módulos da proposta | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo numerico | Potencia Módulos (W) | Definir a potencia unitaria dos Módulos | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Controle numerico | Qtde Inversores (+/-) | Ajustar a quantidade de inversores | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo numerico | Potencia Inversor (kW) | Definir a potencia do inversor | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo monetario | Valor do KIT (R$) | Receber o valor-base do kit | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 > Equipamentos | Campo texto | Fornecedor | Registrar o fornecedor do kit/equipamento | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 1 | Botão | Cancelar | Fechar o modal sem avancar | Ação, Reload |
| Propostas | Propostas > Nova Proposta > Passo 1 | Botão | Prosseguir | Validar os dados e abrir o passo 2 | Ação, Persistência |
| Propostas | Propostas > Nova Proposta > Passo 2 > Tabela de Cotação | Grupo de inputs | Parâmetros de Cálculo | Recalcular Cotação a partir de `Projeto`, `Instalacao`, `KM`, `Distancia`, `Material CA`, `Comissao`, `Imposto` e `Margem` | Ação, Persistência, Contrato Técnico |
| Propostas | Propostas > Nova Proposta > Passo 2 > Tabela de Cotação | Tabela dinamica | Tabela de composição/Cotação | Refletir categorias, itens, totais e percentuais da proposta | Ação, Reload, Contrato Técnico |
| Propostas | Propostas > Nova Proposta > Passo 2 | Botão | Voltar | Retornar ao passo 1 preservando os dados informados | Reload, A11y/Mobile |
| Propostas | Propostas > Nova Proposta > Passo 2 | Botão | Prosseguir | Consolidar a Cotação e abrir o passo 3 | Ação, Persistência |
| Propostas | Propostas > Gerar Proposta > Dados basicos | Campo texto | Nome da Proposta | Definir o nome do arquivo/Histórico da proposta | Persistência, Reload |
| Propostas | Propostas > Gerar Proposta > Template Word | Grupo de radio | Selecao do template | Permitir escolher qual template carregado sera usado | Ação, Persistência, Reload |
| Propostas | Propostas > Gerar Proposta > Editar Dados Antes de Gerar | Grade dinamica | Campos dinamicos do documento | Permitir ajustar os dados finais antes da Geração | Persistência, Contrato Técnico |
| Propostas | Propostas > Gerar Proposta > Formato de Saida | Grupo de radio | Word (.docx) / PDF | Definir corretamente o formato final da Exportação | Ação, Contrato Técnico, Reload |
| Propostas | Propostas > Gerar Proposta | Botão | Voltar | Retornar ao passo 2 preservando o estado da proposta | Reload, A11y/Mobile |
| Propostas | Propostas > Gerar Proposta | Botão | Gerar e Baixar | Gerar o documento e iniciar o download no formato escolhido | Persistência, Reload, Contrato Técnico |
| Templates | Configurações > Templates > Cabeçalho | Botão | + Upload Template .docx | Abrir o seletor de arquivo para envio do template | Ação, A11y/Mobile |
| Templates | Configurações > Templates > Upload | Input de arquivo | `tpl-file-in` | Receber o `.docx/.doc` e disparar o upload/processamento | Ação, Persistência, Contrato Técnico |
| Templates | Configurações > Templates > Placeholders | Grade clicável | Placeholders disponiveis | Exibir placeholders e permitir copia/uso no template | Ação, Contrato Técnico, A11y/Mobile |
| Templates | Configurações > Templates > Lista | Lista dinamica | `tpl-list` | Listar templates carregados com seus metadados | Reload, Persistência |
| Templates | Configurações > Templates > Lista > Linha | Botão | Testar | Processar o template da linha com dados de teste | Ação, Contrato Técnico, Reload |
| Templates | Configurações > Templates > Lista > Linha | Ação de download | Baixar | Baixar o arquivo do template listado | Ação, Reload |
| Templates | Configurações > Templates > Lista > Linha | Botão | Remover | Remover o template da lista e da persistência associada | Persistência, Reload |
| Templates | Configurações > Templates > Testar Template | Select | Selecionar template | Escolher o template que sera usado no teste demo | Ação, Reload |
| Templates | Configurações > Templates > Testar Template | Botão | Testar com Dados Demo | Gerar um teste visual/arquivo com dados ficticios | Ação, Contrato Técnico, Reload |
| Templates | Configurações > Propostas > Valores Padrão | Botão | Restaurar Padrões | Restaurar os valores default de Cálculo | Ação, Persistência |
| Templates | Configurações > Propostas > Valores Padrão | Grupo de inputs | Custos e encargos Padrão | Editar `Custo do Projeto`, `Custo de Instalacao`, `Valor do KM`, `Material CA`, `Comissao`, `Imposto` e `Margem de Lucro` | Persistência, Reload, Contrato Técnico |
| Templates | Configurações > Propostas > Valores Padrão | Botão | Salvar Valores Padrão | Persistir os defaults de Cálculo para propostas novas | Persistência, Reload |
| Templates | Configurações > Propostas > Valores Padrão | Botão | Simular impacto | Recalcular e exibir a previa dos valores Padrão | Ação, Contrato Técnico |
| Templates | Configurações > Propostas > Prazos | Campo numerico | Prazo medio para entrega de contratos (dias) | Definir o prazo Padrão de contratos | Persistência, Reload |
| Templates | Configurações > Propostas > Prazos | Botão | Salvar Prazos | Persistir o prazo configurado | Persistência, Reload |
| Contratos | Contratos > Barra de filtros | Controle segmentado | Todos / Aprovados / Pendentes / Reprovados | Filtrar a tabela conforme o status escolhido | Ação, Reload, A11y/Mobile |
| Contratos | Contratos > Listagem > Linha > Docs | ícone | Ver contrato | Abrir o contrato da linha no visualizador | Ação, Persistência, Reload |
| Contratos | Contratos > Listagem > Linha > Docs | ícone | Ver procuracao | Abrir a procuracao da linha no visualizador | Ação, Persistência, Reload |
| Contratos | Contratos > Listagem > Linha > Docs | ícone | Baixar contrato | Baixar o arquivo de contrato da linha | Ação, Persistência, Reload |
| Contratos | Contratos > Listagem > Linha > Docs | ícone | Baixar procuracao | Baixar o arquivo de procuracao da linha | Ação, Persistência, Reload |
| Contratos | Contratos > Listagem > Linha > Editar | ícone | Editar Situação | Abrir o modal de atualizacao do contrato selecionado | Ação, Reload |
| Contratos | Contratos > Atualizar Situação do Contrato | Select | Situação | Escolher entre `pendente`, `aprovado` e `reprovado` | Persistência, Permissão, Reload |
| Contratos | Contratos > Atualizar Situação do Contrato | Textarea | Motivo | Registrar contexto/motivo da alteracao do contrato | Persistência, Reload |
| Contratos | Contratos > Atualizar Situação do Contrato | Botão | Cancelar | Fechar o modal sem aplicar alteracao | Ação, Reload |
| Contratos | Contratos > Atualizar Situação do Contrato | Botão | Atualizar | Aplicar a nova Situação do contrato e seus efeitos na cadeia | Persistência, Reload, Permissão |

### Bloco 4 - Financeiro, Compras e Comissões

| área | Caminho no Site | Tipo de controle | Controle | Ação esperada | Lentes ainda faltantes |
|---|---|---|---|---|---|
| Financeiro | Menu lateral > Financeiro | Navegação | Item Financeiro | Abrir a Página Financeiro e marcar o menu como ativo | RBAC/Permissão, foco visual, teclado, mobile |
| Financeiro | Dashboard > Card Financeiro | Atalho de Navegação | Card Financeiro | Levar do dashboard para a Página Financeiro | Consistencia de contagem, foco, mobile |
| Financeiro | Financeiro > KPIs | Card KPI clicável | Pago | Filtrar a listagem para itens pagos | Combinacao com outros filtros, persistência do estado, teclado |
| Financeiro | Financeiro > KPIs | Card KPI clicável | A Vencer | Filtrar a listagem para vencimentos futuros/pendentes | Regra de data, combinacao com outros filtros, mobile |
| Financeiro | Financeiro > KPIs | Card KPI clicável | Vencido | Filtrar a listagem para vencidos | Regra de atraso, combinacao com outros filtros, teclado |
| Financeiro | Financeiro > Filtros | Campo texto | Buscar | Filtrar a grade por cliente/registro digitado | Debounce, combinacao com status, vazio/sem resultado, mobile |
| Financeiro | Financeiro > Filtros | Campo data | Filtro por data | Restringir a grade por data escolhida | Faixa de datas, timezone, combinacao com busca/status |
| Financeiro | Financeiro > Filtros | Select | Todos meses | Filtrar a grade por mes | Populacao dinamica, combinacao com outros filtros, mobile |
| Financeiro | Financeiro > Filtros rapidos | Chip/filtro | Todos | Limpar filtros rapidos e voltar a grade completa | Sincronizacao com KPIs e filtros superiores |
| Financeiro | Financeiro > Listagem > Linha | ícone de Ação | Comprovante | Abrir anexos/comprovantes do lancamento correto | Vínculo com item certo, storage/download, Permissão |
| Financeiro | Financeiro > Listagem > Linha | Botão de Ação | Parcelas | Abrir modal de parcelas do lancamento correto | UUID/ID, carga remota, consistencia dos totais |
| Financeiro | Financeiro > Listagem > Linha | Botão de Ação | Dar Baixa | Abrir modal de baixa para o item correto | Vínculo com item certo, estado pago/parcial, RBAC |
| Financeiro | Financeiro > Modal Parcelas | Encerramento de modal | X / Fechar | Fechar o modal sem alterar dados | Descarte de estado, teclado/Esc, foco de retorno |
| Financeiro | Financeiro > Modal Parcelas | Campo de formulario | Descrição | Receber a Descrição da nova parcela | Validação, limite de texto, acessibilidade |
| Financeiro | Financeiro > Modal Parcelas | Campo numerico | Valor (R$) | Receber o valor da parcela | Máscara/Localização, zero/negativo, acessibilidade |
| Financeiro | Financeiro > Modal Parcelas | Campo data | Vencimento | Definir a data de vencimento da parcela | Datas Inválidas, timezone, mobile |
| Financeiro | Financeiro > Modal Parcelas | Botão primario | + Adicionar | Criar a parcela e atualizar a lista/resumo | Persistência, recalculo do pai, feedback de erro |
| Financeiro | Financeiro > Modal Baixa | Encerramento de modal | X / Cancelar | Fechar o modal sem aplicar baixa | Descarte de upload/estado, teclado/Esc, foco |
| Financeiro | Financeiro > Modal Baixa | Radio | Confirmar pagamento | Marcar a intencao de confirmar a baixa | Estado inicial, obrigatoriedade, teclado |
| Financeiro | Financeiro > Modal Baixa | Campo monetario | Valor Recebido | Informar o valor efetivamente pago | Baixa parcial, máscara, saldo remanescente |
| Financeiro | Financeiro > Modal Baixa | Campo texto | Observações | Registrar Observações da baixa | Persistência, limite de texto, acessibilidade |
| Financeiro | Financeiro > Modal Baixa | Upload | Comprovante de Pagamento | Anexar comprovante ao lancamento | Tipos/tamanho, persistência no storage, preview/download |
| Financeiro | Financeiro > Modal Baixa | Botão primario | Efetuar Baixa | Aplicar a baixa e refletir na grade/Comissões | Persistência, recalculo, realtime, erro parcial |
| Compras | Menu lateral > Compras | Navegação | Item Compras | Abrir a Página Compras e marcar o menu como ativo | RBAC/Permissão, foco visual, teclado, mobile |
| Compras | Dashboard > Card Compras | Atalho de Navegação | Card Compras | Levar do dashboard para a Página Compras | Consistencia de contagem, foco, mobile |
| Compras | Compras > Cabeçalho | Botão primario | + Registrar | Abrir o modal de registro de compra | Foco inicial, RBAC, mobile |
| Compras | Compras > Listagem > Linha | Botão de Ação | + Detalhes | Abrir os detalhes da compra correta | Vínculo com linha certa, carga de anexos, foco |
| Compras | Compras > Listagem > Linha | Botão de Ação | Concluir | Concluir a compra e liberar a Próxima etapa | Persistência, Vínculo com entrega, feedback de erro |
| Compras | Compras > Modal Registrar Compra | Encerramento de modal | X / Cancelar | Fechar o modal sem salvar | Descarte de estado, teclado/Esc, foco |
| Compras | Compras > Modal Registrar Compra | Select | Projeto | Selecionar o projeto vinculado a compra | Lista real de projetos, default vazio, teclado |
| Compras | Compras > Modal Registrar Compra | Campo texto | Fornecedor | Informar o fornecedor | Validação, autocomplete, acessibilidade |
| Compras | Compras > Modal Registrar Compra | Campo texto | Kit / Descrição | Descrever o kit comprado | Limite de texto, persistência, acessibilidade |
| Compras | Compras > Modal Registrar Compra | Campo monetario | Valor (R$) | Informar o valor da compra | Máscara/Localização, zero/negativo, acessibilidade |
| Compras | Compras > Modal Registrar Compra | Campo texto | No NF | Informar o Número da nota fiscal | Validação, persistência, formato |
| Compras | Compras > Modal Registrar Compra | Botão primario | Registrar | Criar a compra e atualizar a listagem | Persistência, Vínculo com projeto, feedback de erro |
| Compras | Compras > Modal Detalhes da Compra | Encerramento de modal | X / Fechar | Fechar o modal de detalhes sem salvar | Descarte de estado, teclado/Esc, foco |
| Compras | Compras > Modal Detalhes da Compra | Textarea | Descrição do Kit Adquirido | Registrar Descrição detalhada do item comprado | Persistência, limite de texto, acessibilidade |
| Compras | Compras > Modal Detalhes da Compra | Upload | Print da Compra | Anexar comprovante visual da compra | Tipos/tamanho, preview, storage |
| Compras | Compras > Modal Detalhes da Compra | Upload | Nota Fiscal (PDF) | Anexar a NF da compra | Validação de PDF, preview/download, storage |
| Compras | Compras > Modal Detalhes da Compra | Upload | Romaneio | Anexar o romaneio da compra | Tipos/tamanho, preview/download, storage |
| Compras | Compras > Modal Detalhes da Compra | Botão primario | Salvar | Salvar Descrição e anexos da compra correta | Persistência por item, feedback de erro, realtime |
| Comissões | Menu lateral > Comissões | Navegação | Item Comissões | Abrir a Página Comissões e marcar o menu como ativo | RBAC/Permissão, foco visual, teclado, mobile |
| Comissões | Comissões > KPIs | Card KPI informativo | A Pagar | Exibir total pendente de pagamento de Comissão | Cálculo real, atualizacao após baixa/pagamento |
| Comissões | Comissões > KPIs | Card KPI informativo | Pago | Exibir total já pago em Comissões | Cálculo real, atualizacao após pagamento |
| Comissões | Comissões > KPIs | Card KPI informativo | Média/Contrato | Exibir media de Comissão por contrato | Regra de Cálculo, atualizacao em tempo real |
| Comissões | Comissões > Listagem > Linha | ícone de Ação | Comprovante | Abrir comprovantes da Comissão correta | Vínculo com item certo, storage/download, Permissão |
| Comissões | Comissões > Listagem > Linha | Botão de Ação | Pagar | Registrar o pagamento da Comissão liberada | Persistência, data/comprovante, bloqueio por Quitação |

### Bloco 5 - Projetos, Entrega, Obras, Pós-Obra, Empresas, Backend, Banco e Pacote

| área | Caminho no Site | Tipo de controle | Controle | Ação esperada | Lentes ainda faltantes |
|---|---|---|---|---|---|
| Projetos | Projetos > Listagem > Linha | Select | Alterar status | Mudar o status do projeto na linha correta | Persistência, Reload, regra de transicao |
| Projetos | Projetos > Listagem > Linha | Input date | Lim. Aprovação | Salvar a data limite de Aprovação do projeto | Persistência, Reload, Contrato Técnico |
| Projetos | Projetos > Listagem > Linha | Input date condicional | Lim. Vistoria | Salvar a data limite de vistoria quando a etapa exigir | Persistência, Reload, regra de exibicao |
| Projetos | Projetos > Listagem > Linha | Select | Delegar | Atribuir o projeto a um projetista | Persistência, Reload, Permissão |
| Projetos | Projetos > Listagem > Linha | Botão/ícone | Anexos | Abrir fluxo de anexar e consultar documentos do projeto | Persistência, Viewer, Contrato Técnico |
| Entrega | Entrega de Material > Listagem > Linha | Botão | Confirmar | Marcar a entrega como concluida e refletir na cadeia operacional | Persistência, Reload, Vínculo com compra/obra |
| Obras | Obras > Topo | Botão | Mapa | Abrir o mapa das obras | Contrato Técnico, links reais, A11y/Mobile |
| Obras | Obras > Topo | Botão | + Adicionar | Abrir o modal de nova obra | Persistência, Permissão |
| Obras | Obras > Tabs | Tab | Lista | Trocar para a visao de lista | Reload, A11y/Mobile |
| Obras | Obras > Tabs | Tab | Checklist de Instalacao | Trocar para o checklist da obra | Persistência, A11y/Mobile |
| Obras | Obras > Tabs | Tab | Agenda | Trocar para a agenda de obras | Reload, A11y/Mobile |
| Obras | Obras > Tabs | Tab | Por Equipe | Trocar para o painel agrupado por equipe | Reload, A11y/Mobile |
| Obras | Obras > Lista > Linha | Select | Alterar status | Atualizar o status da obra | Persistência, Reload, regra de transicao |
| Obras | Obras > Lista > Linha | Input text | Equipe | Alterar a equipe responsavel pela obra | Persistência, Reload, multiusuario |
| Obras | Obras > Checklist de Instalacao | Toggle/item | Item do checklist | Marcar ou desmarcar item da instalacao | Persistência, Reload, multiusuario, A11y |
| Obras | Obras > Modal Adicionar Obra | Grupo de campos | Cliente / Data / Equipe / Lider | Preencher os dados Mínimos da nova obra | Validação, Persistência |
| Obras | Obras > Modal Adicionar Obra | Botão | Adicionar | Criar a obra e fechar o modal | Persistência, Reload |
| Entrega da Obra | Entrega da Obra > Listagem > Linha | Select | Alterar status | Mudar o status final da entrega Técnica da obra | Persistência, Reload, precondicoes |
| Pós-Obra | Pós-Obra > Topo | Botão | Exportar CSV | Exportar a listagem atual | Contrato Técnico, filtro aplicado |
| Pós-Obra | Pós-Obra > Filtros | Input date | Período inicial | Filtrar a lista pelo inicio do intervalo | Persistência de filtro, Reload |
| Pós-Obra | Pós-Obra > Filtros | Input date | Período final | Filtrar a lista pelo fim do intervalo | Persistência de filtro, Reload |
| Pós-Obra | Pós-Obra > Filtros | Select | Cidade | Filtrar por cidade | Reload, consistencia de dados |
| Pós-Obra | Pós-Obra > Filtros | Select | Tipo | Filtrar por tipo de sistema | Reload, consistencia de dados |
| Pós-Obra | Pós-Obra > Filtros | Select | Prazo | Filtrar por status de prazo | Reload, consistencia de Cálculo |
| Pós-Obra | Pós-Obra > Linha > Docs | ícone | Proposta | Abrir a proposta do cliente finalizado | Viewer, Persistência, Contrato Técnico |
| Pós-Obra | Pós-Obra > Linha > Docs | ícone | Contrato | Abrir o contrato do cliente finalizado | Viewer, Persistência, Contrato Técnico |
| Empresas | Empresas > Topo | Botão | + Nova Empresa | Abrir o modal de Criação de empresa | Permissão, Reload |
| Empresas | Empresas > Lista | Input busca | Buscar empresa | Filtrar a grade por nome ou CNPJ | Reload, Performance |
| Empresas | Empresas > Modal Nova Empresa | Grupo de campos | Nome Fantasia / Razao Social / CNPJ | Registrar a identidade principal da empresa | Validação, Persistência, mascaras |
| Empresas | Empresas > Modal Nova Empresa | Grupo de campos | Telefone / E-mail / Cidade / Estado | Registrar contato e Localização | Validação, Persistência |
| Empresas | Empresas > Modal Nova Empresa | Select | Plano | Definir o plano comercial da empresa | Persistência, regra de limites |
| Empresas | Empresas > Modal Nova Empresa | Grupo de campos | Nome do ADM / E-mail do ADM / Senha inicial | Criar o Usuário administrador inicial | Auth real, Persistência |
| Empresas | Empresas > Modal Nova Empresa | Botão | Criar Empresa | Executar a Criação da empresa completa | Persistência, Auth, Rollback |
| Backend | Backend > Middleware | Header de Autenticação | x-api-key | Autorizar chamadas da API | Segurança, Resiliencia |
| Backend | Backend > Middleware | Query param | apiKey | Autorizar chamadas por query string | Segurança, Log, Contrato Técnico |
| Backend | Backend > Upload | Limite | fileSize=50MB | Bloquear arquivo acima do tamanho permitido | Resiliencia, mensagem de erro |
| Backend | Backend > Upload | Filtro de arquivo | .docx / mimetype | Aceitar somente template Word válido | Resiliencia, Validação real |
| Backend | Backend > API | Endpoint | GET /health | Informar se o servico esta pronto | Dependencias reais, observabilidade |
| Backend | Backend > API | Endpoint multipart | POST /api/testar-template | Receber template e devolver PDF de teste | Contrato Técnico, Resiliencia |
| Backend | Backend > API | Entrada de template | template_file | Gerar proposta usando arquivo enviado no request | Contrato Técnico, Resiliencia |
| Backend | Backend > API | Entrada de template | template_path | Gerar proposta usando arquivo no Storage | Storage real, Resiliencia |
| Backend | Backend > API | Payload | dados JSON | Preencher placeholders do template | Contrato Técnico, Validação |
| Backend | Backend > API | Flag | salvar=true | Salvar o PDF gerado no Storage | Storage real, erro parcial |
| Backend | Backend > Conversão | Rotina Técnica | toPdf() via soffice | Converter DOCX em PDF | Dependencia externa, cleanup |
| Backend | Backend > Erros | Middleware global | Handler de exceções | Devolver erro controlado ao cliente | Segurança, padronizacao |
| Banco | Banco > Schema | Tabela | organizations | Sustentar cadastro e contexto de empresa | Contrato frontend, RLS |
| Banco | Banco > Schema | Tabela | users | Sustentar Usuários e Vínculo com empresa | Contrato frontend, auth, RLS |
| Banco | Banco > Schema | Tabela | organization_settings | Sustentar Configurações por empresa | Contrato frontend, migracao legado |
| Banco | Banco > Schema | Tabela | projects | Sustentar projetos e prazos do Módulo Projetos | Contrato frontend, Persistência |
| Banco | Banco > Schema | Tabela | inspections | Sustentar vistoria e Relatório Técnico | Integração com projetos/documentos |
| Banco | Banco > Schema | Tabela | material_deliveries | Sustentar a etapa Entrega de Material | Integração com compras/clientes |
| Banco | Banco > Schema | Tabela | works | Sustentar a etapa Obras | Contrato frontend, geolocalizacao |
| Banco | Banco > Schema | Tabela relacional | work_teams | Vincular Usuários a obras e papeis | Multiusuario, Contrato frontend |
| Banco | Banco > Schema | Tabela | work_completions | Sustentar Entrega da Obra e sistema ligado | Integração com obras/Pós-obra |
| Banco | Banco > Schema | Tabela | deadlines | Sustentar prazos operacionais | Regras de negocio, Notificação |
| Banco | Banco > Schema | Tabela | notifications | Sustentar alertas por Usuário/empresa | Realtime, leitura, RLS |
| Banco | Banco > Segurança | Bloco de Configuração | ENABLE ROW LEVEL SECURITY | Aplicar isolamento por tabela | Politicas reais, teste multiempresa |
| Pacote | Pacote > Raiz | Script npm | frontend / backend / backend:test | Subir frontend, backend e testes pelo pacote raiz | Reproducao, docs |
| Pacote | Pacote > Scripts | Script Node | scripts/serve-frontend.js | Servir o frontend em porta local | Reproducao, fallback de rota |
| Pacote | Pacote > Scripts | Script CMD | open-crm-chrome.cmd | Abrir o CRM no Chrome | Ambiente corporativo, perfil local |
| Pacote | Pacote > Scripts | Script CMD | open-crm-edge.cmd | Abrir o CRM no Edge | Ambiente corporativo, perfil local |
| Pacote | Pacote > Backend | Scripts npm | start / dev / test | Operar o backend isoladamente | Reproducao, docs |
| Pacote | Pacote > Backend | Arquivo de ambiente | .env.example | Orientar Configuração Mínima de execucao | Segurança, deploy |
| Pacote | Pacote > Backend | Deploy config | Dockerfile e railway.toml | Empacotar e publicar o backend | Deploy real, healthcheck |
| Pacote | Pacote > Entradas principais | Arquivo base | frontend/index.html e database/supabase-schema.sql | Servir como entrada visual e contrato de banco | Compatibilidade cruzada, versionamento |

## Próximo passo

Com este inventario consolidado, os Próximos scans deixam de ser "varreduras soltas" e passam a seguir um roteiro:
- marcar `Ja clicado/testado`
- marcar `Resultado observado`
- marcar `Resultado esperado`
- abrir novos problemas apenas quando o controle falhar de fato
- fechar cobertura por área antes de abrir a Próxima
