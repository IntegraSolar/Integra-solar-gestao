export type ReceiptData = {
  org: {
    name: string
    cnpj: string | null
    address: string | null
    phone: string | null
    email: string | null
    logoBase64: string | null
  }
  client: {
    name: string
    cpf_cnpj: string | null
    address: string | null
  }
  proposal: {
    number: string | null
    contractNumber: string | null
  }
  financials: {
    totalSale: number
    totalPaid: number
    balance: number
    paidPct: number
  }
  installments: {
    position: number
    due_date: string
    confirmed_at: string
    amount: number
  }[]
  issuedAt: string
  version: number
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  // Dynamic import to avoid SSR issues with jsPDF's browser globals
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15
  let y = margin

  // ── Header background ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // dark blue
  doc.rect(0, 0, W, 42, 'F')

  // Logo
  if (data.org.logoBase64) {
    try {
      doc.addImage(data.org.logoBase64, 'PNG', margin, 8, 40, 18)
    } catch {
      // ignore logo errors
    }
  }

  // Company name + info on header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const headerX = data.org.logoBase64 ? margin + 45 : margin
  doc.text(data.org.name, headerX, 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 220)
  const orgDetails = [
    data.org.cnpj ? `CNPJ: ${data.org.cnpj}` : null,
    data.org.address,
    data.org.phone,
    data.org.email,
  ].filter(Boolean).join('   |   ')
  doc.text(orgDetails, headerX, 23)

  // "RECIBO" title on right
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 200, 80)
  doc.text('RECIBO', W - margin, 18, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 220)
  doc.text(`Versão ${data.version}  |  Emitido em ${fmtDate(data.issuedAt)}`, W - margin, 25, { align: 'right' })

  y = 50

  // ── Client section ─────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y, W - margin * 2, 22, 2, 2, 'F')

  doc.setTextColor(100, 100, 120)
  doc.text('DADOS DO CLIENTE', margin + 4, y + 6)

  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(data.client.name, margin + 4, y + 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 100)
  const clientMeta = [
    data.client.cpf_cnpj ? `CPF/CNPJ: ${data.client.cpf_cnpj}` : null,
    data.client.address,
  ].filter(Boolean).join('   |   ')
  doc.text(clientMeta, margin + 4, y + 19)

  y += 28

  // ── Proposal info ──────────────────────────────────────────────────
  if (data.proposal.number || data.proposal.contractNumber) {
    doc.setFontSize(8.5)
    doc.setTextColor(80, 80, 100)
    doc.setFont('helvetica', 'normal')
    const propLine = [
      data.proposal.number ? `Proposta nº ${data.proposal.number}` : null,
      data.proposal.contractNumber ? `Contrato nº ${data.proposal.contractNumber}` : null,
    ].filter(Boolean).join('   |   ')
    doc.text(propLine, margin, y)
    y += 8
  }

  // ── Financial summary boxes ────────────────────────────────────────
  const boxW = (W - margin * 2 - 6) / 4
  const boxes = [
    { label: 'Valor total', value: brl(data.financials.totalSale), color: [34, 34, 80] as [number,number,number] },
    { label: 'Total pago', value: brl(data.financials.totalPaid), color: [5, 120, 80] as [number,number,number] },
    { label: 'Saldo restante', value: brl(data.financials.balance), color: [150, 60, 20] as [number,number,number] },
    { label: 'Quitado', value: `${data.financials.paidPct.toFixed(1)}%`, color: [20, 80, 150] as [number,number,number] },
  ]

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 2)
    doc.setFillColor(248, 249, 252)
    doc.roundedRect(bx, y, boxW, 20, 2, 2, 'F')
    doc.setDrawColor(220, 225, 235)
    doc.roundedRect(bx, y, boxW, 20, 2, 2, 'S')
    doc.setTextColor(...box.color)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(box.label.toUpperCase(), bx + boxW / 2, y + 6, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(box.value, bx + boxW / 2, y + 14, { align: 'center' })
  })

  y += 26

  // ── Installments table ─────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 50)
  doc.text('PARCELAS PAGAS', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Nº', 'Vencimento', 'Data do pagamento', 'Valor']],
    body: data.installments.map(p => [
      p.position === 1 ? 'Entrada' : `Parcela ${p.position}`,
      fmtDate(p.due_date),
      fmtDate(p.confirmed_at),
      brl(p.amount),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
  })

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Declaration ────────────────────────────────────────────────────
  const proposalRef = data.proposal.contractNumber
    ? `contrato nº ${data.proposal.contractNumber}`
    : data.proposal.number
    ? `proposta nº ${data.proposal.number}`
    : 'contrato/proposta descrito neste documento'

  const declaration =
    `Declaramos, para os devidos fins, que recebemos do cliente acima identificado a quantia total de ` +
    `${brl(data.financials.totalPaid)}, correspondente aos pagamentos efetuados até ${fmtDate(data.issuedAt)}, ` +
    `referentes ao ${proposalRef}.`

  doc.setFillColor(240, 248, 240)
  doc.setDrawColor(100, 200, 130)
  const declLines = doc.splitTextToSize(declaration, W - margin * 2 - 10)
  const declH = declLines.length * 5 + 10
  doc.roundedRect(margin, y, W - margin * 2, declH, 2, 2, 'FD')
  doc.setTextColor(30, 80, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(declLines, margin + 5, y + 7)

  y += declH + 12

  // ── Signature area ─────────────────────────────────────────────────
  const sigX = W / 2
  doc.setDrawColor(100, 100, 120)
  doc.line(sigX - 40, y, sigX + 40, y)
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 80)
  doc.setFont('helvetica', 'bold')
  doc.text(data.org.name, sigX, y + 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(120, 120, 140)
  doc.text(fmtDate(data.issuedAt), sigX, y + 10, { align: 'center' })

  // ── Footer ─────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Documento gerado automaticamente — ${data.org.name}  |  Página ${p} de ${pageCount}`,
      W / 2,
      295,
      { align: 'center' }
    )
  }

  return Buffer.from(doc.output('arraybuffer'))
}
