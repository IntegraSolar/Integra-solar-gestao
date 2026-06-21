# PLANO MESTRE DE SCANS 100 - INTEGRA SOLAR

Data: 30/03/2026

## Objetivo real

Mapear o máximo Possível de problemas do sistema com método, rastreabilidade e cobertura controlada.

Importante:
- `100% absoluto` só existe se tivermos todos os arquivos, ambiente completo, banco real, templates reais e todos os perfis de Usuário.
- Com o material atual, o alvo correto e `100% de cobertura pratica do que foi entregue`.
- Tudo que Não puder ser comprovado por falta de arquivo, ambiente ou credencial deve ficar marcado como `nao validavel com o pacote atual`.

## Problema que o plano resolve

Hoje os scans acham coisa nova a cada rodada porque o sistema tem Várias camadas misturadas:
- interface demo
- estado local em memoria
- tentativa de persistência real
- backend parcial
- banco recuperado com contrato incompleto

Então o plano abaixo troca `scan solto` por `cobertura total por matriz`.

## Regra de ouro

Cada área do sistema deve ser validada em `7 lentes`, e só pode ser considerada fechada quando passar por todas elas:

1. `UI visivel`
2. `acao/click`
3. `persistencia`
4. `reload/reentrada`
5. `perfil/permissao`
6. `responsividade/acessibilidade`
7. `contrato tecnico` frontend x backend x banco

## Estrutura oficial dos Próximos scans

### Bloco A - Inventario total

Objetivo:
- listar tudo o que existe para testar

Saida esperada:
- menus
- submenus
- cards
- Botões principais
- ícones pequenos
- modais
- tabelas
- filtros
- exportacoes
- uploads
- Relatórios
- automacoes
- telas administrativas

Arquivo sugerido:
- `MATRIZ_DE_COBERTURA_TOTAL.md`

Colunas da matriz:
- `Area`
- `Caminho no Site`
- `Tipo de elemento`
- `Acao esperada`
- `Ja validado?`
- `Por qual fase`
- `Falta validar o que`
- `Status`

### Bloco B - Scan de superficie

Objetivo:
- garantir que nenhum elemento clicável ficou de fora

Cobertura:
- todos os Botões
- todos os links
- todos os ícones
- todos os cards clicáveis
- todos os atalhos do topo
- todos os itens da sidebar

Método:
- clicar
- observar retorno visual
- verificar se abriu modal, Página, dropdown ou nada

Saida:
- problemas de UX quebrada
- controles mortos
- rotas sem destino

### Bloco C - Scan de persistência

Objetivo:
- separar o que `parece salvar` do que `salva mesmo`

Para cada Ação:
- executar
- verificar no estado local
- verificar no banco
- recarregar a tela
- verificar se o efeito sobreviveu

Cobertura:
- CRM
- clientes
- propostas
- contratos
- financeiro
- compras
- obras
- entrega
- Pós-Obra
- Configurações

Saida:
- falso positivo de toast
- falso salvamento
- Ação local que some no reload

### Bloco D - Scan de fluxo fim a fim

Objetivo:
- validar cadeia operacional completa

Fluxos obrigatorios:
- `Lead > Proposta > Cliente > Contrato > Financeiro > Projeto > Compra > Entrega > Obra > Entrega da Obra > Pos-Obra`
- `Nova empresa > usuario > login > permissao`
- `Template > proposta > DOCX > PDF > storage`
- `notificacao > leitura > update`

Método:
- executar ponta a ponta
- validar pré-condição
- validar transicao
- validar desbloqueio
- validar relacao por ID

Saida:
- quebra de cadeia
- dependencia por texto
- etapa pulavel
- dado incoerente entre Módulos

### Bloco E - Scan de perfis e Permissão

Objetivo:
- provar o que cada perfil pode ou Não pode fazer

Perfis Mínimos:
- `adm supremo`
- `adm empresa`
- `comercial`
- `financeiro`
- `projetista`
- `instalacao`
- `pos-obra`

Para cada perfil:
- menu visível
- rota acessivel
- Botão habilitado
- Botão bloqueado
- API efetivamente protegida

Saida:
- Módulo escondido mas acessivel
- Permissão só visual
- Ação Crítica sem bloqueio real

### Bloco F - Scan Técnico de contrato

Objetivo:
- comparar tudo que a tela chama com o que o backend e o banco realmente suportam

Cobertura:
- tabelas
- views
- Funções RPC
- colunas
- enums
- storage paths
- payloads
- rotas backend

Saida:
- tabela ausente
- coluna divergente
- enum errado
- upload salvo sem metadado
- README prometendo recurso que Não existe

### Bloco G - Scan de resiliencia

Objetivo:
- descobrir o que quebra quando o ambiente Não esta perfeito

Testes:
- sem internet
- sem CDN
- sem Supabase
- sem Storage
- sem backend
- sem template
- sem PDF backend
- Sessão expirada
- Usuário sem organization

Saida:
- fail-open
- tela demo enganosa
- erro silencioso
- sistema preso em loading

### Bloco H - Scan de acessibilidade e responsividade

Objetivo:
- validar uso real em teclado, leitor de tela e tela pequena

Cobertura:
- foco
- tab order
- Enter/Espaco
- Escape
- labels
- tabs
- modais
- toast
- busca
- checklist
- mobile/tablet

Saida:
- mouse-only
- modal sem foco
- feedback invisivel para tecnologia assistiva
- layout quebrado em viewport pequena

### Bloco I - Scan de Segurança e exposicao

Objetivo:
- mapear risco operacional e vazamento

Cobertura:
- credenciais expostas
- API key em frontend
- query string insegura
- RLS permissivo
- multiempresa sem isolamento
- upload inseguro
- erro interno vazando para cliente

Saida:
- risco de vazamento
- privilegio indevido
- falso isolamento entre empresas

## Ordem ideal de execucao

1. `Matriz de cobertura total`
2. `Scan de superficie`
3. `Scan de persistencia`
4. `Scan fim a fim`
5. `Scan de permissao`
6. `Scan tecnico de contrato`
7. `Scan de resiliencia`
8. `Scan de acessibilidade/responsividade`
9. `Scan de seguranca`
10. `Deduplicacao final`
11. `Plano de correcao P1 P2 P3`

## Como evitar problema repetido

Cada novo problema só entra se trouxer ao menos um destes:
- `caminho novo`
- `causa nova`
- `risco novo`
- `evidencia nova`

Se for o mesmo defeito em outra tela:
- entra como novo somente se tiver impacto Próprio

Se for o mesmo defeito com nome diferente:
- Não entra de novo

## Regra de severidade

### P1

Quebra operação, vaza dado, libera Usuário indevido, perde dado ou engana o Usuário com falso sucesso crítico.

### P2

Quebra fluxo importante, gera retrabalho forte ou causa incoerencia relevante entre tela e banco.

### P3

UX ruim, texto errado, acessibilidade, responsividade, semântica ou defeito lateral sem bloquear operação principal.

## Evidencia Mínima por problema

Todo achado deve ter pelo menos:
- `Caminho no Site`
- `Nome do Problema`
- `Funcao Observada`
- `Funcao Esperada`
- `Evidencia tecnica`

Quando Possível, incluir:
- arquivo e linha
- print
- log de console
- efeito após reload

## Definicao de “área fechada”

Uma área só fecha quando:
- todos os controles foram inventariados
- todos os controles foram testados
- o comportamento foi comparado com persistência
- houve teste de reload
- houve Validação de Permissão
- houve leitura do contrato Técnico

## Definicao de “scan encerrado”

Um scan só encerra quando entregar:
- arquivo `.md`
- contagem de achados novos
- lista deduplicada
- o que ficou sem validar
- Próximo bloco recomendado

## Definicao pratica de 100%

Vamos considerar `100% mapeado` quando:
- todas as áreas da matriz estiverem em `validado` ou `nao validavel com pacote atual`
- Não existir elemento clicável sem status
- Não existir fluxo principal sem teste fim a fim
- Não existir Módulo sem leitura Técnica de contrato
- todo resto novo encontrado for apenas refinamento, Não nova classe de problema

## Minha recomendacao objetiva

Em vez de `SCAN 7`, `SCAN 8`, `SCAN 9` soltos, o melhor caminho agora e:

1. montar `MATRIZ_DE_COBERTURA_TOTAL.md`
2. marcar o que já foi coberto pelas Fases 1 a 6
3. abrir os Próximos scans só nas lacunas da matriz
4. depois fazer a deduplicacao final
5. por fim gerar `PLANO_DE_CORRECAO.md`

## Próxima Ação ideal

Criar agora:
- `MATRIZ_DE_COBERTURA_TOTAL.md`

Essa matriz vai ser a peca que faltava para parar de “achar surpresa” e passar a `fechar cobertura`.
