import { describe, it, expect } from 'vitest'
import { custosProjeto } from '@/lib/apresentacoes-usina/custos'
import { montarViabilidadeInput, PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025',
  tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25,
  icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23,
  aplicaReajuste1430: true,
}
const campos = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2' as const, valorInvestimento: 154413.82,
  descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
}

function linhas() {
  const input = montarViabilidadeInput(campos, RGE)
  return custosProjeto(input, calcularViabilidade(input))
}

// toLocaleString('pt-BR', BRL) usa U+00A0 entre "R$" e os dígitos — normaliza p/ espaço comum.
const achar = (rot: string) =>
  linhas().find((l) => l.rotulo.includes(rot))?.valor.replace(/ /g, ' ')

describe('custosProjeto (Custos Totais do Projeto - Vida Util)', () => {
  it('reproduz CAPEX, reestruturacao e vida util da planilha', () => {
    expect(achar('CAPEX')).toBe('-R$ 154.413,82')
    expect(achar('Reestrutura')).toBe('-R$ 20.782,07')
    expect(achar('Vida útil')).toBe('25 anos')
  })

  it('reproduz OPEX acumulado (VP), Total, LCoE e CO2 da planilha', () => {
    // C39 = -959.820,04 ; C40 = -1.135.015,93 ; C43 = 0,4155 ; C44 = 9.482 kg/ano
    expect(achar('OPEX acumulado')).toBe('-R$ 959.820,04')
    expect(achar('Total dos custos')).toBe('-R$ 1.135.015,93')
    expect(achar('LCoE')).toBe('0,4155 R$/kWh')
    expect(achar('CO')).toBe('9.482 kg/ano')
  })
})
