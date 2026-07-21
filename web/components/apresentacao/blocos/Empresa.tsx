// web/components/apresentacao/blocos/Empresa.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Icone } from '../primitivos/Icone'

function LinhaContato({ nome, texto }: { nome: 'local' | 'telefone' | 'email'; texto: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--apr-texto-suave)', display: 'flex' }}>
        <Icone nome={nome} tamanho={16} />
      </span>
      <span style={{ fontSize: 14 }}>{texto}</span>
    </div>
  )
}

export function Empresa({ dados }: { dados: ApresentacaoData }) {
  const { empresa } = dados

  const contatos = [
    empresa.endereco_resumido && { nome: 'local' as const, texto: empresa.endereco_resumido },
  ].filter(Boolean) as { nome: 'local' | 'telefone' | 'email'; texto: string }[]

  const rodape = [empresa.razao_social, empresa.cnpj].filter(Boolean).join(' · ') || null

  return (
    <Secao>
      <p style={{ fontSize: 22, fontWeight: 700, marginBottom: rodape ? 4 : 16 }}>{empresa.nome}</p>
      {rodape && (
        <p style={{ fontSize: 12, color: 'var(--apr-texto-suave)', marginBottom: 20 }}>{rodape}</p>
      )}
      {contatos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contatos.map((c) => (
            <LinhaContato key={c.nome} nome={c.nome} texto={c.texto} />
          ))}
        </div>
      )}
    </Secao>
  )
}
