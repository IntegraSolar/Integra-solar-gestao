// web/components/apresentacao/blocos/Condicoes.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Condicoes({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Condições comerciais">
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)' }}>Investimento total</p>
        <p
          style={{
            fontFamily: 'var(--apr-fonte-titulo)',
            fontSize: 38,
            fontWeight: 700,
            color: 'var(--apr-destaque)',
            lineHeight: 1.1,
            margin: '6px 0',
          }}
        >
          {dados.investimento.valor}
        </p>
        <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)' }}>
          Proposta válida até {dados.datas.valida_ate}
        </p>
      </div>
    </Secao>
  )
}
