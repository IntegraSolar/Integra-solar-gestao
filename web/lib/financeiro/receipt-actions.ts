'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserData } from '@/lib/org/queries'
import { generateReceiptPdf } from './receipt-pdf'
import type { ReceiptData } from './receipt-pdf'

export type PaymentReceipt = {
  id: string
  client_id: string
  client_name: string
  version: number
  total_paid: number
  token: string
  pdf_path: string | null
  created_by_name: string | null
  created_at: string
}

export type ActionResult = { error?: string; success?: string }

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

export async function generateReceipt(clientId: string): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Fetch all data in parallel
  const [clientRes, orgConfigRes, installmentsRes, saleRes, proposalRes] = await Promise.all([
    (supabase as any)
      .from('clients')
      .select('id, name, cpf_cnpj, street, number, neighborhood, city, state')
      .eq('id', clientId)
      .eq('organization_id', orgId)
      .single(),
    (supabase as any)
      .from('org_config')
      .select('razao_social, cnpj, endereco, telefone, email, logo_url, numero, cidade, estado')
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase
      .from('client_installments')
      .select('position, due_date, amount, confirmed_at, status')
      .eq('client_id', clientId)
      .eq('organization_id', orgId)
      .eq('status', 'confirmada')
      .order('position', { ascending: true }),
    (supabase as any)
      .from('client_sale')
      .select('sale_value')
      .eq('client_id', clientId)
      .maybeSingle(),
    (supabase as any)
      .from('proposals')
      .select('id, proposal_number, contract_number')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const client = clientRes.data
  if (!client) return { error: 'Cliente não encontrado.' }

  const orgConfig = orgConfigRes.data
  const paidInstallments = (installmentsRes.data ?? []) as {
    position: number; due_date: string; amount: number; confirmed_at: string
  }[]

  if (paidInstallments.length === 0) return { error: 'Nenhuma parcela confirmada para gerar recibo.' }

  const totalSale = Number(saleRes?.data?.sale_value ?? 0)
  const totalPaid = paidInstallments.reduce((s, p) => s + Number(p.amount), 0)

  // Fetch logo as base64
  const logoBase64 = await fetchLogoBase64(orgConfig?.logo_url ?? null)

  // Build address strings
  const orgAddress = [
    orgConfig?.endereco,
    orgConfig?.numero ? `nº ${orgConfig.numero}` : null,
    orgConfig?.cidade,
    orgConfig?.estado,
  ].filter(Boolean).join(', ')

  const clientAddress = [
    client.street,
    client.number ? `nº ${client.number}` : null,
    client.neighborhood,
    client.city,
    client.state,
  ].filter(Boolean).join(', ')

  const proposal = proposalRes?.data

  const now = new Date().toISOString()

  const receiptData: ReceiptData = {
    org: {
      name: orgConfig?.razao_social ?? 'Empresa',
      cnpj: orgConfig?.cnpj ?? null,
      address: orgAddress || null,
      phone: orgConfig?.telefone ?? null,
      email: orgConfig?.email ?? null,
      logoBase64,
    },
    client: {
      name: client.name,
      cpf_cnpj: client.cpf_cnpj ?? null,
      address: clientAddress || null,
    },
    proposal: {
      number: proposal?.proposal_number ?? null,
      contractNumber: proposal?.contract_number ?? null,
    },
    financials: {
      totalSale,
      totalPaid,
      balance: totalSale - totalPaid,
      paidPct: totalSale > 0 ? (totalPaid / totalSale) * 100 : 0,
    },
    installments: paidInstallments.map(p => ({
      position: p.position,
      due_date: p.due_date,
      confirmed_at: p.confirmed_at,
      amount: Number(p.amount),
    })),
    issuedAt: now,
    version: 1,
  }

  // Determine version
  const { data: lastReceipt } = await (supabase as any)
    .from('payment_receipts')
    .select('version')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  receiptData.version = (lastReceipt?.version ?? 0) + 1

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateReceiptPdf(receiptData)
  } catch (e: any) {
    return { error: `Erro ao gerar PDF: ${e.message}` }
  }

  // Upload to Supabase Storage
  const pdfPath = `receipts/${orgId}/${clientId}/v${receiptData.version}.pdf`
  const { error: uploadError } = await adminClient.storage
    .from('project-docs')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) return { error: `Erro ao salvar PDF: ${uploadError.message}` }

  // Save receipt record
  const { data: newReceipt, error: insertError } = await (supabase as any)
    .from('payment_receipts')
    .insert({
      client_id: clientId,
      organization_id: orgId,
      version: receiptData.version,
      total_paid: totalPaid,
      pdf_path: pdfPath,
      created_by_name: user?.profile?.full_name ?? user?.profile?.email ?? null,
    })
    .select('token')
    .single()

  if (insertError) return { error: insertError.message }

  return { success: 'Recibo gerado com sucesso.', token: newReceipt.token }
}

export async function getReceiptsByClient(clientId: string): Promise<PaymentReceipt[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('payment_receipts')
    .select('id, client_id, clients!client_id(name), version, total_paid, token, pdf_path, created_by_name, created_at')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .order('version', { ascending: false })

  return (data ?? []).map((r: any) => ({
    id: r.id,
    client_id: r.client_id,
    client_name: r.clients?.name ?? '—',
    version: r.version,
    total_paid: Number(r.total_paid),
    token: r.token,
    pdf_path: r.pdf_path,
    created_by_name: r.created_by_name,
    created_at: r.created_at,
  }))
}

export async function getAllReceipts(): Promise<PaymentReceipt[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('payment_receipts')
    .select('id, client_id, clients!client_id(name), version, total_paid, token, pdf_path, created_by_name, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((r: any) => ({
    id: r.id,
    client_id: r.client_id,
    client_name: r.clients?.name ?? '—',
    version: r.version,
    total_paid: Number(r.total_paid),
    token: r.token,
    pdf_path: r.pdf_path,
    created_by_name: r.created_by_name,
    created_at: r.created_at,
  }))
}

export async function getLatestReceiptByClient(clientId: string): Promise<PaymentReceipt | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('payment_receipts')
    .select('id, client_id, clients!client_id(name), version, total_paid, token, pdf_path, created_by_name, created_at')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients?.name ?? '—',
    version: data.version,
    total_paid: Number(data.total_paid),
    token: data.token,
    pdf_path: data.pdf_path,
    created_by_name: data.created_by_name,
    created_at: data.created_at,
  }
}
