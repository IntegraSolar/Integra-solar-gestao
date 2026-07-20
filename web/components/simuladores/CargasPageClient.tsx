'use client'
import { useState } from 'react'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { CargasBuilder } from './CargasBuilder'

/** Dono do estado da tela autônoma de levantamento. */
export function CargasPageClient({ biblioteca: inicial }: { biblioteca: CargaBiblioteca[] }) {
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(inicial)
  return (
    <CargasBuilder
      cargas={cargas}
      onCargasChange={setCargas}
      biblioteca={biblioteca}
      onBibliotecaChange={setBiblioteca}
      mostrarCabecalho
    />
  )
}
