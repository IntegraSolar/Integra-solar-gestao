// web/lib/simuladores/viabilidade/proposta-pdf.ts
import type { ViabilidadeInput, ViabilidadeResultado } from './types'
import type { EmpresaProposta } from './proposta-empresa'

export type DadosProposta = {
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const num = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

export async function gerarPropostaPdf(d: DadosProposta): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15

  // Cabeçalho
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 34, 'F')
  if (d.empresa.logoBase64) {
    try { doc.addImage(d.empresa.logoBase64, 'PNG', margin, 8, 34, 16) } catch { /* ignore */ }
  }
  const hx = d.empresa.logoBase64 ? margin + 40 : margin
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(d.empresa.nome, hx, 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text([d.empresa.cnpj ? `CNPJ: ${d.empresa.cnpj}` : null, d.empresa.telefone, d.empresa.email].filter(Boolean).join('   |   '), hx, 20)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 200, 80)
  doc.text('PROPOSTA', W - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}  ·  validade 10 dias`, W - margin, 20, { align: 'right' })

  let y = 40
  if (d.clienteNome) {
    doc.setTextColor(60, 60, 70); doc.setFontSize(9)
    doc.text(`Cliente: ${d.clienteNome}${d.clienteCidade ? ' — ' + d.clienteCidade : ''}`, margin, y)
    y += 6
  }

  const i = d.input, r = d.resultado
  const regraGD = i.modalidade === 'GD1' ? 'GD 1' : 'GD 2'
  const geracaoMensal = r.geracaoAnualKwh / 12

  autoTable(doc, {
    startY: y, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Usina Fotovoltaica (UFV)', '']],
    body: [
      ['Modelo de compensação', 'Compartilhada'],
      ['Regra de transição', regraGD],
      ['Concessionária', d.concessionariaNome],
      ['Potência pico (kWp)', num(r.kwp, 2)],
      ['Potência nominal (kW)', num(i.numInversores * i.potenciaInversorKw, 0)],
      ['Painel FV', `${num(i.potenciaPainelWp)} Wp × ${i.numPaineis} un — ${d.modeloPainel}`],
      ['Inversor(es)', `${num(i.potenciaInversorKw)} kW × ${i.numInversores} un — ${d.modeloInversor}`],
      ['Fator de capacidade', num(i.fatorCapacidade, 2)],
      ['Geração anual (kWh)', num(r.geracaoAnualKwh, 0)],
      ['Geração mensal (kWh)', num(geracaoMensal, 0)],
      ['Tipo de usina', r.tipoUsina],
    ],
  })

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Premissas do projeto', '']],
    body: [
      ['Desconto do consumidor', pct(i.descontoLocacao)],
      ['Tarifa compensável (R$/kWh)', num(i.tarifaLocacaoBase, 4)],
      ['Reajuste de energia / IPCA', pct(i.reajusteTarifaAnual)],
      ['Fator de indisponibilidade', pct(i.degradacaoAnual)],
      ['TMA', pct(i.tma)],
      ['Percentual de imposto', pct(i.impostoPct)],
    ],
  })

  const reinvestAno15 = 0.1 * i.valorInvestimento * Math.pow(1.02, 15)
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Custos totais do projeto', '']],
    body: [
      ['Investimento inicial (CAPEX)', brl(-i.valorInvestimento)],
      ['Reestruturação do inversor (ano 15)', brl(-reinvestAno15)],
      ['Vida útil do projeto (anos)', String(i.horizonteAnos)],
    ],
  })
  // TODO-oem-vp: "O&M Acumulado (VP)" omitido — não reproduzível do output atual do motor.

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [31, 157, 85] },
    head: [['Resultados', 'Capital próprio', 'Com financiamento']],
    body: [
      ['TIR', pct(r.capitalProprio.tir), pct(r.comFinanciamento.tir)],
      ['VPL', brl(r.capitalProprio.vpl), brl(r.comFinanciamento.vpl)],
      ['Payback (anos)', String(r.capitalProprio.paybackAnos), String(r.comFinanciamento.paybackAnos)],
    ],
  })

  const gy = (doc as any).lastAutoTable.finalY + 6
  desenharGraficoAcumulado(doc, r, margin, gy, W - margin * 2, 45)

  doc.addPage()
  autoTable(doc, {
    startY: margin, theme: 'striped', styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Ano', 'Produção (kWh)', 'Receita', 'OPEX', 'Fluxo próprio', 'Acumulado']],
    body: r.projecao.map((l) => [
      String(l.ano), num(l.producaoKwh, 0), brl(l.receitaBruta), brl(l.opex),
      brl(l.fluxoProprio), brl(l.fluxoProprioAcum),
    ]),
  })

  const fname = `proposta-viabilidade-${d.concessionariaNome}-${num(r.kwp, 0)}kwp.pdf`.replace(/\s+/g, '-')
  doc.save(fname)
}

function desenharGraficoAcumulado(
  doc: any, r: ViabilidadeResultado, x: number, y: number, w: number, h: number,
): void {
  const acum = r.projecao.map((l) => l.fluxoProprioAcum)
  const min = Math.min(...acum, 0)
  const max = Math.max(...acum, 0)
  const range = max - min || 1
  const anosOperacionais = acum.length - 1 // projeção = ano 0 + horizonte
  const sx = (idx: number) => x + (idx / (anosOperacionais || 1)) * w
  const sy = (v: number) => y + h - ((v - min) / range) * h

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2)
  doc.rect(x, y, w, h)
  doc.setDrawColor(150, 150, 150)
  doc.line(x, sy(0), x + w, sy(0))
  doc.setDrawColor(31, 157, 85); doc.setLineWidth(0.5)
  for (let k = 1; k < acum.length; k++) doc.line(sx(k - 1), sy(acum[k - 1]), sx(k), sy(acum[k]))
  doc.setFontSize(7); doc.setTextColor(90, 90, 90)
  doc.text(`Fluxo de caixa acumulado (${anosOperacionais} anos)`, x, y - 1.5)
  doc.text(brl(max), x + w, y + 3, { align: 'right' })
  doc.text(brl(min), x + w, y + h, { align: 'right' })
}
