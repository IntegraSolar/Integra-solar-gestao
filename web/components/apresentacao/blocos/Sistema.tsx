// web/components/apresentacao/blocos/Sistema.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid var(--apr-borda)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--apr-texto-suave)' }}>{rotulo}</span>
      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

export function Sistema({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Sistema proposto">
      <Linha rotulo="Painéis" valor={dados.sistema.paineis} />
      <Linha rotulo="Inversor" valor={dados.sistema.inversores} />
      <Linha rotulo="Potência total" valor={dados.sistema.potencia_kwp} />
      <Linha rotulo="Geração estimada" valor={dados.sistema.geracao_mensal} />
    </Secao>
  )
}
