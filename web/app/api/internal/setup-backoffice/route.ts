import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

// Rota de uso único para criar o usuário admin do backoffice via Admin API
// REMOVER após usar
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('s')
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Deletar usuário criado via SQL (hash incompatível)
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find((u) => u.email === 'admin@integrasolar.app.br')
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id)
  }

  // Recriar via Admin API (hash gerado pelo GoTrue — compatível)
  const { data, error } = await admin.auth.admin.createUser({
    email: 'admin@integrasolar.app.br',
    password: 'Admin@Integra2026',
    email_confirm: true,
    user_metadata: { full_name: 'Administrador Backoffice', is_backoffice: true },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.user?.id, email: data.user?.email })
}
