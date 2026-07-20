// web/components/apresentacao/blocos/Depoimentos.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Depoimentos({ dados }: { dados: ApresentacaoData }) {
  if (dados.depoimentos.length === 0) return null

  return (
    <Secao titulo="O que dizem nossos clientes">
      <div className="apr__grid">
        {dados.depoimentos.map((d, i) => (
          <div
            key={i}
            style={{
              padding: 18,
              borderRadius: 14,
              border: '1px solid var(--apr-borda)',
              background: 'var(--apr-fundo)',
            }}
          >
            <p style={{ fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{d.texto}&rdquo;</p>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>{d.autor}</p>
            {d.cidade && (
              <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)' }}>{d.cidade}</p>
            )}
          </div>
        ))}
      </div>
    </Secao>
  )
}
