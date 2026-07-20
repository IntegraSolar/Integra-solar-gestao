// web/components/apresentacao/primitivos/Secao.tsx

export function Secao({
  titulo,
  children,
}: {
  titulo?: string
  children: React.ReactNode
}) {
  return (
    <section className="apr__card" style={{ padding: 'var(--apr-pad-secao)' }}>
      {titulo && <h2 className="apr__secao-titulo">{titulo}</h2>}
      {children}
    </section>
  )
}
