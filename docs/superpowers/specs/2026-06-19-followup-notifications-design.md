# Follow-up Notifications — Design Spec

**Data:** 2026-06-19
**Status:** Aprovado

## Objetivo

Adicionar um sistema de notificações visuais para follow-ups agendados no CRM. O usuário vê um sininho no topo do sidebar com badge indicando pendências, e ao clicar abre um drawer lateral com todos os follow-ups organizados por urgência.

## Componentes

### 1. NotificationBell (sininho)

- **Localização:** Topo do sidebar, ao lado do logo
- **Badge:** Círculo vermelho com número de follow-ups atrasados + vencendo hoje
- **Badge oculto** quando contagem = 0
- **Ao clicar:** abre/fecha o NotificationsDrawer

### 2. NotificationsDrawer (painel lateral)

- **Estilo:** Painel lateral direito, glassmorphism navy `#0f1424`, borda `white/10`
- **Largura:** ~380px, overlay com backdrop escuro
- **3 seções por urgência:**
  - **Atrasados** — `due_date < now()`, indicador vermelho `#EF4444`
  - **Hoje** — `due_date` entre início e fim do dia, indicador dourado `#FFD080`
  - **Próximos 7 dias** — `due_date` entre amanhã e +7 dias, indicador branco/neutro
- **Cada item mostra:**
  - Título do follow-up
  - Nome do lead (clicável — abre o LeadDrawer)
  - Data/hora formatada com `formatDate` do FormatService
  - Descrição (se existir), truncada em 1 linha
- **Ações por item:**
  - Clicar no nome do lead → abre LeadDrawer
  - Botão check → marca como concluído (`toggleFollowUp`)
- **Estado vazio:** "Nenhum follow-up pendente 🎉" (seção oculta se vazia)

### 3. useFollowUpNotifications (hook)

- Polling a cada 5 minutos (300.000ms) via `setInterval`
- Chama `GET /api/notifications/followups`
- Retorna: `{ followups, count, isLoading }`
- `count` = atrasados + hoje (para o badge)
- Re-fetch automático ao montar + a cada 5 min

### 4. API Route: GET /api/notifications/followups

- **Path:** `web/app/api/notifications/followups/route.ts`
- **Query:** `lead_follow_ups` WHERE:
  - `organization_id` = org do usuário
  - `completed_at IS NULL`
  - `due_date <= now() + 7 days`
- **Join:** `leads(id, name)` para nome do lead
- **Retorno:** `{ followups: Array<{ id, title, description, due_date, lead_id, lead_name }> }`
- **Ordenação:** `due_date ASC` (mais urgente primeiro)

## Integração no Layout

- O hook `useFollowUpNotifications` roda no `DashboardLayout` (layout principal)
- `NotificationBell` recebe `count` e `onClick` do layout
- `NotificationsDrawer` recebe `followups`, `isOpen`, `onClose` do layout
- Não interfere com o LeadDrawer existente (são drawers independentes)

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `web/app/api/notifications/followups/route.ts` | Criar — API route |
| `web/hooks/useFollowUpNotifications.ts` | Criar — hook de polling |
| `web/components/notifications/NotificationBell.tsx` | Criar — sininho + badge |
| `web/components/notifications/NotificationsDrawer.tsx` | Criar — drawer lateral |
| `web/components/layout/Sidebar.tsx` (ou equivalente) | Modificar — adicionar NotificationBell |
| `web/app/(dashboard)/layout.tsx` | Modificar — montar hook + drawer |

## Sem dependências novas

Usa apenas o que já existe: Supabase queries, FormatService, toggleFollowUp action, glassmorphism theme.
