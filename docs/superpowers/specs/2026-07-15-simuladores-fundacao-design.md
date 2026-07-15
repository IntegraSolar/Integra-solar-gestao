# Simuladores — Fundação (Sub-projeto 1)

**Data:** 2026-07-15
**Branch:** `feat/simuladores` (isolada; nada vai para produção até o merge na `main`)
**Status:** desenho aprovado no brainstorm; pronto para virar plano de implementação.

## Contexto e objetivo

Criar um novo **setor "Simuladores"** na plataforma Integra Solar — um espaço à parte do
pipeline (não faz parte da evolução do cliente/projeto) que hospedará ferramentas de
simulação. Este documento cobre **apenas a fundação**: a estrutura compartilhada que os
simuladores vão reaproveitar. **Nenhum simulador funcional** é construído aqui — cada um
será desenhado e implementado no seu próprio ciclo (spec → plano → implementação).

### Fluxo de trabalho (isolamento de produção)
- Todo o desenvolvimento acontece na branch **`feat/simuladores`**. A `main` (produção,
  `integrasolar.app.br`) permanece intocada.
- A cada push da branch, o **Vercel gera um Preview Deployment** com URL própria — é onde
  o funcionamento é visualizado e testado (o build local falha pelo acento em `Gestão`).
- Só após aprovação a branch é mesclada na `main` → produção.

## Escopo

### Dentro (fundação)
1. **Item de menu "Simuladores"** com selo PRO (posição A: entre o grupo de pipeline e "OUTROS").
2. **Gating por empresa** via booleano `simuladores_habilitado`, com toggle no backoffice.
3. **Rota/tela-hub `/simuladores`** — grade compacta (Estilo 1) com os 6 simuladores em estado
   "em breve", seguindo o design system da plataforma.
4. **Tela de bloqueio/upsell** para empresas sem o recurso habilitado.
5. **Componente de cabeçalho compartilhado** para os simuladores: Título da simulação,
   Nome do cliente, Descrição (todos manuais).

### Fora (deste sub-projeto — decidido explicitamente)
- **Puxar dados de cliente/proposta** — removido deste momento. Todos os dados dos
  simuladores serão manuais ou definidos dentro do próprio simulador.
- **Salvar simulação** (tabela genérica) e **exportar PDF** — só serão definidos/construídos
  junto com o primeiro simulador que precisar deles (escopo "A" aprovado).
- **Qualquer cálculo/simulador funcional** — cada um é um sub-projeto futuro.

## Arquitetura

### 3.1 Navegação (`web/components/layout/Sidebar.tsx`)
- Novo `NavItem` "Simuladores" (`href: /simuladores`, ícone tipo `Calculator`/`SlidersHorizontal`).
- Renderizado **entre** `PIPELINE_ITEMS` e o separador "OUTROS", com um selo **PRO** ao lado do label.
- **Sempre visível** para todos os usuários (SEM `moduleKey` de permissão) — decisão do usuário:
  "aparecer para todos, utilizável só por quem tem o recurso". O controle é o toggle da empresa,
  aplicado no acesso à rota, não na visibilidade do menu.
- Gating fino por role (esconder de certos perfis dentro da org) fica como opção futura, se surgir a necessidade.

### 3.2 Gating (habilitação por empresa)
- **Migration aditiva:** coluna `simuladores_habilitado boolean not null default false` em
  `organizations` (tabela já lida no `getCurrentUserData`; expor no tipo `organization`).
- **Backoffice:** toggle na tela da empresa (`/backoffice/empresas/[id]`) para ligar/desligar,
  numa Server Action guardada por `requireBackofficeSession()` (padrão já estabelecido no Pass 2),
  com registro em auditoria.
- **Gate de acesso (server-side):** a página `/simuladores` (e futuras subrotas) verifica
  `organization.simuladores_habilitado`. Se falso → renderiza a **tela de bloqueio/upsell**
  (não redireciona, pois o item deve "aparecer para todos"). Se true → renderiza o hub.
- Helper reutilizável, ex. `requireSimuladoresEnabled()` em `web/lib/simuladores/access.ts`,
  para as subrotas futuras reaproveitarem.

### 3.3 Tela-hub (`web/app/(dashboard)/simuladores/page.tsx`)
- Server Component; `export const metadata = { title: 'Simuladores' }` (padrão U1).
- Lista de simuladores definida em um registro central
  (`web/lib/simuladores/registry.ts`): `{ slug, titulo, descricao, icone, status: 'disponivel' | 'em_breve' }`.
- Renderiza a **grade compacta (Estilo 1)**: cards com ícone + título + linha curta + selo de estado.
- Cards "em breve" são visuais e não navegáveis; cards "disponível" (futuros) linkam para `/simuladores/<slug>`.
- Estilo via componentes/tokens existentes do dashboard (não introduzir design novo).

### 3.4 Cabeçalho compartilhado (`web/components/simuladores/SimuladorHeader.tsx`)
- Componente reutilizável recebido por qualquer simulador futuro.
- Campos manuais controlados: **Título da simulação**, **Nome do cliente**, **Descrição**.
- Expõe os valores para o simulador-pai (via props/estado) — não persiste nada nesta fase.
- Validação leve (título obrigatório; cliente e descrição opcionais) — a decidir por simulador.

### 3.5 Tela de bloqueio/upsell (`web/components/simuladores/SimuladoresLocked.tsx`)
- Estado mostrado quando `simuladores_habilitado = false`.
- Mensagem de upsell + CTA "Fale com a Integra Solar" (sem checkout self-serve — habilitação
  é manual pelo backoffice). Segue o design system.

## Dados

- **Nenhuma tabela nova** nesta fase.
- **Uma coluna nova:** `organizations.simuladores_habilitado` (migration aditiva, reversível,
  sem impacto no schema existente; RLS inalterada).

## Segurança
- Gate de acesso **no servidor** (não confiar em esconder o menu).
- Toggle do backoffice protegido por `requireBackofficeSession()` + auditoria.
- Multi-tenant: o flag é por `organization`; leitura já passa pela RLS/`getCurrentUserData`.

## Testes
- Unit: `registry.ts` (formato/estado dos itens), helper `requireSimuladoresEnabled` (true/false).
- Guard do backoffice: toggle exige sessão de admin (padrão dos testes existentes).
- Verificação visual: hub e tela de bloqueio no **Preview do Vercel** (grade Estilo 1, tema da plataforma).

## Roadmap de decomposição (fora desta fundação)
Cada simulador vira seu próprio spec, plugando em hub + cabeçalho (e, quando necessário,
Salvar + PDF, definidos no primeiro que precisar):
1. Viabilidade de usina de investimento
2. Sistemas híbridos e off-grid (dimensionamento + autonomia de baterias)
3. Conta de energia após instalação (Lei 14.300 + payback)
4. Parcelamento via cartão de crédito
5. Financiamento
6. Comparativo com proposta concorrente

Estrutura reaproveitada entre simuladores será definida caso a caso, no momento em que surgir.

## Decisões registradas (do brainstorm)
- Posição do menu: **A** (destaque entre pipeline e OUTROS, selo PRO).
- Identificação enterprise: **B** (toggle `simuladores_habilitado` por empresa, independe do plano).
- Persistência: **C** (híbrido — descartável por padrão, com "Salvar") — porém o mecanismo
  de salvar só entra junto com o primeiro simulador.
- Estilo do hub: **Estilo 1** (grade compacta), seguindo o design da plataforma.
- Layout do simulador: **A** (duas colunas entrada|resultado) — molde a aplicar por simulador.
- Puxar dados de cliente/proposta: **removido** desta fase.
- Fronteira da fundação: **A** (só nav + gating + hub + cabeçalho agora).
