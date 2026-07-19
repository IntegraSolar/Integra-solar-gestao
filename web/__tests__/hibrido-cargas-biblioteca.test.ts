import { describe, it, expect } from 'vitest'
import {
  cargaBibliotecaSchema, rowToCargaBiblioteca, cargaBibliotecaToRow,
  bibliotecaParaCarga, duracaoJanelaHoras,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const MINIMO = {
  nome: 'Geladeira duplex',
  potenciaUnitW: 150,
  potenciaPartidaW: 600,
  tensaoV: 220,
  fatorPotencia: 0.85,
  horasDia: 10,
  diasSemana: 7,
  horaInicio: 0,
  horaFim: 24,
  critica: true,
}

describe('cargaBibliotecaSchema', () => {
  it('aceita um modelo mínimo válido', () => {
    expect(cargaBibliotecaSchema.safeParse(MINIMO).success).toBe(true)
  })
  it('rejeita potência de partida menor que a nominal', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, potenciaPartidaW: 100 }).success).toBe(false)
  })
  it('aceita partida igual à nominal (cargas resistivas)', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, potenciaUnitW: 5500, potenciaPartidaW: 5500 }).success).toBe(true)
  })
  it('rejeita fator de potência fora de (0, 1]', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 0 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 1.2 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, fatorPotencia: 1 }).success).toBe(true)
  })
  it('rejeita horas/dia fora de 0–24', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horasDia: 25 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horasDia: -1 }).success).toBe(false)
  })
  it('rejeita dias/semana fora de 1–7', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, diasSemana: 0 }).success).toBe(false)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, diasSemana: 8 }).success).toBe(false)
  })
  it('aceita hora 24 (dia inteiro) e rejeita acima disso', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horaFim: 24 }).success).toBe(true)
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, horaFim: 25 }).success).toBe(false)
  })
  it('rejeita nome vazio', () => {
    expect(cargaBibliotecaSchema.safeParse({ ...MINIMO, nome: '' }).success).toBe(false)
  })
})

describe('mapeadores row<->objeto', () => {
  it('ida e volta preserva valores e nulos', () => {
    const data = cargaBibliotecaSchema.parse(MINIMO)
    const row = { id: 'b1', ...cargaBibliotecaToRow(data) }
    const back = rowToCargaBiblioteca(row as Record<string, unknown>)
    expect(back.id).toBe('b1')
    expect(back.nome).toBe('Geladeira duplex')
    expect(back.potenciaPartidaW).toBe(600)
    expect(back.critica).toBe(true)
    expect(back.categoria).toBeNull()
    expect(back.prioridade).toBeNull()
  })
})

describe('bibliotecaParaCarga', () => {
  const modelo = { id: 'b1', ...cargaBibliotecaSchema.parse({ ...MINIMO, categoria: 'Refrigeração', prioridade: 'Alta' }) }

  it('cria a carga com quantidade 1', () => {
    expect(bibliotecaParaCarga(modelo).quantidade).toBe(1)
  })
  it('copia os demais campos do modelo', () => {
    const c = bibliotecaParaCarga(modelo)
    expect(c.nome).toBe('Geladeira duplex')
    expect(c.categoria).toBe('Refrigeração')
    expect(c.potenciaUnitW).toBe(150)
    expect(c.potenciaPartidaW).toBe(600)
    expect(c.tensaoV).toBe(220)
    expect(c.fatorPotencia).toBe(0.85)
    expect(c.horasDia).toBe(10)
    expect(c.diasSemana).toBe(7)
    expect(c.horaInicio).toBe(0)
    expect(c.horaFim).toBe(24)
    expect(c.prioridade).toBe('Alta')
    expect(c.critica).toBe(true)
  })
  it('não carrega o id do modelo para a carga', () => {
    expect('id' in bibliotecaParaCarga(modelo)).toBe(false)
  })
})

describe('duracaoJanelaHoras', () => {
  it('janela simples', () => {
    expect(duracaoJanelaHoras(18, 22)).toBe(4)
  })
  it('janela que atravessa a meia-noite', () => {
    expect(duracaoJanelaHoras(18, 6)).toBe(12)
  })
  it('dia inteiro', () => {
    expect(duracaoJanelaHoras(0, 24)).toBe(24)
  })
  it('janela nula', () => {
    expect(duracaoJanelaHoras(10, 10)).toBe(0)
  })
})
