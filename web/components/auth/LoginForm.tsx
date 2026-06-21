'use client'

import { useFormState } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { signIn } from '@/lib/auth/actions'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState = { error: undefined, success: undefined }

export function LoginForm() {
  const [state, action] = useFormState(signIn, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.35)]">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/Logo integra solar - sem nome.png"
          alt="Integra Solar"
          width={280}
          height={110}
          className="object-contain"
          priority
        />
        <p className="mt-2 text-sm text-[#7A90A4]">Plataforma de Gestão</p>
      </div>

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

        <div className="flex flex-col gap-1.5">
          <Input
            id="password"
            name="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-xs text-[#1A3A5C] font-semibold hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <FormError message={state?.error} />

        <SubmitButton pendingLabel="Entrando..." className="mt-2 w-full py-3">
          Entrar
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#A8BCCE]">
        Ainda não tem conta?{' '}
        <Link href="/register" className="font-semibold text-[#28944a] hover:underline">
          Criar conta empresarial
        </Link>
      </p>
    </div>
  )
}
