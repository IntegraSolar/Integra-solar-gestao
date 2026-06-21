import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { getCurrentUserData } from '@/lib/org/queries'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUserData()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  )
}
