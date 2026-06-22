// web/app/(dashboard)/clientes/[id]/tabs/Tab6Anexos.tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { uploadAttachment, confirmTab6 } from '@/lib/clients/actions'
import { ATTACHMENT_TYPE_LABELS, ATTACHMENT_TYPES } from '@/lib/clients/types'
import type { Client } from '@/lib/clients/types'
import { secureStorageUrl } from '@/lib/storage/url'

function AttachmentRow({ client, type, label }: { client: Client; type: string; label: string }) {
  const existing = client.attachments.find((a) => a.type === type)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadAttachment(client.id, type, {}, fd)
    })
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{label}</p>
        {existing ? (
          <a
            href={secureStorageUrl(existing.file_url) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs truncate block"
            style={{ color: '#3B82F6' }}
          >
            Arquivo enviado — ver →
          </a>
        ) : (
          <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Não enviado</p>
        )}
      </div>
      <label
        className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: 'var(--theme-input-bg)',
          border: '1px solid var(--theme-input-border)',
          color: 'var(--theme-text-muted)',
        }}
      >
        <input
          type="file"
          name="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleSubmit(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        {isPending ? '...' : existing ? 'Substituir' : 'Enviar'}
      </label>
    </div>
  )
}

export function Tab6Anexos({ client }: { client: Client }) {
  const [isPending, startTransition] = useTransition()
  const uploadedCount = ATTACHMENT_TYPES.filter((t) => client.attachments.some((a) => a.type === t)).length

  function handleConfirm() {
    startTransition(async () => {
      await confirmTab6(client.id)
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Documentos e Fotos
        </p>
        <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
          {uploadedCount}/{ATTACHMENT_TYPES.length} enviados
        </span>
      </div>

      {ATTACHMENT_TYPES.map((type) => (
        <AttachmentRow
          key={type}
          client={client}
          type={type}
          label={ATTACHMENT_TYPE_LABELS[type]}
        />
      ))}

      <div
        className="flex items-center justify-between p-3 rounded-xl mt-2"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
      >
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          {client.completed_tabs?.tab6 ? 'Anexos confirmados ✓' : 'Marcar esta aba como concluída'}
        </p>
        <Button
          variant="secondary"
          className="text-xs py-1.5 px-3"
          onClick={handleConfirm}
          loading={isPending}
          disabled={client.completed_tabs?.tab6}
          type="button"
        >
          Confirmar Anexos
        </Button>
      </div>
    </div>
  )
}
