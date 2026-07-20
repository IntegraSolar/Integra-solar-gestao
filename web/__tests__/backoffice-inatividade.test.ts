import { describe, it, expect } from 'vitest'
import { diasUteisEntre, classificarInatividade } from '@/lib/backoffice/inatividade'

// 2026-07-20 é uma segunda-feira.
const SEGUNDA = '2026-07-20'

describe('diasUteisEntre', () => {
  it('mesmo dia não acumula', () => {
    expect(diasUteisEntre(SEGUNDA, SEGUNDA)).toBe(0)
  })

  it('conta um dia útil de sexta para segunda (fim de semana não conta)', () => {
    expect(diasUteisEntre('2026-07-17', SEGUNDA)).toBe(1)
  })

  it('sábado e domingo sozinhos valem zero', () => {
    expect(diasUteisEntre('2026-07-17', '2026-07-19')).toBe(0)
  })

  it('conta a semana útil inteira', () => {
    // seg 13 → seg 20: ter,qua,qui,sex,seg = 5 dias úteis
    expect(diasUteisEntre('2026-07-13', SEGUNDA)).toBe(5)
  })

  it('data futura não gera dias negativos', () => {
    expect(diasUteisEntre('2026-07-25', SEGUNDA)).toBe(0)
  })
})

describe('classificarInatividade', () => {
  it('sem nenhuma proposta é "nunca usou"', () => {
    const r = classificarInatividade(null, SEGUNDA)
    expect(r.tipo).toBe('nunca_usou')
    expect(r.nivel).toBe(0)
  })

  it('proposta hoje é empresa ativa', () => {
    const r = classificarInatividade(`${SEGUNDA}T10:00:00Z`, SEGUNDA)
    expect(r.tipo).toBe('ativa')
    expect(r.dias_uteis).toBe(0)
  })

  it('um dia útil parado já é alerta nível 1', () => {
    const r = classificarInatividade('2026-07-17T10:00:00Z', SEGUNDA)
    expect(r.tipo).toBe('inativa')
    expect(r.dias_uteis).toBe(1)
    expect(r.nivel).toBe(1)
  })

  it('escalona os níveis de 1 a 5', () => {
    expect(classificarInatividade('2026-07-16T10:00:00Z', SEGUNDA).nivel).toBe(2)
    expect(classificarInatividade('2026-07-15T10:00:00Z', SEGUNDA).nivel).toBe(3)
    expect(classificarInatividade('2026-07-14T10:00:00Z', SEGUNDA).nivel).toBe(4)
    expect(classificarInatividade('2026-07-13T10:00:00Z', SEGUNDA).nivel).toBe(5)
  })

  it('acima de cinco dias satura no nível 5, mas mantém a contagem real', () => {
    const r = classificarInatividade('2026-07-06T10:00:00Z', SEGUNDA)
    expect(r.nivel).toBe(5)
    expect(r.dias_uteis).toBe(10)
  })

  it('proposta com data futura (seed) não vira inatividade negativa', () => {
    const r = classificarInatividade('2026-07-25T12:00:00Z', SEGUNDA)
    expect(r.tipo).toBe('ativa')
    expect(r.dias_uteis).toBe(0)
  })
})
