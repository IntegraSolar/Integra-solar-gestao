// web/app/instalador/[token]/InstallerView.tsx
'use client'

import { useState, useEffect, use } from 'react'

type InstallerData = {
  client: {
    name: string
    phone: string | null
    address: string
    city: string | null
    state: string | null
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
  photos: { type: string; url: string }[]
  notes: string | null
}

const PHOTO_LABELS: Record<string, string> = {
  foto_frente: 'Frente da casa',
  foto_disjuntor: 'Disjuntor/Padrão',
  foto_maps: 'Vista aérea',
  conta_luz: 'Conta de luz',
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
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

export default function InstallerView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<InstallerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/instalador/${token}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
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

  const { client, equipment, installation, adaptations, photos, notes } = data

  const mapsUrl = client.maps_coordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(client.maps_coordinates)}`
    : client.address
      ? `https://www.google.com/maps/search/${encodeURIComponent(client.address)}`
      : null

  const hasEquipment = equipment.modules.brand || equipment.modules.qty || equipment.inverters.brand || equipment.inverters.qty
  const hasInstallation = installation.roof_type || installation.roof_orientation || installation.entry_breaker || installation.entry_cable_mm

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">IS</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Integra Solar</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{client.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Cliente */}
        <Card icon="👤" title="Dados do Cliente">
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="Telefone" value={client.phone} />
          <InfoRow label="Cidade" value={[client.city, client.state].filter(Boolean).join(' - ')} />
        </Card>

        {/* Localização */}
        {(client.address || client.maps_coordinates) && (
          <Card icon="📍" title="Localização">
            <InfoRow label="Endereço" value={client.address} />
            {client.maps_coordinates && (
              <InfoRow label="Coordenadas" value={client.maps_coordinates} />
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
              >
                📍 Abrir no Google Maps
              </a>
            )}
          </Card>
        )}

        {/* Equipamentos */}
        {hasEquipment && (
          <Card icon="⚡" title="Equipamentos">
            {equipment.total_power_kwp && (
              <div className="bg-yellow-50 rounded-xl px-3 py-2 mb-2">
                <p className="text-xs text-yellow-700">Potência total do sistema</p>
                <p className="text-lg font-bold text-yellow-800">{equipment.total_power_kwp} kWp</p>
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
          <Card icon="🏠" title="Informações da Instalação">
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

        {/* Observações */}
        {notes && (
          <Card icon="📝" title="Observações">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
          </Card>
        )}

        {/* Fotos */}
        {photos.length > 0 && (
          <Card icon="📷" title="Fotos">
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
                    alt={PHOTO_LABELS[photo.type] ?? photo.type}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-[11px] text-white font-medium">{PHOTO_LABELS[photo.type] ?? photo.type}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">Integra Solar — Dados da Instalação</p>
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
