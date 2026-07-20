import { describe, it, expect } from 'vitest'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
  type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import {
  PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO,
} from '@/lib/simuladores/hibrido/premissas'
import { fioBSchedule } from '@/lib/simuladores/fio-b'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { PAINEL, INVERSOR, BATERIA, CARGAS, PROJETO } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

const RESULTADO = calcularHibrido(
  montarHibridoInput(
    {
      ...CAMPOS_INICIAIS,
      tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
      hspMensal: PROJETO.hspMensal,
      painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
      numModulos: '16',
    },
    EQUIP,
    CARGAS
  )
)

const BASE: CamposFinanceiro = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' }

describe('fisicoParaFinanceiro', () => {
  const f = fisicoParaFinanceiro(RESULTADO)

  it('extrai os seis campos das origens certas', () => {
    expect(f.numModulos).toBe(RESULTADO.dimensionamento.numModulos)
    expect(f.numInversores).toBe(RESULTADO.inversor.numInversoresParalelo)
    expect(f.numBaterias).toBe(RESULTADO.baterias.numBaterias)
    expect(f.potenciaInstaladaKwp).toBe(RESULTADO.dimensionamento.potenciaInstaladaKwp)
    expect(f.producaoAnualKwh).toBe(RESULTADO.dimensionamento.producaoAnualKwh)
    expect(f.consumoAnualKwh).toBe(RESULTADO.cargas.consumoAnualKwh)
  })
  it('os valores do projeto de teste chegam com sentido físico', () => {
    expect(f.numModulos).toBe(16)
    expect(f.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
    expect(f.numBaterias).toBeGreaterThan(0)
  })
})

describe('camposFinanceiroIniciais', () => {
  const c = camposFinanceiroIniciais(2026)

  it('tarifas começam vazias (não há padrão razoável)', () => {
    expect(c.tarifaKwh).toBe('')
    expect(c.tusdFioBKwh).toBe('')
    expect(c.disponibilidadeKwhMes).toBe('')
  })
  it('preços vêm pré-preenchidos com os padrões', () => {
    expect(c.moduloUnitario).toBe(String(PRECOS_CAPEX_PADRAO.moduloUnitario))
    expect(c.bateriaUnitaria).toBe(String(PRECOS_CAPEX_PADRAO.bateriaUnitaria))
  })
  it('premissas vêm pré-preenchidas e o ano de conexão vem do parâmetro', () => {
    expect(c.bdi).toBe(String(PREMISSAS_FINANCEIRAS_PADRAO.bdi))
    expect(c.horizonteAnos).toBe(String(PREMISSAS_FINANCEIRAS_PADRAO.horizonteAnos))
    expect(c.anoConexao).toBe('2026')
  })
})

describe('montarFinanceiroInput', () => {
  const fisico = fisicoParaFinanceiro(RESULTADO)

  it('repassa as tarifas digitadas', () => {
    const p = montarFinanceiroInput({ ...BASE, tusdFioBKwh: '0.36', disponibilidadeKwhMes: '100' }, fisico)
    expect(p.tarifas.tarifaKwh).toBe(1.22)
    expect(p.tarifas.tusdFioBKwh).toBe(0.36)
    expect(p.tarifas.disponibilidadeKwhMes).toBe(100)
  })
  it('tarifa em branco vira 0 (sem padrão possível)', () => {
    const p = montarFinanceiroInput({ ...BASE, tarifaKwh: '' }, fisico)
    expect(p.tarifas.tarifaKwh).toBe(0)
  })
  it('preço em branco cai no padrão do motor', () => {
    const p = montarFinanceiroInput({ ...BASE, moduloUnitario: '' }, fisico)
    expect(p.precos?.moduloUnitario).toBe(PRECOS_CAPEX_PADRAO.moduloUnitario)
  })
  it('preço preenchido sobrepõe o padrão', () => {
    const p = montarFinanceiroInput({ ...BASE, moduloUnitario: '900' }, fisico)
    expect(p.precos?.moduloUnitario).toBe(900)
  })
  it('texto inválido cai no padrão', () => {
    const p = montarFinanceiroInput({ ...BASE, bdi: 'abc' }, fisico)
    expect(p.premissas?.bdi).toBe(PREMISSAS_FINANCEIRAS_PADRAO.bdi)
  })
  it('zero digitado é respeitado', () => {
    const p = montarFinanceiroInput({ ...BASE, bdi: '0' }, fisico)
    expect(p.premissas?.bdi).toBe(0)
  })

  it('deriva o fioBSchedule do ano de conexão e do horizonte', () => {
    const p = montarFinanceiroInput({ ...BASE, anoConexao: '2027', horizonteAnos: '25' }, fisico)
    expect(p.premissas?.fioBSchedule).toEqual(fioBSchedule(2027, 25))
    expect(p.premissas?.fioBSchedule[0]).toBeCloseTo(0.75, 9)
  })
  it('horizonte customizado muda o tamanho do schedule', () => {
    const p = montarFinanceiroInput({ ...BASE, anoConexao: '2026', horizonteAnos: '10' }, fisico)
    expect(p.premissas?.horizonteAnos).toBe(10)
    expect(p.premissas?.fioBSchedule).toHaveLength(10)
  })
  it('repassa o físico sem alterar', () => {
    const p = montarFinanceiroInput(BASE, fisico)
    expect(p.fisico).toEqual(fisico)
  })
})
