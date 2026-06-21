'use client'

import { useState, useEffect, useCallback } from 'react'

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
    if (due < startOfDay) {
      overdue.push(f)
    } else if (due < endOfDay) {
      today.push(f)
    } else {
      upcoming.push(f)
    }
  }

  return { overdue, today, upcoming }
}

const POLL_INTERVAL = 5 * 60 * 1000

export function useFollowUpNotifications() {
  const [followups, setFollowups] = useState<FollowUpNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    const interval = setInterval(fetchFollowups, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchFollowups])

  const grouped = groupByUrgency(followups)
  const badgeCount = grouped.overdue.length + grouped.today.length

  return { followups, grouped, badgeCount, isLoading, refetch: fetchFollowups }
}
