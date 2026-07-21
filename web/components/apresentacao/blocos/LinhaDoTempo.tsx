// web/components/apresentacao/blocos/LinhaDoTempo.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function LinhaDoTempo({ dados }: { dados: ApresentacaoData }) {
  const etapas = dados.textos.timeline

  return (
    <Secao titulo="Etapas do seu projeto">
      <div>
        {etapas.map((etapa, i) => (
          <div key={etapa.titulo} style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: '50%',
                  background: 'var(--apr-destaque)',
                  color: 'var(--apr-contraste)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              {i < etapas.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    background: 'var(--apr-borda)',
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: i < etapas.length - 1 ? 20 : 0 }}>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{etapa.titulo}</p>
              <p style={{ fontSize: 13, color: 'var(--apr-texto-suave)', marginTop: 2 }}>
                {etapa.descricao}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Secao>
  )
}
