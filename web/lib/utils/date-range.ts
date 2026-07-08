// Helpers de intervalo de datas — tudo em timezone America/Sao_Paulo (UTC-3).
// O Supabase armazena timestamps em UTC. Se filtrarmos usando meia-noite UTC como
// limite, registros criados dia 31 às 22h BRT (= 01/mês+1 01h UTC) são excluídos
// por engano. Estas helpers calculam o intervalo levando o offset em conta.

const BRT_OFFSET_MINUTES = -180 // America/Sao_Paulo é UTC-3 (sem horário de verão)

function bumpToUtc(year: number, monthIndex: number, day: number, hour: number, minute: number, sec: number): Date {
  // Cria uma data que representa a hora local BRT convertida para UTC.
  // Ex: 01/07/2026 00:00 BRT = 01/07/2026 03:00 UTC
  const utc = Date.UTC(year, monthIndex, day, hour, minute, sec)
  return new Date(utc - BRT_OFFSET_MINUTES * 60 * 1000)
}

/**
 * Retorna início e fim de um mês em BRT, convertidos para ISO string UTC.
 * Uso: `.gte('col', startISO).lte('col', endISO)`
 */
export function getMonthRangeBRT(month: number, year: number): { startISO: string; endISO: string } {
  const start = bumpToUtc(year, month - 1, 1, 0, 0, 0)
  const end = bumpToUtc(year, month - 1, getLastDay(month, year), 23, 59, 59)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

/**
 * Retorna start/end como YYYY-MM-DD para colunas de tipo DATE (sem hora).
 * Uso: `.gte('due_date', startDate).lte('due_date', endDate)`
 */
export function getMonthDateRange(month: number, year: number): { startDate: string; endDate: string } {
  const mm = String(month).padStart(2, '0')
  const startDate = `${year}-${mm}-01`
  const endDate = `${year}-${mm}-${String(getLastDay(month, year)).padStart(2, '0')}`
  return { startDate, endDate }
}

function getLastDay(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}
