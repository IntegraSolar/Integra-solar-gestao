'use client'

import { useFormState } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { registerCompany } from '@/lib/auth/actions'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState = { error: undefined, success: undefined }

export function RegisterForm() {
  const [state, action] = useFormState(registerCompany, initialState)

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_32px_80px_rgba(10,22,34,.15)]">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <Image
          src="/Logo integra solar - sem nome.png"
          alt="Integra Solar"
          width={220}
          height={90}
          className="object-contain"
          priority
        />
        <p className="mt-2 text-sm text-[#78716c]">Crie sua conta empresarial</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Input
          name="company_name"
          label="Nome da empresa *"
          placeholder="Ex: Solar Energy LTDA"
          required
        />

        <Input
          name="full_name"
          label="Seu nome completo *"
          placeholder="Ex: João da Silva"
          required
        />

        <Input
          name="email"
          type="email"
          label="E-mail *"
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />

        <Input
          name="phone"
          label="Telefone"
          placeholder="(00) 00000-0000"
        />

        <Input
          name="password"
          type="password"
          label="Senha *"
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          required
        />

        <FormError message={state?.error} />

        <SubmitButton pendingLabel="Criando conta..." className="mt-2 w-full py-3">
          Criar conta
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#a8a29e]">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-semibold text-[#28944a] hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
