import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Empresa({ dados }: { dados: ApresentacaoUsinaData }) {
  const e = dados.empresa
  return (
    <Secao titulo="Sobre a empresa">
      <p className="apr-usina__empresa-nome">{e.nome}</p>
      <p className="apr-usina__empresa-info">
        {[e.cnpj ? `CNPJ ${e.cnpj}` : null, e.telefone, e.email].filter(Boolean).join(' · ')}
      </p>
    </Secao>
  )
}
