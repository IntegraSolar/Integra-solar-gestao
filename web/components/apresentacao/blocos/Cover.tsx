// web/components/apresentacao/blocos/Cover.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'

export function Cover({ dados }: { dados: ApresentacaoData }) {
  return (
    <section
      className="apr__card"
      style={{
        padding: '48px 28px',
        background: 'var(--apr-contraste)',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      {dados.empresa.logo_url ? (
        <img
          src={dados.empresa.logo_url}
          alt={dados.empresa.nome}
          style={{ height: 44, objectFit: 'contain', margin: '0 auto 24px' }}
        />
      ) : (
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 24 }}>{dados.empresa.nome}</p>
      )}

      <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.65 }}>
        Proposta Comercial
      </p>
      <h1
        style={{
          fontFamily: 'var(--apr-fonte-titulo)',
          fontSize: 30,
          fontWeight: 700,
          margin: '10px 0 6px',
          lineHeight: 1.2,
        }}
      >
        {dados.cliente.nome}
      </h1>
      {dados.cliente.cidade && (
        <p style={{ fontSize: 14, opacity: 0.75 }}>{dados.cliente.cidade}</p>
      )}
      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 28 }}>
        Emitida em {dados.datas.emitida_em}
      </p>
    </section>
  )
}
