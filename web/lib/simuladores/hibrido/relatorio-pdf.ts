// web/lib/simuladores/hibrido/relatorio-pdf.ts
import { montarRelatorio } from './relatorio-conteudo'
import { desenharCabecalho, desenharSecoes, MARGEM } from './documento-pdf'
import type { DadosRelatorio } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'
import type jsPDF from 'jspdf'
import type { LinhaProjecaoFinanceira } from './types'

function desenharGraficoAcumulado(doc: jsPDF, projecao: LinhaProjecaoFinanceira[], y: number) {
  const W = doc.internal.pageSize.getWidth()
  const x = MARGEM
  const w = W - MARGEM * 2
  const h = 45
  const valores = projecao.map((l) => l.fluxoAcumulado)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const faixa = max - min || 1
  const py = (v: number) => y + h - ((v - min) / faixa) * h

  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.text('Fluxo de caixa acumulado', x, y - 2)

  doc.setDrawColor(200, 205, 215)
  doc.line(x, py(0), x + w, py(0))

  doc.setDrawColor(255, 159, 64)
  doc.setLineWidth(0.6)
  for (let i = 1; i < projecao.length; i++) {
    const x1 = x + ((i - 1) / (projecao.length - 1)) * w
    const x2 = x + (i / (projecao.length - 1)) * w
    doc.line(x1, py(valores[i - 1]), x2, py(valores[i]))
  }
  doc.setLineWidth(0.2)
}

export async function gerarRelatorioPdf(
  dados: DadosRelatorio, empresa: EmpresaProposta
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const y0 = desenharCabecalho(
    doc, empresa, 'RELATÓRIO EXECUTIVO',
    `Emitido em ${dados.dataEmissao.toLocaleDateString('pt-BR')}`
  )
  const y = desenharSecoes(doc, autoTable as never, montarRelatorio(dados), y0)

  const H = doc.internal.pageSize.getHeight()
  const yGrafico = y > H - 60 ? (doc.addPage(), MARGEM + 10) : y + 6
  desenharGraficoAcumulado(doc, dados.financeiro.projecao, yGrafico)

  const cliente = dados.dados.clienteNome.trim() || 'projeto'
  doc.save(`relatorio-executivo-${cliente.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
