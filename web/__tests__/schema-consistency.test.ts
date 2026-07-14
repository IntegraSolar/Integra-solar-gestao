import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regressão: a tabela correta é `client_sale` (singular). Referências a
 * `client_sales` (plural) apontam para uma tabela inexistente e falham
 * silenciosamente (DRE, comissões e portal do cliente ficavam sem os dados
 * de venda). Este teste impede o retorno do nome errado.
 */
const ROOT = join(__dirname, '..')
const DIRS = ['app', 'lib']
const NOMES_INEXISTENTES = ["from('client_sales')", 'from("client_sales")']

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      out.push(...walk(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('consistência de schema — nomes de tabela', () => {
  it('não referencia a tabela inexistente client_sales', () => {
    const ofensores: string[] = []
    for (const dir of DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        const content = readFileSync(file, 'utf8')
        if (NOMES_INEXISTENTES.some((n) => content.includes(n))) {
          ofensores.push(file.replace(ROOT, ''))
        }
      }
    }
    expect(ofensores, `Use 'client_sale' (singular). Arquivos com client_sales: ${ofensores.join(', ')}`).toEqual([])
  })
})
