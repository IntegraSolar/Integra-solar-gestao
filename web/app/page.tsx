'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users, FileText, DollarSign, Wrench, FolderOpen, BarChart2,
  Check, ChevronDown, ArrowRight, X as XIcon, Zap, Shield,
  Calendar, Sun, Calculator, Database,
} from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'CRM de Vendas', desc: 'Gerencie leads, clientes e oportunidades em um funil visual completo. Acompanhe cada etapa da jornada do cliente.' },
  { icon: Calculator, title: 'Propostas e Orçamentos', desc: 'Gere orçamentos com cálculo automático de dimensionamento, custos e margem. Exporte em PDF profissional.' },
  { icon: DollarSign, title: 'Gestão Financeira', desc: 'Controle parcelas, comissões, comprovantes e fluxo de caixa. Saiba exatamente quanto receber e quando.' },
  { icon: Wrench, title: 'Controle de Obras', desc: 'Acompanhe cada instalação com checklists, prazos, equipes e fotos. Nunca perca um prazo.' },
  { icon: FolderOpen, title: 'Documentos e Contratos', desc: 'ART, projetos, NFs, comprovantes e contratos organizados por cliente. Tudo em um só lugar.' },
  { icon: BarChart2, title: 'Relatórios e Indicadores', desc: 'Dashboard com KPIs, SLA por etapa, ticket médio, conversão e comparativos. Decisões baseadas em dados.' },
]

const PROBLEMS = [
  { before: 'Planilhas espalhadas no Drive', after: 'Tudo centralizado em uma plataforma' },
  { before: 'Propostas feitas manualmente no Word', after: 'Orçamentos automáticos com cálculo real' },
  { before: 'Financeiro controlado no papel', after: 'Parcelas, comissões e comprovantes digitais' },
  { before: 'Sem visibilidade dos prazos', after: 'Prazo global por cliente com alertas de atraso' },
  { before: 'Documentos perdidos no WhatsApp', after: 'Documentos organizados por etapa do pipeline' },
  { before: 'Sem dados para tomar decisões', after: 'Dashboard com indicadores em tempo real' },
]

const PLANS = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: 'R$ 199,90',
    period: '/mês',
    tag: 'Sem fidelidade',
    highlight: false,
    features: ['CRM completo', 'Propostas ilimitadas', 'Gestão financeira', 'Controle de obras', 'Gestão documental', 'Relatórios', 'Suporte por chat'],
    cta: 'Assinar Plano Mensal',
  },
  {
    id: 'semestral',
    name: 'Semestral',
    price: 'R$ 1.079,00',
    period: '/semestre',
    tag: 'Mais Vendido',
    saving: 'Economize R$ 120,40',
    highlight: false,
    features: ['Todos os recursos do mensal', 'Economia de ~10%', 'Suporte prioritário', 'Treinamento incluso', 'Integrações avançadas'],
    cta: 'Escolher Semestral',
  },
  {
    id: 'anual',
    name: 'Anual',
    price: 'R$ 1.998,00',
    period: '/ano',
    tag: 'Melhor Oferta',
    saving: 'Economize R$ 400,80',
    highlight: true,
    features: ['Todos os recursos do semestral', 'Economia de ~17%', 'Suporte dedicado', 'Consultoria de setup', 'Melhor custo-benefício'],
    cta: 'Escolher Anual',
  },
]

const FAQ = [
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Não há fidelidade nos planos mensais. Para planos semestrais e anuais, você pode cancelar a renovação automática a qualquer momento.' },
  { q: 'O sistema funciona para qualquer empresa de energia solar?', a: 'Sim. O Integra Solar foi projetado para integradoras, revendedores e instaladores de sistemas fotovoltaicos de qualquer porte — de 1 a 100+ funcionários.' },
  { q: 'Posso mudar de plano depois?', a: 'Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento pelo painel administrativo.' },
  { q: 'Como funciona o Pix recorrente?', a: 'No Pix recorrente, geramos uma cobrança mensal automática. Você recebe a notificação e paga pelo app do seu banco, sem precisar lembrar.' },
  { q: 'Como funciona a cobrança no cartão?', a: 'A cobrança é feita automaticamente no cartão cadastrado na data de renovação. Você recebe um recibo por e-mail a cada cobrança.' },
  { q: 'Preciso de treinamento para usar?', a: 'O sistema é intuitivo e foi feito para quem não tem tempo de aprender ferramentas complexas. Mas oferecemos treinamento incluso nos planos semestrais e anuais.' },
]

const WHATSAPP_URL = 'https://wa.me/5563992217642?text=' + encodeURIComponent('Gostaria de agendar uma apresentação da plataforma Integra Solar!')

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  const scrollToPlans = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f5f4f3] text-[#1c1917]">
      {/* ── Header ──────────────────────────────────────────────── */}
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

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#28944a]/10 text-[#28944a] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Sun className="w-4 h-4" />
          Feito por integradores, para integradores
        </div>
        <h1 className="font-[Sora] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d3019] leading-tight">
          Organize sua empresa de energia solar em um único sistema
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-[#57534e] max-w-3xl mx-auto leading-relaxed">
          CRM, propostas, financeiro, obras, documentos e gestão completa — numa plataforma criada por quem vive o dia a dia do setor solar.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={scrollToPlans} className="inline-flex items-center gap-2 bg-[#28944a] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#1d7035] transition-colors shadow-lg shadow-green-900/10">
            Começar Agora <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-white text-[#0d3019] font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 hover:border-[#28944a] hover:text-[#28944a] transition-colors">
            <Calendar className="w-5 h-5" /> Agende uma apresentação
          </button>
        </div>
      </section>

      {/* ── Feito por quem vive o problema ──────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-[#0d3019] rounded-3xl p-10 sm:p-14 text-white text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Shield className="w-4 h-4" /> A diferença de quem entende o setor
          </div>
          <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold leading-tight">
            O Integra Solar não é um sistema genérico<br className="hidden sm:block" /> adaptado para energia solar
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            Ele foi construído por quem atua como integrador e entende os problemas reais: propostas perdidas no WhatsApp, planilhas desatualizadas, prazos estourados e falta de controle financeiro. Cada funcionalidade foi pensada para resolver um problema real da operação.
          </p>
        </div>
      </section>

      {/* ── Problema vs Solução ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-4">
          Antes vs Depois do Integra Solar
        </h2>
        <p className="text-center text-[#57534e] mb-14 max-w-2xl mx-auto">
          Veja como empresas de energia solar estão substituindo processos manuais por uma gestão organizada.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="bg-white rounded-xl p-5 flex items-start gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                  <XIcon className="w-3.5 h-3.5 text-red-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-600/70 line-through">{p.before}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-[#28944a]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#28944a]" />
                  </div>
                  <p className="text-sm font-medium text-[#0d3019]">{p.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-4">
          Tudo que você precisa, em um só lugar
        </h2>
        <p className="text-center text-[#57534e] mb-14 max-w-2xl mx-auto">
          Do primeiro contato com o lead até o pós-venda — cada etapa da sua operação organizada.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#28944a]/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-[#28944a]" />
              </div>
              <h3 className="font-[Sora] font-semibold text-lg text-[#0d3019]">{f.title}</h3>
              <p className="mt-2 text-sm text-[#57534e] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Inteligência operacional ────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-center">
            <div className="w-14 h-14 rounded-xl bg-[#28944a]/10 flex items-center justify-center mx-auto mb-5">
              <Zap className="w-7 h-7 text-[#28944a]" />
            </div>
            <h3 className="font-[Sora] font-bold text-lg text-[#0d3019] mb-2">Dimensionamento</h3>
            <p className="text-sm text-[#57534e]">Calcule automaticamente a potência, geração e custos do sistema fotovoltaico.</p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-center">
            <div className="w-14 h-14 rounded-xl bg-[#28944a]/10 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-7 h-7 text-[#28944a]" />
            </div>
            <h3 className="font-[Sora] font-bold text-lg text-[#0d3019] mb-2">Propostas em PDF</h3>
            <p className="text-sm text-[#57534e]">Gere orçamentos profissionais em segundos com seus templates personalizados.</p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-center">
            <div className="w-14 h-14 rounded-xl bg-[#28944a]/10 flex items-center justify-center mx-auto mb-5">
              <Database className="w-7 h-7 text-[#28944a]" />
            </div>
            <h3 className="font-[Sora] font-bold text-lg text-[#0d3019] mb-2">Dados centralizados</h3>
            <p className="text-sm text-[#57534e]">Clientes, propostas, projetos, financeiro e documentos — tudo acessível de qualquer lugar.</p>
          </div>
        </div>
      </section>

      {/* ── CTA Apresentação ────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-gray-100">
          <h2 className="font-[Sora] text-2xl sm:text-3xl font-bold text-[#0d3019] mb-3">
            Quer ver o Integra Solar funcionando na prática?
          </h2>
          <p className="text-[#57534e] max-w-2xl mx-auto mb-8">
            Agende uma apresentação rápida e veja como empresas de energia solar estão organizando sua operação com mais eficiência.
          </p>
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-white text-[#0d3019] font-semibold px-8 py-4 rounded-xl text-lg border-2 border-[#28944a] hover:bg-[#28944a] hover:text-white transition-colors">
            <Calendar className="w-5 h-5" /> Agende uma apresentação
          </button>
        </div>
      </section>

      {/* ── Plans ───────────────────────────────────────────────── */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-4">
          Escolha o plano ideal para sua empresa
        </h2>
        <p className="text-center text-[#57534e] mb-14">Todos os planos incluem 7 dias grátis para teste. Cancele quando quiser.</p>
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
                className={`mt-8 block text-center font-semibold py-3.5 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-[#28944a] text-white hover:bg-[#1d7035]'
                    : 'bg-[#0d3019] text-white hover:bg-[#0d3019]/90'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Redução de custo ─────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-[#0d3019] rounded-3xl p-10 sm:p-14 text-center text-white">
          <h2 className="font-[Sora] text-2xl sm:text-3xl font-bold mb-4">
            Sem implementação cara. Sem setup demorado.
          </h2>
          <p className="text-white/70 max-w-3xl mx-auto text-lg leading-relaxed">
            Esqueça consultorias de R$ 10.000 para implementar um ERP. O Integra Solar já vem configurado para o fluxo de empresas de energia solar. Crie sua conta, configure suas premissas e comece a usar em minutos.
          </p>
        </div>
      </section>

      {/* ── Guarantee ───────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
        <div className="bg-white rounded-2xl p-10 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="w-14 h-14 rounded-full bg-[#28944a]/10 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-[#28944a]" />
          </div>
          <h2 className="font-[Sora] text-2xl font-bold text-[#0d3019] mb-3">Garantia de 7 dias</h2>
          <p className="text-[#57534e] leading-relaxed">
            Teste o Integra Solar por 7 dias. Se não fizer sentido para sua empresa, cancele sem burocracia e sem perguntas.
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
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
                <div className="px-6 pb-4 text-sm text-[#57534e] leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Final ───────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <h2 className="font-[Sora] text-3xl sm:text-4xl font-bold text-[#0d3019] mb-4">
          Ainda tem dúvidas?
        </h2>
        <p className="text-[#57534e] text-lg max-w-2xl mx-auto mb-8">
          Fale com um especialista e veja se o Integra Solar faz sentido para sua empresa.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={scrollToPlans} className="inline-flex items-center gap-2 bg-[#28944a] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#1d7035] transition-colors">
            Começar Agora <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-white text-[#0d3019] font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 hover:border-[#28944a] hover:text-[#28944a] transition-colors">
            <Calendar className="w-5 h-5" /> Agende uma apresentação
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-10 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={120} height={34} className="h-8 w-auto" />
          <div className="flex gap-6 text-sm text-[#57534e]">
            <Link href="/login" className="hover:text-[#1c1917]">Entrar</Link>
            <a href="#planos" className="hover:text-[#1c1917]">Planos</a>
            <button onClick={() => setShowDemo(true)} className="hover:text-[#1c1917]">Apresentação</button>
          </div>
          <p className="text-xs text-[#a8a29e]">&copy; {new Date().getFullYear()} Integra Solar. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── Modal Agendar Apresentação ──────────────────────────── */}
      {showDemo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setShowDemo(false)} className="absolute top-4 right-4 text-[#a8a29e] hover:text-[#1c1917]">
              <XIcon className="w-5 h-5" />
            </button>
            <h3 className="font-[Sora] text-xl font-bold text-[#0d3019] mb-2">Agende uma apresentação</h3>
            <p className="text-sm text-[#57534e] mb-6">Preencha seus dados e entraremos em contato para agendar uma demonstração personalizada.</p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.open(WHATSAPP_URL, '_blank'); setShowDemo(false) }}>
              <div>
                <label className="block text-xs font-medium text-[#57534e] mb-1">Nome completo</label>
                <input type="text" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534e] mb-1">E-mail</label>
                <input type="email" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534e] mb-1">WhatsApp</label>
                <input type="tel" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534e] mb-1">Nome da empresa</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Sua empresa" />
              </div>
              <button type="submit" className="w-full bg-[#28944a] text-white font-semibold py-3 rounded-xl hover:bg-[#1d7035] transition-colors">
                Solicitar apresentação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
