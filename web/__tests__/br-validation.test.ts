import { describe, it, expect } from 'vitest'
import { isValidCPF, isValidCNPJ, isValidCpfCnpj, isValidCEP, isValidPhoneBR } from '@/lib/validation/br'

describe('isValidCPF', () => {
  it('aceita CPFs válidos (com e sem máscara)', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('52998224725')).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-24')).toBe(false)
  })
  it('rejeita sequências repetidas e tamanho errado', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCPF('123')).toBe(false)
  })
})

describe('isValidCNPJ', () => {
  it('aceita CNPJ válido (com e sem máscara)', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
    expect(isValidCNPJ('11222333000181')).toBe(true)
  })
  it('rejeita dígito errado e repetição', () => {
    expect(isValidCNPJ('11.222.333/0001-80')).toBe(false)
    expect(isValidCNPJ('00000000000000')).toBe(false)
  })
})

describe('isValidCpfCnpj respeitando o tipo', () => {
  it('pf exige CPF, pj exige CNPJ', () => {
    expect(isValidCpfCnpj('52998224725', 'pf')).toBe(true)
    expect(isValidCpfCnpj('11222333000181', 'pf')).toBe(false)
    expect(isValidCpfCnpj('11222333000181', 'pj')).toBe(true)
    expect(isValidCpfCnpj('52998224725', 'pj')).toBe(false)
  })
  it('sem tipo aceita qualquer um dos dois', () => {
    expect(isValidCpfCnpj('52998224725')).toBe(true)
    expect(isValidCpfCnpj('11222333000181')).toBe(true)
  })
})

describe('CEP e telefone', () => {
  it('CEP precisa de 8 dígitos', () => {
    expect(isValidCEP('30110-012')).toBe(true)
    expect(isValidCEP('3011001')).toBe(false)
  })
  it('telefone aceita fixo (10) e celular (11)', () => {
    expect(isValidPhoneBR('(31) 3333-4444')).toBe(true)
    expect(isValidPhoneBR('(31) 99999-8888')).toBe(true)
    expect(isValidPhoneBR('9999-8888')).toBe(false)
  })
})
