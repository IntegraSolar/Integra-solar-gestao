// web/components/apresentacao/primitivos/Icone.tsx
// Biblioteca de icones SVG inline, sem dependencia externa (pagina publica, deve ser leve).
import type { ReactElement } from 'react'

export type NomeIcone =
  | 'sol'
  | 'raio'
  | 'bateria'
  | 'ferramenta'
  | 'escudo'
  | 'relogio'
  | 'check'
  | 'casa'
  | 'grafico'
  | 'documento'
  | 'telefone'
  | 'email'
  | 'local'
  | 'calendario'

const CAMINHOS: Record<NomeIcone, ReactElement> = {
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  raio: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />,
  bateria: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 10v4" />
      <path d="M6 10v4M10 10v4" />
    </>
  ),
  ferramenta: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" strokeLinejoin="round" />
  ),
  escudo: (
    <path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5l-8-3Z" strokeLinejoin="round" />
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" strokeLinejoin="round" />,
  casa: (
    <>
      <path d="M3 11 12 4l9 7" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  grafico: (
    <>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </>
  ),
  documento: (
    <>
      <path d="M6 2h9l5 5v15H6Z" strokeLinejoin="round" />
      <path d="M15 2v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  telefone: (
    <path d="M4 5c0 8.3 6.7 15 15 15l3-4-6-3-2 2c-2-1-4-3-5-5l2-2-3-6-4 3Z" strokeLinejoin="round" />
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  local: (
    <>
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
}

export function Icone({ nome, tamanho = 20 }: { nome: NomeIcone; tamanho?: number }) {
  const conteudo = CAMINHOS[nome]
  if (!conteudo) return null

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {conteudo}
    </svg>
  )
}
