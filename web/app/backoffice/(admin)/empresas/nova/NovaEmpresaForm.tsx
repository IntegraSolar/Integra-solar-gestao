'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarNovaEmpresa } from '@/lib/backoffice/empresas/create-actions'

const inputCls = 'w-full rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10 bg-white placeholder:text-[#9BAEBF]'
const labelCls = 'block text-xs font-semibold text-[#4A6580] mb-1.5'

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function NovaEmpresaForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    full_name: '',
    email: '',
    phone: '',
    plan: 'professional' as 'starter' | 'professional' | 'enterprise',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  function setField(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await criarNovaEmpresa(form)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(result.success ?? 'Empresa criada com sucesso!')
      // Aguarda 2s para o admin ler o sucesso e redireciona
      setTimeout(() => {
        if (result.orgId) {
          router.push(`/backoffice/empresas/${result.orgId}`)
        } else {
          router.push('/backoffice/empresas')
        }
      }, 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dados da empresa */}
      <div className="rounded-2xl bg-white border border-[#E2ECF4] shadow-sm p-6">
        <h2 className="text-sm font-bold text-[#0E2236] uppercase tracking-wide mb-5">
          Dados da Empresa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome da Empresa *</label>
            <input
              className={inputCls}
              value={form.company_name}
              onChange={e => setField('company_name', e.target.value)}
              placeholder="Ex: Integra Solar Tocantins"
              required
            />
          </div>
          <div>
            <label className={labelCls}>CNPJ <span className="text-[#9BAEBF] font-normal">(opcional)</span></label>
            <input
              className={inputCls}
              value={form.cnpj}
              onChange={e => setField('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className={labelCls}>Plano</label>
            <select
              className={inputCls}
              value={form.plan}
              onChange={e => setField('plan', e.target.value)}
            >
              {PLANS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dados do responsável */}
      <div className="rounded-2xl bg-white border border-[#E2ECF4] shadow-sm p-6">
        <h2 className="text-sm font-bold text-[#0E2236] uppercase tracking-wide mb-5">
          Responsável (Proprietário da conta)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome Completo *</label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              placeholder="Ex: Rafael Souza"
              required
            />
          </div>
          <div>
            <label className={labelCls}>E-mail *</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="responsavel@empresa.com"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Telefone / WhatsApp</label>
            <input
              type="tel"
              className={inputCls}
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}
              placeholder="(63) 99999-9999"
            />
          </div>
          <div>
            <label className={labelCls}>Senha inicial <span className="text-[#9BAEBF] font-normal">(opcional)</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls + ' pr-10'}
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder="Deixe em branco para enviar convite por e-mail"
                minLength={form.password ? 8 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAEBF] hover:text-[#4A6580]"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info sobre o modo de acesso */}
      <div className="rounded-xl bg-[#1A3A5C]/5 border border-[#1A3A5C]/10 px-5 py-4">
        <p className="text-xs text-[#4A6580] leading-relaxed">
          {form.password
            ? <><span className="font-semibold text-[#1A3A5C]">Acesso imediato:</span> A conta será criada com a senha informada. O responsável poderá entrar na plataforma diretamente.</>
            : <><span className="font-semibold text-[#1A3A5C]">Convite por e-mail:</span> Um e-mail será enviado para o responsável com um link para ele definir sua própria senha.</>
          }
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-5 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-5 py-3">
          <p className="text-sm text-green-700">{success}</p>
          <p className="text-xs text-green-600 mt-0.5">Redirecionando...</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !!success}
          className="px-6 py-2.5 rounded-xl bg-[#1A3A5C] text-white text-sm font-semibold hover:bg-[#0E2236] transition-colors disabled:opacity-50"
        >
          {isPending ? 'Criando empresa...' : 'Criar Empresa e Enviar Convite'}
        </button>
        <a
          href="/backoffice/empresas"
          className="px-6 py-2.5 rounded-xl border border-[#D0DCE8] text-sm text-[#6B8CA4] hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
