'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { bloquearEmpresa, desbloquearEmpresa } from './queries'
import { verifySession, SESSION_COOKIE } from '@/lib/backoffice/auth/session'
import { registrarAuditoria } from '@/lib/backoffice/auditoria/queries'

async function getAdminName(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return 'Desconhecido'
  const session = await verifySession(token)
  return session?.name ?? 'Desconhecido'
}

export async function bloquearEmpresaAction(id: string, motivo: string) {
  const result = await bloquearEmpresa(id, motivo)
  if (!result.error) {
    const adminName = await getAdminName()
    await registrarAuditoria({
      organization_id: id,
      user_name: adminName,
      action: 'bloquear_empresa',
      description: motivo,
    })
    revalidatePath(`/backoffice/empresas/${id}`)
    revalidatePath('/backoffice/auditoria')
  }
  return result
}

export async function desbloquearEmpresaAction(id: string) {
  const result = await desbloquearEmpresa(id)
  if (!result.error) {
    const adminName = await getAdminName()
    await registrarAuditoria({
      organization_id: id,
      user_name: adminName,
      action: 'desbloquear_empresa',
      description: 'Empresa desbloqueada pelo administrador.',
    })
    revalidatePath(`/backoffice/empresas/${id}`)
    revalidatePath('/backoffice/auditoria')
  }
  return result
}
