// web/lib/simuladores/hibrido/documento-pdf.ts
// Desenho comum aos dois documentos. Não decide conteúdo — só pinta o que as
// funções puras de conteúdo devolveram.
import type jsPDF from 'jspdf'
import type { SecaoDocumento } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'

export const MARGEM = 14

export function desenharCabecalho(
  doc: jsPDF, empresa: EmpresaProposta, titulo: string, subtitulo: string
): number {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(26, 35, 64)
  doc.rect(0, 0, W, 26, 'F')

  let hx = MARGEM
  if (empresa.logoBase64) {
    try {
      doc.addImage(empresa.logoBase64, 'PNG', MARGEM, 5, 16, 16)
      hx = MARGEM + 20
    } catch {
      // Logo inválido não pode impedir a emissão do documento.
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(empresa.nome, hx, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 200, 220)
  doc.text(
    [empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : null, empresa.telefone, empresa.email]
      .filter(Boolean).join('   |   '),
    hx, 17
  )
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 200, 80)
  doc.text(titulo, W - MARGEM, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 200, 220)
  doc.text(subtitulo, W - MARGEM, 17, { align: 'right' })

  return 34
}

type AutoTable = (doc: jsPDF, opts: Record<string, unknown>) => void

export function desenharSecoes(
  doc: jsPDF, autoTable: AutoTable, secoes: SecaoDocumento[], yInicial: number
): number {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let y = yInicial

  for (const secao of secoes) {
    if (y > H - 40) { doc.addPage(); y = MARGEM + 6 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(26, 35, 64)
    doc.text(secao.titulo, MARGEM, y)
    y += 5

    for (const p of secao.paragrafos ?? []) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 60, 70)
      const linhas = doc.splitTextToSize(p, W - MARGEM * 2) as string[]
      if (y + linhas.length * 4 > H - 20) { doc.addPage(); y = MARGEM + 6 }
      doc.text(linhas, MARGEM, y)
      y += linhas.length * 4 + 2
    }

    if (secao.linhas && secao.linhas.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGEM, right: MARGEM },
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 1.2 },
        columnStyles: { 0: { textColor: [110, 115, 130] }, 1: { fontStyle: 'bold' } },
        body: secao.linhas.map((l) => [l.rotulo, l.valor]),
      })
      const t = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      y = (t?.finalY ?? y) + 4
    }

    y += 2
  }

  return y
}
