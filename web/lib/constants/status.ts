// Central status constants. Use these instead of inline string literals
// so that typos are caught at compile time and renaming is a single-file change.

export const InstallmentStatus = {
  PENDENTE: 'pendente',
  CONFIRMADA: 'confirmada',
} as const
export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus]

export const PurchaseStatus = {
  AGUARDANDO: 'aguardando',
  PENDENTE: 'pendente',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
} as const
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus]

export const ProjectStatus = {
  PENDENTE: 'pendente',
  ENVIADO: 'enviado',
  APROVADO: 'aprovado',
} as const
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export const DeliveryStatus = {
  PENDENTE: 'pendente',
  CONCLUIDA: 'concluida',
} as const
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus]

export const ObraStatus = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
} as const
export type ObraStatus = (typeof ObraStatus)[keyof typeof ObraStatus]

export const CommissionStatus = {
  PENDENTE: 'pendente',
  PAGA: 'paga',
} as const
export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus]

export const PosObraStatus = {
  PENDENTE: 'pendente',
  CONCLUIDA: 'concluida',
} as const
export type PosObraStatus = (typeof PosObraStatus)[keyof typeof PosObraStatus]

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const SUBSCRIPTION_BLOCKED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.EXPIRED,
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.OVERDUE,
  SubscriptionStatus.UNPAID,
]

export const PipelineStage = {
  CONTRATOS: 'contratos',
  FINANCEIRO: 'financeiro',
  PROJETOS: 'projetos',
  COMPRAS: 'compras',
  COMISSOES: 'comissoes',
  ENTREGA_MATERIAL: 'entrega_material',
  OBRA: 'obra',
  ENTREGA_OBRA: 'entrega_obra',
  POS_OBRA: 'pos_obra',
  CONCLUIDO: 'concluido',
} as const
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage]

export const ProposalStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus]
