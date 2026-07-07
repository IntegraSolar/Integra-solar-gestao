'use server'

import { revalidatePath } from 'next/cache'
import { bloquearEmpresa, desbloquearEmpresa } from './queries'

export async function bloquearEmpresaAction(id: string, motivo: string) {
  const result = await bloquearEmpresa(id, motivo)
  if (!result.error) revalidatePath(`/backoffice/empresas/${id}`)
  return result
}

export async function desbloquearEmpresaAction(id: string) {
  const result = await desbloquearEmpresa(id)
  if (!result.error) revalidatePath(`/backoffice/empresas/${id}`)
  return result
}
