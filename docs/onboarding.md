# Onboarding — Integra Solar Gestão

Guia de setup para novos desenvolvedores.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| Banco de dados | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Estilização | Tailwind CSS 3 |
| Deploy | Vercel |
| Rate limiting | Upstash Redis |
| Error tracking | Sentry |
| Testes | Vitest |

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- Acesso ao projeto Supabase (`bnmyvxwcmsrnxqmluchp`)
- Acesso ao repositório GitHub

---

## Setup local

```bash
# 1. Clone o repositório
git clone https://github.com/IntegraSolar/Integra-solar-gestao.git
cd Integra-solar-gestao/web

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha os valores conforme a seção abaixo

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em: `http://localhost:3000`

---

## Variáveis de ambiente

Crie o arquivo `web/.env.local` com as seguintes variáveis. Peça os valores ao líder técnico.

### Públicas (expostas ao browser)

```env
NEXT_PUBLIC_SUPABASE_URL=https://bnmyvxwcmsrnxqmluchp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=<DSN do Sentry — opcional em dev>
NEXT_PUBLIC_PDF_BACKEND_URL=<URL do backend de PDF — opcional em dev>
```

### Privadas (apenas servidor)

```env
SUPABASE_SERVICE_ROLE_KEY=<service role key do Supabase>
COOKIE_SECRET=<string aleatória de 32+ caracteres para assinar cookies>
ASAAS_WEBHOOK_SECRET=<secret do webhook Asaas>
PDF_BACKEND_API_KEY=<chave de autenticação do backend PDF>

# Rate limiting (opcional em dev — usa in-memory como fallback)
UPSTASH_REDIS_REST_URL=<URL do Upstash Redis>
UPSTASH_REDIS_REST_TOKEN=<token do Upstash Redis>
```

> Em desenvolvimento sem `COOKIE_SECRET` configurado, os cookies não são assinados (aceito). Em produção, essa variável é obrigatória.

---

## Scripts disponíveis

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Build de produção
npm run start      # Inicia servidor de produção (após build)
npm run lint       # Verifica lint (ESLint)
npm test           # Roda testes unitários (Vitest)
npm run test:watch # Testes em modo watch
```

---

## Estrutura de pastas

```
web/
├── app/
│   ├── (dashboard)/     # Páginas autenticadas do sistema
│   │   ├── clientes/    # Gestão de clientes
│   │   ├── leads/       # CRM e funil de vendas
│   │   ├── financeiro/  # Fluxo financeiro e parcelas
│   │   ├── contratos/   # Gestão de contratos
│   │   ├── projetos/    # Projetos de instalação
│   │   ├── compras/     # Pedidos de compra
│   │   ├── estoque/     # Inventário
│   │   ├── comissoes/   # Comissões de vendedores
│   │   ├── relatorios/  # Relatórios gerenciais
│   │   └── configuracoes/ # Config da organização (LGPD, audit, templates)
│   ├── api/             # Route handlers (Next.js API)
│   ├── auth/            # Callback de autenticação Supabase
│   └── page.tsx         # Página de login
├── components/
│   ├── ui/              # Componentes de UI reutilizáveis
│   └── crm/             # Componentes específicos de CRM
├── lib/                 # Lógica de negócio e acesso a dados
│   ├── supabase/        # Clients Supabase (server, client, admin)
│   ├── proposals/       # Geração de propostas (precificação, placeholders)
│   ├── format/          # Formatação de dados (moeda, CPF, data, etc.)
│   ├── auditoria/       # Log de auditoria
│   ├── lgpd/            # Conformidade LGPD (direito ao esquecimento)
│   ├── logger.ts        # Logger estruturado centralizado
│   └── rate-limit.ts    # Rate limiting (Upstash + fallback in-memory)
├── __tests__/           # Testes unitários (Vitest)
├── middleware.ts         # Auth, cookies HMAC, bloqueio por subscription
└── vitest.config.ts     # Configuração dos testes
```

---

## Autenticação

O sistema usa **Supabase Auth**. O fluxo é:

1. Usuário acessa `/` (login)
2. Supabase emite token de sessão via cookie
3. `middleware.ts` valida a sessão em toda rota protegida
4. Dados do usuário + organização são lidos via `getCurrentUserData()` em `lib/auth/`
5. Se a subscription estiver em status bloqueado, o usuário é redirecionado para a página de bloqueio

O cookie `sub_cache` armazena o ID da organização assinado com HMAC-SHA256 para evitar roundtrips ao banco em toda requisição.

---

## Multi-tenancy

Cada registro no banco pertence a uma organização via coluna `organization_id`. O isolamento é garantido por **RLS (Row-Level Security)** no Supabase — cada query retorna apenas dados da organização do usuário logado, mesmo que o código não filtre explicitamente.

---

## Fluxo de desenvolvimento

1. Crie uma branch a partir de `main`
2. Implemente a feature
3. Rode `npm test` para garantir que nenhum teste quebrou
4. Rode `npm run build` para garantir que o build passa
5. Abra PR para `main`
6. Após merge, a Vercel faz deploy automático

---

## Convenções

- **Server Components por padrão** — só use `'use client'` quando necessário (interatividade, hooks de estado)
- **Server Actions** para mutations (formulários, operações de escrita)
- **`Promise.all`** para buscar auth + dados em paralelo nas páginas
- **`loading.tsx`** para skeleton loaders em rotas que buscam dados lentos
- **`error.tsx`** para capturar erros de renderização no dashboard
- **`logger`** (não `console.log`) para logging em código de servidor
- **`mask()`** antes de logar qualquer ID de usuário
