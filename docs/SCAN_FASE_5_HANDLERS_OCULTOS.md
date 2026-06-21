# SCAN COMPLETO FASE 5 - HANDLERS OCULTOS INTEGRA SOLAR

Data do scan: 30/03/2026

Escopo desta fase:
- Quinta onda complementar, focada em handlers ocultos, Botões pequenos, ícones, `onclick` inline, modais reutilizados e Ações menores ainda Não mapeadas.
- Deduplicacao cruzada contra `SCAN FULL SITE INTEGRA SOLAR.md`, `SCAN_FASE_2.md`, `SCAN_FASE_3.md` e `SCAN_FASE_4.md`.
- Priorizacao de controles pequenos que parecem funcionar na UI, mas quebram o fluxo, escondem erro ou deixam sujeira de persistência.

Regra desta fase:
- Entrar apenas com achados novos.
- Não repetir erro já consolidado nas fases anteriores, mesmo quando a área for parecida.

## Tabela Consolidada

| # | Caminho no Site | Nome do Problema | Função Observada | Função Esperada | Linhas de apoio |
|---|---|---|---|---|---|
| 1 | Clientes > Lista > Ação Docs > Ver arquivo | Visualizador reutilizado esconde o Botão global de download | `showClienteDocs()` abre o modal de anexos e oculta `viewer-dl-btn`. Quando o Usuário clica em `Ver`, `viewFile()` atualiza `href` e `download`, mas Não torna o Botão visível de novo. O arquivo abre na previa, porem a Ação global de baixar continua escondida. | Ao abrir a previa de um anexo, o Botão global de download do visualizador deve reaparecer. | `frontend/index.html:3229-3233`; `frontend/index.html:3891-3899` |
| 2 | Qualquer Módulo com dropzone > Arquivo enviado > Botão `X` | Remocao da dropzone Não reconcilia anexo persistido | Depois do upload bem-sucedido, o fluxo pode salvar o arquivo na tabela `attachments`, mas o `X` da dropzone chama `removeFileFromList()`, que apenas remove da lista local e apaga o arquivo do storage. O registro persistido do anexo Não e removido nem confirmado. | O `X` da dropzone deve excluir UI, storage e registro de banco de forma sincronizada, ou agir apenas sobre arquivos ainda pendentes. | `frontend/index.html:3803-3826`; `frontend/index.html:3882-3888`; `frontend/index.html:3925-3945` |
| 3 | Qualquer lista de anexos persistidos > Botão `X` Remover | Exclusao de anexo confirma sucesso sem validar retorno real | `confirmDeleteAttachment()` sempre mostra `Anexo removido` depois de chamar `deleteAttachment()`. Dentro de `deleteAttachment()`, as respostas do Supabase Não sao inspecionadas; erros de delete podem passar sem bloquear o toast de sucesso. | O sistema deve confirmar a remocao só depois de validar exclusao no banco e no storage. | `frontend/index.html:3970-3982`; `frontend/index.html:4013-4017` |
| 4 | Configurações > Valores Padrão da proposta > Carregar/Salvar | Defaults podem vazar entre empresas por leitura global da primeira linha | `loadProposalDefaults()` e `saveProposalDefaults()` usam `proposal_defaults.limit(1).single()` sem filtrar a organização atual. Na pratica, a primeira linha global pode contaminar a leitura e a gravacao de defaults entre empresas diferentes. | Os valores Padrão precisam ser carregados e salvos por empresa atual, nunca por "primeira linha" global. | `frontend/index.html:5488-5499`; `frontend/index.html:5515-5547` |
| 5 | Empresas > Lista > Ação `Acessar empresa` | Nome da empresa sem escape pode quebrar o `onclick` do ícone | A tabela monta `onclick="loginComoEmpresa('${e.id}','${e.fantasy_name||e.corporate_name}')"` com o nome cru dentro de aspas simples. Empresas com apostrofo ou aspas no nome podem quebrar o handler ou corromper o HTML inline. | O nome precisa ser escapado corretamente ou o evento deve ser ligado sem interpolar texto cru em `onclick`. | `frontend/index.html:5008-5018` |
| 6 | Clientes > Lista > Ação Docs | Nome do cliente sem escape pode quebrar o `onclick` do Botão | O Botão `Docs` chama `showClienteDocs('${c.id}','${c.nome}')` com o nome do cliente cru dentro de aspas simples. Nomes com apostrofo ou aspas quebram o handler inline e impedem a abertura correta dos anexos. | O nome do cliente deve ser escapado ou transportado por dataset/listener, sem interpolacao crua em `onclick`. | `frontend/index.html:2762-2763` |
| 7 | Empresas > Lista > ícone olho > Ver detalhes | Modal de detalhes busca Configuração da empresa e descarta o resultado | `verEmpresa()` consulta `configuracoes_empresa` em `cfg`, mas o HTML do modal nunca usa esse objeto. O ícone "Ver detalhes" exibe apenas dados basicos da empresa e lista de Usuários, deixando a Configuração carregada sem qualquer efeito. | O modal deve mostrar a Configuração buscada, ou a consulta extra deve ser removida para o fluxo refletir o que realmente entrega. | `frontend/index.html:5104-5129` |

## Leitura Rapida

1. O bloco mais fragil desta rodada foi `anexos/modais reutilizados`: a UI abre, mas as Ações pequenas deixam estado inconsistente ou escondem controles.
2. O segundo Padrão dominante foi `onclick inline com texto cru`, que fica fragil para nomes reais com apostrofo/aspas.
3. O terceiro Padrão foi `persistencia parcial`: a interface remove ou confirma algo pequeno, mas storage e banco Não acompanham de forma transacional.

## Base Técnica Desta Fase

- `site-recuperado/frontend/index.html:2762-2763`
- `site-recuperado/frontend/index.html:3229-3233`
- `site-recuperado/frontend/index.html:3803-3826`
- `site-recuperado/frontend/index.html:3882-3899`
- `site-recuperado/frontend/index.html:3925-3945`
- `site-recuperado/frontend/index.html:3970-4017`
- `site-recuperado/frontend/index.html:5008-5018`
- `site-recuperado/frontend/index.html:5104-5129`
- `site-recuperado/frontend/index.html:5488-5547`
