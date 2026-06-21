'use client'

import { useFormState } from 'react-dom'
import { updatePassword } from '@/lib/auth/actions'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState = { error: undefined, success: undefined }

export function UpdatePasswordForm() {
  const [state, action] = useFormState(updatePassword, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      <h2 className="mb-2 text-xl font-bold text-[#1A2B3C]">Definir nova senha</h2>
      <p className="mb-6 text-sm text-[#7A90A4]">
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="password"
          name="password"
          type="password"
          label="Nova senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmar senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <FormError message={state?.error} />

        <SubmitButton pendingLabel="Salvando..." className="mt-2 w-full py-3">
          Salvar senha e entrar
        </SubmitButton>
      </form>
    </div>
  )
}
