// web/components/apresentacao/blocos/Assinatura.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

function LinhaAssinatura({ rotulo }: { rotulo: string }) {
  return (
    <div>
      <div style={{ borderBottom: '1px solid var(--apr-borda)', height: 52 }} />
      <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)', marginTop: 8, textAlign: 'center' }}>
        {rotulo}
      </p>
    </div>
  )
}

export function Assinatura({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Aceite">
      <div className="apr__grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <LinhaAssinatura rotulo={dados.cliente.nome} />
        <LinhaAssinatura rotulo={dados.empresa.nome} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)', textAlign: 'center', marginTop: 20 }}>
        Emitida em {dados.datas.emitida_em}
      </p>
    </Secao>
  )
}
