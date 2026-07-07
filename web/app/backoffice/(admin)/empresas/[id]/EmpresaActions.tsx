'use client'

import { useState, useTransition } from 'react'
import { bloquearEmpresaAction, desbloquearEmpresaAction } from '@/lib/backoffice/empresas/actions'
import { useRouter } from 'next/navigation'

export function BloquearEmpresaButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleBloquear() {
    if (!motivo.trim()) return
    startTransition(async () => {
      await bloquearEmpresaAction(id, motivo.trim())
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
      >
        Bloquear empresa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-[#1A3A5C] mb-1">Bloquear empresa</h3>
            <p className="text-sm text-[#6B8CA4] mb-4">
              A empresa perderá acesso à plataforma. Informe o motivo:
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Inadimplência, violação de termos..."
              rows={3}
              className="w-full rounded-xl border border-[#D0DCE8] px-4 py-3 text-sm text-[#1A3A5C] outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-[#6B8CA4] hover:text-[#1A3A5C] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBloquear}
                disabled={!motivo.trim() || isPending}
                className="rounded-xl bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Bloqueando...' : 'Confirmar bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function DesbloquearEmpresaButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDesbloquear() {
    if (!confirm('Desbloquear esta empresa?')) return
    startTransition(async () => {
      await desbloquearEmpresaAction(id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDesbloquear}
      disabled={isPending}
      className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Desbloqueando...' : 'Desbloquear empresa'}
    </button>
  )
}
