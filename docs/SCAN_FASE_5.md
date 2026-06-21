# SCAN COMPLETO FASE 5 INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Quinta onda de varredura com profundidade máxima em cadeia operacional, Sessão, multiempresa, bootstrap, Permissão, templates, Segurança de UI e contrato real com o banco.
- Cruzamento entre Navegação visual, console do navegador, Código do frontend e schema SQL recuperado.
- Entrada apenas em causas novas ou em raiz Técnica nova que ainda Não estava claramente escrita nas fases anteriores.

Regra desta fase:
- Não repetir sintomas antigos sem causa nova.
- Priorizar problemas que explicam por que a tela parece pronta, mas o fluxo Não fecha de verdade.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada |
|---|---|---|---|---|
| 1 | Carregamento inicial > Cadeia operacional inteira após sync com banco | Rehidratacao do banco religa Módulos operacionais por Padrão | No mapeamento vindo do banco, projetos, compras, entregas e obras entram com `liberado: true`, e o financeiro só fica bloqueado se estiver `Cancelado`. Isso reabre a cadeia mesmo sem recompor a ordem operacional real. | O carregamento deveria reconstruir o gating verdadeiro de cada etapa, Não marcar tudo como liberado por default. |
| 2 | Contratos > Aprovar contrato | Liberacao do fluxo usa casamento por nome em vez de chave real | `updCont()` libera cliente, projetos, compras e financeiro comparando texto (`c.nome`, `cliente`, `proj`, `nome`). Se o fluxo vier por IDs ou formatos diferentes, a cadeia quebra ou libera item errado. | A Aprovação deveria propagar desbloqueios usando chaves estaveis e consistentes. |
| 3 | Contratos > Aprovar contrato > Geração do Financeiro | Aprovação fabrica parcela unica com vencimento imediato | Se o contrato for aprovado e Não existir entrada financeira, o sistema cria uma cobranca unica com valor total e vencimento em `today()`, ignorando forma de pagamento, parcelas e prazos cadastrados. | A Aprovação deveria respeitar o plano financeiro real do contrato antes de criar cobrancas. |
| 4 | Projetos > Alterar status | Dropdown permite salto de etapa sem regra de transicao | O seletor de projetos aceita ir direto entre estados operacionais sem validar ordem, prazo, vistoria previa ou dependencia anterior. | O fluxo de projetos deveria validar transicoes permitidas e bloquear saltos indevidos. |
| 5 | Entrega da Obra > Alterar status | Sistema pode ser ligado sem vistoria aprovada | O dropdown de Entrega da Obra aceita `sistema-ligado`, e `updEObrSt()` marca isso localmente sem validar vistoria aprovada nem registro real de Conclusão da obra. | O sistema só deveria permitir `sistema-ligado` quando a vistoria e a Conclusão real estiverem validadas. |
| 6 | Compras > Concluir > Entrega de Material | Desbloqueio da entrega depende de texto livre | `concComp()` libera entregas com `if(e.cli===c.proj)`, ou seja, depende de coincidencia textual entre cliente/projeto, Não de relacao por ID. | A Conclusão da compra deveria desbloquear a entrega pelo registro vinculado, usando chave real. |
| 7 | Compras > Concluir > Entrega de Material | Se a entrega Não existir, a cadeia trava | Ao concluir compra, o sistema apenas percorre `S.entregas` existente; se Não houver uma linha previamente criada para aquele cliente/projeto, a etapa seguinte Não nasce nem e vinculada. | Concluir compra deveria criar ou vincular a entrega necessaria para continuar o fluxo. |
| 8 | Entrega de Material > Confirmar > Obras | Desbloqueio da obra depende de texto livre e de linha preexistente | `confEnt()` só libera obra quando encontra `o.cli===e.cli`; se a obra Não existir ou o texto divergir, a cadeia para ali. | Confirmar entrega deveria usar relacao formal entre entrega e obra, com Criação ou Vínculo garantido da etapa seguinte. |
| 9 | Login > Credenciais locais de emergência | Login local abre o app antes da Autenticação real | O login local libera a interface e chama `init()` imediatamente; depois tenta autenticar no Supabase em background e, se der certo, só atualiza `S.currentUser.id`. Isso mistura Sessão local e Sessão de nuvem. | O sistema deveria abrir em modo local isolado ou esperar a Autenticação real completa antes de entrar no app. |
| 10 | Login > Pos-login > Identidade da empresa | Usuário sem empresa cai na primeira organization do banco | Se `organization_id` vier vazio, `onAuthSuccess()` faz `.limit(1).single()` em `organizations` e usa a primeira empresa encontrada. | O login deveria bloquear, exigir vinculacao explicita ou pedir escolha da empresa correta. |
| 11 | Sessão > Sair | Logout pode falhar antes de limpar a tela | `doLogout()` comeca com `await supabase.auth.signOut()` sem `try/catch`. Se essa chamada falhar, o Código abaixo pode Não rodar e a interface Não e resetada. | O logout deveria limpar estado local e UI mesmo quando o sign out remoto falhar. |
| 12 | Login/Sessão > Carregamento de Permissões | Frontend depende de estrutura legada de Permissão | `carregarPermissoes()` consulta `nivel_permissoes` por `nivel`, enquanto o schema recuperado trabalha com `roles`, `permissions` e `role_permissions`. | O carregamento de Permissões deve usar o RBAC real do schema ou ter um adaptador compativel. |
| 13 | Login > Pos-login > Dados da empresa | Frontend usa colunas de organization ausentes no schema | O login tenta ler `plano`, `ativo` e `max_usuarios` em `organizations`, mas esses campos Não aparecem no SQL recuperado. | O Módulo de empresa deve usar colunas reais do schema ou o schema precisa receber esses campos antes do fluxo funcionar. |
| 14 | Configurações > Valores Padrão / custos / prazos | Defaults empresariais apontam para tabela que Não veio no pacote | A prioridade do carregamento e `configuracoes_empresa`, mas o schema recuperado traz `organization_settings`, Não essa tabela legada. | Os valores Padrão deveriam ser lidos e gravados na estrutura real do banco recuperado. |
| 15 | Configurações > Valores Padrão / Prazos | Fallback de defaults depende de `proposal_defaults`, tabela ausente | `loadProposalDefaults()`, `saveProposalDefaults()` e `savePrazos()` continuam usando `proposal_defaults`, que Não existe no SQL recuperado. | Defaults e prazos devem ser persistidos em uma estrutura real do schema recuperado. |
| 16 | Dashboard > KPIs reais | Dashboard tenta ler view inexistente | `carregarDashboardDoBackend()` consulta `vw_dashboard`, mas essa view Não aparece no schema enviado. Assim, os KPIs reais nunca substituem de forma confiavel a camada demo. | O dashboard deve ler consultas ou views que existam de fato no banco recuperado. |
| 17 | Empresas > Lista > Ativar/Desativar | Ação administrativa da falso positivo de sucesso | `toggleEmpresaAtiva()` faz `update`, mas logo em seguida mostra sucesso e rerenderiza sem validar erro, retorno ou linha afetada. | O Botão deveria confirmar persistência real antes de anunciar ativacao ou desativacao. |
| 18 | Empresas > Acessar empresa | "Logar como empresa" e apenas troca local de contexto | `loginComoEmpresa()` só altera `currentOrgId/currentOrg`, preserva o super admin em memoria e chama `init()` de novo. Não existe impersonacao real nem troca de Autorização. | O fluxo deveria fazer impersonacao verdadeira, ou assumir explicitamente que e apenas Visualização local controlada. |
| 19 | Topo > Busca global | Busca global monta HTML e Ação inline com dados crus | `globalSearch()` injeta `nome`, `cidade` e `tel` dentro de `innerHTML` e `onclick` sem escape. Um dado com aspas ou markup pode quebrar a interface ou executar comportamento inesperado. | Os resultados da busca deveriam ser montados com `textContent`, `dataset` e eventos seguros. |
| 20 | Sistema inteiro > Toasts e mensagens | Sistema aceita HTML bruto em mensagens de toast | `toast()` usa `innerHTML`, e o Próprio app passa HTML com Botão embutido em mensagens como a de impersonacao. | Toasts deveriam escapar Conteúdo por Padrão e usar Ações estruturadas, Não HTML solto. |
| 21 | Inicializacao > Abertura do app | App desenha interface demo antes de carregar a Sessão real | `init()` renderiza CRM, clientes, propostas, contratos, financeiro e outros Módulos com dados locais antes de terminar a carga do banco. Isso gera uma tela inicial enganosa e contraditoria. | O app deveria abrir em loading/skeleton ou em modo demo explicito até a carga real terminar. |
| 22 | Inicializacao > Bootstrap do banco | Falha no pre-load pode deixar o app preso no modo demo | O `Promise.all([...]).then(()=>{ loadAllFromDB(); setupRealtime(); })` Não tem `catch/finally`. Se a chamada inicial falhar, a carga real e o realtime podem Não acontecer, sem um erro de negocio claro na tela. | O bootstrap deveria fechar com tratamento de erro e fallback deterministico, sem deixar a interface em estado silenciosamente incompleto. |
| 23 | Dashboard/Relatorios > Gráficos | Reentrada no app recria Chart sem destruir Instância anterior | `initCharts()` Instância novos Gráficos em toda nova chamada de `init()` e Não faz `destroy()` dos objetos anteriores. Isso pode empilhar instancias, memoria e render duplicado. | Os Gráficos deveriam ser reutilizados ou destruidos antes de cada recriacao. |
| 24 | Sessão > Realtime / reinit | Realtime cria canal novo a cada reinicializacao | `setupRealtime()` sempre abre o canal `integra-solar-changes` e se inscreve de novo, sem remover inscricoes antigas quando o app reinicia ou troca de empresa. | O app deveria manter um unico canal por Sessão ou desmontar o anterior antes de reabrir outro. |
| 25 | Configurações > Templates > Grid de placeholders | Copiar placeholder da confirmacao falsa de sucesso | O clique do placeholder usa `navigator.clipboard?.writeText(...)`, mas já mostra `toast('Copiado...')` sem verificar se a API existia, se houve Permissão ou se a copia realmente funcionou. | O sistema só deveria confirmar a copia depois do sucesso real, com erro claro quando o clipboard falhar. |

## Leitura Rapida

1. A Fase 5 mostrou que a raiz mais pesada agora Não esta só em Botões isolados: esta em Sessão, contrato com o banco, bootstrap e cadeia operacional.
2. O sistema mistura tres mundos ao mesmo tempo: dados demo, estado local e tentativa de persistência real. Isso explica por que alguns fluxos parecem funcionar por alguns segundos e depois se contradizem.
3. Os blocos mais perigosos desta fase foram `login/sessao`, `multiempresa`, `permissoes`, `defaults/configuracoes`, `dashboard real`, `gating operacional` e `seguranca de UI`.

## Base Técnica Desta Fase

- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:1821-1950`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2150-2290`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2318-2332`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2435-2451`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2459-2477`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2829-2855`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:2936-3057`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:4130-4174`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:5133-5152`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:5176-5562`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\frontend\index.html:5777-5795`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\database\supabase-schema.sql:66-81`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\database\supabase-schema.sql:110-131`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\site-recuperado\database\supabase-schema.sql:509-629`
- `C:\Users\RodriguesFrandolosoR\Downloads\F\CRM - IAGO\.playwright-cli\console-2026-03-30T18-17-56-052Z.log`
