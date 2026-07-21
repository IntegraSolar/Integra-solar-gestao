import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // O binário do Chromium (~67 MB) é carregado por caminho de arquivo em tempo de
  // execução, não por import. Sem estas duas linhas o Next não o enxerga, não o
  // empacota, e a função de PDF sobe para a Vercel sem o navegador que precisa
  // abrir — falhando só em produção.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/proposta/**': ['./node_modules/@sparticuz/chromium/**'],
  },
  images: {
    // Serve AVIF/WebP (menores) para imagens via next/image quando o browser suporta.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: *.supabase.co",
      "connect-src 'self' *.supabase.co *.sentry.io",
      "font-src 'self'",
      "media-src 'self' blob: *.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  // Evita que o Sentry envolva o middleware com instrumentação Edge Runtime,
  // que pode crashar quando NEXT_PUBLIC_SENTRY_DSN não está configurado.
  autoInstrumentMiddleware: false,
  // Tree-shaking do SDK client: remove tracing (performance) e Session Replay
  // do bundle. Mantém apenas a captura de erros. Ver sentry.client.config.ts.
  bundleSizeOptimizations: {
    excludeTracing: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
    excludeDebugStatements: true,
  },
})
