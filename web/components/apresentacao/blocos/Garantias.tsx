// web/components/apresentacao/blocos/Garantias.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Icone, type NomeIcone } from '../primitivos/Icone'

const GARANTIAS: { icone: NomeIcone; titulo: string; prazo: string; descricao: string }[] = [
  { icone: 'sol', titulo: 'Painéis', prazo: '25 anos', descricao: 'Garantia de performance' },
  { icone: 'raio', titulo: 'Inversor', prazo: '10 anos', descricao: 'Garantia do fabricante' },
  { icone: 'ferramenta', titulo: 'Instalação', prazo: '1 ano', descricao: 'Serviço e mão de obra' },
]

function CardGarantia({
  icone,
  titulo,
  prazo,
  descricao,
}: {
  icone: NomeIcone
  titulo: string
  prazo: string
  descricao: string
}) {
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

export function Garantias({ dados: _dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Garantias">
      <div className="apr__grid">
        {GARANTIAS.map((g) => (
          <CardGarantia key={g.titulo} {...g} />
        ))}
      </div>
    </Secao>
  )
}
