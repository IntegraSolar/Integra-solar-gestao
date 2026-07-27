import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
export function Capa({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <section className="apr__card apr__cover">
      {dados.empresa.logo_url && <img src={dados.empresa.logo_url} alt="" className="apr__cover-logo" />}
      <h1 className="apr__cover-titulo">{dados.titulo}</h1>
      {dados.cliente.nome && (
        <p className="apr__cover-cliente">
          {dados.cliente.nome}{dados.cliente.cidade ? ` — ${dados.cliente.cidade}` : ''}
        </p>
      )}
      <p className="apr__cover-data">
        Emitida em {dados.datas.emitida_em} · validade {dados.datas.validade_dias} dias
      </p>
    </section>
  )
}
