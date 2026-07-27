// web/lib/apresentacoes-usina/grafico.ts
// SVG do fluxo de caixa acumulado, gerado no servidor. Sem canvas: canvas é
// pintado por JS e sai em branco no PDF do Chromium (captura antes do paint).

const W = 600
const H = 220
const PAD = 8

/** Recebe a série de fluxo acumulado (ano 0..N) e devolve um SVG inline. */
export function svgFluxoAcumulado(acumulado: number[]): string {
  if (acumulado.length === 0) {
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`
  }
  const min = Math.min(...acumulado, 0)
  const max = Math.max(...acumulado, 0)
  const range = max - min || 1
  const n = acumulado.length - 1 || 1
  const x = (i: number) => PAD + (i / n) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const pontos = acumulado.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const zero = y(0).toFixed(1)
  return [
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="apr-usina__grafico">`,
    `<line x1="${PAD}" y1="${zero}" x2="${W - PAD}" y2="${zero}" stroke="rgba(0,0,0,.2)" stroke-width="1"/>`,
    `<polyline fill="none" stroke="var(--apr-destaque-cheia)" stroke-width="2.5" points="${pontos}"/>`,
    `</svg>`,
  ].join('')
}
