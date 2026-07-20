// web/components/apresentacao/blocos/FluxoInstalacao.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Icone, type NomeIcone } from '../primitivos/Icone'

const PASSOS: { icone: NomeIcone; texto: string }[] = [
  { icone: 'local', texto: 'Visita técnica' },
  { icone: 'ferramenta', texto: 'Montagem das estruturas' },
  { icone: 'sol', texto: 'Instalação dos módulos' },
  { icone: 'raio', texto: 'Conexão e testes' },
]

export function FluxoInstalacao({ dados: _dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Fluxo de instalação">
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
              Passo {i + 1}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{p.texto}</p>
          </div>
        ))}
      </div>
    </Secao>
  )
}
