# SCAN COMPLETO FASE 6 INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Sexta onda de varredura, focada em visões ainda Não formalizadas nas fases anteriores.
- Revisão dedicada de acessibilidade, responsividade, Navegação por teclado, semântica estrutural do HTML, dialogs/modais, Identificação programatica de campos e endurecimento do backend.
- Cruzamento entre leitura de Código local e exploracao paralela deduplicada.

Regra desta fase:
- Não repetir problema já consolidado nas Fases 1 a 5.
- Entrar apenas quando a nova lente trouxe causa Técnica nova ou risco novo ainda Não escrito no mestre.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada | Evidencia |
|---|---|---|---|---|---|
| 1 | Site inteiro > Estrutura base do HTML | HTML malformado no `head` | O arquivo fecha `</style></head>` duas vezes seguidas, deixando a arvore dependente da tolerancia do navegador. | O HTML deveria ter fechamento unico e estrutura válida. | `frontend/index.html:441`; `frontend/index.html:443` |
| 2 | Site inteiro > Uso em tablet/celular | Layout principal Não tem breakpoint real para mobile | O app mantem sidebar fixa, topbar deslocada e `main` com `margin-left` permanente; a unica media query só reduz a grade `.g4`. | A casca principal deveria ter menu recolhivel, topbar adaptada e Conteúdo sem corte lateral em telas estreitas. | `frontend/index.html:35`; `frontend/index.html:56`; `frontend/index.html:80`; `frontend/index.html:102`; `frontend/index.html:119` |
| 3 | Login > Links auxiliares | `Recuperar acesso` e `Voltar ao login` sao mouse-only | Os atalhos do login sao `span` com `onclick`, sem `button`, `a`, `href`, `tabindex` ou handler de teclado. | Esses atalhos deveriam ser Botões ou links reais, com foco e ativacao por teclado. | `frontend/index.html:467`; `frontend/index.html:475` |
| 4 | Menu lateral > Navegação principal | Menu lateral inacessivel por teclado | Os itens do menu sao `div` com `onclick`, sem semântica de Botão/link, sem foco nativo e sem acionamento por teclado. | A Navegação deveria usar `button` ou `a`, com foco visível e suporte a teclado. | `frontend/index.html:492-506` |
| 5 | Dashboard > Cards principais | Cards clicáveis Não sao acessiveis por teclado | Os cards do dashboard Também navegam por `onclick` em `div`, sem papel semantico, foco ou `Enter/Espaco`. | Os cards deveriam ser links ou Botões focaveis. | `frontend/index.html:578-585` |
| 6 | Modais do sistema > Geral | Modais Não fazem Gestão de foco nem fechamento por teclado | `openM()` e `closeM()` apenas alternam classe CSS; Não ha foco inicial, trap de foco, retorno de foco ao gatilho nem `Escape`. | Todo modal deveria abrir com foco previsivel, prender o Tab dentro dele e aceitar `Escape`. | `frontend/index.html:1217`; `frontend/index.html:2430-2432` |
| 7 | Obras, Relatórios e Configurações > Barras de abas | Sistema de tabs Não e acessivel por teclado | As abas sao `div class="tab"` com `onclick`, sem `role="tab"`, `aria-selected`, `tabindex` ou Navegação por setas. | Tabs deveriam expor papel semantico, estado selecionado e Navegação por teclado. | `frontend/index.html:762-765`; `frontend/index.html:823-827`; `frontend/index.html:935-960` |
| 8 | Topo > Busca global > Lista de resultados | Resultados da busca Não sao focaveis nem navegáveis por teclado | Cada resultado da busca e um `div.gsri` com `onclick`, sem operação de lista acessivel, sem seta/Enter e sem semântica de Opção. | A busca deveria permitir navegar pelos resultados via teclado e usar elementos ou roles apropriados. | `frontend/index.html:87-89`; `frontend/index.html:2450` |
| 9 | Obras > Checklist de Instalacao | Checklist usa caixa customizada sem acessibilidade nativa | O item clicável do checklist e uma `div.chk-box` com `onclick`, sem checkbox nativo, sem `aria-checked` e sem foco por teclado. | O checklist deveria usar `input type="checkbox"` ou equivalente acessivel com estado exposto. | `frontend/index.html:3106-3111` |
| 10 | Configurações > Permissões por Perfil | Grade de Permissões esconde o checkbox real | A matriz usa `perm-item` clicável e esconde o `input type="checkbox"` com `display:none`, deslocando o toggle para `div` visual. | A grade deveria usar controles checkaveis acessiveis, focaveis e com estado semanticamente exposto. | `frontend/index.html:3151-3157` |
| 11 | Sistema inteiro > Feedback assincrono | Toast Não tem live region para tecnologia assistiva | O feedback global vive em `div#toast` comum, e `toast()` só injeta HTML e mostra a caixa visual. | O sistema deveria anunciar feedback assincrono em uma live region acessivel (`role`/`aria-live`). | `frontend/index.html:2435-2440` |
| 12 | Modais operacionais > Baixa, Compra e Nova Obra | Campos sem Identificação programatica consistente | Vários formularios operacionais exibem `label`, mas os inputs Não trazem identificadores claros e consistentes para associacao formal, automacao e leitura assistiva. | Campos operacionais deveriam ter `id` e associacao formal com o label. | `frontend/index.html:1370-1371`; `frontend/index.html:1393`; `frontend/index.html:1405` |
| 13 | Site inteiro > Carregamento inicial | Imagens grandes embutidas em Base64 dentro do HTML | Logos e imagens sao carregadas em `data:image/...` dentro do Próprio `index.html`, aumentando parse inicial, peso do HTML e custo de Manutenção. | Assets visuais deveriam ficar em arquivos externos cacheaveis. | `frontend/index.html:451`; `frontend/index.html:488` |
| 14 | Backend > Autenticação da API | API key pode ser enviada por query string | `auth()` aceita `req.query.apiKey` Além do header. Isso facilita vazamento em Histórico, logs e compartilhamento de URL. | A chave deveria ser aceita apenas por header seguro. | `backend/server.js:42-46` |
| 15 | Backend > Monitoramento > Health check | `/health` Não verifica dependencias Críticas | A rota responde `ok` estatico sem testar Supabase, Storage ou disponibilidade do LibreOffice. | O health check deveria refletir o estado real das dependencias Críticas. | `backend/server.js:98-101`; `backend/server.js:185-188` |
| 16 | Backend > Upload de template/proposta | Validação de arquivo confia só em extensao ou mimetype | O `fileFilter` aceita o upload se o nome terminar em `.docx` ou se o mimetype contiver `docx`, sem validar a estrutura real do arquivo. | O backend deveria validar o arquivo de forma mais robusta antes de processar. | `backend/server.js:36-40` |
| 17 | Propostas > Geração backend > Salvar PDF no Storage | Erro de upload do PDF pode passar em silencio | O backend faz `await ...upload(...)`, mas Não inspeciona o retorno (`error`) antes de seguir para a resposta `200` com o PDF. | A rota deveria validar o resultado do upload e informar falha parcial quando o PDF Não for salvo. | `backend/server.js:158-164` |
| 18 | Backend > Conversão de PDF > Arquivos temporarios | Limpeza final pode deixar PDF temporario para tras | Se o LibreOffice gerar um PDF com nome alternativo encontrado via `fs.readdirSync`, o `finally` apaga só `docx` e `pdf` esperados, Não o arquivo real encontrado. | A limpeza deveria remover Também o PDF efetivamente utilizado no retorno. | `backend/server.js:87-95` |
| 19 | Backend > Respostas de erro | Servidor expõe mensagens internas cruas ao cliente | Tanto o error handler global quanto Várias respostas de rota devolvem `err.message` ou `error.message` diretamente ao frontend. | O cliente deveria receber mensagem generica, enquanto o detalhe Técnico ficaria apenas no log do servidor. | `backend/server.js:133`; `backend/server.js:151-152`; `backend/server.js:181-182` |

## Leitura Rapida

1. A Fase 6 abriu uma frente que quase Não tinha sido escrita até agora: acessibilidade, teclado, mobile e semântica estrutural da interface.
2. O segundo bloco novo apareceu no backend, com riscos de operação silenciosa: `health` superficial, upload sem Validação forte, erro interno vazando e salvamento de PDF sem confirmacao real.
3. O Padrão dominante desta fase foi: a aplicacao pode até "abrir", mas ainda Não esta pronta para uso robusto em teclado, leitor de tela, celular e operação segura de backend.
