// web/components/apresentacao/blocos/Contato.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'

export function Contato({ dados }: { dados: ApresentacaoData }) {
  const { empresa } = dados
  const linhas = [
    empresa.telefone && { rotulo: 'Telefone', valor: empresa.telefone },
    empresa.email && { rotulo: 'E-mail', valor: empresa.email },
    empresa.cidade && { rotulo: 'Cidade', valor: empresa.cidade },
  ].filter(Boolean) as { rotulo: string; valor: string }[]

  return (
    <Secao titulo="Fale com a gente">
      <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{empresa.nome}</p>
      <div className="apr__grid">
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--apr-texto-suave)' }}>
              {l.rotulo}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{l.valor}</p>
          </div>
        ))}
      </div>
    </Secao>
  )
}
