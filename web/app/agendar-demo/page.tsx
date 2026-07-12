import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MessageCircle, CheckCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '5563992217642'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent('Gostaria de agendar uma apresentação da plataforma Integra Solar!')

export default function AgendarDemoPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={180} height={52} className="h-11 w-auto" />
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-[0_32px_80px_rgba(10,22,34,.15)] border border-gray-100">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-[#28944a]/10 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-[#28944a]" />
            </div>
          </div>

          <h1 style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold text-[#0d3019] text-center mb-2">
            Acesso mediante apresentação
          </h1>
          <p className="text-[#57534e] text-sm text-center leading-relaxed mb-6">
            Para garantir a melhor experiência desde o primeiro dia, o acesso à plataforma é liberado após uma apresentação comercial personalizada com nossa equipe.
          </p>

          <ul className="space-y-3 mb-8">
            {[
              'Demonstração ao vivo da plataforma',
              'Onboarding personalizado para sua operação',
              'Suporte dedicado desde o início',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#28944a] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#57534e]">{item}</span>
              </li>
            ))}
          </ul>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#28944a] text-white font-semibold py-3 rounded-xl hover:bg-[#1d7035] transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Agendar pelo WhatsApp
          </a>

          <p className="text-xs text-[#a8bcce] text-center mt-4">
            20 minutos. Sem compromisso. Você decide se faz sentido.
          </p>
        </div>

        <p className="text-center text-sm text-[#a8bcce] mt-6">
          Já tem acesso?{' '}
          <Link href="/login" className="font-semibold text-[#28944a] hover:underline">
            Entrar na plataforma
          </Link>
        </p>
      </div>
    </div>
  )
}
