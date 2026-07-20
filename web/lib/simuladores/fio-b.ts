// web/lib/simuladores/fio-b.ts
// Escalonamento do TUSD Fio B sobre a energia injetada (Lei 14.300/2022).
// Compartilhado entre os simuladores de viabilidade e híbrido/off-grid.
//
// A cobrança é escalonada por ANO-CALENDÁRIO, não por ano de projeto. Fixar a
// escala como [0,6; 0,75; 0,9; 1; …] equivale a assumir conexão em 2026 — o que
// fica silenciosamente errado a partir de 2027, superestimando a economia dos
// primeiros anos. Por isso a escala é derivada do ano de conexão.
//
// FORA DE ESCOPO: sistemas conectados antes de 2023 têm direito adquirido à
// compensação integral até 2045. Este simulador vende sistemas novos e não
// modela esse caso; a tela restringe o ano de conexão a 2023 ou posterior.

export const PERCENTUAIS_FIO_B_14300: Record<number, number> = {
  2023: 0.15,
  2024: 0.30,
  2025: 0.45,
  2026: 0.60,
  2027: 0.75,
  2028: 0.90,
}

export const PRIMEIRO_ANO_FIO_B = 2023
export const ANO_FIO_B_INTEGRAL = 2029

/** Fração do TUSD Fio B cobrada num dado ano-calendário. */
export function percentualFioB(ano: number): number {
  if (ano < PRIMEIRO_ANO_FIO_B) return 0
  if (ano >= ANO_FIO_B_INTEGRAL) return 1
  return PERCENTUAIS_FIO_B_14300[ano] ?? 1
}

/** Escala por ano de projeto (índice 0 = primeiro ano de operação). */
export function fioBSchedule(anoConexao: number, horizonteAnos: number): number[] {
  if (horizonteAnos <= 0) return []
  return Array.from({ length: horizonteAnos }, (_, i) => percentualFioB(anoConexao + i))
}
