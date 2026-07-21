import { describe, it, expect } from 'vitest'
import { TEXTOS_PADRAO, mesclarTextos } from '@/lib/apresentacoes/textos'

describe('mesclarTextos', () => {
  it('null devolve exatamente os padrões', () => {
    expect(mesclarTextos(null)).toEqual(TEXTOS_PADRAO)
  })

  it('objeto vazio devolve os padrões', () => {
    expect(mesclarTextos({})).toEqual(TEXTOS_PADRAO)
  })

  it('personalizar só garantias preserva as demais chaves nos padrões', () => {
    const resultado = mesclarTextos({
      garantias: [{ icone: 'escudo', titulo: 'Painel', prazo: '30 anos', descricao: 'Custom' }],
    })

    expect(resultado.garantias).toEqual([
      { icone: 'escudo', titulo: 'Painel', prazo: '30 anos', descricao: 'Custom' },
    ])
    expect(resultado.timeline).toEqual(TEXTOS_PADRAO.timeline)
    expect(resultado.como_funciona).toEqual(TEXTOS_PADRAO.como_funciona)
    expect(resultado.fluxo).toEqual(TEXTOS_PADRAO.fluxo)
  })

  it('lista vazia numa chave cai no padrão daquela chave', () => {
    const resultado = mesclarTextos({ timeline: [] })
    expect(resultado.timeline).toEqual(TEXTOS_PADRAO.timeline)
  })

  it('item com título vazio invalida a lista, que cai no padrão', () => {
    const resultado = mesclarTextos({
      timeline: [{ titulo: '', descricao: 'Algo' }],
    })
    expect(resultado.timeline).toEqual(TEXTOS_PADRAO.timeline)
  })

  it('ícone inválido não descarta o item, vira o ícone padrão da chave', () => {
    const resultado = mesclarTextos({
      garantias: [{ icone: 'nao-existe', titulo: 'Painel', prazo: '30 anos', descricao: 'Custom' }],
    })
    expect(resultado.garantias).toEqual([
      { icone: 'sol', titulo: 'Painel', prazo: '30 anos', descricao: 'Custom' },
    ])
  })

  it('abertura com espaços em branco vira null', () => {
    expect(mesclarTextos({ abertura: '   ' }).abertura).toBeNull()
  })

  it('abertura preenchida é preservada (com trim)', () => {
    expect(mesclarTextos({ abertura: '  Bem-vindo!  ' }).abertura).toBe('Bem-vindo!')
  })

  it('entrada absurda devolve os padrões sem lançar', () => {
    expect(mesclarTextos('string qualquer')).toEqual(TEXTOS_PADRAO)
    expect(mesclarTextos(42)).toEqual(TEXTOS_PADRAO)
    expect(mesclarTextos(['a', 'b'])).toEqual(TEXTOS_PADRAO)
  })
})
