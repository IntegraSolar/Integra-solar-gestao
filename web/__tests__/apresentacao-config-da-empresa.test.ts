import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A empresa configura textos, modelo e tema em Configurações → Apresentação, e
 * isso precisa chegar à proposta que o cliente abre.
 *
 * Já falhou uma vez: a tela salvava certo em `org_apresentacao_config`, mas a
 * rota pública nunca lia essa tabela. Alterar a garantia de 25 para 15 anos não
 * mudava nada na apresentação, e nenhum teste acusou — o defeito estava na
 * fiação entre módulos, não na lógica de nenhum deles.
 *
 * Estes testes inspecionam o código-fonte porque é onde a ligação vive. Não
 * substituem um teste de integração; impedem a regressão específica.
 */

const ROTA_PUBLICA = join(process.cwd(), 'app', 'api', 'proposta', '[token]', 'route.ts')
const LINK_ACTIONS = join(process.cwd(), 'lib', 'proposals', 'link-actions.ts')

describe('rota pública da proposta', () => {
  const src = readFileSync(ROTA_PUBLICA, 'utf-8')

  it('lê a configuração padrão da empresa', () => {
    expect(src).toContain('org_apresentacao_config')
  })

  it('busca os textos personalizados junto da configuração', () => {
    expect(src).toMatch(/select\(\s*'template,\s*tema,\s*blocos,\s*textos'\s*\)/)
  })

  it('repassa os textos para a montagem da apresentação', () => {
    expect(src).toMatch(/textos:\s*orgCfg\?\.textos/)
  })

  it('faz a config da proposta vencer a da empresa', () => {
    expect(src).toMatch(/normalizarConfig\(cfg\s*\?\?\s*orgCfg\)/)
  })
})

describe('geração do link', () => {
  const src = readFileSync(LINK_ACTIONS, 'utf-8')

  it('herda o padrão da empresa quando a proposta não tem config própria', () => {
    // Sem isso, o DEFAULT da coluna ('premium') vence o modelo escolhido pela
    // empresa, e a configuração da tela parece não ter efeito nenhum.
    expect(src).toContain('org_apresentacao_config')
  })
})
