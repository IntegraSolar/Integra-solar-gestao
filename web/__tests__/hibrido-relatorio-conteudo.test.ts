import { describe, it, expect } from 'vitest'
import { montarRelatorio } from '@/lib/simuladores/hibrido/relatorio-conteudo'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { DADOS_PROJETO_INICIAL } from '@/components/simuladores/HibridoIdentificacao'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }
const CAMPOS = {
  ...CAMPOS_INICIAIS, tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id, numModulos: '16',
}
const RESULTADO = calcularHibrido(montarHibridoInput(CAMPOS, EQUIP, CARGAS))
const CAMPOS_FIN = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22', tusdFioBKwh: '0.36', disponibilidadeKwhMes: '100' }
const PARAMS_FIN = montarFinanceiroInput(CAMPOS_FIN, fisicoParaFinanceiro(RESULTADO))
const FINANCEIRO = calcularFinanceiro(PARAMS_FIN)
const ECONOMIA = calcularEconomiaAno(1, {
  fisico: PARAMS_FIN.fisico, tarifas: PARAMS_FIN.tarifas,
  premissas: PARAMS_FIN.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO,
})

const DATA_FIXA = new Date('2026-07-19T12:00:00Z')

const BASE = {
  dados: { ...DADOS_PROJETO_INICIAL, nome: 'Projeto Palmas', clienteNome: 'Iago' },
  projeto: { ...PROJETO }, resultado: RESULTADO,
  painel: PAINEL, inversor: INVERSOR, bateria: BATERIA, tipoSistema: 'Híbrido',
  financeiro: FINANCEIRO, economiaAno1: ECONOMIA, camposFin: CAMPOS_FIN,
  dataEmissao: DATA_FIXA,
}

const texto = (s: { paragrafos?: string[]; linhas?: { rotulo: string; valor: string }[] }) =>
  [...(s.paragrafos ?? []), ...(s.linhas ?? []).map((l) => `${l.rotulo}: ${l.valor}`)].join(' | ')

describe('montarRelatorio — estrutura', () => {
  const secoes = montarRelatorio(BASE)
  const tudo = secoes.map(texto).join(' | ')

  it('inclui o bloco de premissas adotadas', () => {
    expect(secoes.some((s) => /Premissas/i.test(s.titulo))).toBe(true)
  })
  it('as premissas mostram tarifa, TMA, inflação e horizonte', () => {
    const p = secoes.find((s) => /Premissas/i.test(s.titulo))!
    const t = texto(p)
    expect(t).toContain('1,22')
    expect(t).toMatch(/TMA/i)
    expect(t).toMatch(/[Ii]nflação/)
    expect(t).toMatch(/25/)
  })
  it('registra que os valores são estimativas, não garantia', () => {
    expect(tudo).toMatch(/estimativa/i)
    expect(tudo).toMatch(/não constituem garantia|não constitui garantia/i)
  })
})

describe('montarRelatorio — data de emissão vem por parâmetro', () => {
  it('imprime a data passada, não a de hoje', () => {
    const tudo = montarRelatorio(BASE).map(texto).join(' | ')
    expect(tudo).toContain(DATA_FIXA.toLocaleDateString('pt-BR'))
  })
  it('mudar a data muda o documento', () => {
    const outra = new Date('2030-01-15T12:00:00Z')
    const tudo = montarRelatorio({ ...BASE, dataEmissao: outra }).map(texto).join(' | ')
    expect(tudo).toContain(outra.toLocaleDateString('pt-BR'))
  })
})

describe('montarRelatorio — indicadores batem com o motor', () => {
  const secoes = montarRelatorio(BASE)
  const fin = texto(secoes.find((s) => /Viabilidade/i.test(s.titulo))!)

  it('investimento total e VPL vêm do motor', () => {
    const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    expect(fin).toContain(brl(FINANCEIRO.capex.investimentoTotal))
    expect(fin).toContain(brl(FINANCEIRO.indicadores.vpl))
  })
})

describe('montarRelatorio — payback nulo', () => {
  const semPayback = {
    ...FINANCEIRO,
    indicadores: { ...FINANCEIRO.indicadores, paybackSimplesAnos: null, paybackDescontadoAnos: null },
  }
  const tudo = montarRelatorio({ ...BASE, financeiro: semPayback }).map(texto).join(' | ')

  it('sai como "não se paga no horizonte"', () => {
    expect(tudo).toMatch(/não se paga no horizonte/i)
  })
  it('e nunca como "0 anos"', () => {
    expect(tudo).not.toMatch(/0 anos/)
  })
})

describe('montarRelatorio — conclusão condicional', () => {
  it('VPL positivo conclui pela viabilidade', () => {
    const c = montarRelatorio(BASE).find((s) => /Conclus/i.test(s.titulo))!
    expect(FINANCEIRO.indicadores.vpl).toBeGreaterThan(0)
    expect(texto(c)).toMatch(/vi[áa]vel/i)
  })
  it('VPL negativo recomenda revisar as premissas', () => {
    const ruim = { ...FINANCEIRO, indicadores: { ...FINANCEIRO.indicadores, vpl: -50000 } }
    const c = montarRelatorio({ ...BASE, financeiro: ruim }).find((s) => /Conclus/i.test(s.titulo))!
    expect(texto(c)).toMatch(/revisar/i)
  })
})
