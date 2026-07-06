'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type FollowUpNotification = {
  id: string
  title: string
  description: string | null
  due_date: string
  lead_id: string
  lead_name: string
}

type GroupedFollowUps = {
  overdue: FollowUpNotification[]
  today: FollowUpNotification[]
  upcoming: FollowUpNotification[]
}

function groupByUrgency(followups: FollowUpNotification[]): GroupedFollowUps {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const overdue: FollowUpNotification[] = []
  const today: FollowUpNotification[] = []
  const upcoming: FollowUpNotification[] = []

  for (const f of followups) {
    const due = new Date(f.due_date)
    if (due < startOfDay) overdue.push(f)
    else if (due < endOfDay) today.push(f)
    else upcoming.push(f)
  }

  return { overdue, today, upcoming }
}

export function useFollowUpNotifications() {
  const [followups, setFollowups] = useState<FollowUpNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchFollowups = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/followups')
      const data = await res.json()
      setFollowups(data.followups ?? [])
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFollowups()

    const supabase = createClient()

    // Subscribe to task inserts/updates/deletes — refetch on any change
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => { fetchFollowups() }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFollowups])

  const grouped = groupByUrgency(followups)
  const badgeCount = grouped.overdue.length + grouped.today.length

  return { followups, grouped, badgeCount, isLoading, refetch: fetchFollowups }
}
