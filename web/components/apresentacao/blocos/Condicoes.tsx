// web/components/apresentacao/blocos/Condicoes.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Condicoes({ dados }: { dados: ApresentacaoData }) {
  // Sem orçamento gerado não há valor a informar. Exibir "R$ 0,00" para o cliente
  // final seria pior do que convidá-lo a falar com a empresa.
  if (!dados.investimento.valor) {
    return (
      <Secao titulo="Condições comerciais">
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Valor sob consulta</p>
          <p style={{ fontSize: 13, color: 'var(--apr-texto-suave)', marginTop: 6 }}>
            Entre em contato para receber o investimento detalhado.
          </p>
        </div>
      </Secao>
    )
  }

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
