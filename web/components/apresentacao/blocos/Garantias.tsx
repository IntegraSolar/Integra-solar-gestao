// web/components/apresentacao/blocos/Garantias.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import type { ItemGarantia } from '@/lib/apresentacoes/textos'
import { Secao } from '../primitivos/Secao'
import { Icone } from '../primitivos/Icone'

function CardGarantia({ icone, titulo, prazo, descricao }: ItemGarantia) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        border: '1px solid var(--apr-borda)',
        background: 'var(--apr-fundo)',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--apr-destaque)', display: 'flex', justifyContent: 'center' }}>
        <Icone nome={icone} tamanho={24} />
      </div>
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--apr-texto-suave)',
          margin: '10px 0 6px',
        }}
      >
        {titulo}
      </p>
      <p
        style={{
          fontFamily: 'var(--apr-fonte-titulo)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--apr-destaque)',
        }}
      >
        {prazo}
      </p>
      <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)', marginTop: 4 }}>{descricao}</p>
    </div>
  )
}

export function Garantias({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Garantias">
      <div className="apr__grid">
        {dados.textos.garantias.map((g) => (
          <CardGarantia key={g.titulo} {...g} />
        ))}
      </div>
    </Secao>
  )
}
