// web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PosObraClient } from '@/lib/pos-obra/queries'
import { upsertPosObra } from '@/lib/pos-obra/actions'
import { DatePicker } from '@/components/ui/inputs'

export default function PosObraDetail({
  posObra,
  clientId,
}: {
  posObra: PosObraClient
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    data_contato: posObra.data_contato ?? '',
    nps: posObra.nps ?? '',
    observacoes: posObra.observacoes ?? '',
    status: posObra.status,
  })

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertPosObra(clientId, {
        data_contato: form.data_contato || null,
        nps: form.nps !== '' ? Number(form.nps) : null,
        observacoes: form.observacoes || null,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/pos-obra')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'var(--theme-surface)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{posObra.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{posObra.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${posObra.status === 'concluida' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
          {posObra.status === 'concluida' ? 'Concluída' : 'Pendente'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{posObra.dias_usados} / {posObra.contract_max_days ?? '—'} dias</span>
      </div>

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados do Pós-Obra</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DatePicker label="Data de contato" value={form.data_contato || null} onChange={(iso) => setForm((f) => ({ ...f, data_contato: iso }))} />
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--theme-text-subtle)' }}>
              Data para verificar a primeira conta de energia do cliente
            </p>
          </div>
          <div>
            <label className={labelCls}>NPS (0-10)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              value={form.nps}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (e.target.value === '') setForm((f) => ({ ...f, nps: '' }))
                else if (!isNaN(v) && v >= 0 && v <= 10) setForm((f) => ({ ...f, nps: String(v) }))
              }}
              className={inputCls}
              placeholder="0-10"
            />
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--theme-text-subtle)' }}>
              Nota de satisfação percebida pelo cliente
            </p>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Observações gerais</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Registro de contato, feedback do cliente..."
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputCls}
            >
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
      >
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
