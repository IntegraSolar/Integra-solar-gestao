// web/components/apresentacao/blocos/LinhaDoTempo.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

const ETAPAS = [
  {
    titulo: 'Dimensionamento',
    descricao: 'Analisamos seu consumo e definimos o tamanho ideal do sistema.',
  },
  {
    titulo: 'Projeto',
    descricao: 'Elaboramos o projeto técnico conforme as normas da concessionária.',
  },
  {
    titulo: 'Homologação',
    descricao: 'Enviamos a documentação e aguardamos a aprovação da distribuidora.',
  },
  {
    titulo: 'Instalação',
    descricao: 'Nossa equipe instala estruturas, módulos e inversor no seu telhado.',
  },
  {
    titulo: 'Comissionamento',
    descricao: 'Testamos o sistema e solicitamos a vistoria final para ligação.',
  },
  {
    titulo: 'Monitoramento',
    descricao: 'Você acompanha a geração de energia em tempo real pelo aplicativo.',
  },
]

export function LinhaDoTempo({ dados: _dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Etapas do seu projeto">
      <div>
        {ETAPAS.map((etapa, i) => (
          <div key={etapa.titulo} style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: '50%',
                  background: 'var(--apr-destaque)',
                  color: 'var(--apr-contraste)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              {i < ETAPAS.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    background: 'var(--apr-borda)',
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: i < ETAPAS.length - 1 ? 20 : 0 }}>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{etapa.titulo}</p>
              <p style={{ fontSize: 13, color: 'var(--apr-texto-suave)', marginTop: 2 }}>
                {etapa.descricao}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Secao>
  )
}
