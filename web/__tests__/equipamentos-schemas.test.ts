import { describe, it, expect } from 'vitest'
import {
  painelSchema, inversorSchema, bateriaSchema,
  rowToPainel, painelToRow, rowToInversor, inversorToRow, rowToBateria, bateriaToRow,
} from '@/lib/simuladores/equipamentos/schemas'

describe('painelSchema', () => {
  const minimo = { fabricante: 'OSDA', modelo: 'MHDRZ', potenciaWp: 620, voc: 49.08, vmp: 40.74, isc: 16.08, imp: 15.22, areaM2: 2.7 }
  it('aceita painel mínimo válido (opcionais ausentes)', () => {
    expect(painelSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita quando falta obrigatório (area_m2)', () => {
    const { areaM2, ...semArea } = minimo
    expect(painelSchema.safeParse(semArea).success).toBe(false)
  })
  it('rejeita potência não positiva', () => {
    expect(painelSchema.safeParse({ ...minimo, potenciaWp: 0 }).success).toBe(false)
  })
})

describe('inversorSchema', () => {
  const minimo = { fabricante: 'DEYE', modelo: 'SUN 8K', tipo: 'Híbrido', potCaNomW: 8000, mpptMinV: 125, mpptMaxV: 425, tensaoCcMaxV: 500, numMppt: 2, corrMaxMpptA: 22, potFvMaxWp: 10400 }
  it('aceita inversor mínimo válido', () => {
    expect(inversorSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita tipo fora do enum', () => {
    expect(inversorSchema.safeParse({ ...minimo, tipo: 'Central' }).success).toBe(false)
  })
  it('backup default false quando ausente', () => {
    const p = inversorSchema.parse(minimo)
    expect(p.backup).toBe(false)
  })
})

describe('bateriaSchema', () => {
  const minimo = { fabricante: 'ZTRON', modelo: 'ZTS48150P', tecnologia: 'Lítio NMC', tensaoV: 48, capacidadeAh: 150 }
  it('aceita bateria mínima válida', () => {
    expect(bateriaSchema.safeParse(minimo).success).toBe(true)
  })
  it('rejeita tecnologia fora do enum', () => {
    expect(bateriaSchema.safeParse({ ...minimo, tecnologia: 'Sódio' }).success).toBe(false)
  })
})

describe('mapeadores row<->objeto', () => {
  it('painel: ida e volta preserva valores e nulos', () => {
    const data = painelSchema.parse({ fabricante: 'OSDA', modelo: 'MHDRZ', potenciaWp: 620, voc: 49.08, vmp: 40.74, isc: 16.08, imp: 15.22, areaM2: 2.7, coefPmp: -0.0029 })
    const row = { id: 'p1', organization_id: 'o1', ...painelToRow(data) }
    const back = rowToPainel(row as Record<string, unknown>)
    expect(back.id).toBe('p1')
    expect(back.potenciaWp).toBe(620)
    expect(back.coefPmp).toBe(-0.0029)
    expect(back.noct).toBeNull()
  })
  it('inversor: preserva tipo, backup e opcionais nulos', () => {
    const data = inversorSchema.parse({ fabricante: 'DEYE', modelo: 'SUN 8K', tipo: 'Híbrido', potCaNomW: 8000, mpptMinV: 125, mpptMaxV: 425, tensaoCcMaxV: 500, numMppt: 2, corrMaxMpptA: 22, potFvMaxWp: 10400, eficiencia: 97 })
    const row = { id: 'i1', ...inversorToRow(data) }
    const back = rowToInversor(row as Record<string, unknown>)
    expect(back.tipo).toBe('Híbrido')
    expect(back.backup).toBe(false)
    expect(back.eficiencia).toBe(97)
    expect(back.paralelismo).toBeNull()
  })
  it('bateria: energia calcula depois; aqui preserva o que veio', () => {
    const data = bateriaSchema.parse({ fabricante: 'ZTRON', modelo: 'ZTS48150P', tecnologia: 'Lítio NMC', tensaoV: 48, capacidadeAh: 150, dod: 90, socMin: 10 })
    const row = { id: 'b1', ...bateriaToRow(data) }
    const back = rowToBateria(row as Record<string, unknown>)
    expect(back.dod).toBe(90)
    expect(back.socMin).toBe(10)
    expect(back.energiaKwh).toBeNull()
  })
})
