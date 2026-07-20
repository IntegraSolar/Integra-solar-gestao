import { describe, it, expect } from 'vitest'
import {
  CAMPOS_INICIAIS, DIAS_MES, montarHibridoInput, montarPremissas,
  type CamposHibrido, type EquipamentosDisponiveis,
} from '@/lib/simuladores/hibrido/montar-input'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { PAINEL, INVERSOR, BATERIA, CARGAS, PROJETO } from './fixtures/hibrido-fixture'

const EQUIP: EquipamentosDisponiveis = {
  paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA],
}

const COMPLETO: CamposHibrido = {
  ...CAMPOS_INICIAIS,
  tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  perdaSombreamento: 0.03, perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
}

describe('montarHibridoInput — mapeamento', () => {
  const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)

  it('monta o projeto com os campos da tela e os dias do calendário', () => {
    expect(input.projeto.hspMensal).toEqual(PROJETO.hspMensal)
    expect(input.projeto.diasMes).toEqual(DIAS_MES)
    expect(input.projeto.tempMediaC).toBe(27)
    expect(input.projeto.tempMaxC).toBe(38)
    expect(input.projeto.tempMinC).toBe(22)
    expect(input.projeto.criterioGeracao).toBe('mes_critico')
  })
  it('resolve os equipamentos pelos ids', () => {
    expect(input.painel?.modelo).toBe('MHDRZ')
    expect(input.inversor?.modelo).toBe('SUN 8K (EU)')
    expect(input.bateria?.modelo).toBe('ZTS48150P')
  })
  it('id inexistente vira null (motor trata)', () => {
    const i = montarHibridoInput({ ...COMPLETO, painelId: 'nao-existe' }, EQUIP, CARGAS)
    expect(i.painel).toBeNull()
  })
  it('repassa as cargas sem alterar', () => {
    expect(input.cargas).toEqual(CARGAS)
  })
})

describe('montarHibridoInput — regra "vazio ≠ zero"', () => {
  it('overrides em branco são OMITIDOS do input', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    expect(input.numModulos).toBeUndefined()
    expect(input.modulosPorString).toBeUndefined()
    expect(input.numStrings).toBeUndefined()
    expect(input.tensaoBancoV).toBeUndefined()
    expect(input.diasAutonomia).toBeUndefined()
  })

  it('omitir faz o motor usar o nº de módulos RECOMENDADO, não zero', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    const r = calcularHibrido(input)
    expect(r.dimensionamento.numModulos).toBe(r.dimensionamento.numModulosRecomendado)
    expect(r.dimensionamento.numModulos).toBeGreaterThan(0)
  })

  it('override preenchido chega ao motor e muda o resultado', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: '16' }, EQUIP, CARGAS)
    expect(input.numModulos).toBe(16)
    const r = calcularHibrido(input)
    expect(r.dimensionamento.numModulos).toBe(16)
    expect(r.dimensionamento.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
  })

  it('override com texto inválido é tratado como vazio', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: 'abc' }, EQUIP, CARGAS)
    expect(input.numModulos).toBeUndefined()
  })

  it('override zero explícito é respeitado (o usuário digitou 0)', () => {
    const input = montarHibridoInput({ ...COMPLETO, numModulos: '0' }, EQUIP, CARGAS)
    expect(input.numModulos).toBe(0)
  })

  it('baseEnergia e tipoSistema são sempre enviados (têm valor sempre)', () => {
    const input = montarHibridoInput(COMPLETO, EQUIP, CARGAS)
    expect(input.baseEnergia).toBe('total')
    expect(input.tipoSistema).toBe('Híbrido')
  })
})

describe('montarPremissas', () => {
  it('sem customização devolve exatamente as premissas padrão', () => {
    expect(montarPremissas(COMPLETO)).toEqual(PREMISSAS_PADRAO)
  })
  it('customização sobrepõe só o campo informado', () => {
    const p = montarPremissas({ ...COMPLETO, simultaneidade: '0.5' })
    expect(p.simultaneidade).toBe(0.5)
    expect(p.margemInversor).toBe(PREMISSAS_PADRAO.margemInversor)
    expect(p.soiling).toBe(PREMISSAS_PADRAO.soiling)
  })
  it('aceita margem, DC/AC máx e mín', () => {
    const p = montarPremissas({ ...COMPLETO, margemInversor: '0.3', dcAcMax: '1.5', dcAcMin: '0.9' })
    expect(p.margemInversor).toBe(0.3)
    expect(p.dcAcMax).toBe(1.5)
    expect(p.dcAcMin).toBe(0.9)
  })
  it('texto inválido não sobrepõe o padrão', () => {
    const p = montarPremissas({ ...COMPLETO, simultaneidade: 'xyz' })
    expect(p.simultaneidade).toBe(PREMISSAS_PADRAO.simultaneidade)
  })
})

describe('CAMPOS_INICIAIS', () => {
  it('tem 12 HSP e nenhum equipamento pré-selecionado', () => {
    expect(CAMPOS_INICIAIS.hspMensal).toHaveLength(12)
    expect(CAMPOS_INICIAIS.painelId).toBe('')
  })
  it('todos os overrides começam vazios', () => {
    expect(CAMPOS_INICIAIS.numModulos).toBe('')
    expect(CAMPOS_INICIAIS.modulosPorString).toBe('')
    expect(CAMPOS_INICIAIS.simultaneidade).toBe('')
  })
})
