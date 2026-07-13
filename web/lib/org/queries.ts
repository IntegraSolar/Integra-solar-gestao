import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type ModulePermission = {
  access: boolean
  view_all: boolean
  add: boolean
  edit: boolean
  delete: boolean
  export: boolean
}

export type CurrentUserData = {
  profile: {
    id: string
    email: string
    full_name: string | null
  }
  membership: {
    id: string
    role: string
    permissions: Record<string, ModulePermission>
    organization: {
      id: string
      name: string
      plan: string
      status: string
    }
  } | null
}

// cache() do React deduplica chamadas dentro do mesmo request de servidor.
export const getCurrentUserData = cache(async function (): Promise<CurrentUserData | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      permissions,
      organization:organizations(id, name, plan, status)
    `)
    .eq('user_id', user.id)
    .single()

  return {
    profile,
    membership: membership
      ? {
          id: membership.id as string,
          role: membership.role as string,
          permissions: (membership.permissions ?? {}) as Record<string, ModulePermission>,
          organization: membership.organization as { id: string; name: string; plan: string; status: string },
        }
      : null,
  }
})
