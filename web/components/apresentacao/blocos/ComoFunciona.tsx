// web/components/apresentacao/blocos/ComoFunciona.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Icone, type NomeIcone } from '../primitivos/Icone'

const PASSOS: { icone: NomeIcone; texto: string }[] = [
  { icone: 'sol', texto: 'Os painéis captam a luz do sol.' },
  { icone: 'raio', texto: 'O inversor transforma essa energia em eletricidade para sua casa.' },
  { icone: 'grafico', texto: 'O que sobra vira crédito na conta de luz.' },
  { icone: 'telefone', texto: 'Você acompanha tudo pelo aplicativo, a qualquer hora.' },
]

export function ComoFunciona({ dados: _dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Como funciona a energia solar">
      <div className="apr__grid">
        {PASSOS.map((p, i) => (
          <div key={p.texto} style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--apr-destaque)', display: 'flex', justifyContent: 'center' }}>
              <Icone nome={p.icone} tamanho={22} />
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'var(--apr-texto-suave)',
                marginTop: 8,
              }}
            >
              {i + 1}
            </p>
            <p style={{ fontSize: 13, marginTop: 2 }}>{p.texto}</p>
          </div>
        ))}
      </div>
    </Secao>
  )
}
