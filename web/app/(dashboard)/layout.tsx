import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { getCurrentUserData } from '@/lib/org/queries'
import { createClient } from '@/lib/supabase/server'
import { SUBSCRIPTION_BLOCKED_STATUSES } from '@/lib/constants/status'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUserData()

  if (!user) {
    redirect('/login')
  }

  // Verificação de subscription no Node.js runtime (sem risco de timeout)
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscription) {
        const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date()
        const isBlocked = SUBSCRIPTION_BLOCKED_STATUSES.includes(subscription.status as never) || !!isExpired
        if (isBlocked) {
          redirect('/subscription-expired')
        }
      }
    }
  } catch {
    // Subscription check is non-critical — allow access on error
  }

  return (
    <div className="flex min-h-screen">
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  )
}
