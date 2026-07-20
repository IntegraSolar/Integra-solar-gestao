// web/components/apresentacao/primitivos/Indicador.tsx

export function Indicador({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string
  valor: string
  nota?: string | null
}) {
  return (
    <div className="apr__ind">
      <p className="apr__ind-rotulo">{rotulo}</p>
      <p className="apr__ind-valor">{valor}</p>
      {nota && <p className="apr__ind-nota">{nota}</p>}
    </div>
  )
}
