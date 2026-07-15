# Dependências — Integra Solar (`web/`)

> Auditoria de supply chain / segurança revisada em **2026-07-15**.
> `npm audit`: **0 vulnerabilidades**. Node runtime alvo: 20+ (CI usa 20; local 24).

## Dependências críticas (produção)

| Biblioteca | Versão | Função no sistema | Criticidade |
|---|---|---|---|
| `next` | 16.2.10 | Framework (App Router, Server Actions, middleware) | 🔴 Crítica |
| `react` / `react-dom` | 19.2.7 | UI | 🔴 Crítica |
| `@supabase/supabase-js` / `@supabase/ssr` | 2.110.x / 0.12.x | Banco, Auth, RLS, Storage | 🔴 Crítica |
| `zod` | 4.4.x | Validação de entrada (todas as Server Actions) | 🔴 Crítica |
| `@upstash/ratelimit` / `@upstash/redis` | 2.0.x / 1.38.x | Rate limiting, anti-brute-force, concorrência | 🟠 Alta |
| `@sentry/nextjs` | 10.65.x | Observabilidade / captura de erros | 🟠 Alta |
| `stripe` / `@stripe/stripe-js` | 22.x / 9.x | Pagamentos (**Fase D — ainda não integrado**) | 🟡 Reservada |

## Dependências de segurança (acompanhamento contínuo)

- **Autenticação / autorização:** `@supabase/ssr`, `@supabase/supabase-js`, `next` (middleware).
- **Criptografia de sessão do backoffice:** Web Crypto API nativa (HS256) — sem lib externa.
- **Rate limit / anti-abuso:** `@upstash/ratelimit`, `@upstash/redis`.
- **Pagamentos (futuro):** `stripe`, `@stripe/stripe-js`.
- **Geração de documentos (entrada de dados de template):** `pizzip`, `jszip`, `jspdf`, `jspdf-autotable`.

## Dependências monitoradas (majors segurados — atualizar só com revisão manual)

| Biblioteca | Atual | Latest | Por que segurar |
|---|---|---|---|
| `typescript` | 5.9.3 | 7.0.2 | TS 7 é o novo compilador (Go); ecossistema/plugins ainda maturando |
| `tailwindcss` | 3.4.19 | 4.3.2 | v4 muda engine e config (breaking); migração dedicada |
| `@types/node` | 20.19.x | 26.1.x | Acompanhar a versão do Node de runtime, não a mais nova |
| `eslint` | 10.6.0 | 10.7.0 | Pinado para casar com `eslint-config-next` |

Esses majors estão listados no `ignore` do [`dependabot.yml`](../.github/dependabot.yml).

## Automação

- **Dependabot** (`.github/dependabot.yml`): PRs semanais, agrupados (patch/minor juntos; Supabase/Sentry/Stripe em grupos próprios); majors de `next/react/tailwind/eslint/typescript` exigem revisão manual.
- **CI gate** (`.github/workflows/security-audit.yml`): `npm audit --audit-level=high` + `tsc --noEmit` em push/PR na `main` e semanalmente. **Bloqueia deploy em High/Critical.**

## Notas de manutenção

- **Override de `postcss`:** o `next` empacota `postcss@8.4.31` (afetado por GHSA-qx2v-qp2m-jg93). Um override aninhado (`overrides.next.postcss = "$postcss"`) força a versão corrigida `8.5.19`. Impacto real era nulo (XSS de stringify de CSS, só em build sobre CSS confiável), mas mantém o `audit` limpo.
- **Build local:** o Turbopack falha quando o caminho do projeto contém acento (`Gestão`). Validação de build é feita no **Vercel** (caminho sem acento). Gate local = `tsc` + `vitest`.
