export const metadata = { title: "Contato" }
import { MessageCircle, Mail } from 'lucide-react'

const SUPPORT = {
  whatsapp: { number: '5563992217742', display: '(63) 99221-7742' },
  email: 'integrasolaradm@gmail.com',
}

export default function SuportePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Suporte</h1>
        <p className="text-white/40 text-sm mt-1">Entre em contato com o suporte da plataforma</p>
      </div>

      <div className="space-y-3">
        <a
          href={`https://wa.me/${SUPPORT.whatsapp.number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl transition-all hover:border-white/20"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#25D36615' }}>
            <MessageCircle size={20} style={{ color: '#25D366' }} />
          </div>
          <div>
            <p className="text-xs text-white/40">WhatsApp</p>
            <p className="text-sm font-medium text-white">{SUPPORT.whatsapp.display}</p>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT.email}`}
          className="flex items-center gap-4 p-4 rounded-xl transition-all hover:border-white/20"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,208,128,0.08)' }}>
            <Mail size={20} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div>
            <p className="text-xs text-white/40">E-mail</p>
            <p className="text-sm font-medium text-white">{SUPPORT.email}</p>
          </div>
        </a>
      </div>
    </div>
  )
}
