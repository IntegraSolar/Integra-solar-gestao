import { describe, it, expect } from 'vitest'
import { TEMAS, temaValido, TEMA_PADRAO } from '@/lib/apresentacoes/temas'
import { TEMPLATES, templateValido, TEMPLATE_PADRAO, blocosDoTemplate } from '@/lib/apresentacoes/templates'
import { BLOCOS_VALIDOS, normalizarConfig } from '@/lib/apresentacoes/tipos'

describe('catálogo de temas', () => {
  it('tem os seis temas', () => {
    expect(Object.keys(TEMAS).sort()).toEqual([
      'corporate-blue',
      'executive-black',
      'green-energy',
      'minimal-white',
      'modern-dark',
      'solar-gold',
    ])
  })

  it('todo tema declara nome e cor de destaque', () => {
    for (const tema of Object.values(TEMAS)) {
      expect(tema.nome.length).toBeGreaterThan(0)
      expect(tema.corDestaque).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('valida ids de tema', () => {
    expect(temaValido('minimal-white')).toBe(true)
    expect(temaValido('rosa-choque')).toBe(false)
  })

  it('o tema padrão existe no catálogo', () => {
    expect(TEMAS[TEMA_PADRAO]).toBeDefined()
  })
})

describe('catálogo de templates', () => {
  it('tem o template premium', () => {
    expect(TEMPLATES['premium']).toBeDefined()
  })

  it('o template padrão existe', () => {
    expect(TEMPLATES[TEMPLATE_PADRAO]).toBeDefined()
  })

  it('premium usa os seis blocos da fase 1, nesta ordem', () => {
    expect(blocosDoTemplate('premium')).toEqual([
      'cover', 'resumo', 'sistema', 'equipamentos', 'condicoes', 'contato',
    ])
  })

  it('todo bloco de todo template é um bloco válido', () => {
    for (const id of Object.keys(TEMPLATES)) {
      for (const bloco of blocosDoTemplate(id as any)) {
        expect(BLOCOS_VALIDOS).toContain(bloco)
      }
    }
  })

  it('valida ids de template', () => {
    expect(templateValido('premium')).toBe(true)
    expect(templateValido('inexistente')).toBe(false)
  })
})

describe('normalizarConfig', () => {
  it('sem configuração, devolve os padrões', () => {
    const c = normalizarConfig(null)
    expect(c.template).toBe(TEMPLATE_PADRAO)
    expect(c.tema).toBe(TEMA_PADRAO)
    expect(c.blocos.length).toBeGreaterThan(0)
  })

  it('descarta tema inválido vindo do banco', () => {
    const c = normalizarConfig({ template: 'premium', tema: 'hackeado', blocos: ['cover'] })
    expect(c.tema).toBe(TEMA_PADRAO)
  })

  it('descarta template inválido vindo do banco', () => {
    const c = normalizarConfig({ template: 'xxx', tema: 'minimal-white', blocos: ['cover'] })
    expect(c.template).toBe(TEMPLATE_PADRAO)
  })

  it('filtra blocos desconhecidos e preserva a ordem dos válidos', () => {
    const c = normalizarConfig({
      template: 'premium',
      tema: 'minimal-white',
      blocos: ['contato', 'inventado', 'cover'],
    })
    expect(c.blocos).toEqual(['contato', 'cover'])
  })

  it('lista de blocos vazia cai para os blocos do template', () => {
    const c = normalizarConfig({ template: 'premium', tema: 'minimal-white', blocos: [] })
    expect(c.blocos).toEqual(blocosDoTemplate('premium'))
  })
})
