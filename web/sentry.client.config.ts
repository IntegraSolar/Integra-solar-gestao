import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Tracing (performance) e Session Replay desativados para reduzir o bundle
  // client — as partes mais pesadas do SDK. A captura de erros (o essencial)
  // segue ativa. O tree-shaking real acontece via bundleSizeOptimizations no
  // next.config.mjs; aqui garantimos que também não rodam em runtime.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: (integrations) =>
    integrations.filter((i) => i.name !== 'Replay' && i.name !== 'BrowserTracing'),
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
