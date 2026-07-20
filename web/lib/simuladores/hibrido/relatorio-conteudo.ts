// web/lib/simuladores/hibrido/relatorio-conteudo.ts
// Monta o conteúdo do Relatório executivo. Função PURA.
//
// Este documento vai para o cliente e influencia uma decisão de compra de
// dezenas de milhares de reais. Os indicadores são projeções de 25 anos
// apoiadas em premissas discutíveis, por isso o relatório imprime as premissas
// adotadas como bloco próprio e registra que os valores são estimativas.
import type { DadosRelatorio, SecaoDocumento } from './documento-tipos'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const brl = (v: number) => `R$ ${n(v)}`
const pct = (v: number) => `${n(v * 100, 1)}%`
const ou = (v: string, sufixo = '') => (v.trim() === '' ? '—' : `${v.trim()}${sufixo}`)
/** Campo numérico da tela (string) formatado como número pt-BR, ou travessão se em branco. */
const ouN = (v: string, casas = 2) => (v.trim() === '' ? '—' : n(Number(v), casas))

/** `null` = não se paga no horizonte. Imprimir 0 diria o oposto. */
const payback = (v: number | null) => (v === null ? 'não se paga no horizonte' : `${n(v, 1)} anos`)

export function montarRelatorio(d: DadosRelatorio): SecaoDocumento[] {
  const { dados, resultado, painel, inversor, bateria, financeiro, economiaAno1, camposFin } = d
  const dim = resultado.dimensionamento
  const ind = financeiro.indicadores
  const cobertura = resultado.cargas.consumoAnualKwh > 0
    ? dim.producaoAnualKwh / resultado.cargas.consumoAnualKwh
    : 0
  const horizonte = financeiro.projecao.length - 1

  const conclusao = ind.vpl > 0
    ? `Com investimento total de ${brl(financeiro.capex.investimentoTotal)}, o sistema proporciona economia estimada de ${brl(economiaAno1.economiaLiquida)} no primeiro ano e Valor Presente Líquido positivo de ${brl(ind.vpl)} ao longo de ${horizonte} anos, com retorno do capital em ${payback(ind.paybackSimplesAnos)}. Nas premissas adotadas, o projeto se mostra economicamente viável.`
    : `Nas premissas adotadas, o Valor Presente Líquido do projeto é de ${brl(ind.vpl)}. Recomenda-se revisar os custos de instalação, a tarifa considerada e o dimensionamento antes de prosseguir.`

  return [
    {
      titulo: '1. Identificação',
      linhas: [
        { rotulo: 'Cliente', valor: ou(dados.clienteNome) },
        { rotulo: 'Simulação', valor: ou(dados.nome) },
        { rotulo: 'Local', valor: `${ou(dados.clienteCidade)} / ${ou(dados.clienteUf)}` },
        { rotulo: 'Concessionária', valor: ou(dados.concessionaria) },
        { rotulo: 'Responsável técnico', valor: ou(dados.responsavelTecnico) },
        { rotulo: 'Data de emissão', valor: d.dataEmissao.toLocaleDateString('pt-BR') },
      ],
    },
    {
      titulo: '2. Sistema proposto',
      linhas: [
        { rotulo: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { rotulo: 'Módulos', valor: painel ? `${n(dim.numModulos, 0)} × ${painel.fabricante} ${painel.modelo}` : '—' },
        { rotulo: 'Área necessária', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { rotulo: 'Inversor', valor: inversor ? `${n(resultado.inversor.numInversoresParalelo, 0)} × ${inversor.fabricante} ${inversor.modelo}` : '—' },
        { rotulo: 'Potência CA total', valor: `${n(resultado.inversor.potenciaCaTotalW, 0)} W` },
        {
          rotulo: 'Banco de baterias',
          valor: bateria
            ? `${n(resultado.baterias.numBaterias, 0)} × ${bateria.modelo} · ${n(resultado.baterias.energiaInstaladaKwh)} kWh`
            : 'não contemplado',
        },
      ],
    },
    {
      titulo: '3. Desempenho energético',
      linhas: [
        { rotulo: 'Irradiação média (HSP)', valor: `${n(dim.hspMediaAnual)} kWh/m²·dia` },
        { rotulo: 'Consumo anual', valor: `${n(resultado.cargas.consumoAnualKwh, 0)} kWh` },
        { rotulo: 'Geração anual estimada', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { rotulo: 'Cobertura do consumo', valor: pct(cobertura) },
        { rotulo: 'Produção diária média', valor: `${n(dim.producaoDiariaKwh, 1)} kWh` },
        { rotulo: 'Performance Ratio', valor: pct(dim.prTotal) },
        {
          rotulo: 'Autonomia do banco',
          valor: bateria ? `${n(resultado.baterias.autonomiaRealDias, 1)} dias` : '—',
        },
      ],
    },
    {
      titulo: '4. Viabilidade financeira',
      linhas: [
        { rotulo: 'Investimento total', valor: brl(financeiro.capex.investimentoTotal) },
        { rotulo: 'Investimento por kWp', valor: brl(financeiro.capex.investimentoPorKwp) },
        { rotulo: 'Economia no 1º ano', valor: brl(economiaAno1.economiaLiquida) },
        { rotulo: `Economia acumulada (${horizonte} anos)`, valor: brl(ind.economiaAcumulada) },
        { rotulo: 'Payback simples', valor: payback(ind.paybackSimplesAnos) },
        { rotulo: 'Payback descontado', valor: payback(ind.paybackDescontadoAnos) },
        { rotulo: 'VPL', valor: brl(ind.vpl) },
        { rotulo: 'TIR', valor: pct(ind.tir) },
        { rotulo: 'LCOE', valor: `R$ ${n(ind.lcoe, 4)}/kWh` },
      ],
    },
    {
      titulo: '5. Premissas adotadas',
      linhas: [
        { rotulo: 'Tarifa de energia', valor: `R$ ${ouN(camposFin.tarifaKwh)}/kWh` },
        { rotulo: 'TUSD Fio B', valor: `R$ ${ouN(camposFin.tusdFioBKwh)}/kWh` },
        { rotulo: 'Inflação da tarifa', valor: `${ouN(camposFin.inflacaoTarifa, 3)} ao ano (fração)` },
        { rotulo: 'TMA', valor: `${ouN(camposFin.tma, 3)} ao ano (fração)` },
        { rotulo: 'Degradação dos módulos', valor: `${ouN(camposFin.degradacaoAnual, 3)} ao ano (fração)` },
        { rotulo: 'O&M anual', valor: `${ouN(camposFin.omAnual, 3)} do investimento (fração)` },
        { rotulo: 'Horizonte de análise', valor: `${horizonte} anos` },
        { rotulo: 'Ano de conexão', valor: ou(camposFin.anoConexao) },
      ],
    },
    {
      titulo: '6. Conclusão',
      paragrafos: [
        conclusao,
        'Os valores apresentados são estimativas calculadas a partir das premissas declaradas neste relatório — irradiação informada, inflação da tarifa, degradação dos módulos e taxa mínima de atratividade. Alterações regulatórias, reajustes da concessionária ou condições de instalação diferentes das previstas podem alterar o resultado. Não constituem garantia de retorno financeiro.',
      ],
    },
  ]
}
