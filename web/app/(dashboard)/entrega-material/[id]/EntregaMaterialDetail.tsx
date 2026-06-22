// web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { EntregaMaterialClient } from '@/lib/entrega-material/queries'
import { upsertDelivery, uploadDeliveryMedia } from '@/lib/entrega-material/actions'
import { DatePicker } from '@/components/ui/inputs'
import { Plus, ExternalLink, Trash2, Image as ImageIcon } from 'lucide-react'
import { secureStorageUrl } from '@/lib/storage/url'

export default function EntregaMaterialDetail({
  entrega,
  clientId,
}: {
  entrega: EntregaMaterialClient
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const initialChecklist = {
    foto_materiais: (entrega.checklist as any)?.foto_materiais ?? false,
    verificar_avarias: (entrega.checklist as any)?.verificar_avarias ?? false,
  }

  const [form, setForm] = useState({
    data_entrega: entrega.data_entrega ?? '',
    status: entrega.status,
    checklist: initialChecklist,
  })

  const initialMedia: string[] = (() => {
    try { return JSON.parse((entrega as any).media_urls ?? '[]') } catch { return [] }
  })()
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialMedia)

  function handleCheckbox(key: keyof typeof form.checklist) {
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertDelivery(clientId, {
        data_entrega: form.data_entrega || null,
        checklist: form.checklist,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'entregue') router.push('/entrega-material')
      }
    })
  }

  async function handleUploadMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadDeliveryMedia(clientId, fd)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(result.success!)
      if (result.url) setMediaUrls((prev) => [...prev, result.url!])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'var(--theme-surface)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{entrega.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{entrega.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${
          entrega.status === 'entregue' ? 'bg-green-500/20 text-green-300 border-green-500/40'
          : entrega.status === 'atrasada' ? 'bg-red-500/20 text-red-300 border-red-500/40'
          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
        }`}>
          {entrega.status === 'entregue' ? 'Entregue' : entrega.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{entrega.dias_usados} / {entrega.contract_max_days ?? '—'} dias</span>
      </div>

      {/* Checklist */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Checklist de Entrega</h2>
        {([
          ['foto_materiais', 'Foto dos materiais'],
          ['verificar_avarias', 'Verificar possíveis avarias'],
        ] as [keyof typeof form.checklist, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.checklist[key]} onChange={() => handleCheckbox(key)} className="w-4 h-4 accent-yellow-400" />
            <span className="text-sm text-white/80">{label}</span>
          </label>
        ))}
      </div>

      {/* Dados da entrega */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados da Entrega</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DatePicker label="Data de entrega ao cliente" value={form.data_entrega || null} onChange={(iso) => setForm((f) => ({ ...f, data_entrega: iso }))} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="atrasada">Atrasada</option>
              <option value="entregue">Entregue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fotos e vídeos da entrega */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Fotos e Vídeos da Entrega</h2>

        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {mediaUrls.map((url, i) => {
              const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)
              return (
                <a
                  key={i}
                  href={secureStorageUrl(url) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative rounded-xl overflow-hidden group"
                  style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)', aspectRatio: '1' }}
                >
                  {isVideo ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">▶</span>
                    </div>
                  ) : (
                    <img src={secureStorageUrl(url) ?? ''} alt={`Entrega ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <ExternalLink size={18} style={{ color: 'var(--theme-accent)' }} />
                  </div>
                </a>
              )
            })}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleUploadMedia}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-colors hover:bg-white/10"
          style={{ color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border)' }}
        >
          <Plus size={14} />
          {uploading ? 'Enviando...' : 'Adicionar foto ou vídeo'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}>
        {isPending ? 'Salvando…' : 'Salvar e liberar para Obra'}
      </button>
    </div>
  )
}
