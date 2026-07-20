// web/components/apresentacao/blocos/Equipamentos.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

function CardEquip({
  titulo,
  marca,
  quantidade,
  potencia,
}: {
  titulo: string
  marca: string
  quantidade: string
  potencia: string | null
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        border: '1px solid var(--apr-borda)',
        background: 'var(--apr-fundo)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--apr-texto-suave)',
        }}
      >
        {titulo}
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 2px' }}>{marca}</p>
      <p style={{ fontSize: 13, color: 'var(--apr-texto-suave)' }}>
        {[`${quantidade} un`, potencia].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

export function Equipamentos({ dados }: { dados: ApresentacaoData }) {
  const { paineis, inversores } = dados.equipamentos
  return (
    <Secao titulo="Equipamentos">
      <div className="apr__grid">
        <CardEquip
          titulo="Painéis"
          marca={paineis.marca}
          quantidade={paineis.quantidade}
          potencia={paineis.potencia}
        />
        <CardEquip
          titulo="Inversor"
          marca={inversores.marca}
          quantidade={inversores.quantidade}
          potencia={inversores.potencia}
        />
      </div>
    </Secao>
  )
}
