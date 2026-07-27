import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
describe('fiação da proposta de usina', () => {
  it('middleware trata /proposta-usina como rota pública', () => {
    const src = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf-8')
    expect(src).toContain("'/proposta-usina'")
    expect(src).toContain("'/api/proposta-usina'")
  })
  it('next.config inclui o Chromium no bundle da rota de PDF', () => {
    const src = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf-8')
    expect(src).toContain('/api/proposta-usina/**')
  })
})
