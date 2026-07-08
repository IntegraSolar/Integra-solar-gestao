'use client'

import { useActionState, useState } from 'react'
import { updatePassword } from '@/lib/auth/actions'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar, PasswordRequirements } from '@/components/auth/PasswordStrengthBar'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState = { error: undefined, success: undefined }

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, initialState)
  const [password, setPassword] = useState('')

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      <h2 className="mb-2 text-xl font-bold text-[#1A2B3C]">Definir nova senha</h2>
      <p className="mb-6 text-sm text-[#7A90A4]">
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <PasswordInput
            id="password"
            name="password"
            label="Nova senha"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrengthBar password={password} />
          <PasswordRequirements password={password} />
        </div>

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
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
