import { NextResponse } from 'next/server'
import crypto from 'crypto'
import type { AsaasWebhookPayload } from '@/lib/webhooks/asaas'
import { dispatchAsaasEvent } from '@/lib/webhooks/asaas'

function verifyAsaasSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    // Em desenvolvimento, permitir sem assinatura
    if (process.env.NODE_ENV === 'development') return true
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: Request) {
  let rawBody: string

  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const signature = request.headers.get('asaas-access-token')
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET ?? ''

  if (!verifyAsaasSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: AsaasWebhookPayload

  try {
    payload = JSON.parse(rawBody) as AsaasWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.event || !payload.payment) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = await dispatchAsaasEvent(payload)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[Asaas webhook] Erro interno:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET para verificar que o endpoint existe
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Integra Solar Asaas Webhook',
    note: 'Integração Asaas pendente de configuração.',
  })
}
