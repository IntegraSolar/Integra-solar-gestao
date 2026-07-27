import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * O seletor da Viabilidade deve oferecer apenas as concessionárias que a empresa
 * marcou como "configurada" — não o catálogo inteiro (~29). Estes testes
 * inspecionam o código porque a ligação é entre a página e a action: um teste de
 * lógica pura não pegaria a página voltar a ler todas.
 */

const PAGE = join(process.cwd(), 'app', '(dashboard)', 'simuladores', 'viabilidade-usina', 'page.tsx')
const ACTIONS = join(process.cwd(), 'lib', 'simuladores', 'viabilidade', 'concessionarias-actions.ts')

describe('página da Viabilidade', () => {
  const src = readFileSync(PAGE, 'utf-8')

  it('alimenta o seletor só com as concessionárias configuradas', () => {
    expect(src).toContain('listConcessionariasConfiguradas')
  })

  it('não usa mais a listagem completa para o seletor', () => {
    expect(src).not.toMatch(/listConcessionarias\(\)/)
  })
})

describe('actions de concessionária', () => {
  const src = readFileSync(ACTIONS, 'utf-8')

  it('a listagem de configuradas filtra por configurada = true', () => {
    expect(src).toMatch(/listConcessionariasConfiguradas[\s\S]*\.eq\('configurada',\s*true\)/)
  })

  it('expõe a action de ligar/desligar a exibição', () => {
    expect(src).toContain('setConcessionariaConfigurada')
  })

  it('a gestão continua listando todas (catálogo completo)', () => {
    expect(src).toMatch(/export async function listConcessionarias\(/)
  })
})
