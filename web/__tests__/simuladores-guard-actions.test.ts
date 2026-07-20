import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Os Simuladores são um recurso pago, liberado por empresa no backoffice.
 * O guard precisa viver também nas server actions: se ficasse só nas páginas,
 * uma empresa sem o plano poderia chamar as actions diretamente.
 */

const RAIZ = join(process.cwd(), 'lib', 'simuladores')

function arquivosDeActions(dir: string): string[] {
  const achados: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) achados.push(...arquivosDeActions(caminho))
    else if (entrada.name.includes('actions') && entrada.name.endsWith('.ts')) achados.push(caminho)
  }
  return achados
}

const ARQUIVOS = arquivosDeActions(RAIZ)

describe('server actions dos simuladores', () => {
  it('encontra os arquivos de actions', () => {
    expect(ARQUIVOS.length).toBeGreaterThanOrEqual(6)
  })

  it.each(ARQUIVOS)('%s usa o guard compartilhado de plano', (arquivo) => {
    const src = readFileSync(arquivo, 'utf-8')
    expect(src).toContain('requireSimuladoresOrg')
  })

  it.each(ARQUIVOS)('%s não redefine um requireOrg local sem checagem de plano', (arquivo) => {
    const src = readFileSync(arquivo, 'utf-8')
    // Uma definição própria de requireOrg voltaria a checar só a organização,
    // reabrindo o furo que este guard fechou.
    expect(src).not.toMatch(/async function requireOrg\s*\(/)
  })

  it.each(ARQUIVOS)('%s protege todas as actions exportadas', (arquivo) => {
    const src = readFileSync(arquivo, 'utf-8')
    const exportadas = (src.match(/^export async function/gm) ?? []).length
    const chamadas = (src.match(/requireOrg\(\)/g) ?? []).length
    expect(chamadas).toBeGreaterThanOrEqual(exportadas)
  })
})
