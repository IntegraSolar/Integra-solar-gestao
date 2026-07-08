'use client'

import { useTransition } from 'react'
import { removerAdmin } from '@/lib/backoffice/configuracoes/actions'
import { useRouter } from 'next/navigation'

export function RemoverAdminButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemover() {
    if (!confirm(`Remover acesso de "${name}" ao backoffice?`)) return
    startTransition(async () => {
      await removerAdmin(id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleRemover}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors font-semibold"
    >
      {isPending ? 'Removendo...' : 'Remover'}
    </button>
  )
}
