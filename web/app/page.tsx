'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, FileText, DollarSign, Wrench, FolderOpen, BarChart2, Check, ChevronDown } from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'CRM de Vendas', desc: 'Gerencie leads, clientes e oportunidades em um funil visual completo.' },
  { icon: FileText, title: 'Propostas Automáticas', desc: 'Gere propostas profissionais com cálculo automático de dimensionamento.' },
  { icon: DollarSign, title: 'Gestão Financeira', desc: 'Controle receitas, despesas, comissões e fluxo de caixa em tempo real.' },
  { icon: Wrench, title: 'Controle de Obras', desc: 'Acompanhe cada etapa da instalação com checklists e cronogramas.' },
  { icon: FolderOpen, title: 'Documentos e Contratos', desc: 'Armazene e organize todos os documentos dos seus clientes.' },
  { icon: BarChart2, title: 'Relatórios Inteligentes', desc: 'Dashboards e relatórios para tomar decisões baseadas em dados.' },
]

const PLANS = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: 'R$ 199,90',
    period: '/mês',
    tag: 'Sem fidelidade',
    highlight: false,
    features: ['CRM completo', 'Propostas ilimitadas', 'Gestão financeira', 'Controle de obras', 'Suporte por chat'],
  },
  {
    id: 'semestral',
    name: 'Semestral',
    price: 'R$ 1.079,00',
    period: '/semestre',
    tag: 'Mais Vendido',
    saving: 'Economize R$ 120,40',
    highlight: false,
    features: ['Tudo do Mensal', 'Relatórios avançados', 'Integrações', 'Suporte prioritário', 'Treinamento incluso'],
  },
  {
    id: 'anual',
    name: 'Anual',
    price: 'R$ 1.998,00',
    period: '/ano',
    tag: 'Melhor Oferta',
    saving: 'Economize R$ 400,80',
    highlight: true,
    features: ['Tudo do Semestral', 'API exclusiva', 'Multi-usuários', 'Suporte dedicado', 'Consultoria de setup'],
  },
]

const FAQ = [
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Não há fidelidade nos planos mensais. Para planos semestrais e anuais, você pode cancelar a renovação automática a qualquer momento.' },
  { q: 'O sistema funciona para qualquer empresa de energia solar?', a: 'Sim. O Integra Solar foi projetado para integradoras, revendedores e instaladores de sistemas fotovoltaicos de qualquer porte.' },
  { q: 'Posso mudar de plano depois?', a: 'Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento pelo painel administrativo.' },
  { q: 'Como funciona o Pix recorrente?', a: 'No Pix recorrente, geramos uma cobrança mensal automática. Você recebe a notificação e paga pelo app do seu banco, sem precisar lembrar.' },
  { q: 'Como funciona a cobrança no cartão?', a: 'A cobrança é feita automaticamente no cartão cadastrado na data de renovação. Você recebe um recibo por e-mail a cada cobrança.' },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const scrollToPlans = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f5f4f3] text-[#1c1917]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={140} height={40} className="h-9 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#57534e] hover:text-[#1c1917] transition-colors px-4 py-2">
              Entrar
            </Link>
            <button onClick={scrollToPlans} className="text-sm font-medium bg-[#28944a] text-white px-5 py-2.5 rounded-xl hover:bg-[#1d7035] transition-colors">
              Começar Agora
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h1 className="font-[Sora] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d3019] leading-tight">
          Organize sua empresa de energia solar em um único sistema
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-[#57534e] max-w-3xl mx-auto">
          CRM, propostas, financeiro, obras, documentos e gestão completa da sua empresa em uma única plataforma.
        </p>
        <button onClick={scrollToPlans} className="mt-10 inline-flex items-center bg-[#28944a] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#1d7035] transition-colors shadow-lg shadow-green-900/10">
          Começar Agora
        </button>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-14">
          Tudo que você precisa, em um só lugar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-xl bg-[#28944a]/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-[#28944a]" />
              </div>
              <h3 className="font-[Sora] font-semibold text-lg text-[#0d3019]">{f.title}</h3>
              <p className="mt-2 text-sm text-[#57534e]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-4">
          Escolha o plano ideal
        </h2>
        <p className="text-center text-[#57534e] mb-14">Todos os planos incluem 7 dias grátis para teste.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? 'border-2 border-[#28944a] shadow-xl scale-[1.02]'
                  : 'border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  plan.highlight ? 'bg-[#28944a] text-white' : 'bg-[#28944a]/10 text-[#28944a]'
                }`}>
                  {plan.tag}
                </span>
              </div>
              <h3 className="font-[Sora] text-xl font-bold text-[#0d3019]">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#0d3019]">{plan.price}</span>
                <span className="text-sm text-[#57534e]">{plan.period}</span>
              </div>
              {plan.saving && (
                <p className="mt-1 text-sm font-medium text-[#28944a]">{plan.saving}</p>
              )}
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-[#57534e]">
                    <Check className="w-4 h-4 text-[#28944a] shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${plan.id}`}
                className={`mt-8 block text-center font-semibold py-3 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-[#28944a] text-white hover:bg-[#1d7035]'
                    : 'bg-[#0d3019] text-white hover:bg-[#0d3019]/90'
                }`}
              >
                Começar Agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
        <div className="bg-white rounded-2xl p-10 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="font-[Sora] text-2xl font-bold text-[#0d3019] mb-3">Garantia de 7 dias</h2>
          <p className="text-[#57534e]">
            Teste por 7 dias. Se não fizer sentido, cancele sem burocracia.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h2 className="font-[Sora] text-3xl font-bold text-center text-[#0d3019] mb-10">Perguntas Frequentes</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-[#0d3019]">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#57534e] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-sm text-[#57534e]">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={120} height={34} className="h-8 w-auto" />
          <div className="flex gap-6 text-sm text-[#57534e]">
            <Link href="/login" className="hover:text-[#1c1917]">Entrar</Link>
            <a href="#planos" className="hover:text-[#1c1917]">Planos</a>
          </div>
          <p className="text-xs text-[#57534e]">&copy; {new Date().getFullYear()} Integra Solar. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
