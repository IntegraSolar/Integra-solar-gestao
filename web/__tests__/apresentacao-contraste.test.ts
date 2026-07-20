import { describe, it, expect } from 'vitest'
import { corLegivelSobreClaro, contraste, hexParaRgb } from '@/lib/apresentacoes/contraste'

const BRANCO: [number, number, number] = [255, 255, 255]

function contrasteComBranco(hex: string): number {
  const rgb = hexParaRgb(hex)!
  return contraste(rgb, BRANCO)
}

describe('corLegivelSobreClaro', () => {
  it('mantém cor que já é legível sobre branco', () => {
    // Azul #3B82F6 mede 3.68:1 — acima do mínimo, passa intacto.
    expect(corLegivelSobreClaro('#3B82F6')).toBe('#3B82F6')
  })

  it('escurece levemente até o verde padrão do sistema', () => {
    // #10B981 mede 2.54:1 sobre branco — abaixo de 3. Surpreende, mas é fato:
    // verdes e dourados vibrantes quase sempre reprovam sobre fundo claro.
    const ajustada = corLegivelSobreClaro('#10B981')
    expect(ajustada).not.toBe('#10B981')
    expect(contrasteComBranco(ajustada)).toBeGreaterThanOrEqual(3)
    // Continua sendo verde: canal G segue dominante.
    const [r, g, b] = hexParaRgb(ajustada)!
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  it('escurece o amarelo claro da Mineira Energia até ficar legível', () => {
    // Caso real: #FFD080 tinha 1.44:1 sobre o card branco — indicador invisível.
    const antes = contrasteComBranco('#FFD080')
    expect(antes).toBeLessThan(3)

    const ajustada = corLegivelSobreClaro('#FFD080')
    expect(ajustada).not.toBe('#FFD080')
    expect(contrasteComBranco(ajustada)).toBeGreaterThanOrEqual(3)
  })

  it('preserva o matiz ao escurecer (amarelo continua amarelo)', () => {
    const [r, g, b] = hexParaRgb(corLegivelSobreClaro('#FFD080'))!
    expect(r).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })

  it('cores muito escuras passam sem alteração', () => {
    expect(corLegivelSobreClaro('#0A0E1A')).toBe('#0A0E1A')
  })

  it('aceita hex de três dígitos', () => {
    expect(contrasteComBranco(corLegivelSobreClaro('#ff0'))).toBeGreaterThanOrEqual(3)
  })

  it('devolve a entrada quando não é um hex válido', () => {
    expect(corLegivelSobreClaro('roxo')).toBe('roxo')
    expect(corLegivelSobreClaro('')).toBe('')
  })

  it('branco puro é escurecido, não devolvido como está', () => {
    const r = corLegivelSobreClaro('#FFFFFF')
    expect(r).not.toBe('#FFFFFF')
    expect(contrasteComBranco(r)).toBeGreaterThanOrEqual(3)
  })
})
