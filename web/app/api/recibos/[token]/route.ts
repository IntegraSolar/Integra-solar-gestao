import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReceiptPdf } from '@/lib/financeiro/receipt-pdf'
import type { ReceiptData } from '@/lib/financeiro/receipt-pdf'

async function fetchLogoBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:${res.headers.get('content-type') ?? 'image/png'};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  // Resolve token → receipt
  const { data: receipt } = await (admin as any)
    .from('payment_receipts')
    .select('id, client_id, organization_id, version, total_paid, pdf_path, created_at')
    .eq('token', token)
    .single()

  if (!receipt) return NextResponse.json({ error: 'Recibo não encontrado.' }, { status: 404 })

  // If PDF already stored, try to serve directly from storage
  if (receipt.pdf_path) {
    const { data: fileData } = await admin.storage.from('project-docs').download(receipt.pdf_path)
    if (fileData) {
      const buf = Buffer.from(await fileData.arrayBuffer())
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="recibo-v${receipt.version}.pdf"`,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  }

  // Fallback: regenerate PDF on-the-fly from stored data
  const [clientRes, orgConfigRes, installmentsRes, saleRes, proposalRes] = await Promise.all([
    (admin as any)
      .from('clients')
      .select('id, name, cpf_cnpj, street, number, neighborhood, city, state')
      .eq('id', receipt.client_id)
      .single(),
    (admin as any)
      .from('org_config')
      .select('razao_social, cnpj, endereco, telefone, email, logo_url, numero, cidade, estado')
      .eq('organization_id', receipt.organization_id)
      .maybeSingle(),
    (admin as any)
      .from('client_installments')
      .select('position, due_date, amount, confirmed_at')
      .eq('client_id', receipt.client_id)
      .eq('organization_id', receipt.organization_id)
      .eq('status', 'confirmada')
      .order('position', { ascending: true }),
    (admin as any)
      .from('client_sale')
      .select('sale_value')
      .eq('client_id', receipt.client_id)
      .maybeSingle(),
    (admin as any)
      .from('proposals')
      .select('proposal_number, contract_number')
      .eq('client_id', receipt.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const client = clientRes.data
  const orgConfig = orgConfigRes.data
  const paidInstallments = installmentsRes.data ?? []
  const totalSale = Number(saleRes?.data?.sale_value ?? 0)
  const totalPaid = paidInstallments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const logoBase64 = await fetchLogoBase64(orgConfig?.logo_url ?? null)

  const orgAddress = [orgConfig?.endereco, orgConfig?.numero ? `nº ${orgConfig.numero}` : null, orgConfig?.cidade, orgConfig?.estado].filter(Boolean).join(', ')
  const clientAddress = [client?.street, client?.number ? `nº ${client.number}` : null, client?.neighborhood, client?.city, client?.state].filter(Boolean).join(', ')
  const proposal = proposalRes?.data

  const receiptData: ReceiptData = {
    org: { name: orgConfig?.razao_social ?? 'Empresa', cnpj: orgConfig?.cnpj ?? null, address: orgAddress || null, phone: orgConfig?.telefone ?? null, email: orgConfig?.email ?? null, logoBase64 },
    client: { name: client?.name ?? '—', cpf_cnpj: client?.cpf_cnpj ?? null, address: clientAddress || null },
    proposal: { number: proposal?.proposal_number ?? null, contractNumber: proposal?.contract_number ?? null },
    financials: { totalSale, totalPaid, balance: totalSale - totalPaid, paidPct: totalSale > 0 ? (totalPaid / totalSale) * 100 : 0 },
    installments: paidInstallments.map((p: any) => ({ position: p.position, due_date: p.due_date, confirmed_at: p.confirmed_at, amount: Number(p.amount) })),
    issuedAt: receipt.created_at,
    version: receipt.version,
  }

  const buf = await generateReceiptPdf(receiptData)
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="recibo-v${receipt.version}.pdf"`,
    },
  })
}
