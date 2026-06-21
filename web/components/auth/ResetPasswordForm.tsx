'use client'

import { useFormState } from 'react-dom'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/actions'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState = { error: undefined, success: undefined }

export function ResetPasswordForm() {
  const [state, action] = useFormState(requestPasswordReset, initialState)

  if (state?.success) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
            ✓
          </div>
          <h2 className="text-lg font-bold text-[#1A2B3C]">E-mail enviado</h2>
          <p className="text-sm text-[#7A90A4]">{state.success}</p>
          <Link href="/login" className="mt-4 text-sm font-semibold text-[#1A3A5C] hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      <h2 className="mb-2 text-xl font-bold text-[#1A2B3C]">Recuperar senha</h2>
      <p className="mb-6 text-sm text-[#7A90A4]">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />

        <FormError message={state?.error} />

        <SubmitButton pendingLabel="Enviando..." className="w-full py-3">
          Enviar link de recuperação
        </SubmitButton>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-[#7A90A4] hover:text-[#1A3A5C]">
          ← Voltar ao login
        </Link>
      </div>
    </div>
  )
}
