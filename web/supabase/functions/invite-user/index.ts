import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const siteOrigin = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

const corsHeaders = {
  'Access-Control-Allow-Origin': siteOrigin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  email: string
  organization_id: string
  role: 'owner' | 'admin' | 'manager' | 'user'
  full_name?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const siteUrl = siteOrigin

    // Verificar o usuário que está fazendo a chamada
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: callerUser },
      error: callerError,
    } = await supabaseUser.auth.getUser()

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: InvitePayload = await req.json()
    const { email, organization_id, role, full_name } = payload

    if (!email || !organization_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, organization_id, role' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Cliente admin para verificar permissões e enviar convite
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar que o caller tem permissão (owner ou admin na org)
    const { data: callerMembership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('organization_id', organization_id)
      .maybeSingle()

    if (membershipError || !callerMembership) {
      return new Response(
        JSON.stringify({ error: 'Você não pertence a esta organização.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!['owner', 'admin'].includes(callerMembership.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas owners e admins podem convidar usuários.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar que o role convidado não é maior que o caller
    const roleHierarchy = ['user', 'manager', 'admin', 'owner']
    const callerLevel = roleHierarchy.indexOf(callerMembership.role)
    const inviteeLevel = roleHierarchy.indexOf(role)

    if (inviteeLevel > callerLevel) {
      return new Response(
        JSON.stringify({ error: 'Você não pode convidar um usuário com papel superior ao seu.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Enviar convite
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? '', organization_id, role },
        redirectTo: `${siteUrl}/auth/callback?type=invite`,
      })

    if (inviteError) {
      throw inviteError
    }

    // Adicionar membro à org (otimista — o trigger cria o profile quando o user confirmar)
    const { error: memberInsertError } = await supabaseAdmin
      .from('organization_members')
      .upsert(
        {
          organization_id,
          user_id: inviteData.user.id,
          role,
        },
        { onConflict: 'organization_id,user_id' }
      )

    if (memberInsertError) {
      console.error('Erro ao inserir membro:', memberInsertError.message)
      // Não falhar — o convite já foi enviado
    }

    return new Response(
      JSON.stringify({ success: true, user_id: inviteData.user.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro na Edge Function invite-user:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
