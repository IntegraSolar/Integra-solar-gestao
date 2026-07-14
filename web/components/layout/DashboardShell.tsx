'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { NotificationsDrawer } from '@/components/notifications/NotificationsDrawer'
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications'
import type { CurrentUserData } from '@/lib/org/queries'

export function DashboardShell({
  user,
  children,
}: {
  user: CurrentUserData
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { grouped, badgeCount, refetch } = useFollowUpNotifications(user.membership?.organization.id)
  const router = useRouter()

  function handleLeadClick(leadId: string) {
    setDrawerOpen(false)
    router.push(`/leads?open=${leadId}`)
  }

  function handleCompleted() {
    refetch()
  }

  return (
    <>
      <Sidebar
        user={user}
        notificationCount={badgeCount}
        onNotificationClick={() => setDrawerOpen(true)}
      />
      <NotificationsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        grouped={grouped}
        onLeadClick={handleLeadClick}
        onCompleted={handleCompleted}
      />
      <div className="flex-1 min-w-0 ml-56 overflow-y-auto pt-14 relative z-10">
        {children}
      </div>
    </>
  )
}
