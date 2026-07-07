import { redirect } from 'next/navigation'
import { BackofficeShell } from '@/components/backoffice/BackofficeShell'
import { getCurrentPlatformUser } from '@/lib/backoffice/auth/getCurrentPlatformUser'

export default async function BackofficeAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentPlatformUser()
  if (!user) redirect('/backoffice/login')

  return <BackofficeShell user={user}>{children}</BackofficeShell>
}
