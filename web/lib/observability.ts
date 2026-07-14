import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'

/**
 * Camada de observabilidade para operações de servidor (server actions, rotas de
 * API). Combina o logger estruturado com o Sentry e padroniza o contexto:
 * requestId, módulo, ação, tenant e usuário — nunca dados sensíveis.
 */

export function newRequestId(): string {
  // ID curto o suficiente para correlacionar logs sem expor nada.
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 8)
}

export type OpContext = {
  requestId?: string
  module: string          // ex.: 'backoffice.empresas'
  action: string          // ex.: 'criarNovaEmpresa'
  tenant?: string         // organization_id
  user?: string           // user id (nunca e-mail/senha)
}

function baseMeta(ctx: OpContext, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    requestId: ctx.requestId,
    module: ctx.module,
    action: ctx.action,
    tenant: ctx.tenant,
    user: ctx.user,
    ...(extra ?? {}),
  }
}

/** Início de uma operação crítica. */
export function logStart(ctx: OpContext, extra?: Record<string, unknown>): void {
  logger.info(ctx.module, `${ctx.action}: início`, baseMeta(ctx, extra))
}

/** Sucesso de uma operação crítica. */
export function logOk(ctx: OpContext, extra?: Record<string, unknown>): void {
  logger.info(ctx.module, `${ctx.action}: ok`, baseMeta(ctx, extra))
}

/**
 * Falha: registra no logger (ERROR) e envia ao Sentry com tags de correlação.
 * Retorna a mensagem para uso opcional na resposta ao usuário.
 */
export function reportError(ctx: OpContext, error: unknown, extra?: Record<string, unknown>): string {
  const message = error instanceof Error ? error.message : String(error)
  logger.error(ctx.module, `${ctx.action}: falha`, error, baseMeta(ctx, extra))
  Sentry.captureException(error, {
    tags: { module: ctx.module, action: ctx.action, requestId: ctx.requestId ?? '' },
    extra: { tenant: ctx.tenant, user: ctx.user, ...(extra ?? {}) },
  })
  return message
}
