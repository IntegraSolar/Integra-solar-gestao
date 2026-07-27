import { describe, it, expect } from 'vitest'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'
import { montarViabilidadeInput, PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025', tusd: 517.75, te: 304.45, tusdFioB: 303.53,
  tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25, icms: 0.18, pisCofins: 0.05,
  demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23, aplicaReajuste1430: true,
}

describe('proposta de usina não vaza dado interno', () => {
  it('serialização não contém termos sensíveis', () => {
    const input = montarViabilidadeInput({
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD2', valorInvestimento: 154413.82,
      descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
    }, RGE)
    const data = montarApresentacaoUsina({
      input, resultado: calcularViabilidade(input),
      empresa: { nome: 'X', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null },
      clienteNome: null, clienteCidade: null, concessionariaNome: 'RGE',
      modeloPainel: '', modeloInversor: '',
      config: { cor_principal: '#0a0e1a', cor_secundaria: '#0a0e1a' },
    })
    const txt = JSON.stringify(data).toLowerCase()
    for (const termo of ['margem', 'comiss', 'custo interno', 'lucro', 'opexpct']) {
      expect(txt).not.toContain(termo)
    }
  })
})
