'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { bloquearEmpresa, desbloquearEmpresa, editarEmpresa, excluirEmpresa } from './queries'
import { verifySession, SESSION_COOKIE } from '@/lib/backoffice/auth/session'
import { requireBackofficeSession } from '@/lib/backoffice/auth/getCurrentPlatformUser'
import { registrarAuditoria } from '@/lib/backoffice/auditoria/queries'

async function getAdminName(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return 'Desconhecido'
  const session = await verifySession(token)
  return session?.name ?? 'Desconhecido'
}

export async function bloquearEmpresaAction(id: string, motivo: string) {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
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
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
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

export async function editarEmpresaAction(
  id: string,
  data: { name?: string; plan?: string; status?: string }
): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const result = await editarEmpresa(id, data)
  if (!result.error) {
    const adminName = await getAdminName()
    await registrarAuditoria({
      organization_id: id,
      user_name: adminName,
      action: 'editar_empresa',
      description: `Dados editados: ${Object.keys(data).join(', ')}`,
    })
    revalidatePath(`/backoffice/empresas/${id}`)
    revalidatePath('/backoffice/empresas')
  }
  return result
}

export async function excluirEmpresaAction(id: string): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const adminName = await getAdminName()
  const result = await excluirEmpresa(id)
  if (!result.error) {
    await registrarAuditoria({
      organization_id: id,
      user_name: adminName,
      action: 'excluir_empresa',
      description: 'Empresa excluída permanentemente.',
    }).catch(() => null)
    revalidatePath('/backoffice/empresas')
    redirect('/backoffice/empresas')
  }
  return result
}
