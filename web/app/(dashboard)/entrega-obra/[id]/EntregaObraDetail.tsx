// web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { EntregaObraClient } from '@/lib/entrega-obra/queries'
import { upsertObraDelivery, uploadObraPhoto, deleteObraPhoto } from '@/lib/entrega-obra/actions'
import type { ObraPhoto } from '@/lib/entrega-obra/actions'
import { DatePicker } from '@/components/ui/inputs'
import { Plus, Trash2, X, ZoomIn } from 'lucide-react'

const MAX_PHOTOS = 20

export default function EntregaObraDetail({
  entrega,
  clientId,
  initialPhotos,
}: {
  entrega: EntregaObraClient
  clientId: string
  initialPhotos: ObraPhoto[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [photos, setPhotos] = useState<ObraPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const initialChecklist = {
    vistoria: (entrega.checklist as any)?.vistoria ?? false,
    fotos: (entrega.checklist as any)?.fotos ?? false,
    cliente_ok: (entrega.checklist as any)?.cliente_ok ?? false,
    monitoramento_configurado: (entrega.checklist as any)?.monitoramento_configurado ?? false,
    sistema_ligado: (entrega.checklist as any)?.sistema_ligado ?? false,
  }

  const [form, setForm] = useState({
    data_entrega: entrega.data_entrega ?? '',
    observacoes: entrega.observacoes ?? '',
    status: entrega.status,
    checklist: initialChecklist,
    monitor_app: (entrega as any).monitor_app ?? '',
    monitor_user: (entrega as any).monitor_user ?? '',
    monitor_pass: (entrega as any).monitor_pass ?? '',
  })

  function handleCheckbox(key: keyof typeof form.checklist) {
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertObraDelivery(clientId, {
        data_entrega: form.data_entrega || null,
        observacoes: form.observacoes || null,
        checklist: form.checklist,
        status: form.status,
        monitor_app: form.monitor_app || null,
        monitor_user: form.monitor_user || null,
        monitor_pass: form.monitor_pass || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/entrega-obra')
      }
    })
  }

  function photoUrl(filePath: string): string {
    return `/api/storage/download?bucket=project-docs&path=${encodeURIComponent(filePath)}`
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadObraPhoto(entrega.id, fd)
    if (result.error) {
      setError(result.error)
    } else if (result.photo) {
      setPhotos((prev) => [...prev, result.photo!])
      setSuccess(result.success ?? 'Foto enviada.')
    }
    setUploading(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  async function handleDeletePhoto(id: string) {
    setDeletingId(id)
    setError(null)
    const result = await deleteObraPhoto(id)
    if (result.error) {
      setError(result.error)
    } else {
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      setSuccess(result.success ?? 'Foto removida.')
    }
    setDeletingId(null)
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
        <span className={`px-3 py-1 rounded-full text-xs border ${entrega.status === 'concluida' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
          {entrega.status === 'concluida' ? 'Concluída' : 'Pendente'}
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
          ['vistoria', 'Vistoria realizada'],
          ['fotos', 'Fotos registradas'],
          ['cliente_ok', 'Aprovação do cliente'],
          ['monitoramento_configurado', 'Monitoramento configurado'],
          ['sistema_ligado', 'Sistema ligado'],
        ] as [keyof typeof form.checklist, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.checklist[key]} onChange={() => handleCheckbox(key)} className="w-4 h-4 accent-yellow-400" />
            <span className="text-sm text-white/80">{label}</span>
          </label>
        ))}
      </div>

      {/* Dados da Entrega */}
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
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Observações gerais</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Observações sobre a entrega da obra..."
            />
          </div>
        </div>
      </div>

      {/* Monitoramento */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Monitoramento</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Nome do App de monitoramento</label>
            <input type="text" value={form.monitor_app} onChange={(e) => setForm((f) => ({ ...f, monitor_app: e.target.value }))} className={inputCls} placeholder="Ex: SolarView, Growatt, iSolarCloud" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Usuário</label>
              <input type="text" value={form.monitor_user} onChange={(e) => setForm((f) => ({ ...f, monitor_user: e.target.value }))} className={inputCls} placeholder="Login do monitoramento" />
            </div>
            <div>
              <label className={labelCls}>Senha</label>
              <input type="text" value={form.monitor_pass} onChange={(e) => setForm((f) => ({ ...f, monitor_pass: e.target.value }))} className={inputCls} placeholder="Senha do monitoramento" />
            </div>
          </div>
        </div>
      </div>

      {/* Fotos da Obra Finalizada */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">Fotos da Obra Finalizada</h2>
          <span className="text-xs text-white/30">{photos.length}/{MAX_PHOTOS}</span>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                <img
                  src={photoUrl(photo.file_path)}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(photoUrl(photo.file_path))}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingId === photo.id}
                    className="p-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-300 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white/70 truncate">{photo.file_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">Nenhuma foto adicionada.</p>
        )}

        {photos.length < MAX_PHOTOS && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors hover:bg-white/10 w-full justify-center"
              style={{ color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border)' }}
            >
              <Plus size={14} />
              {uploading ? 'Enviando...' : 'Adicionar imagem'}
            </button>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}>
        {isPending ? 'Salvando…' : 'Salvar e liberar Pós-Obra'}
      </button>
    </div>
  )
}
