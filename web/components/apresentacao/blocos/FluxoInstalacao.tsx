// web/components/apresentacao/blocos/FluxoInstalacao.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Icone } from '../primitivos/Icone'

export function FluxoInstalacao({ dados }: { dados: ApresentacaoData }) {
  const passos = dados.textos.fluxo

  return (
    <Secao titulo="Fluxo de instalação">
      <div className="apr__grid">
        {passos.map((p, i) => (
          <div key={p.titulo} style={{ textAlign: 'center' }}>
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
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{p.descricao}</p>
          </div>
        ))}
      </div>
    </Secao>
  )
}
