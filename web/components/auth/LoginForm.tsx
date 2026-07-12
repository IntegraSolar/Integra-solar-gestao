'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { signIn } from '@/lib/auth/actions'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Input } from '@/components/ui/Input'

const WHATSAPP_URL = `https://wa.me/5563992217642?text=` + encodeURIComponent('Gostaria de agendar uma apresentação da plataforma Integra Solar!')

const initialState = { error: undefined, success: undefined }

export function LoginForm() {
  const [state, action] = useActionState(signIn, initialState)
  const [showDemo, setShowDemo] = useState(false)

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
        <button onClick={() => setShowDemo(true)} className="font-semibold text-[#28944a] hover:underline">
          Solicitar demonstração
        </button>
      </p>

      {showDemo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
            <button onClick={() => setShowDemo(false)} className="absolute top-4 right-4 text-[#57534e] hover:text-[#1c1917]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[#0d3019] mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              Agende uma demonstração
            </h3>
            <p className="text-sm text-[#57534e] mb-6">20 minutos. Sem compromisso. Veja se faz sentido para sua empresa.</p>
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); window.open(WHATSAPP_URL, '_blank'); setShowDemo(false) }}
            >
              <input type="text" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Seu nome" />
              <input type="email" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="E-mail" />
              <input type="tel" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="WhatsApp" />
              <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Empresa (opcional)" />
              <button type="submit" className="w-full bg-[#28944a] text-white font-semibold py-3 rounded-lg hover:bg-[#1d7035] transition-colors text-sm">
                Solicitar demonstração
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
