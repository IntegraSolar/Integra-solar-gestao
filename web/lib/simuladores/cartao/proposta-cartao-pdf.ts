// web/lib/simuladores/cartao/proposta-cartao-pdf.ts
import type { OpcaoParcelamento } from './calculo'
import type { EmpresaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'

export type TabelaPdf = { nome: string; observacao: string | null; opcoes: OpcaoParcelamento[] }
export type DadosCartaoPdf = {
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  valorProposta: number
  entrada: number
  valorParcelar: number
  repassar: boolean
  tabelas: TabelaPdf[]
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export async function gerarPropostaCartaoPdf(d: DadosCartaoPdf): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15

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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 200, 80)
  doc.text('PARCELAMENTO', W - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 200, 220)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - margin, 20, { align: 'right' })

  let y = 40
  if (d.clienteNome) {
    doc.setTextColor(60, 60, 70); doc.setFontSize(9)
    doc.text(`Cliente: ${d.clienteNome}${d.clienteCidade ? ' — ' + d.clienteCidade : ''}`, margin, y); y += 6
  }
  doc.setTextColor(40, 40, 50); doc.setFontSize(9)
  doc.text(
    `Proposta: ${brl(d.valorProposta)}   |   Entrada: ${brl(d.entrada)}   |   A parcelar: ${brl(d.valorParcelar)}   |   Taxa repassada ao cliente: ${d.repassar ? 'Sim' : 'Não'}`,
    margin, y,
  )
  y += 4

  for (const t of d.tabelas) {
    autoTable(doc, {
      startY: y + 2, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.2 },
      headStyles: { fillColor: [15, 23, 42] },
      head: [[{ content: `${t.nome}${t.observacao ? '  —  ' + t.observacao : ''}`, colSpan: 4 }]],
      body: [
        ['Plano', 'Taxa', 'Valor total', 'Valor da parcela'],
        ...t.opcoes.map((o) => [`${o.parcelas}x`, pct(o.taxa), brl(o.valorTotal), brl(o.valorParcela)]),
      ],
      didParseCell: (data: any) => { if (data.row.index === 0) data.cell.styles.fontStyle = 'bold' },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  const fname = `parcelamento-${Math.round(d.valorProposta)}.pdf`
  doc.save(fname)
}
