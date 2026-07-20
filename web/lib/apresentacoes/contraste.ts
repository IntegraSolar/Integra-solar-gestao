// web/lib/apresentacoes/contraste.ts

/**
 * Ajuste de cor para legibilidade sobre fundo claro.
 *
 * A apresentação usa a cor da empresa nos números em destaque. Empresas com cor
 * clara (ex.: #FFD080) produziam contraste de 1.44:1 sobre o card branco — muito
 * abaixo do mínimo de 3:1 do WCAG para texto grande, deixando o indicador
 * praticamente invisível. Aqui escurecemos a cor preservando o matiz, até que ela
 * atinja o contraste mínimo. A identidade visual se mantém; a leitura deixa de
 * depender da sorte na escolha da cor.
 */

const CONTRASTE_MINIMO = 3.0
const BRANCO: RGB = [255, 255, 255]

type RGB = [number, number, number]

export function hexParaRgb(hex: string): RGB | null {
  const limpo = hex.trim().replace('#', '')
  const completo =
    limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ]
}

function rgbParaHex([r, g, b]: RGB): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function luminancia([r, g, b]: RGB): number {
  const canal = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a: RGB, b: RGB): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Devolve a cor original se ela já for legível sobre fundo claro; caso contrário,
 * a versão escurecida mais próxima que atinge o contraste mínimo.
 */
export function corLegivelSobreClaro(hex: string): string {
  const rgb = hexParaRgb(hex)
  if (!rgb) return hex

  if (contraste(rgb, BRANCO) >= CONTRASTE_MINIMO) return hex

  // Escurece em passos pequenos preservando a proporção entre os canais (matiz).
  let atual: RGB = [...rgb] as RGB
  for (let i = 0; i < 40; i++) {
    atual = [atual[0] * 0.92, atual[1] * 0.92, atual[2] * 0.92] as RGB
    if (contraste(atual, BRANCO) >= CONTRASTE_MINIMO) return rgbParaHex(atual)
  }
  return '#1a1a1a'
}
