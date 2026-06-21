# MATRIZ DE COBERTURA TOTAL - INTEGRA SOLAR

Data: 30/03/2026

## Como ler esta matriz

Objetivo:

- transformar as Fases 1 a 6 em cobertura controlada
- mostrar o que já foi validado
- mostrar o que ainda falta validar

Legenda de status:

- `Fechado` = área passou pelas lentes principais com evidencias suficientes no pacote atual
- `Parcial` = área já foi bastante varrida, mas ainda tem lacunas relevantes
- `Nao validavel com pacote atual` = depende de arquivo, ambiente ou dado que Não veio

Lentes do plano:

- `UI`
- `Acao`
- `Persistencia`
- `Reload`
- `Permissao`
- `A11y/Mobile`
- `Contrato tecnico`

## Resumo atual

- Fases oficiais consolidadas: `1 a 6`
- Total oficial atual: `191 problemas documentados`
- Situação real do projeto: `cobertura ampla, mas ainda nao total`
- Ponto mais forte hoje: `mapeamento estrutural`
- Ponto que ainda falta fechar: `matriz fina por controle e por fluxo`

## Matriz


| área            | Caminho no Site                                 | Tipo de elemento                     | Ação esperada                                             | JÁ validado? | Por qual fase                           | Falta validar o que                                                  | Status                         |
| --------------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ------------ | --------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| Shell           | Login > Tela inicial                            | tela, campos, fallback, reset        | autenticar, recuperar acesso, controlar estado inicial    | Sim          | F1, F3, F5, F6                          | foco detalhado por campo e comportamento com Sessão expirada real    | Parcial                        |
| Shell           | Sidebar > Módulos principais                    | menu lateral                         | navegar entre todas as Páginas e respeitar perfil         | Sim          | F1, F6                                  | prova completa por perfil real no navegador                          | Parcial                        |
| Shell           | Topbar > Busca, sino, atalhos                   | busca, Notificações, Botão novo lead | buscar, abrir pendencias e atalhos                        | Sim          | F1, F3, F5, F6                          | Navegação por teclado e leitura real com dataset variado             | Parcial                        |
| Shell           | Toasts, banners e loading overlay               | feedback global                      | anunciar erro, sucesso, aviso e loading corretamente      | Sim          | F3, F5, F6                              | confirmar ordem de prioridade entre overlays e modais em uso real    | Parcial                        |
| Empresas        | Empresas > Lista principal                      | tela administrativa                  | listar, abrir detalhes, acessar empresa, ativar/desativar | Sim          | F2, F5                                  | fluxo ponta a ponta com empresa real criada no banco                 | Parcial                        |
| Empresas        | Empresas > Nova empresa                         | modal/formulario                     | criar empresa, Usuário inicial e estrutura base           | Sim          | F1, F5                                  | Validação completa com Auth real, seeds e rollback                   | Parcial                        |
| Empresas        | Empresas > Ver detalhes                         | modal de detalhe                     | mostrar dados, Usuários e Configurações da empresa        | Sim          | F5 handlers                             | cruzar com Configurações reais e anexar campos faltantes             | Parcial                        |
| Dashboard       | Dashboard > Cards/KPIs                          | cards, indicadores                   | refletir dados reais e navegar para Módulos               | Sim          | F1, F2, F5, F6                          | fechar coerencia numerica total após persistencias corrigidas        | Parcial                        |
| Dashboard       | Dashboard > Filtros e Gráficos                  | filtros, charts, comparação          | filtrar e recalcular visualmente e tecnicamente           | Sim          | F2, F3, F5, F6                          | validar series reais quando banco vier completo                      | Parcial                        |
| CRM             | CRM > Kanban                                    | colunas, drag/drop, automacoes       | mover lead, criar etapa, respeitar pipeline               | Sim          | F2                                      | cobertura fina de todos os controles pequenos por coluna             | Parcial                        |
| CRM             | CRM > Modal Adicionar Lead                      | modal/formulario                     | cadastrar lead corretamente                               | Sim          | F2, F6                                  | validar todos os campos, formato e persistência final no banco       | Parcial                        |
| CRM             | CRM > Observações do lead                       | modal                                | salvar e recuperar Histórico                              | Sim          | F2, F6                                  | validar persistência remota correta e reload                         | Parcial                        |
| CRM             | CRM > Menu de Opções do card                    | ícones, Ações rapidas                | gerar proposta, cadastrar cliente, editar, excluir        | Sim          | F4, F5 handlers                         | revisar todos os handlers com nomes reais contendo aspas/apostrofo   | Parcial                        |
| Clientes        | Clientes > Listagem                             | tabela, filtros, badges              | listar cliente correto e filtrar de verdade               | Sim          | F1, F2, F5 semântica                    | validar todos os filtros e estados após banco real                   | Parcial                        |
| Clientes        | Clientes > Cadastro em 8 etapas                 | stepper/modal grande                 | cadastrar cliente completo e coerente                     | Sim          | F1, F2, F3, F5 semântica                | cobertura de cada etapa por campo, com persistência e reload         | Parcial                        |
| Clientes        | Clientes > Anexos/documentos                    | upload, lista, visualizador          | anexar, ver, remover, reconciliar storage e banco         | Sim          | F1, F4, F5 handlers                     | testar todos os docTypes restantes e reconciliacao final             | Parcial                        |
| Clientes        | Clientes > Portal do cliente                    | modal de acesso                      | criar acesso contextualizado para cliente                 | Sim          | F4, F5 semântica                        | validar fluxo real com identidade e senha utilizável                 | Parcial                        |
| Propostas       | Propostas > Listagem                            | tabela e Ações                       | listar, visualizar, aprovar, re-gerar                     | Sim          | F1, F4, F5 semântica                    | fechar comportamento real de todos os ícones da linha                | Parcial                        |
| Propostas       | Propostas > Passo 1 Equipamentos                | modal                                | montar proposta base corretamente                         | Sim          | F1, F5 semântica                        | validar consistencia de Cálculos com defaults reais                  | Parcial                        |
| Propostas       | Propostas > Passo 2 Cotação                     | modal/tabela                         | calcular composicao e transitar para Geração              | Sim          | F1                                      | revisar todos os campos derivados e formula real                     | Parcial                        |
| Propostas       | Propostas > Passo 3 Geração                     | modal/Exportação                     | gerar DOCX/PDF, salvar proposta e registrar Histórico     | Sim          | F1, F3, F5, F6                          | validar com template real enviado e backend completo                 | Parcial                        |
| Templates       | Configurações > Templates                       | upload, teste, lista                 | cadastrar template, testar, reusar, remover               | Sim          | F1, F3, F4, F5 handlers, F5 performance | falta prova com template profissional definitivo do cliente          | Parcial                        |
| Contratos       | Contratos > Listagem                            | tabela e Ações                       | visualizar arquivos, editar Situação, baixar docs         | Sim          | F1, F4, F5 semântica                    | revalidar após ajuste de IDs e fontes de arquivo                     | Parcial                        |
| Contratos       | Contratos > Modal editar Situação               | modal                                | atualizar contrato e recalcular cadeia                    | Sim          | F2, F5                                  | fluxo reverso completo e comportamento por status real               | Parcial                        |
| Financeiro      | Financeiro > Listagem/KPIs/filtros              | tabela, kpis, filtros                | listar contas, filtrar e refletir status real             | Sim          | F1, F3, F4, F6                          | filtros secundarios ainda precisam cobertura total                   | Parcial                        |
| Financeiro      | Financeiro > Modal baixa                        | modal/upload                         | baixar parcial ou total, anexar comprovante, persistir    | Sim          | F2, F6                                  | cobertura completa de baixa parcial e reconciliacao banco/storage    | Parcial                        |
| Financeiro      | Financeiro > Parcelas                           | modal                                | abrir, carregar, adicionar, quitar e baixar               | Sim          | F2, F4                                  | fechar ciclo inteiro com tabela real ou marcar como Não suportado    | Parcial                        |
| Projetos        | Projetos > Listagem e status                    | tabela, select, datas                | alterar status, delegar, respeitar gate                   | Sim          | F2, F5                                  | validar todas as transicoes permitidas e bloqueadas                  | Parcial                        |
| Compras         | Compras > Listagem                              | tabela e Botões                      | registrar, detalhar e concluir compra                     | Sim          | F2, F3, F5                              | falta prova de persistência remota completa por item                 | Parcial                        |
| Compras         | Compras > Modal registrar compra                | modal                                | criar compra consistente com projeto/cliente              | Sim          | F1, F6                                  | validar todos os campos e reflexos nos Próximos Módulos              | Parcial                        |
| Compras         | Compras > Modal detalhes                        | modal                                | editar documentos e salvar detalhes da compra             | Sim          | F1, F6                                  | confirmar se algum campo realmente persiste no banco                 | Parcial                        |
| Entrega         | Entrega de Material > Listagem                  | tabela e confirmar entrega           | marcar entrega e liberar Próxima etapa corretamente       | Sim          | F2, F3, F5                              | falta fechar relacao formal compra > entrega > obra > eobra          | Parcial                        |
| Obras           | Obras > Lista                                   | tabela principal                     | alterar status, equipe, anexos, abrir mapa                | Sim          | F3, F6                                  | cobertura fina de todos os botões e anexos ainda restantes           | Parcial                        |
| Obras           | Obras > Checklist de instalacao                 | checklist                            | marcar itens por obra corretamente                        | Sim          | F3, F6                                  | validar persistência por obra e comportamento multiusuario           | Parcial                        |
| Obras           | Obras > Agenda e Por equipe                     | subabas                              | refletir alocacao e agenda reais                          | Sim          | F2, F3, F6                              | testar com dataset mais real de equipes                              | Parcial                        |
| Obras           | Obras > Mapa                                    | modal                                | mostrar Localização das obras                             | Parcial      | F1                                      | falta prova visual/controlada do mapa com links reais                | Parcial                        |
| Entrega da Obra | Entrega da Obra > Listagem                      | tabela e status                      | respeitar precondicoes e liberar Pós-Obra corretamente    | Sim          | F2, F3, F5                              | falta prova com work_completions real no banco                       | Parcial                        |
| Pós-Obra        | Pós-Obra > Lista e filtros                      | tabela, filtros, documentos          | listar corretamente, filtrar e abrir docs reais           | Sim          | F3, F5 semântica                        | filtros de Período e docs reais ainda precisam fechamento            | Parcial                        |
| Relatórios      | Relatórios > Tabs principais                    | tabs, filtros, exportacoes           | filtrar, gerar Gráficos e exportar real                   | Sim          | F3, F6                                  | filtros finos e consistencia numerica final com base real            | Parcial                        |
| Relatórios      | Relatórios > Chamados Técnicos                  | card, Botão novo chamado             | abrir e registrar chamado Técnico                         | Sim          | F3                                      | fluxo ainda e decorativo; precisa confirmar escopo final do cliente  | Parcial                        |
| Configurações   | Config > Funil CRM                              | etapas, cores, exclusao              | gerenciar etapas e salvar de verdade                      | Sim          | F2, F6                                  | revisar todos os handlers de etapa com IDs reais                     | Parcial                        |
| Configurações   | Config > Permissões                             | tabs, matriz, salvar                 | editar Permissão e respeitar RBAC                         | Sim          | F2, F5, F6                              | prova com perfis reais e adaptador de schema                         | Parcial                        |
| Configurações   | Config > Alertas                                | frequencias e regras                 | salvar regras reais de alerta                             | Parcial      | F1, F6                                  | persistência real e efeito no motor de Notificações                  | Parcial                        |
| Configurações   | Config > Metas                                  | formulario e mini barras             | salvar metas e recalcular mini painel                     | Sim          | F3                                      | falta persistência real e teste com meta zero após correcao          | Parcial                        |
| Configurações   | Config > Usuários                               | tabela e modal criar                 | convidar, editar, ativar, desativar Usuário               | Sim          | F1, F6                                  | fluxo real com Auth e governanca de senha                            | Parcial                        |
| Notificações    | Topo > Modal de Notificações                    | lista, badge, leitura                | carregar, exibir e marcar como lida                       | Sim          | F3, F5                                  | deduplicacao/cooldown e view real do banco ainda precisam fechamento | Parcial                        |
| Comissões       | Comissões > Listagem                            | tabela e pagar                       | pagar, anexar comprovante e refletir quitação             | Sim          | F2, F3                                  | anexos e persistência de pagamento ainda faltam fechar               | Parcial                        |
| Upload/Viewer   | Sistema > Visualizador de arquivo               | modal viewer                         | abrir imagem/pdf/documento e baixar                       | Sim          | F4, F5 handlers                         | fechar todos os estados de download global e preview alternativo     | Parcial                        |
| Backend         | Backend > Auth, CORS e API key                  | Segurança de API                     | proteger rotas corretamente                               | Sim          | F1, F6                                  | teste com ambiente real e origens reais permitidas                   | Parcial                        |
| Backend         | Backend > Geração de proposta/PDF               | rota, storage, soffice               | gerar PDF real, salvar e responder corretamente           | Sim          | F1, F5, F6                              | validar com LibreOffice e Storage em ambiente final do cliente       | Parcial                        |
| Backend         | Backend > Testar template                       | rota de teste                        | validar placeholders e devolver PDF de teste              | Sim          | F1, F6                                  | prova com DOCX real do cliente e arquivos malformados                | Parcial                        |
| Backend         | Backend > Testes automatizados                  | `test.js` e smoke tests              | cobrir servico de forma portavel                          | Sim          | F1, F6                                  | ajustar runner e rerodar em Windows/cenario real                     | Parcial                        |
| Banco           | Schema > RBAC, organizations, settings          | contrato Técnico                     | sustentar login, empresa e Permissão                      | Sim          | F1, F5                                  | ainda falta reconciliar legado x schema final que o cliente usar     | Parcial                        |
| Banco           | Schema > Notificações, dashboard, defaults      | views, tabelas, RPCs                 | sustentar frontend sem entidades fantasmas                | Sim          | F1, F5                                  | definir fonte unica e remover/ajustar legado                         | Parcial                        |
| Pacote          | Material entregue > templates, dumps e ambiente | arquivo/ambiente                     | permitir reproducao real do sistema                       | Sim          | F1, F6                                  | faltam templates `.docx`, dados reais e ambiente completo            | Não validavel com pacote atual |


## Leitura Geral da Cobertura

1. O sistema já esta muito bem mapeado em `estrutura`, `persistencia falsa`, `cadeia operacional`, `backend`, `schema` e `a11y/mobile`.
2. O que mais falta agora Não e “achar área nova”. E `fechar lacuna fina` dentro de áreas já conhecidas.
3. Os maiores vazios atuais dependem de material ausente:
  - templates profissionais reais
  - ambiente Supabase realmente operacional
  - dados reais para multiempresa/perfis
  - Validação visual completa em navegador com todos os fluxos

## Próxima Ordem Recomendada

1. `MATRIZ FINA POR CONTROLE`
  - quebrar as áreas `Parcial` em Botões, filtros, ícones e campos
2. `SCAN DE PERFIS`
  - provar tudo por perfil real
3. `SCAN FIM A FIM COM EVIDENCIA`
  - executar fluxos completos e registrar reload/persistencia
4. `DEDUPLICACAO FINAL`
  - unificar fases oficiais e complementares
5. `PLANO_DE_CORRECAO`
  - atacar `P1`, `P2`, `P3`

