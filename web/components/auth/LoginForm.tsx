'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signIn } from '@/lib/auth/actions'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Input } from '@/components/ui/Input'

const initialState = { error: undefined, success: undefined }

export function LoginForm() {
  const [state, action] = useActionState(signIn, initialState)

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
          <PasswordInput
            id="password"
            name="password"
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

        {/* Manter conectado */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="remember_me"
            value="1"
            defaultChecked
            className="h-4 w-4 rounded border-[#D0DCE8] text-[#1A3A5C] accent-[#1A3A5C]"
          />
          <span className="text-sm text-[#4A6580]">Manter conectado por 30 dias</span>
        </label>

        <FormError message={state?.error} />

        <SubmitButton pendingLabel="Entrando..." className="mt-2 w-full py-3">
          Entrar
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#A8BCCE]">
        Ainda não tem acesso?{' '}
        <Link href="/agendar-demo" className="font-semibold text-[#28944a] hover:underline">
          Solicitar demonstração
        </Link>
      </p>
    </div>
  )
}
