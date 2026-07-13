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

  // Busca dados do usuário na tabela app_users (inclui org via join)
  const { data: appUser } = await (supabase as any)
    .from('app_users')
    .select(`
      id,
      name,
      email,
      role_id,
      organization_id,
      organization:organizations(id, name, plan, status)
    `)
    .eq('id', user.id)
    .single()

  if (!appUser) return null

  const org = Array.isArray(appUser.organization)
    ? appUser.organization[0]
    : appUser.organization

  return {
    profile: {
      id: appUser.id as string,
      email: (appUser.email ?? user.email ?? '') as string,
      full_name: (appUser.name ?? null) as string | null,
    },
    membership: org
      ? {
          id: appUser.id as string,
          role: (appUser.role_id ?? 'member') as string,
          permissions: {} as Record<string, ModulePermission>,
          organization: org as { id: string; name: string; plan: string; status: string },
        }
      : null,
  }
})
