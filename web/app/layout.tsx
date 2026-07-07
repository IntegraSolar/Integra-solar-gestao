import type { Metadata } from 'next'
import { Figtree, DM_Sans, Sora } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Integra Solar — Plataforma de Gestão',
  description: 'CRM para gestão de projetos de energia solar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${figtree.variable} ${dmSans.variable} ${sora.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var ALLOWED=['green','navy','dark','light'];var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',ALLOWED.indexOf(t)!==-1?t:'green')})()
        `}} />
      </head>
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
