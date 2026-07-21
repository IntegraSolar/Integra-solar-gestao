// web/components/apresentacao/blocos/Hero.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Indicador } from '../primitivos/Indicador'

export function Hero({ dados }: { dados: ApresentacaoData }) {
  const frase =
    dados.textos.abertura ??
    (dados.cliente.cidade ? `Energia solar para ${dados.cliente.cidade}` : 'Sua usina solar')

  return (
    <Secao>
      <h1
        style={{
          fontFamily: 'var(--apr-fonte-titulo)',
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.25,
          margin: '0 0 20px',
          textAlign: 'center',
        }}
      >
        {frase}
      </h1>
      <div className="apr__grid">
        <Indicador rotulo="Potência" valor={dados.sistema.potencia_kwp} />
        <Indicador rotulo="Geração mensal" valor={dados.sistema.geracao_mensal} />
        {dados.investimento.valor && (
          <Indicador rotulo="Investimento" valor={dados.investimento.valor} />
        )}
      </div>
    </Secao>
  )
}
