// web/lib/crm/acesso.ts
import type { ModulePermission } from '@/lib/org/queries'

const ADMIN_ROLES = ['owner', 'admin']

/**
 * Quem enxerga o funil inteiro da empresa.
 *
 * Proprietário e administrador sempre veem tudo. Os demais papéis dependem da
 * coluna "Ver todos" do módulo Leads, configurável em Configurações → Acesso
 * (o preset de gerente já vem com ela ligada; o de vendedor, desligada).
 */
export function podeVerTodosOsLeads(
  role: string,
  permissions: Record<string, ModulePermission | undefined>
): boolean {
  if (ADMIN_ROLES.includes(role)) return true
  return permissions?.leads?.view_all === true
}

/**
 * Um vendedor só alcança o lead do qual é responsável ou que ele mesmo criou.
 * Lead sem responsável fica restrito a quem vê todos — é da empresa, não de um vendedor.
 */
export function podeAcessarLead(
  lead: { assigned_to_user_id: string | null; created_by: string | null },
  userId: string,
  verTodos: boolean
): boolean {
  if (verTodos) return true
  if (lead.assigned_to_user_id && lead.assigned_to_user_id === userId) return true
  if (lead.created_by && lead.created_by === userId) return true
  return false
}

/** Filtro PostgREST equivalente a podeAcessarLead, para aplicar direto na query. */
export function filtroLeadsDoUsuario(userId: string): string {
  return `assigned_to_user_id.eq.${userId},created_by.eq.${userId}`
}
