import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function SubscriptionExpiredPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-md w-full bg-white rounded-2xl p-10 text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold text-[#0d3019] mb-3">
          Assinatura inativa
        </h1>
        <p className="text-[#57534e] mb-8 leading-relaxed">
          Sua assinatura expirou ou está pendente de pagamento. Entre em contato com nossa equipe para regularizar o acesso.
        </p>
        <div className="space-y-3">
          <a
            href="https://wa.me/5563992217642?text=Olá!%20Preciso%20regularizar%20o%20acesso%20à%20plataforma%20Integra%20Solar."
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#28944a] text-white font-semibold py-3 rounded-xl hover:bg-[#1d7035] transition-colors text-center"
          >
            Falar com nossa equipe
          </a>
          <a
            href="https://wa.me/5563992217642?text=Preciso%20de%20ajuda%20com%20minha%20assinatura"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full border border-gray-200 text-[#57534e] font-medium py-3 rounded-xl hover:border-[#28944a] transition-colors"
          >
            Falar com suporte
          </a>
        </div>
      </div>
    </div>
  )
}
