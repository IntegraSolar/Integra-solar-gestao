// web/lib/simuladores/viabilidade/pct.ts
// Conversão entre fração (como o motor e o estado guardam: 0,08) e porcentagem
// (como a tela mostra e recebe: 8). Isolado e puro porque erra aqui = número
// errado indo para o cálculo de viabilidade.

/**
 * Fração → porcentagem, para exibir no input.
 *
 * `toPrecision(10)` remove o ruído de ponto flutuante (0,08 × 100 daria
 * 8,000000000000002) sem arredondar a ponto de alterar um valor não editado:
 * mantém precisão de sobra para qualquer premissa real.
 */
export function fracToPct(f: number): string {
  if (!Number.isFinite(f)) return ''
  return String(Number((f * 100).toPrecision(10)))
}

/** Porcentagem digitada → fração, para guardar no estado. Vazio vira 0. */
export function pctToFrac(v: string): number {
  if (v.trim() === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n / 100 : 0
}
