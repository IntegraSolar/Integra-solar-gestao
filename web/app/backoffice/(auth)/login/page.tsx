import type { Metadata } from 'next'
import { BackofficeLoginForm } from '@/components/backoffice/BackofficeLoginForm'

export const metadata: Metadata = {
  title: 'Backoffice — Integra Solar',
  robots: 'noindex, nofollow',
}

export default function BackofficeLoginPage() {
  return <BackofficeLoginForm />
}
