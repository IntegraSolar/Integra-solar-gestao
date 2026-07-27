import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'

export function Capa({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <section className="apr__card" style={{ padding: '48px 32px', textAlign: 'center' }}>
      {dados.empresa.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dados.empresa.logo_url}
          alt={dados.empresa.nome}
          style={{ height: 72, objectFit: 'contain', margin: '0 auto 28px' }}
        />
      ) : (
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 28 }}>{dados.empresa.nome}</p>
      )}

      <h1
        style={{
          fontFamily: 'var(--apr-fonte-titulo)',
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.25,
          margin: '0 0 10px',
        }}
      >
        {dados.titulo}
      </h1>
      {dados.cliente.nome && (
        <p style={{ fontSize: 15, opacity: 0.85, margin: '0 0 4px' }}>
          {dados.cliente.nome}
          {dados.cliente.cidade ? ` — ${dados.cliente.cidade}` : ''}
        </p>
      )}
      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 12 }}>
        Emitida em {dados.datas.emitida_em} · validade {dados.datas.validade_dias} dias
      </p>
    </section>
  )
}
