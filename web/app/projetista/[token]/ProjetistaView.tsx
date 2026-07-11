'use client'

import { useState, useEffect, use } from 'react'

type ProjetistaData = {
  client: {
    name: string
    phone: string | null
    email: string | null
    cpf_cnpj: string | null
    address: string
    city: string | null
    state: string | null
    zip: string | null
    maps_coordinates: string | null
  }
  equipment: {
    modules: { brand: string | null; power_w: number | null; qty: number | null }
    inverters: { brand: string | null; power_w: number | null; qty: number | null }
    total_power_kwp: number | null
  }
  installation: {
    roof_type: string | null
    roof_orientation: string | null
    entry_breaker: string | null
    entry_cable_mm: string | null
  }
  adaptations: {
    has_adaptations: boolean
    items: string[]
  }
  project: {
    responsavel: string | null
    numero_processo: string | null
    status: string | null
  } | null
  documents: { type: string; url: string; name: string }[]
  projectDocs: { name: string; url: string; path: string }[]
  legacyDocs: { label: string; url: string }[]
  photos: { name: string; url: string; path: string }[]
  notes: string | null
}

const DOC_LABELS: Record<string, string> = {
  procuracao: 'Procuração',
  conta_luz: 'Conta de Luz',
  rg_cnh: 'RG / CNH',
  foto_disjuntor: 'Foto do Disjuntor',
  foto_maps: 'Foto Aérea (Maps)',
  foto_frente: 'Foto da Frente',
  proposta_formalizada: 'Proposta Formalizada',
  cotacao_material: 'Cotação de Material',
}

function Card({ icon, title, children, action }: { icon: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-4 py-3 space-y-2">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right font-medium">{String(value)}</span>
    </div>
  )
}

export default function ProjetistaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<ProjetistaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/projetista/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error ?? 'Link inválido')
        }
        return r.json()
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [token])

  async function handleDownloadZip() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/projetista/${token}/zip`)
      if (!res.ok) throw new Error('Erro ao gerar ZIP')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `projeto.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar o ZIP. Tente novamente.')
    }
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">{error ?? 'Este link não existe ou foi invalidado.'}</p>
        </div>
      </div>
    )
  }

  const { client, equipment, installation, adaptations, project, documents, projectDocs, legacyDocs, photos, notes } = data
  const hasEquipment = equipment.modules.brand || equipment.modules.qty || equipment.inverters.brand || equipment.inverters.qty
  const hasInstallation = installation.roof_type || installation.roof_orientation || installation.entry_breaker || installation.entry_cable_mm
  const allDocs = [...documents, ...projectDocs, ...legacyDocs]
  const hasAnyFile = allDocs.length > 0 || photos.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">IS</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Integra Solar — Projeto</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{client.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* ZIP download */}
        {hasAnyFile && (
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando ZIP...
              </>
            ) : (
              <>📦 Baixar todos os arquivos (ZIP)</>
            )}
          </button>
        )}

        {/* Cliente */}
        <Card icon="👤" title="Dados do Cliente">
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="Telefone" value={client.phone} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="CPF/CNPJ" value={client.cpf_cnpj} />
          <InfoRow label="Endereço" value={client.address} />
          <InfoRow label="CEP" value={client.zip} />
          <InfoRow label="Cidade" value={[client.city, client.state].filter(Boolean).join(' - ')} />
          {client.maps_coordinates && (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(client.maps_coordinates)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              📍 Abrir no Google Maps
            </a>
          )}
        </Card>

        {/* Equipamentos */}
        {hasEquipment && (
          <Card icon="⚡" title="Equipamentos">
            {equipment.total_power_kwp && (
              <div className="bg-blue-50 rounded-xl px-3 py-2 mb-2">
                <p className="text-xs text-blue-700">Potência total do sistema</p>
                <p className="text-lg font-bold text-blue-800">{equipment.total_power_kwp} kWp</p>
              </div>
            )}
            {(equipment.modules.brand || equipment.modules.qty) && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Módulos</p>
                <InfoRow label="Marca/Modelo" value={equipment.modules.brand} />
                <InfoRow label="Potência" value={equipment.modules.power_w ? `${equipment.modules.power_w}W` : null} />
                <InfoRow label="Quantidade" value={equipment.modules.qty} />
              </>
            )}
            {(equipment.inverters.brand || equipment.inverters.qty) && (
              <>
                <div className="border-t border-gray-100 my-2" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inversores</p>
                <InfoRow label="Marca/Modelo" value={equipment.inverters.brand} />
                <InfoRow label="Potência" value={equipment.inverters.power_w ? `${equipment.inverters.power_w}kW` : null} />
                <InfoRow label="Quantidade" value={equipment.inverters.qty} />
              </>
            )}
          </Card>
        )}

        {/* Instalação */}
        {hasInstallation && (
          <Card icon="🏠" title="Informações Técnicas">
            <InfoRow label="Tipo de telhado" value={installation.roof_type} />
            <InfoRow label="Orientação" value={installation.roof_orientation} />
            <InfoRow label="Disjuntor de entrada" value={installation.entry_breaker} />
            <InfoRow label="Cabo de entrada" value={installation.entry_cable_mm} />
          </Card>
        )}

        {/* Adequações */}
        <Card icon="🔧" title="Adequações">
          {adaptations.has_adaptations && adaptations.items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-orange-600 font-medium">Necessita adequações</p>
              {adaptations.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-orange-50 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-orange-500 mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600">✓ Nenhuma adequação necessária.</p>
          )}
        </Card>

        {/* Projeto */}
        {project && (
          <Card icon="📐" title="Projeto">
            <InfoRow label="Responsável" value={project.responsavel} />
            <InfoRow label="Nº processo" value={project.numero_processo} />
            <InfoRow label="Status" value={project.status} />
          </Card>
        )}

        {/* Observações */}
        {notes && (
          <Card icon="📝" title="Observações">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
          </Card>
        )}

        {/* Documentos */}
        {(documents.length > 0 || legacyDocs.length > 0 || projectDocs.length > 0) && (
          <Card icon="📄" title="Documentos">
            {documents.map((doc, i) => (
              <a
                key={`doc-${i}`}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700">{DOC_LABELS[doc.type] ?? doc.type}</span>
                <span className="text-xs text-blue-600 font-medium">Baixar ↓</span>
              </a>
            ))}
            {legacyDocs.map((doc, i) => (
              <a
                key={`legacy-${i}`}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700">{doc.label}</span>
                <span className="text-xs text-blue-600 font-medium">Baixar ↓</span>
              </a>
            ))}
            {projectDocs.length > 0 && (
              <>
                {(documents.length > 0 || legacyDocs.length > 0) && <div className="border-t border-gray-100 my-1" />}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anexos do Projeto</p>
                {projectDocs.map((doc, i) => (
                  <a
                    key={`proj-${i}`}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">Baixar ↓</span>
                  </a>
                ))}
              </>
            )}
          </Card>
        )}

        {/* Fotos */}
        {photos.length > 0 && (
          <Card icon="📷" title="Fotos da Obra">
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl(photo.url)}
                  className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 group cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-[11px] text-white font-medium truncate">{photo.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">Integra Solar — Dados do Projeto</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center p-2"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            className="max-w-full max-h-[95vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
