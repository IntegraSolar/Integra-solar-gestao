# Referência de API — Integra Solar Gestão

Documentação das rotas de API internas e da arquitetura de acesso a dados.

> Todas as rotas requerem autenticação via cookie de sessão Supabase.
> Requisições sem sessão válida recebem `401 Unauthorized`.

---

## Rotas de API

### Clientes

#### `GET /api/clients/[id]/full-data`

Retorna todos os dados de um cliente para exportação ou visualização completa.

**Parâmetros de rota**
- `id` — UUID do cliente

**Resposta `200`**
```json
{
  "client": { ... },
  "contracts": [ ... ],
  "projects": [ ... ],
  "financials": [ ... ]
}
```

---

### Leads

#### `GET /api/leads`

Lista todos os leads da organização.

**Resposta `200`**
```json
{ "leads": [ { "id": "...", "name": "...", "status": "..." } ] }
```

#### `GET /api/leads/[id]/followups`

Retorna os follow-ups de um lead.

#### `GET /api/leads/[id]/notes`

Retorna as anotações de um lead.

#### `GET /api/leads/[id]/proposals`

Retorna as propostas vinculadas a um lead.

---

### Propostas

#### `POST /api/proposals/[id]/generate`

Gera o documento Word da proposta com base no template e dados do lead.

**Parâmetros de rota**
- `id` — UUID da proposta

**Resposta `200`** — arquivo `.docx` (download direto)

**Erros**
- `404` — proposta ou template não encontrado
- `422` — template com placeholders inválidos

---

### Templates

#### `GET /api/templates/[id]/download`

Retorna uma URL assinada para download do template Word no Supabase Storage.

#### `GET /api/templates/[id]/diagnose`

Analisa o template e lista todos os placeholders encontrados no documento.

---

### Storage

#### `GET /api/storage/download`

Gera URL assinada para download de qualquer arquivo privado do Storage.

**Query params**
- `bucket` — nome do bucket (`client-files`, `proposals`)
- `path` — caminho do arquivo dentro do bucket

---

### Notificações

#### `GET /api/notifications/followups`

Retorna follow-ups pendentes do usuário logado para exibir notificações no dashboard.

---

### Webhooks

#### `POST /api/webhooks/asaas`

Recebe eventos do gateway de pagamento Asaas (cobrança, cancelamento, ativação de plano).

**Segurança**: valida assinatura HMAC-SHA256 via header `asaas-access-token` contra `ASAAS_WEBHOOK_SECRET`. Requisições sem assinatura válida retornam `401`.

**Eventos tratados**
- `PAYMENT_CONFIRMED` — ativa subscription
- `PAYMENT_OVERDUE` — marca subscription como inadimplente
- `SUBSCRIPTION_DELETED` — cancela acesso

---

## Arquitetura de acesso a dados

### Padrão de queries

Cada domínio tem uma pasta em `lib/<domínio>/` com dois arquivos:

- `queries.ts` — leitura de dados (SELECT), sempre com o cliente Supabase de servidor
- `actions.ts` — escrita de dados (INSERT/UPDATE/DELETE), implementados como Server Actions Next.js

Exemplo:
```
lib/clients/
  queries.ts   → getClients(), getClientById()
  actions.ts   → createClient(), updateClient(), deleteClient()
```

### Cliente Supabase

Há três clients disponíveis em `lib/supabase/`:

| Client | Uso | RLS |
|---|---|---|
| `createClient()` (server) | Server Components, Server Actions | Ativo — acessa dados do usuário logado |
| `createBrowserClient()` | Componentes client-side | Ativo |
| `createAdminClient()` | Webhooks, operações privilegiadas | Bypass RLS — usar com cuidado |

### Multi-tenancy e RLS

Todas as tabelas têm `organization_id`. As políticas RLS no Supabase garantem que:
- Usuários só leem/escrevem dados da própria organização
- Nenhuma query de aplicação precisa filtrar por `organization_id` manualmente
- O isolamento é garantido no banco, não apenas no código

---

## Segurança

### Rate limiting

Rotas sensíveis usam `rateLimit()` de `lib/rate-limit.ts`:

```typescript
const allowed = await rateLimit(`login:${ip}`, 10, 60_000) // 10 req/min
if (!allowed) return rateLimitResponse() // 429
```

Em produção usa Upstash Redis (distribuído). Em desenvolvimento usa Map in-memory como fallback.

### Cookies assinados

O middleware assina o cookie `sub_cache` com HMAC-SHA256 usando `COOKIE_SECRET`. Cookies adulterados são rejeitados e o usuário refaz lookup no banco.

### Auditoria

Ações críticas são registradas via `logAction()` em `lib/auditoria/actions.ts`. Os logs ficam na tabela `audit_logs` do Supabase com RLS — cada organização acessa apenas seus próprios logs.

Ações auditadas: criação/edição/exclusão de clientes, leads, contratos, propostas e operações LGPD.

### LGPD

O painel em **Configurações → LGPD** permite anonimizar dados de leads e clientes mediante solicitação de titular. A anonimização:
- Substitui nome, telefone, e-mail, CPF por `[removido]`
- Mantém dados financeiros (LGPD Art. 16 — obrigação legal)
- Registra a operação no audit log

---

## Logger

Use `logger` (de `lib/logger.ts`) em todo código de servidor. Nunca use `console.log` diretamente.

```typescript
import { logger, mask } from '@/lib/logger'

// Informação
logger.info('clientes', 'Cliente criado', { clientId: mask(id) })

// Aviso
logger.warn('auth', 'Tentativa de acesso sem sessão')

// Erro
logger.error('proposals', 'Falha ao gerar proposta', error, { proposalId: mask(id) })
```

**Regras:**
- Sempre use `mask(id)` antes de logar qualquer ID de usuário ou dado sensível
- Nunca logue senhas, tokens, CPF, telefone, e-mail ou dados bancários
- Em produção o logger emite JSON (ingestível por Vercel Logs/Datadog)
- Em desenvolvimento emite texto legível com nível e escopo

---

## Testes

Os testes ficam em `web/__tests__/`. Para rodar:

```bash
npm test           # Roda uma vez (ideal para CI)
npm run test:watch # Modo interativo para desenvolvimento
```

### Cobertura atual

| Arquivo de teste | Funções testadas |
|---|---|
| `format.test.ts` | `formatCurrency`, `formatPhone`, `formatCPF`, `formatCNPJ`, `formatCEP`, `formatDate`, `cleanDigits`, `cleanCurrency`, `toISODate`, `validate*` |
| `pricing.test.ts` | `calcularPreco` — divisor, custos individuais, edge cases |
| `logger.test.ts` | `mask`, `logger.info/warn/error` |
| `rate-limit.test.ts` | `rateLimit` (in-memory), `rateLimitResponse` |

Adicione testes para toda função pura nova em `lib/`.
