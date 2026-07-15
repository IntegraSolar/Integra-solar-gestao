'use client'

import { useState, useTransition } from 'react'
import {
  bloquearEmpresaAction,
  desbloquearEmpresaAction,
  editarEmpresaAction,
  excluirEmpresaAction,
  toggleSimuladoresAction,
} from '@/lib/backoffice/empresas/actions'
import { useRouter } from 'next/navigation'
import { Button, inputCls } from '@/components/backoffice/ui'

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
      <Button variant="secondary" onClick={() => setOpen(true)}>Editar</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-[#0E1B2A] mb-4">Editar empresa</h3>

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
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
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
      <Button variant="danger" onClick={() => setOpen(true)}>Excluir</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-[#C11B1B] mb-1">Excluir empresa</h3>
            <p className="text-sm text-[#45586E] mb-4">
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
            {error && <p className="text-sm text-[#C11B1B] mt-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <Button variant="ghost" onClick={() => { setOpen(false); setConfirm('') }}>Cancelar</Button>
              <Button variant="danger" onClick={handleExcluir} disabled={isPending || confirm !== name}>
                {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
              </Button>
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
      <Button variant="secondary" onClick={() => setOpen(true)}>Bloquear</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-[#0E1B2A] mb-1">Bloquear empresa</h3>
            <p className="text-sm text-[#45586E] mb-4">
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
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleBloquear} disabled={!motivo.trim() || isPending}>
                {isPending ? 'Bloqueando...' : 'Confirmar bloqueio'}
              </Button>
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
    <Button variant="success" onClick={handleDesbloquear} disabled={isPending}>
      {isPending ? 'Desbloqueando...' : 'Desbloquear'}
    </Button>
  )
}

export function SimuladoresToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleSimuladoresAction(id, !enabled)
      if (!result.error) router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        enabled
          ? 'bg-[#EAF7EF] text-[#1f9d55] border border-[#bce8ce]'
          : 'bg-[#F0F4F8] text-[#45586E] border border-[#D0DCE8]'
      }`}
    >
      {isPending ? '...' : enabled ? 'Simuladores: ON' : 'Simuladores: OFF'}
    </button>
  )
}
