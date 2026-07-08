'use server'

import { rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

// Bloqueio progressivo: 5 falhas em 15min → bloqueio
// Usamos o rate limiter existente (Upstash ou in-memory)
export async function checkBruteForce(email: string, ip: string): Promise<{
  blocked: boolean
  message?: string
}> {
  // Checa por email
  const okEmail = await rateLimit(`login_fail_email:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
  if (!okEmail) {
    return { blocked: true, message: 'Muitas tentativas. Tente novamente em 15 minutos.' }
  }

  // Checa por IP (limite mais alto para não bloquear escritórios/proxies)
  const okIp = await rateLimit(`login_fail_ip:${ip}`, 20, 15 * 60 * 1000)
  if (!okIp) {
    return { blocked: true, message: 'Muitas tentativas a partir deste endereço. Tente mais tarde.' }
  }

  return { blocked: false }
}

// Registra tentativa de login no DB (para auditoria)
export async function recordLoginAttempt({
  identifier,
  kind,
  success,
}: {
  identifier: string
  kind: 'email' | 'ip'
  success: boolean
}) {
  try {
    const admin = createAdminClient()
    await (admin as any).from('login_attempts').insert({ identifier, kind, success })
  } catch {
    // Silencioso — não bloqueia o fluxo principal
  }
}

// Verifica se um UA/IP é dispositivo novo para o usuário
export async function isNewDevice(userId: string, userAgent: string, ip: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await (admin as any)
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .or(`user_agent.eq.${userAgent},ip_address.eq.${ip}`)
      .limit(1)
      .maybeSingle()
    return !data
  } catch {
    return false
  }
}

// Registra sessão no DB
export async function recordSession({
  userId,
  organizationId,
  sessionToken,
  userAgent,
  ip,
  rememberMe,
}: {
  userId: string
  organizationId?: string | null
  sessionToken: string
  userAgent: string
  ip: string
  rememberMe: boolean
}) {
  try {
    const admin = createAdminClient()
    const expiresAt = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()       // 1 dia

    const parsed = parseUserAgent(userAgent)

    await (admin as any).from('user_sessions').insert({
      user_id: userId,
      organization_id: organizationId ?? null,
      session_token: sessionToken,
      device_name: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    })
  } catch {
    // Silencioso
  }
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let browser = 'Navegador desconhecido'
  let os = 'SO desconhecido'
  let device = 'Desktop'

  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) device = 'Mobile'
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet'

  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera'

  if (ua.includes('Windows NT')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  return { device, browser, os }
}
