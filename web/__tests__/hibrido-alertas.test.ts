import { describe, it, expect } from 'vitest'
import { calcularAlertas } from '@/lib/simuladores/hibrido/alertas'
import type { Alerta, CodigoAlerta } from '@/lib/simuladores/hibrido/types'

// Cenário nominal: tudo dentro dos limites.
const OK = {
  temPainel: true, temInversor: true, temBateria: true,
  tensaoStringVocTminV: 395.58, tensaoCcMaxV: 500,
  tensaoStringVmpTmaxV: 289.87, mpptMinV: 125,
  correntePorMpptA: 16.08, corrMaxMpptA: 22,
  oversizingDcAc: 1.24, dcAcMax: 1.35, dcAcMin: 1,
  potenciaInstaladaW: 9920, potFvMaxWp: 10400,
  modulosConfigurados: 16, numModulos: 16,
  producaoDiariaKwh: 34.59, consumoDiarioKwh: 5.85,
  potenciaSimultaneaW: 4056.5, potCaNomW: 8000,
  potSurgeW: 16000, potenciaPartidaW: 5795,
  tensaoBancoV: 48, tensaoCcBatV: 48,
  correnteDescargaA: 84.51, correnteContinuaA: 150,
  autonomiaRealDias: 2.04, diasAutonomia: 2,
  tipoInversor: 'Híbrido' as const, tipoSistema: 'Híbrido' as const,
}

const acha = (as: Alerta[], c: CodigoAlerta) => as.find((a) => a.codigo === c)

describe('cenário nominal', () => {
  const alertas = calcularAlertas(OK)
  it('todas as verificações saem como ok', () => {
    expect(alertas.every((a) => a.severidade === 'ok')).toBe(true)
  })
  it('não emite DADOS_INSUFICIENTES', () => {
    expect(acha(alertas, 'DADOS_INSUFICIENTES')).toBeUndefined()
  })
})

describe('cada verificação dispara na sua condição', () => {
  it('SOBRETENSAO quando Voc@Tmin da string passa a tensão CC máx', () => {
    const a = acha(calcularAlertas({ ...OK, tensaoStringVocTminV: 520 }), 'SOBRETENSAO')
    expect(a?.severidade).toBe('erro')
    expect(a?.valor).toBeCloseTo(520, 6)
    expect(a?.limite).toBeCloseTo(500, 6)
  })
  it('SUBTENSAO_MPPT quando Vmp@Tmax da string fica abaixo do MPPT mínimo', () => {
    expect(acha(calcularAlertas({ ...OK, tensaoStringVmpTmaxV: 100 }), 'SUBTENSAO_MPPT')?.severidade).toBe('erro')
  })
  it('CORRENTE_MPPT quando a corrente por MPPT passa o limite', () => {
    expect(acha(calcularAlertas({ ...OK, correntePorMpptA: 30 }), 'CORRENTE_MPPT')?.severidade).toBe('erro')
  })
  it('OVERSIZING_ALTO acima do DC/AC máximo', () => {
    expect(acha(calcularAlertas({ ...OK, oversizingDcAc: 1.5 }), 'OVERSIZING_ALTO')?.severidade).toBe('aviso')
  })
  it('SUBDIMENSIONADO_FV abaixo do DC/AC mínimo', () => {
    expect(acha(calcularAlertas({ ...OK, oversizingDcAc: 0.8 }), 'SUBDIMENSIONADO_FV')?.severidade).toBe('aviso')
  })
  it('POT_FV_EXCEDE quando a potência FV passa a máxima do inversor', () => {
    expect(acha(calcularAlertas({ ...OK, potenciaInstaladaW: 12000 }), 'POT_FV_EXCEDE')?.severidade).toBe('erro')
  })
  it('CONFIG_DIVERGE quando módulos configurados ≠ definidos', () => {
    expect(acha(calcularAlertas({ ...OK, modulosConfigurados: 20 }), 'CONFIG_DIVERGE')?.severidade).toBe('aviso')
  })
  it('GERACAO_INSUFICIENTE quando a produção não cobre o consumo', () => {
    expect(acha(calcularAlertas({ ...OK, producaoDiariaKwh: 3 }), 'GERACAO_INSUFICIENTE')?.severidade).toBe('aviso')
  })
  it('POTENCIA_CONTINUA quando a carga simultânea passa a nominal CA', () => {
    expect(acha(calcularAlertas({ ...OK, potenciaSimultaneaW: 9000 }), 'POTENCIA_CONTINUA')?.severidade).toBe('erro')
  })
  it('SURGE_INSUFICIENTE quando o surge não cobre a partida', () => {
    expect(acha(calcularAlertas({ ...OK, potSurgeW: 3000 }), 'SURGE_INSUFICIENTE')?.severidade).toBe('erro')
  })
  it('TENSAO_BANCO quando a tensão do banco difere da do inversor', () => {
    expect(acha(calcularAlertas({ ...OK, tensaoBancoV: 96 }), 'TENSAO_BANCO')?.severidade).toBe('aviso')
  })
  it('CRATE_EXCEDIDO quando a corrente de descarga passa a recomendada', () => {
    expect(acha(calcularAlertas({ ...OK, correnteDescargaA: 200 }), 'CRATE_EXCEDIDO')?.severidade).toBe('aviso')
  })
  it('AUTONOMIA_ABAIXO quando a autonomia real fica abaixo do alvo', () => {
    expect(acha(calcularAlertas({ ...OK, autonomiaRealDias: 1.2 }), 'AUTONOMIA_ABAIXO')?.severidade).toBe('aviso')
  })
  it('TIPO_INVERSOR quando o tipo não casa com o sistema', () => {
    expect(acha(calcularAlertas({ ...OK, tipoInversor: 'On-grid' }), 'TIPO_INVERSOR')?.severidade).toBe('aviso')
  })
})

describe('dados ausentes', () => {
  it('sem inversor: emite DADOS_INSUFICIENTES e omite as checagens do inversor', () => {
    const alertas = calcularAlertas({ ...OK, temInversor: false })
    expect(acha(alertas, 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
    expect(acha(alertas, 'SOBRETENSAO')).toBeUndefined()
    expect(acha(alertas, 'POTENCIA_CONTINUA')).toBeUndefined()
  })
  it('sem bateria: omite as checagens de bateria', () => {
    const alertas = calcularAlertas({ ...OK, temBateria: false })
    expect(acha(alertas, 'CRATE_EXCEDIDO')).toBeUndefined()
    expect(acha(alertas, 'AUTONOMIA_ABAIXO')).toBeUndefined()
  })
  it('sem painel: emite DADOS_INSUFICIENTES', () => {
    expect(acha(calcularAlertas({ ...OK, temPainel: false }), 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
  })
  it('consumo zero emite DADOS_INSUFICIENTES', () => {
    expect(acha(calcularAlertas({ ...OK, consumoDiarioKwh: 0 }), 'DADOS_INSUFICIENTES')?.severidade).toBe('erro')
  })
})
