import { getOrgConfig } from '@/lib/configuracoes/queries'
import { MessageCircle, Mail, Globe, Phone } from 'lucide-react'

export default async function ContatoPage() {
  const config = await getOrgConfig()

  const items = [
    { icon: MessageCircle, label: 'WhatsApp', value: config.telefone, href: config.telefone ? `https://wa.me/55${config.telefone.replace(/\D/g, '')}` : null, color: '#25D366' },
    { icon: Phone, label: 'Telefone', value: config.telefone, href: config.telefone ? `tel:${config.telefone}` : null, color: '#60a5fa' },
    { icon: Mail, label: 'E-mail', value: config.email, href: config.email ? `mailto:${config.email}` : null, color: 'var(--theme-accent)' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contato / Suporte</h1>
        <p className="text-white/40 text-sm mt-1">Entre em contato com a empresa</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          if (!item.value) return null
          const Icon = item.icon
          return (
            <a
              key={item.label}
              href={item.href ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl transition-all hover:border-white/20"
              style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                <Icon size={20} style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-xs text-white/40">{item.label}</p>
                <p className="text-sm font-medium text-white">{item.value}</p>
              </div>
            </a>
          )
        })}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}>
        <p className="text-xs text-white/40">
          As informações de contato são gerenciadas em Configurações → Empresa.
        </p>
      </div>
    </div>
  )
}
