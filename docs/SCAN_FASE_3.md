# SCAN COMPLETO FASE 3 INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Terceira onda de varredura, deduplicada contra a Fase 1 e a Fase 2.
- Uso do navegador aberto com Playwright para validar áreas ainda Não clicadas.
- Cruzamento com leitura de Código para confirmar se a Ação realmente persiste, exporta ou só muda a interface.
- Foco extra em Botões, links, Relatórios, interações operacionais, Sessão, Notificações e sinais de performance.

Regra desta fase:
- Não repetir o que já estava claramente documentado nas fases anteriores.
- Entrar só quando apareceu um caminho novo, uma causa nova ou uma quebra nova.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada |
|---|---|---|---|---|
| 1 | Relatórios > Vendas > Filtros de Período/Vendedor | Filtros visuais sem ligação real | Os campos de Período e vendedor aparecem na tela, mas Não possuem `id`, evento ou rotina de recarga; o bloco fica só decorativo. | Os filtros devem alterar cards, Gráficos e totais do Relatório. |
| 2 | Relatórios > Leads/Vendas/Obras/Financeiro/Ranking | Relatórios usam números e series fixas de Demonstração | A tela mostra KPIs, tabelas e Gráficos com valores hardcoded no HTML/JS, sem leitura do estado real da empresa. | Os Relatórios devem ser montados com dados vivos do banco e dos filtros aplicados. |
| 3 | Relatórios > Exportar PDF | Botão de PDF e apenas um aviso | No navegador, o clique exibiu o aviso "Exportação PDF disponivel com backend completo", e no Código `exportPDF()` só chama `toast`. | O Botão deve gerar ou baixar um PDF real do Relatório selecionado. |
| 4 | Relatórios > Obras > Chamados Técnicos > + Novo Chamado | Abertura de chamado Não existe | O Botão `+ Novo Chamado` só dispara `toast('Novo chamado tecnico','info')`, sem formulario nem registro. | O clique deve abrir o fluxo de abertura de chamado Técnico. |
| 5 | Entrega de Material > Lista > Confirmar Entrega | Confirmacao de entrega Não persiste | `confEnt()` altera somente `S.entregas`, re-renderiza a lista e libera obras localmente, sem salvar no banco. | A confirmacao deve persistir a entrega antes de liberar a Próxima etapa. |
| 6 | Obras > Lista > Alterar status | Status da obra muda só na memoria | `updObrSt()` altera `S.obras`, atualiza a grade e mostra sucesso, mas Não grava o novo status remotamente. | A alteracao de status deve sobreviver a recarga e refletir no banco. |
| 7 | Obras > Lista > Campo Equipe | Troca de equipe fica só no input local | O `onchange` da equipe atualiza apenas `S.obras.find(...).eq=this.value`, sem persistência e sem Histórico. | A equipe atribuida deve ser salva no registro real da obra. |
| 8 | Obras > Checklist de Instalacao > Marcar item | Checklist Não persiste a execucao | `toggleChk()` só alterna o item em `S.checklists` e re-renderiza a lista, sem qualquer gravacao. | A Conclusão do checklist deve ser salva por obra e por item. |
| 9 | Entrega da Obra > Automacao para Pós-Obra | Pós-Obra inventa dados Padrão quando o cliente Não existe no cache | `checkPosObra()` usa fallback local com cidade `Palmas`, tipo `On-Grid`, data atual e prazo `60` quando Não acha o cliente correto. | A automacao deve exigir dados reais do cliente ou falhar com aviso claro. |
| 10 | Login > Pos-login > Verificacao de assinatura | App abre antes da assinatura ser validada | Depois de `renderAll()`, a checagem `verificarAssinaturaEmpresa()` e chamada sem `await`, então o Usuário entra no app antes do resultado. | A Sessão só deve abrir depois da Validação de assinatura/plano. |
| 11 | Login > Pos-login > Falha na checagem de assinatura | Erro na Validação libera acesso mesmo assim | Se a RPC de assinatura falhar, o `catch` retorna `true` e Não bloqueia empresa expirada ou suspensa. | Falha na checagem deve fechar em modo seguro, Não em modo liberado. |
| 12 | Topo > Sino > Marcar Notificação como lida | UI remove Notificação sem confirmar update no banco | `marcarLidaNotif()` faz `update` sem `try/catch` e remove a Notificação local logo em seguida, mesmo se a gravacao falhar. | A Notificação só deve sumir depois de confirmacao real do banco. |
| 13 | Configurações > Templates > Upload local | Template local some ao fechar a Sessão do navegador | Os metadados dos templates locais vao para `sessionStorage`, Não para persistência duravel; ao fechar a Sessão, o Usuário perde a referencia local. | O sistema deve persistir de forma duravel ou avisar claramente que o upload local e temporario. |
| 14 | Dashboard > Metas mini / Configurações > Metas | Meta zero pode gerar Cálculo enganoso | `renderMetasMini()` divide `MA[k]` por `S.metas[k]`; se a meta virar `0`, o percentual pode virar `NaN` ou ser mascarado para `100`. | O Cálculo deve tratar meta zero sem quebrar barra, Número ou resumo. |
| 15 | Login/Sessão > Sair | Logout Não limpa todo o contexto carregado | `doLogout()` esconde o app e zera só parte do estado visível; `currentOrgId`, `currentOrg` e Vários datasets continuam em memoria. | O logout deve limpar o contexto inteiro antes de permitir novo login. |
| 16 | Frontend global > Estrutura da aplicacao | SPA monolitica pesa Manutenção e resposta da interface | O frontend concentra tudo em um `index.html` de 362359 bytes, com 30 Seções, 147 Botões, 276 `onclick` inline e cerca de 2551 nos DOM. | O sistema deveria ser modularizado para reduzir acoplamento, custo de render e risco de regressao. |
| 17 | Frontend global > Bootstrap Supabase/CDN | Startup perde tempo tentando recuperar bibliotecas bloqueadas | O bootstrap espera até 5s, faz retry do Supabase e continua em modo degradado quando o CDN falha, gerando atraso e avisos repetidos. | O carregamento deve ter fallback local ou erro deterministico mais rapido. |

## Leitura Rapida

1. A Fase 3 aprofundou principalmente `Relatorios`, `Entrega > Obras`, `sessao/assinatura`, `notificacoes`, `templates` e `performance estrutural`.
2. O Padrão mais forte desta fase foi "a interface abre e muda visualmente, mas a Ação Não persiste".
3. O segundo Padrão mais forte foi "dados de Demonstração e fallbacks locais continuam vazando para fluxos que parecem reais".

## Base Técnica Desta Fase

- Evidencia visual do clique em `Relatorios > Exportar PDF`: `.playwright-cli/page-2026-03-30T18-08-25-045Z.yml`
- Estado visual de `Relatorios`: `.playwright-cli/page-2026-03-30T18-07-57-987Z.yml`
- Estado visual de `Obras`: `.playwright-cli/page-2026-03-30T18-04-54-292Z.yml`
- Evidencias de Código principais:
  - `site-recuperado/frontend/index.html:818-907`
  - `site-recuperado/frontend/index.html:2219-2228`
  - `site-recuperado/frontend/index.html:2460-2474`
  - `site-recuperado/frontend/index.html:3005-3111`
  - `site-recuperado/frontend/index.html:3266-3266`
  - `site-recuperado/frontend/index.html:3587-3622`
  - `site-recuperado/frontend/index.html:4304-4310`
  - `site-recuperado/frontend/index.html:5295-5335`
  - `site-recuperado/frontend/index.html:5340-5363`
