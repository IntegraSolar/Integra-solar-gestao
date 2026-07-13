'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { useFormStatus } from 'react-dom'
import { signInBackoffice } from '@/lib/backoffice/auth/actions'
import { FormError } from '@/components/ui/FormError'
import { Button } from '@/components/backoffice/ui'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending} className="mt-2 w-full py-3">
      {pending ? 'Verificando...' : 'Entrar no Backoffice'}
    </Button>
  )
}

const initialState = { error: undefined }

export function BackofficeLoginForm() {
  const [state, action] = useActionState(signInBackoffice, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(0,0,0,.45)]">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image
          src="/Logo integra solar - sem nome.png"
          alt="Integra Solar"
          width={200}
          height={80}
          className="object-contain"
          priority
        />
        <div className="mt-1 flex flex-col items-center gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#1A3A5C]">
            Painel Administrativo
          </span>
          <span className="text-[11px] text-[#9BAEBF]">Acesso restrito — equipe Integra Solar</span>
        </div>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-[#1A3A5C]">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="seu@integrasolar.app.br"
            autoComplete="email"
            required
            className="rounded-lg border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none transition focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#1A3A5C]">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="rounded-lg border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none transition focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10"
          />
        </div>

        <FormError message={state?.error} />

        <SubmitButton />
      </form>
    </div>
  )
}
