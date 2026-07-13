'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, Field, inputCls } from '@/components/backoffice/ui'
import { salvarAssinatura, renovarAssinatura, cancelarAssinatura } from '@/lib/backoffice/assinaturas/actions'
import type { SubscriptionRow } from '@/lib/backoffice/assinaturas/queries'

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const centsFromInput = (v: string) => Math.round(parseFloat(v.replace(/\./g, '').replace(',', '.') || '0') * 100)
const inputFromCents = (c: number) => (c / 100).toFixed(2).replace('.', ',')

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  active: 'green', trial: 'amber', past_due: 'red', canceled: 'gray',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa', trial: 'Trial', past_due: 'Vencida', canceled: 'Cancelada',
}

export function AssinaturaManager({ orgId, sub }: { orgId: string; sub: SubscriptionRow | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [plan, setPlan] = useState(sub?.plan ?? 'professional')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>((sub?.billing_cycle as 'monthly' | 'yearly') ?? 'monthly')
  const [pay, setPay] = useState(sub?.payment_method ?? 'pix')
  const [status, setStatus] = useState(sub?.status ?? 'active')
  const [amount, setAmount] = useState(inputFromCents(sub?.amount ?? 30000))
  const [setupFee, setSetupFee] = useState(inputFromCents(sub?.setup_fee ?? 50000))
  const [expires, setExpires] = useState(sub?.expires_at ? sub.expires_at.slice(0, 10) : '')

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const r = await salvarAssinatura({
        organization_id: orgId, plan, billing_cycle: cycle, payment_method: pay,
        amount: centsFromInput(amount), setup_fee: centsFromInput(setupFee),
        status, expires_at: expires || null,
      })
      if (r.error) { setError(r.error); return }
      setOpen(false); router.refresh()
    })
  }
  function handleRenovar() {
    startTransition(async () => { await renovarAssinatura(orgId); router.refresh() })
  }
  function handleCancelar() {
    if (!confirm('Cancelar a assinatura desta empresa?')) return
    startTransition(async () => { await cancelarAssinatura(orgId); router.refresh() })
  }

  const vencida = sub?.expires_at && new Date(sub.expires_at) < new Date()

  return (
    <div className="p-6">
      {sub ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <Info label="Plano"><span className="capitalize">{sub.plan}</span></Info>
            <Info label="Status"><Badge tone={STATUS_TONE[sub.status] ?? 'gray'}>{STATUS_LABEL[sub.status] ?? sub.status}</Badge></Info>
            <Info label="Mensalidade">{brl(sub.amount)}{sub.billing_cycle === 'yearly' ? '/ano' : '/mês'}</Info>
            <Info label="Implantação">{sub.setup_fee != null ? brl(sub.setup_fee) : '—'}</Info>
            <Info label="Forma de pagamento"><span className="capitalize">{sub.payment_method}</span></Info>
            <Info label="Vencimento">
              <span className={vencida ? 'text-[#C11B1B] font-semibold' : ''}>
                {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('pt-BR') : '—'}
              </span>
            </Info>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(true)}>Editar</Button>
            <Button variant="success" onClick={handleRenovar} disabled={isPending}>Renovar período</Button>
            {sub.status !== 'canceled' && <Button variant="danger" onClick={handleCancelar} disabled={isPending}>Cancelar</Button>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[#7C8D9E]">Esta empresa ainda não tem assinatura registrada.</p>
          <Button variant="primary" onClick={() => setOpen(true)}>Criar assinatura</Button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-base font-bold text-[#0E1B2A] mb-4">{sub ? 'Editar assinatura' : 'Nova assinatura'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Plano">
                <select className={inputCls} value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Ciclo">
                <select className={inputCls} value={cycle} onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </Field>
              <Field label="Mensalidade (R$)">
                <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Implantação (R$)">
                <input className={inputCls} value={setupFee} onChange={(e) => setSetupFee(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Forma de pagamento">
                <select className={inputCls} value={pay} onChange={(e) => setPay(e.target.value)}>
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao">Cartão</option>
                  <option value="manual">Manual / Outro</option>
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Ativa</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Vencida</option>
                  <option value="canceled">Cancelada</option>
                </select>
              </Field>
              <Field label="Vencimento" hint="(deixe vazio p/ calcular pelo ciclo)">
                <input type="date" className={inputCls} value={expires} onChange={(e) => setExpires(e.target.value)} />
              </Field>
            </div>
            {error && <p className="text-sm text-[#C11B1B] mt-3">{error}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C8D9E]">{label}</span>
      <span className="text-sm text-[#0E1B2A]">{children}</span>
    </div>
  )
}
