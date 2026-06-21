import type { Metadata } from 'next'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Bem-vindo — Integra Solar',
}

export default function AcceptInvitePage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-white/80">
          Você foi convidado para a plataforma Integra Solar.
        </p>
        <p className="text-xs text-white/50 mt-1">
          Crie sua senha para acessar.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
