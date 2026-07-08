'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Integra Solar <noreply@integrasolar.com.br>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.integrasolar.com.br'

export async function sendNewDeviceLoginEmail({
  to,
  name,
  device,
  browser,
  ip,
  time,
}: {
  to: string
  name: string
  device: string
  browser: string
  ip: string
  time: string
}) {
  const securityUrl = `${SITE}/configuracoes?tab=seguranca`

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Novo acesso à sua conta — Integra Solar',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <tr><td style="background:#1A3A5C;padding:32px 40px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">Integra Solar</p>
          <p style="margin:4px 0 0;color:#9BAEBF;font-size:13px">Plataforma de Gestão</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#0E2236;font-size:22px">Novo acesso detectado</h2>
          <p style="margin:0 0 24px;color:#4A6580;font-size:15px">Olá, ${name}. Identificamos um acesso à sua conta a partir de um novo dispositivo.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;border-radius:12px;padding:20px;margin-bottom:24px">
            <tr><td style="padding:6px 0">
              <span style="color:#6B8CA4;font-size:13px">Dispositivo</span><br>
              <span style="color:#1A3A5C;font-size:15px;font-weight:600">${device}</span>
            </td></tr>
            <tr><td style="padding:6px 0">
              <span style="color:#6B8CA4;font-size:13px">Navegador</span><br>
              <span style="color:#1A3A5C;font-size:15px;font-weight:600">${browser}</span>
            </td></tr>
            <tr><td style="padding:6px 0">
              <span style="color:#6B8CA4;font-size:13px">IP de origem</span><br>
              <span style="color:#1A3A5C;font-size:15px;font-weight:600">${ip}</span>
            </td></tr>
            <tr><td style="padding:6px 0">
              <span style="color:#6B8CA4;font-size:13px">Horário</span><br>
              <span style="color:#1A3A5C;font-size:15px;font-weight:600">${time}</span>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;color:#4A6580;font-size:14px">Se foi você, pode ignorar este e-mail. Caso não reconheça este acesso, acesse sua conta e encerre as sessões desconhecidas.</p>

          <a href="${securityUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">
            Verificar sessões ativas →
          </a>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #E2ECF4">
          <p style="margin:0;color:#9BAEBF;font-size:12px">
            Este e-mail foi enviado automaticamente. Não responda a esta mensagem.<br>
            © ${new Date().getFullYear()} Integra Solar — Todos os direitos reservados.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendEmailConfirmationEmail({
  to,
  name,
  confirmUrl,
}: {
  to: string
  name: string
  confirmUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Confirme seu e-mail — Integra Solar',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <tr><td style="background:#1A3A5C;padding:32px 40px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">Integra Solar</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#0E2236;font-size:22px">Confirme seu e-mail</h2>
          <p style="margin:0 0 24px;color:#4A6580;font-size:15px">Olá, ${name}! Sua conta foi criada. Clique no botão abaixo para confirmar seu e-mail e acessar a plataforma.</p>
          <a href="${confirmUrl}" style="display:inline-block;background:#28944a;color:#fff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none">
            Confirmar e-mail →
          </a>
          <p style="margin:24px 0 0;color:#9BAEBF;font-size:13px">O link expira em 24 horas. Se não solicitou esta conta, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
