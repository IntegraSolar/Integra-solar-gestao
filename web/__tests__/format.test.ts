import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPhone,
  formatCPF,
  formatCNPJ,
  formatCpfCnpj,
  formatCEP,
  formatDate,
  formatDateTime,
  cleanDigits,
  cleanCurrency,
  toISODate,
  validateCPF,
  validateCNPJ,
  validatePhone,
  validateCEP,
} from '@/lib/format/index'

describe('formatCurrency', () => {
  it('formata número positivo', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00')
  })
  it('formata string numérica', () => {
    expect(formatCurrency('250.5')).toBe('R$ 250,50')
  })
  it('retorna — para null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
  it('retorna — para undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })
  it('retorna — para string vazia', () => {
    expect(formatCurrency('')).toBe('—')
  })
  it('retorna — para NaN', () => {
    expect(formatCurrency('abc')).toBe('—')
  })
  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00')
  })
})

describe('formatPhone', () => {
  it('formata celular 11 dígitos', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
  })
  it('formata fixo 10 dígitos', () => {
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
  })
  it('formata com máscara já aplicada', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })
  it('retorna — para null', () => {
    expect(formatPhone(null)).toBe('—')
  })
  it('retorna — para undefined', () => {
    expect(formatPhone(undefined)).toBe('—')
  })
  it('retorna original para formato desconhecido', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

describe('formatCPF', () => {
  it('formata CPF com 11 dígitos', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01')
  })
  it('formata CPF já com pontuação', () => {
    expect(formatCPF('123.456.789-01')).toBe('123.456.789-01')
  })
  it('retorna — para null', () => {
    expect(formatCPF(null)).toBe('—')
  })
  it('retorna original para dígitos insuficientes', () => {
    expect(formatCPF('123')).toBe('123')
  })
})

describe('formatCNPJ', () => {
  it('formata CNPJ com 14 dígitos', () => {
    expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95')
  })
  it('retorna — para null', () => {
    expect(formatCNPJ(null)).toBe('—')
  })
  it('retorna original para dígitos insuficientes', () => {
    expect(formatCNPJ('1234')).toBe('1234')
  })
})

describe('formatCpfCnpj', () => {
  it('detecta CPF', () => {
    expect(formatCpfCnpj('12345678901')).toBe('123.456.789-01')
  })
  it('detecta CNPJ', () => {
    expect(formatCpfCnpj('12345678000195')).toBe('12.345.678/0001-95')
  })
  it('retorna — para null', () => {
    expect(formatCpfCnpj(null)).toBe('—')
  })
})

describe('formatCEP', () => {
  it('formata CEP com 8 dígitos', () => {
    expect(formatCEP('12345678')).toBe('12345-678')
  })
  it('formata CEP com máscara', () => {
    expect(formatCEP('12345-678')).toBe('12345-678')
  })
  it('retorna — para null', () => {
    expect(formatCEP(null)).toBe('—')
  })
  it('retorna original para formato inválido', () => {
    expect(formatCEP('1234')).toBe('1234')
  })
})

describe('formatDate', () => {
  it('converte ISO para dd/mm/yyyy', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024')
  })
  it('ignora parte de hora', () => {
    expect(formatDate('2024-03-15T10:30:00Z')).toBe('15/03/2024')
  })
  it('retorna — para null', () => {
    expect(formatDate(null)).toBe('—')
  })
  it('retorna original para string sem separador -', () => {
    expect(formatDate('20240315')).toBe('20240315')
  })
})

describe('cleanDigits', () => {
  it('remove pontuação de CPF', () => {
    expect(cleanDigits('123.456.789-01')).toBe('12345678901')
  })
  it('remove traços e parênteses de telefone', () => {
    expect(cleanDigits('(11) 98765-4321')).toBe('11987654321')
  })
  it('retorna apenas dígitos de CNPJ', () => {
    expect(cleanDigits('12.345.678/0001-95')).toBe('12345678000195')
  })
})

describe('cleanCurrency', () => {
  it('converte string BRL para número', () => {
    expect(cleanCurrency('R$ 1.500,50')).toBe(1500.5)
  })
  it('lida com valor sem prefixo', () => {
    expect(cleanCurrency('250,00')).toBe(250)
  })
  it('retorna 0 para string inválida', () => {
    expect(cleanCurrency('abc')).toBe(0)
  })
})

describe('toISODate', () => {
  it('converte dd/mm/yyyy para yyyy-mm-dd', () => {
    expect(toISODate('15/03/2024')).toBe('2024-03-15')
  })
  it('retorna original para formato desconhecido', () => {
    expect(toISODate('2024-03-15')).toBe('2024-03-15')
  })
})

describe('validateCPF', () => {
  it('aceita 11 dígitos', () => {
    expect(validateCPF('12345678901')).toBe(true)
  })
  it('aceita CPF formatado', () => {
    expect(validateCPF('123.456.789-01')).toBe(true)
  })
  it('rejeita menos de 11 dígitos', () => {
    expect(validateCPF('1234')).toBe(false)
  })
})

describe('validateCNPJ', () => {
  it('aceita 14 dígitos', () => {
    expect(validateCNPJ('12345678000195')).toBe(true)
  })
  it('aceita CNPJ formatado', () => {
    expect(validateCNPJ('12.345.678/0001-95')).toBe(true)
  })
  it('rejeita menos de 14 dígitos', () => {
    expect(validateCNPJ('1234')).toBe(false)
  })
})

describe('validatePhone', () => {
  it('aceita celular 11 dígitos', () => {
    expect(validatePhone('11987654321')).toBe(true)
  })
  it('aceita fixo 10 dígitos', () => {
    expect(validatePhone('1134567890')).toBe(true)
  })
  it('aceita formatado', () => {
    expect(validatePhone('(11) 98765-4321')).toBe(true)
  })
  it('rejeita dígitos insuficientes', () => {
    expect(validatePhone('123')).toBe(false)
  })
})

describe('validateCEP', () => {
  it('aceita 8 dígitos', () => {
    expect(validateCEP('12345678')).toBe(true)
  })
  it('aceita formatado', () => {
    expect(validateCEP('12345-678')).toBe(true)
  })
  it('rejeita inválido', () => {
    expect(validateCEP('1234')).toBe(false)
  })
})

describe('formatDateTime', () => {
  it('converte UTC para horário de Brasília', () => {
    expect(formatDateTime('2026-07-21T14:30:00Z')).toBe('21/07/2026, 11:30')
  })

  it('não adianta o dia em registro criado à noite no Brasil', () => {
    // 21/07 às 22h em Brasília é 22/07 às 01h em UTC. Fatiar a string ISO
    // mostraria 22/07 — a razão de existir desta função.
    expect(formatDateTime('2026-07-22T01:00:00Z')).toBe('21/07/2026, 22:00')
  })

  it('devolve travessão para valor ausente', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
  })

  it('devolve o valor original quando não é data', () => {
    expect(formatDateTime('nao-e-data')).toBe('nao-e-data')
  })
})
