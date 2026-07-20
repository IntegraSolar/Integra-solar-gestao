'use client'

import { useState, useEffect } from 'react'
import type { Client } from '@/lib/clients/types'
import { generateClientPortalLink, updateClientPortalVisibility, type PortalVisibility } from '@/lib/clients/portal-actions'
import { generateInstallerLink } from '@/lib/obra/actions'
import { generateProjetistaLink } from '@/lib/projetos/actions'
import { Copy, Check, ExternalLink, Link2, RefreshCw } from 'lucide-react'

type LinksData = {
  installerToken: string | null
  projetistaToken: string | null
  portalToken: string | null
  portalVisibility: PortalVisibility
}

const PORTAL_SECOES: { key: keyof PortalVisibility; label: string }[] = [
  { key: 'show_progress', label: 'Andamento do Projeto' },
  { key: 'show_history', label: 'Histórico do Projeto' },
]

/** Escolha das seções que o cliente enxerga no portal. */
function PortalSecoes({
  visibility,
  onChange,
  disabled,
  hint,
}: {
  visibility: PortalVisibility
  onChange: (v: PortalVisibility) => void
  disabled?: boolean
  hint: string
}) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
        Seções visíveis para o cliente
      </p>
      {PORTAL_SECOES.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={visibility[key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...visibility, [key]: e.target.checked })}
            className="w-3.5 h-3.5 accent-green-500"
          />
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        </label>
      ))}
      <p className="text-[11px]" style={{ color: 'var(--theme-text-subtle)' }}>{hint}</p>
    </div>
  )
}

function LinkCard({
  label,
  description,
  token,
  path,
  color,
  onGenerate,
  generating,
  optionsSlot,
}: {
  label: string
  description: string
  token: string | null
  path: string
  color: string
  onGenerate: () => void
  generating: boolean
  /** Opções específicas do link, exibidas tanto antes quanto depois de gerar. */
  optionsSlot?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const url = token ? `${typeof window !== 'undefined' ? window.location.origin : ''}${path}/${token}` : null

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex items-center gap-2.5">
        <Link2 size={16} style={{ color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>{description}</p>
        </div>
      </div>

      {token && url ? (
        <>
          <div className="px-3 py-2 rounded-lg" style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-border)' }}>
            <p className="text-[11px] font-mono break-all" style={{ color: 'var(--theme-text-muted)' }}>{url}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: copied ? '#10B981' : color, border: `1px solid ${color}33` }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors hover:bg-white/10"
              style={{ color, border: `1px solid ${color}33` }}
            >
              <ExternalLink size={12} /> Abrir
            </a>
          </div>
          {optionsSlot}
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ color: 'var(--theme-text-subtle)' }}
          >
            <RefreshCw size={11} />
            {generating ? 'Gerando...' : 'Gerar novo link (invalida o anterior)'}
          </button>
        </>
      ) : (
        <>
        {optionsSlot}
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}
        >
          {generating ? 'Gerando...' : `Gerar ${label}`}
        </button>
        </>
      )}
    </div>
  )
}

export function Tab9Links({ client }: { client: Client }) {
  const [links, setLinks] = useState<LinksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPortal, setGeneratingPortal] = useState(false)
  const [portalVisibility, setPortalVisibility] = useState<PortalVisibility>({ show_progress: true, show_history: true })
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [visibilityMsg, setVisibilityMsg] = useState<string | null>(null)
  const [generatingInstaller, setGeneratingInstaller] = useState(false)
  const [generatingProjetista, setGeneratingProjetista] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${client.id}/full-data`)
      .then((r) => r.json())
      .then((d) => {
        const vis = d.portalVisibility ?? { show_progress: true, show_history: true }
        setLinks({
          installerToken: d.installerToken ?? null,
          projetistaToken: d.projetistaToken ?? null,
          portalToken: d.portalToken ?? null,
          portalVisibility: vis,
        })
        setPortalVisibility(vis)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [client.id])

  async function handleGeneratePortal() {
    setGeneratingPortal(true)
    setVisibilityMsg(null)
    // As seções escolhidas já valem no link recém-criado.
    const result = await generateClientPortalLink(client.id, portalVisibility)
    if (result.token) {
      setLinks((prev) => prev ? { ...prev, portalToken: result.token!, portalVisibility } : prev)
    }
    if (result.error) setVisibilityMsg(result.error)
    setGeneratingPortal(false)
  }

  // Altera as seções de um link já existente, sem invalidá-lo.
  async function handleSaveVisibility() {
    setSavingVisibility(true)
    setVisibilityMsg(null)
    const result = await updateClientPortalVisibility(client.id, portalVisibility)
    setVisibilityMsg(result.error ?? 'Preferências salvas.')
    if (!result.error) {
      setLinks((prev) => prev ? { ...prev, portalVisibility } : prev)
    }
    setSavingVisibility(false)
  }

  const visibilityAlterada =
    !!links &&
    (links.portalVisibility.show_progress !== portalVisibility.show_progress ||
      links.portalVisibility.show_history !== portalVisibility.show_history)

  async function handleGenerateInstaller() {
    setGeneratingInstaller(true)
    const result = await generateInstallerLink(client.id)
    if (result.token) setLinks((prev) => prev ? { ...prev, installerToken: result.token! } : prev)
    setGeneratingInstaller(false)
  }

  async function handleGenerateProjetista() {
    setGeneratingProjetista(true)
    const result = await generateProjetistaLink(client.id)
    if (result.token) setLinks((prev) => prev ? { ...prev, projetistaToken: result.token! } : prev)
    setGeneratingProjetista(false)
  }

  if (loading) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--theme-text-subtle)' }}>Carregando links...</p>
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-accent)' }}>Links de Acesso</p>

      <LinkCard
        label="Portal do Cliente"
        description="Página de acompanhamento completo para o cliente final"
        token={links?.portalToken ?? null}
        path="/cliente"
        color="#10B981"
        onGenerate={handleGeneratePortal}
        generating={generatingPortal}
        optionsSlot={
          <div className="space-y-2">
            <PortalSecoes
              visibility={portalVisibility}
              onChange={setPortalVisibility}
              disabled={savingVisibility}
              hint={
                links?.portalToken
                  ? 'Desmarque para ocultar a seção no portal. A alteração vale para o link atual.'
                  : 'Desmarque para que a seção não apareça no link que será gerado.'
              }
            />
            {links?.portalToken && visibilityAlterada && (
              <button
                type="button"
                onClick={handleSaveVisibility}
                disabled={savingVisibility}
                className="w-full text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#10B9811A', color: '#10B981', border: '1px solid #10B98133' }}
              >
                {savingVisibility ? 'Salvando...' : 'Salvar alterações'}
              </button>
            )}
            {visibilityMsg && (
              <p className="text-[11px]" style={{ color: 'var(--theme-text-subtle)' }}>{visibilityMsg}</p>
            )}
          </div>
        }
      />

      <LinkCard
        label="Link do Instalador"
        description="Página com dados da instalação para a equipe"
        token={links?.installerToken ?? null}
        path="/instalador"
        color="#F59E0B"
        onGenerate={handleGenerateInstaller}
        generating={generatingInstaller}
      />

      <LinkCard
        label="Link do Projetista"
        description="Página com dados do projeto, documentos e fotos"
        token={links?.projetistaToken ?? null}
        path="/projetista"
        color="#3B82F6"
        onGenerate={handleGenerateProjetista}
        generating={generatingProjetista}
      />
    </div>
  )
}
