import { describe, it, expect } from 'vitest'
import {
  salvarSimulacaoSchema, rowToResumo, rowToCompleta,
} from '@/lib/simuladores/hibrido/simulacoes-schemas'

const MINIMO = {
  nome: 'Projeto Palmas',
  snapshot: { versao: 1 },
  potenciaKwp: 9.92,
  investimentoTotal: 89681.35,
  vpl: 141864.78,
  tir: 0.1848,
  paybackAnos: 6.61,
}

describe('salvarSimulacaoSchema', () => {
  it('aceita o mínimo válido', () => {
    expect(salvarSimulacaoSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('recusa nome vazio', () => {
    expect(salvarSimulacaoSchema.safeParse({ ...MINIMO, nome: '' }).success).toBe(false)
  })
  it('aceita payback null (não se paga no horizonte)', () => {
    const r = salvarSimulacaoSchema.safeParse({ ...MINIMO, paybackAnos: null })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.paybackAnos).toBeNull()
  })
  it('aceita campos de cliente ausentes', () => {
    expect(salvarSimulacaoSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('aceita campos de cliente preenchidos', () => {
    const r = salvarSimulacaoSchema.safeParse({
      ...MINIMO, clienteNome: 'Iago', clienteCidade: 'Palmas', clienteUf: 'TO',
      concessionaria: 'ENERGISA', responsavelTecnico: 'Patrick',
    })
    expect(r.success).toBe(true)
  })
})

describe('mapeadores', () => {
  const row = {
    id: 's1', nome: 'Projeto Palmas',
    cliente_nome: 'Iago', cliente_cidade: 'Palmas', cliente_uf: 'TO',
    concessionaria: 'ENERGISA', responsavel_tecnico: 'Patrick',
    potencia_kwp: 9.92, investimento_total: 89681.35, vpl: 141864.78,
    tir: 0.1848, payback_anos: 6.61,
    snapshot: { versao: 1 },
    created_at: '2026-07-19T12:00:00Z',
  }

  it('rowToResumo traz os campos da listagem', () => {
    const r = rowToResumo(row)
    expect(r.id).toBe('s1')
    expect(r.nome).toBe('Projeto Palmas')
    expect(r.clienteNome).toBe('Iago')
    expect(r.potenciaKwp).toBeCloseTo(9.92, 6)
    expect(r.paybackAnos).toBeCloseTo(6.61, 6)
    expect(r.createdAt).toBe('2026-07-19T12:00:00Z')
  })
  it('rowToResumo preserva payback null', () => {
    expect(rowToResumo({ ...row, payback_anos: null }).paybackAnos).toBeNull()
  })
  it('rowToResumo converte campos de cliente ausentes em null', () => {
    const r = rowToResumo({ ...row, cliente_nome: null, cliente_cidade: null })
    expect(r.clienteNome).toBeNull()
    expect(r.clienteCidade).toBeNull()
  })
  it('rowToCompleta acrescenta identificação e snapshot', () => {
    const c = rowToCompleta(row)
    expect(c.clienteUf).toBe('TO')
    expect(c.concessionaria).toBe('ENERGISA')
    expect(c.responsavelTecnico).toBe('Patrick')
    expect(c.snapshot).toEqual({ versao: 1 })
  })
})
