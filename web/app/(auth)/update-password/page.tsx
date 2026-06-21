import type { Metadata } from 'next'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Definir senha — Integra Solar',
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
