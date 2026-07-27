import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Contato({ dados }: { dados: ApresentacaoUsinaData }) {
  const tel = dados.empresa.telefone
  const zap = tel ? tel.replace(/\D/g, '') : null
  return (
    <Secao titulo="Fale com a gente">
      {zap
        ? <a className="apr-usina__cta" href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        : <p>{dados.empresa.email ?? 'Entre em contato com a empresa.'}</p>}
    </Secao>
  )
}
