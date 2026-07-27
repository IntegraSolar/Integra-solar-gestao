// web/lib/apresentacoes-usina/grafico.ts
// Gráfico do fluxo de caixa acumulado, gerado no servidor como SVG. Sem canvas:
// canvas é pintado por JS e sai em branco no PDF do Chromium (captura antes do
// paint). Aqui o desenho já vem pronto no HTML e imprime idêntico.

const W = 720
const H = 320
const M = { top: 24, right: 24, bottom: 40, left: 84 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/** Valor compacto para os rótulos de eixo: "R$ 227 mil", "-R$ 155 mil". */
function compacto(v: number): string {
  const sinal = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1000) {
    return `${sinal}R$ ${Math.round(abs / 1000).toLocaleString('pt-BR')} mil`
  }
  return `${sinal}R$ ${Math.round(abs).toLocaleString('pt-BR')}`
}

export type PontoFluxo = { ano: number; valor: number }

/**
 * SVG do fluxo acumulado com eixos, linha de base (zero), rótulos de valor,
 * anos no eixo X e o ponto de payback (onde o acumulado cruza o zero) destacado.
 */
export function svgFluxoAcumulado(pontos: PontoFluxo[]): string {
  if (pontos.length === 0) {
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="apr-usina__grafico"></svg>`
  }

  const valores = pontos.map((p) => p.valor)
  const min = Math.min(...valores, 0)
  const max = Math.max(...valores, 0)
  const range = max - min || 1
  const n = pontos.length - 1 || 1

  const x = (i: number) => M.left + (i / n) * PLOT_W
  const y = (v: number) => M.top + PLOT_H - ((v - min) / range) * PLOT_H

  // Ano em que o caixa acumulado vira positivo. Rotulado como "Fluxo positivo",
  // não "Payback": o indicador de payback conta anos operacionais (ano 0 é o
  // investimento), então usar "Payback {ano}" aqui mostraria um número que não
  // bate com o "Payback N anos" do topo. O ano da virada é factual e não
  // contradiz o indicador.
  const iVirada = valores.findIndex((v, idx) => idx > 0 && v >= 0)

  const linha = pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const areaBase = y(0).toFixed(1)
  const area = `${x(0).toFixed(1)},${areaBase} ${linha} ${x(n).toFixed(1)},${areaBase}`

  // Grade horizontal em min, 0 e max, cada uma com o valor à esquerda.
  const niveis = [max, 0, min].filter((v, i, a) => a.indexOf(v) === i)
  const grade = niveis
    .map((v) => {
      const yy = y(v).toFixed(1)
      const forte = v === 0
      return (
        `<line x1="${M.left}" y1="${yy}" x2="${W - M.right}" y2="${yy}" ` +
        `stroke="rgba(0,0,0,${forte ? '.35' : '.1'})" stroke-width="${forte ? 1 : 0.8}"/>` +
        `<text x="${M.left - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle" ` +
        `font-size="11" fill="rgba(0,0,0,.55)">${compacto(v)}</text>`
      )
    })
    .join('')

  // Rótulos de ano: primeiro, último e o de payback (se houver).
  const anosMarcados = new Set<number>([0, n])
  if (iVirada > 0) anosMarcados.add(iVirada)
  const eixoX = Array.from(anosMarcados)
    .map((i) => {
      const anchor = i === 0 ? 'start' : i === n ? 'end' : 'middle'
      return (
        `<text x="${x(i).toFixed(1)}" y="${H - M.bottom + 18}" text-anchor="${anchor}" ` +
        `font-size="11" fill="rgba(0,0,0,.55)">${pontos[i].ano}</text>`
      )
    })
    .join('')

  // Linha e ponto da virada do fluxo destacados.
  let marcadorVirada = ''
  if (iVirada > 0) {
    const px = x(iVirada).toFixed(1)
    const py = y(pontos[iVirada].valor).toFixed(1)
    marcadorVirada =
      `<line x1="${px}" y1="${M.top}" x2="${px}" y2="${H - M.bottom}" stroke="var(--apr-destaque-cheia)" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>` +
      `<circle cx="${px}" cy="${py}" r="4.5" fill="var(--apr-destaque-cheia)"/>` +
      `<text x="${px}" y="${M.top - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--apr-destaque-cheia)">Fluxo positivo ${pontos[iVirada].ano}</text>`
  }

  // Ponto final com o valor acumulado.
  const fx = x(n).toFixed(1)
  const fy = y(pontos[n].valor).toFixed(1)
  const marcadorFinal =
    `<circle cx="${fx}" cy="${fy}" r="4" fill="var(--apr-destaque-cheia)"/>` +
    `<text x="${fx}" y="${(Number(fy) - 10).toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" fill="rgba(0,0,0,.7)">${compacto(pontos[n].valor)}</text>`

  return [
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="apr-usina__grafico" role="img" aria-label="Fluxo de caixa acumulado ao longo dos anos">`,
    `<text x="${M.left}" y="14" font-size="11" fill="rgba(0,0,0,.5)">Fluxo de caixa acumulado (R$)</text>`,
    grade,
    `<polygon points="${area}" fill="var(--apr-destaque-cheia)" opacity=".08"/>`,
    `<polyline fill="none" stroke="var(--apr-destaque-cheia)" stroke-width="2.5" points="${linha}"/>`,
    eixoX,
    marcadorVirada,
    marcadorFinal,
    `</svg>`,
  ].join('')
}
