'use client'

import { useSearchParams } from 'next/navigation'
import { useFormState } from 'react-dom'
import { useTransition } from 'react'
import { processCheckout } from '@/lib/subscription/actions'
import { Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const PLANS_INFO: Record<string, { name: string; price: string; period: string; features: string[] }> = {
  mensal: {
    name: 'Mensal',
    price: 'R$ 99,90',
    period: '/mês',
    features: ['CRM completo', 'Propostas ilimitadas', 'Gestão financeira', 'Controle de obras', 'Suporte por chat'],
  },
  semestral: {
    name: 'Semestral',
    price: 'R$ 539,00',
    period: '/semestre',
    features: ['Tudo do Mensal', 'Relatórios avançados', 'Integrações', 'Suporte prioritário', 'Treinamento incluso'],
  },
  anual: {
    name: 'Anual',
    price: 'R$ 998,00',
    period: '/ano',
    features: ['Tudo do Semestral', 'API exclusiva', 'Multi-usuários', 'Suporte dedicado', 'Consultoria de setup'],
  },
}

type PaymentMethod = 'pix' | 'pix_recorrente' | 'cartao'

export default function CheckoutForm() {
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') || 'mensal'
  const plan = PLANS_INFO[planId] || PLANS_INFO.mensal

  const [state, formAction] = useFormState(processCheckout, {})
  const [pending, startTransition] = useTransition()

  const showPixRecorrente = planId === 'mensal'

  const paymentOptions: { value: PaymentMethod; label: string; desc: string }[] = [
    { value: 'pix', label: 'Pix à Vista', desc: 'Pagamento único via Pix' },
    ...(showPixRecorrente
      ? [{ value: 'pix_recorrente' as PaymentMethod, label: 'Pix Recorrente', desc: 'Cobrança mensal automática via Pix' }]
      : []),
    { value: 'cartao', label: 'Cartão de Crédito', desc: 'Cobrança automática recorrente' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f4f3]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/">
            <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={140} height={40} className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] sticky top-8">
              <h2 className="font-[Sora] text-xl font-bold text-[#0d3019] mb-1">Plano {plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold text-[#0d3019]">{plan.price}</span>
                <span className="text-sm text-[#57534e]">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#57534e]">
                    <Check className="w-4 h-4 text-[#28944a] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-[#57534e]">
                  7 dias de teste grátis. Cancele sem burocracia.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <form action={formAction} className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
              <input type="hidden" name="plan" value={planId} />

              <h2 className="font-[Sora] text-xl font-bold text-[#0d3019] mb-6">Finalizar Assinatura</h2>

              {state.error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {state.error}
                </div>
              )}

              {/* Payment Method */}
              <fieldset className="mb-8">
                <legend className="text-sm font-semibold text-[#0d3019] mb-3">Forma de Pagamento</legend>
                <div className="space-y-2">
                  {paymentOptions.map((opt, i) => (
                    <label key={opt.value} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#28944a]/40 transition-colors has-[:checked]:border-[#28944a] has-[:checked]:bg-[#28944a]/5">
                      <input
                        type="radio"
                        name="payment_method"
                        value={opt.value}
                        defaultChecked={i === 0}
                        className="accent-[#28944a]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[#0d3019]">{opt.label}</p>
                        <p className="text-xs text-[#57534e]">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0d3019] mb-1">Nome da empresa</label>
                  <input type="text" name="company_name" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a] focus:ring-1 focus:ring-[#28944a]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d3019] mb-1">Nome completo</label>
                  <input type="text" name="full_name" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a] focus:ring-1 focus:ring-[#28944a]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d3019] mb-1">Email</label>
                  <input type="email" name="email" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a] focus:ring-1 focus:ring-[#28944a]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d3019] mb-1">Telefone</label>
                  <input type="tel" name="phone" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a] focus:ring-1 focus:ring-[#28944a]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d3019] mb-1">Senha</label>
                  <input type="password" name="password" required minLength={6} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a] focus:ring-1 focus:ring-[#28944a]" />
                </div>
              </div>

              <label className="mt-6 flex items-start gap-2 cursor-pointer">
                <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-[#28944a]" />
                <span className="text-xs text-[#57534e]">
                  Li e aceito os <Link href="/termos" target="_blank" className="text-[#28944a] underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="text-[#28944a] underline">Política de Privacidade</Link>.
                </span>
              </label>

              <button
                type="submit"
                disabled={pending}
                className="mt-4 w-full bg-[#28944a] text-white font-semibold py-3.5 rounded-xl hover:bg-[#1d7035] transition-colors disabled:opacity-50"
              >
                {pending ? 'Processando...' : 'Finalizar Assinatura'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
