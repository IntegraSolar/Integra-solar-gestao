import { describe, it, expect } from 'vitest'
import { calcularValorComissao, montarComissaoItem, totaisComissoes } from '@/lib/comissoes/calculo'
import type { ComissaoRow } from '@/lib/comissoes/calculo'

function row(over: Partial<ComissaoRow> = {}): ComissaoRow {
  return {
    id: 'com-1',
    client_id: 'cli-1',
    client_name: 'Cliente',
    status: 'pendente',
    paid_at: null,
    comprovante_url: null,
    created_at: '2026-07-16T12:00:00Z',
    valor_congelado: 0,
    sale_value: 22000,
    commission_pct: 3,
    commission_seller: 'Iago Bonifácio',
    ...over,
  }
}

describe('calcularValorComissao', () => {
  it('aplica o percentual sobre o valor da venda', () => {
    expect(calcularValorComissao(22000, 3)).toBe(660)
  })

  it('arredonda para duas casas', () => {
    expect(calcularValorComissao(16731.58, 3)).toBe(501.95)
  })

  it('devolve 0 quando falta valor ou percentual', () => {
    expect(calcularValorComissao(null, 3)).toBe(0)
    expect(calcularValorComissao(22000, null)).toBe(0)
    expect(calcularValorComissao(22000, 0)).toBe(0)
  })
})

describe('montarComissaoItem', () => {
  it('usa o vendedor digitado no cadastro da venda', () => {
    const item = montarComissaoItem(row({ commission_seller: 'Maria Vendedora' }))
    expect(item?.vendedor_name).toBe('Maria Vendedora')
  })

  it('recalcula o valor a partir do percentual atual, ignorando o congelado', () => {
    const item = montarComissaoItem(row({ valor_congelado: 999, sale_value: 10000, commission_pct: 5 }))
    expect(item?.valor_comissao).toBe(500)
  })

  it('expõe o percentual usado no cálculo', () => {
    expect(montarComissaoItem(row({ commission_pct: 4.5 }))?.commission_pct).toBe(4.5)
  })

  it('descarta a comissão quando o vendedor não foi preenchido', () => {
    expect(montarComissaoItem(row({ commission_seller: null }))).toBeNull()
    expect(montarComissaoItem(row({ commission_seller: '' }))).toBeNull()
    expect(montarComissaoItem(row({ commission_seller: '   ' }))).toBeNull()
  })

  it('descarta quando não há venda vinculada', () => {
    expect(montarComissaoItem(row({ sale_value: null }))).toBeNull()
  })

  it('remove espaços em volta do nome', () => {
    expect(montarComissaoItem(row({ commission_seller: '  Iago  ' }))?.vendedor_name).toBe('Iago')
  })
})

describe('totaisComissoes', () => {
  it('separa pendentes de pagas', () => {
    const items = [
      montarComissaoItem(row({ id: 'a', status: 'pendente', sale_value: 10000, commission_pct: 3 }))!,
      montarComissaoItem(row({ id: 'b', status: 'pendente', sale_value: 20000, commission_pct: 3 }))!,
      montarComissaoItem(row({ id: 'c', status: 'paga', sale_value: 30000, commission_pct: 3 }))!,
    ]
    const t = totaisComissoes(items)
    expect(t.total_pendente).toBe(900)
    expect(t.total_pago).toBe(900)
  })

  it('zera com lista vazia', () => {
    expect(totaisComissoes([])).toEqual({ total_pendente: 0, total_pago: 0 })
  })
})
