// web/lib/simuladores/hibrido/montar-input.ts
// Ponte pura entre os campos da tela e o input do motor de cálculo.
// Nenhuma fórmula vive aqui — só tradução de formulário para domínio.

/**
 * Interpreta a linha de 12 valores de HSP colada do CRESESB/PVGIS.
 * Devolve `null` se não encontrar exatamente 12 números válidos.
 *
 * A ambiguidade da vírgula (decimal ou separador de lista) é resolvida pela
 * composição do texto, sem tentativa e erro. Isso funciona porque HSP no Brasil
 * fica entre ~3 e ~7 kWh/m²·dia: sempre um dígito antes do decimal, nunca com
 * separador de milhar.
 */
export function parseHspColado(texto: string): number[] | null {
  const t = texto.trim()
  if (t === '') return null

  const temPonto = t.includes('.')
  const temVirgula = t.includes(',')

  let normalizado: string
  if (temPonto && temVirgula) {
    // Ponto é o decimal e a vírgula separa a lista: "4.75, 4.71, …"
    normalizado = t.replace(/,/g, ' ')
  } else if (temVirgula) {
    // Só vírgula: é o decimal. "4,75 4,71 …"
    normalizado = t.replace(/,/g, '.')
  } else {
    normalizado = t
  }

  const tokens = normalizado.split(/[\s;]+/).filter((s) => s !== '')
  if (tokens.length !== 12) return null

  const numeros = tokens.map(Number)
  if (numeros.some((n) => !Number.isFinite(n))) return null
  return numeros
}
