export const COST_CATEGORIES = [
  'Equipamentos',
  'Estrutura',
  'Cabos',
  'Conectores',
  'Proteções elétricas',
  'Frete',
  'Mão de obra',
  'Hospedagem',
  'Alimentação',
  'Combustível',
  'Locação de equipamentos',
  'Engenharia',
  'Documentação',
  'Taxas',
  'Comissão',
  'Outros',
] as const

export type CostCategory = (typeof COST_CATEGORIES)[number]

export type ProjectCost = {
  id: string
  client_id: string
  client_name: string
  description: string
  category: string
  amount: number
  cost_date: string
  notes: string | null
  created_at: string
}

export type UpsertCostData = {
  client_id: string
  description: string
  category: string
  amount: number
  cost_date: string
  notes?: string | null
}
