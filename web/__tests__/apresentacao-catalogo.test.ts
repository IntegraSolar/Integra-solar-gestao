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

  it('premium inclui os blocos essenciais', () => {
    expect(blocosDoTemplate('premium')).toEqual(
      expect.arrayContaining(['cover', 'hero', 'sistema', 'equipamentos', 'condicoes', 'contato'])
    )
  })

  it('nenhum template usa hero e resumo juntos', () => {
    // Os dois exibem os mesmos indicadores. Lado a lado, a apresentação repete
    // potência e geração em sequência — o oposto de "pouco texto, muito impacto".
    for (const id of Object.keys(TEMPLATES)) {
      const blocos = blocosDoTemplate(id)
      expect(blocos.includes('hero') && blocos.includes('resumo')).toBe(false)
    }
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

  it('tem exatamente dez templates', () => {
    expect(Object.keys(TEMPLATES)).toHaveLength(10)
  })

  it('todo temaPadrao existe no catálogo de temas', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(TEMAS[template.temaPadrao]).toBeDefined()
    }
  })

  it('todo template começa em cover e termina em contato', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.blocos[0]).toBe('cover')
      expect(template.blocos[template.blocos.length - 1]).toBe('contato')
    }
  })

  it('todo template contém o bloco condicoes', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.blocos).toContain('condicoes')
    }
  })

  it('nenhum template repete um bloco', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(new Set(template.blocos).size).toBe(template.blocos.length)
    }
  })

  it('todo template tem nome e descrição não vazios', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.nome.length).toBeGreaterThan(0)
      expect(template.descricao.length).toBeGreaterThan(0)
    }
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
