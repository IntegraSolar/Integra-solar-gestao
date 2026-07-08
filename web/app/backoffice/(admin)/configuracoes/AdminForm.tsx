'use client'

import { useActionState, useRef } from 'react'
import { criarAdmin } from '@/lib/backoffice/configuracoes/actions'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin',       label: 'Admin' },
  { value: 'support',     label: 'Suporte' },
]

export function NovoAdminForm() {
  const [state, action, isPending] = useActionState(criarAdmin, null)
  const formRef = useRef<HTMLFormElement>(null)

  if (state?.success && formRef.current) formRef.current.reset()

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[#6B8CA4]">Nome</label>
        <input name="name" required placeholder="Ex: Maria Silva"
          className="rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[#6B8CA4]">E-mail</label>
        <input name="email" type="email" required placeholder="maria@integrasolar.com.br"
          className="rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[#6B8CA4]">Senha provisória</label>
        <input name="password" type="password" required minLength={8} placeholder="Mín. 8 caracteres"
          className="rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[#6B8CA4]">Perfil</label>
        <select name="role" required
          className="rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10 bg-white">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="md:col-span-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          Usuário criado com sucesso.
        </p>
      )}

      <div className="md:col-span-2 flex justify-end">
        <button type="submit" disabled={isPending}
          className="rounded-xl bg-[#1A3A5C] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#0E2236] disabled:opacity-50 transition-colors">
          {isPending ? 'Criando...' : 'Criar usuário'}
        </button>
      </div>
    </form>
  )
}
