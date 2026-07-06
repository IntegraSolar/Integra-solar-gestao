/**
 * Logger estruturado centralizado.
 *
 * Produz JSON em produção (ideal para ingestão por Vercel Logs, Datadog, etc.)
 * e texto legível em desenvolvimento.
 *
 * Nunca registre: senhas, tokens, CPF, telefone, e-mail, dados bancários.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const IS_PROD = process.env.NODE_ENV === 'production'

function mask(id: string | undefined | null): string {
  if (!id) return '[unknown]'
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : '***'
}

function emit(level: LogLevel, scope: string, msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg,
    env: process.env.NODE_ENV ?? 'unknown',
    ...(meta ?? {}),
  }

  const line = IS_PROD ? JSON.stringify(entry) : `[${level.toUpperCase()}] [${scope}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else if (level === 'debug' && !IS_PROD) console.debug(line)
  else if (level !== 'debug') console.log(line)
}

export const logger = {
  debug: (scope: string, msg: string, meta?: Record<string, unknown>) =>
    emit('debug', scope, msg, meta),

  info: (scope: string, msg: string, meta?: Record<string, unknown>) =>
    emit('info', scope, msg, meta),

  warn: (scope: string, msg: string, meta?: Record<string, unknown>) =>
    emit('warn', scope, msg, meta),

  error: (scope: string, msg: string, error?: unknown, meta?: Record<string, unknown>) => {
    const errMeta: Record<string, unknown> = {
      ...(meta ?? {}),
    }
    if (error instanceof Error) {
      errMeta.error = error.message
      // Stack trace só em desenvolvimento
      if (!IS_PROD) errMeta.stack = error.stack
    } else if (error !== undefined) {
      errMeta.error = String(error)
    }
    emit('error', scope, msg, errMeta)
  },
}

// Utilitário de mascaramento para evitar PII em logs
export { mask }
