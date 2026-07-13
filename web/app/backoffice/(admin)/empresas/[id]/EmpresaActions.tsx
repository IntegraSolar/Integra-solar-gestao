'use client'

import { useState, useTransition } from 'react'
import {
  bloquearEmpresaAction,
  desbloquearEmpresaAction,
  editarEmpresaAction,
  excluirEmpresaAction,
} from '@/lib/backoffice/empresas/actions'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10 bg-white'

const PLANS = ['starter', 'professional', 'enterprise']
const STATUSES = ['active', 'trial', 'blocked', 'canceled']

export function EditarEmpresaButton({
  id,
  currentName,
  currentPlan,
  currentStatus,
}: {
  id: string
  currentName: string
  currentPlan: string | null
  currentStatus: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [plan, setPlan] = useState(currentPlan ?? 'professional')
  const [status, setStatus] = useState(currentStatus ?? 'active')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setError(null)
    startTransition(async () => {
      const result = await editarEmpresaAction(id, { name: name.trim(), plan, status })
      if (result.error) { setError(result.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-[#D0DCE8] bg-white px-4 py-2 text-sm font-semibold text-[#1A3A5C] hover:bg-[#F0F4F8] transition-colors"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-[#1A3A5C] mb-4">Editar empresa</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4A6580] mb-1.5">Nome</label>
                <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A6580] mb-1.5">Plano</label>
                <select className={inputCls} value={plan} onChange={e => setPlan(e.target.value)}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A6580] mb-1.5">Status</label>
                <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[#6B8CA4] hover:text-[#1A3A5C]">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-xl bg-[#1A3A5C] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0E2236] disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function ExcluirEmpresaButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExcluir() {
    if (confirm !== name) { setError('O nome não confere.'); return }
    setError(null)
    startTransition(async () => {
      const result = await excluirEmpresaAction(id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
      >
        Excluir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-red-700 mb-1">Excluir empresa</h3>
            <p className="text-sm text-[#6B8CA4] mb-4">
              Esta ação é <strong>irreversível</strong>. Todos os dados da empresa serão apagados permanentemente.
              Para confirmar, digite o nome da empresa abaixo:
            </p>
            <p className="text-xs font-mono bg-[#F0F4F8] rounded-lg px-3 py-2 text-[#1A3A5C] mb-3 select-all">{name}</p>
            <input
              className={inputCls + ' border-red-200 focus:border-red-400 focus:ring-red-100'}
              placeholder="Digite o nome para confirmar"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null) }}
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setOpen(false); setConfirm('') }} className="px-4 py-2 text-sm text-[#6B8CA4] hover:text-[#1A3A5C]">
                Cancelar
              </button>
              <button
                onClick={handleExcluir}
                disabled={isPending || confirm !== name}
                className="rounded-xl bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

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
