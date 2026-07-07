// Tipos compartilhados entre painel cliente e backoffice

export type ActionResult = {
  error?: string
  success?: string
}

export type PaginationParams = {
  page: number
  pageSize: number
}

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
