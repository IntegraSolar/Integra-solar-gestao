'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Users, FileText, DollarSign, Wrench, FolderOpen, BarChart2,
  Check, ChevronDown, ArrowRight, X as XIcon,
  Calendar, AlertTriangle, TrendingUp, Clock, Shield,
} from 'lucide-react'

const WHATSAPP_URL = 'https://wa.me/5563992217642?text=' + encodeURIComponent('Gostaria de agendar uma apresentação da plataforma Integra Solar!')

// ── Animation variants ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } } as const,
}

const stagger = {
  hidden: {} as const,
  visible: { transition: { staggerChildren: 0.1 } } as const,
}

const staggerSlow = {
  hidden: {} as const,
  visible: { transition: { staggerChildren: 0.15 } } as const,
}

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className={`py-20 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </motion.section>
  )
}

// ── Data ─────────────────────────────────────────────────────────
const PAIN_POINTS = [
  { icon: AlertTriangle, title: 'Propostas perdidas', desc: 'Orçamentos no WhatsApp que nunca viram contrato. Leads esquecem, vendedores perdem o timing.' },
  { icon: Clock, title: 'Prazos estourados', desc: 'Sem visibilidade da obra, o prazo do contrato estoura e o cliente reclama. Ninguém sabe onde o projeto parou.' },
  { icon: DollarSign, title: 'Financeiro no escuro', desc: 'Parcelas em planilha, comissões calculadas na mão, comprovantes no WhatsApp. Nenhuma previsibilidade de caixa.' },
  { icon: FolderOpen, title: 'Documentos espalhados', desc: 'ART no e-mail, contrato no Drive, NF no computador. Quando precisa, ninguém encontra.' },
]

const FEATURES = [
  { icon: Users, title: 'CRM com funil visual', desc: 'Do lead ao pós-venda. Cada oportunidade rastreada, cada follow-up agendado, nenhum cliente esquecido.' },
  { icon: FileText, title: 'Orçamentos automáticos', desc: 'Dimensionamento, precificação com margem real e PDF profissional em segundos — não em horas.' },
  { icon: DollarSign, title: 'Financeiro integrado', desc: 'Parcelas, comprovantes, comissões e confirmações de pagamento. Tudo vinculado ao cliente.' },
  { icon: Wrench, title: 'Gestão de obras', desc: 'Prazos, equipes, adaptações, checklist de entrega e monitoramento. Cada instalação sob controle.' },
  { icon: FolderOpen, title: 'Documentação completa', desc: 'ART, projeto, parecer de acesso, NF, romaneio — organizados por cliente e etapa.' },
  { icon: BarChart2, title: 'Indicadores reais', desc: 'Ticket médio, SLA por etapa, crescimento, conversão. Dados para decisão, não para decoração.' },
]

const STEPS = [
  { num: '01', title: 'Cadastre o lead', desc: 'Registre a oportunidade com dados do cliente, consumo e tipo de instalação.' },
  { num: '02', title: 'Gere o orçamento', desc: 'Dimensione o sistema, calcule custos e margem, exporte em PDF profissional.' },
  { num: '03', title: 'Gerencie o projeto', desc: 'Contratos, financeiro, documentação, compras e obra — cada etapa rastreada.' },
  { num: '04', title: 'Entregue e acompanhe', desc: 'Checklist de entrega, monitoramento e pós-venda com NPS do cliente.' },
]

const METRICS = [
  { value: '70%', label: 'menos tempo em tarefas administrativas' },
  { value: '3x', label: 'mais visibilidade sobre prazos e entregas' },
  { value: '0', label: 'documentos perdidos por projeto' },
  { value: '100%', label: 'do financeiro rastreável por cliente' },
]

const FAQ = [
  { q: 'Preciso de treinamento para usar?', a: 'O sistema foi feito para quem não tem tempo de aprender ferramentas complexas. A interface é intuitiva e os planos semestrais e anuais incluem onboarding.' },
  { q: 'Funciona para empresas pequenas?', a: 'Sim. O Integra Solar atende desde o integrador solo até empresas com dezenas de instalações por mês. Você usa o que precisa.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não há fidelidade nos planos mensais. Planos semestrais e anuais podem ter a renovação cancelada a qualquer momento.' },
  { q: 'Meus dados ficam seguros?', a: 'Os dados ficam em infraestrutura de nível bancário (Supabase/AWS) com criptografia, backups automáticos e isolamento por organização.' },
  { q: 'Consigo migrar meus dados atuais?', a: 'Sim. Oferecemos suporte para importação de dados nos planos com onboarding. Você não precisa começar do zero.' },
]

const PLANS = [
  {
    id: 'mensal', name: 'Mensal', price: 'R$ 199,90', period: '/mês', tag: 'Sem fidelidade', highlight: false,
    features: ['CRM completo', 'Propostas ilimitadas', 'Gestão financeira', 'Controle de obras', 'Gestão documental', 'Relatórios', 'Suporte por chat'],
    cta: 'Começar agora',
  },
  {
    id: 'semestral', name: 'Semestral', price: 'R$ 1.079', period: '/semestre', tag: 'Mais vendido', saving: 'Economia de R$ 120', highlight: false,
    features: ['Tudo do mensal', 'Economia de ~10%', 'Suporte prioritário', 'Treinamento incluso', 'Integrações avançadas'],
    cta: 'Escolher semestral',
  },
  {
    id: 'anual', name: 'Anual', price: 'R$ 1.998', period: '/ano', tag: 'Melhor custo-benefício', saving: 'Economia de R$ 400', highlight: true,
    features: ['Tudo do semestral', 'Economia de ~17%', 'Suporte dedicado', 'Consultoria de setup', 'Onboarding guiado'],
    cta: 'Escolher anual',
  },
]

// ── Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Logo marca d'água de fundo */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/Logo integra solar - sem nome.png')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '50%',
          opacity: 0.03,
        }}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={130} height={38} className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-[#57534e] hover:text-[#1c1917] px-4 py-2 hidden sm:block">Entrar</Link>
            <button onClick={() => setShowDemo(true)} className="text-sm font-semibold bg-[#0d3019] text-white px-5 py-2.5 rounded-lg hover:bg-[#145226] transition-colors">
              Agendar demonstração
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden" animate="visible" variants={staggerSlow}
        className="pt-28 pb-20 px-4 sm:px-6 max-w-4xl mx-auto text-center"
      >
        <motion.p variants={fadeUp} className="text-sm font-semibold text-[#28944a] tracking-wide uppercase mb-4">
          Gestão especializada para energia solar
        </motion.p>
        <motion.h1 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-[#0d3019] leading-[1.15] tracking-tight">
          Reduza erros operacionais e escale sua empresa solar com previsibilidade
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 text-lg text-[#57534e] max-w-2xl mx-auto leading-relaxed">
          A plataforma que centraliza vendas, projetos, obras e financeiro — construída por integradores que já passaram pelos mesmos problemas que você.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-[#0d3019] text-white font-semibold px-7 py-3.5 rounded-lg text-base hover:bg-[#145226] transition-colors">
            Agendar demonstração <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#planos" className="inline-flex items-center gap-2 text-[#28944a] font-semibold px-7 py-3.5 rounded-lg text-base hover:bg-[#28944a]/5 transition-colors">
            Ver planos
          </a>
        </motion.div>
        <motion.div variants={fadeUp} className="mt-12 flex items-center justify-center gap-8 text-sm text-[#57534e]">
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#28944a]" /> 7 dias grátis</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#28944a]" /> Sem cartão</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#28944a]" /> Cancele quando quiser</span>
        </motion.div>
      </motion.section>

      {/* ── Problema ────────────────────────────────────────────── */}
      <Section className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm font-semibold text-[#dc2626] tracking-wide uppercase text-center mb-3">
          O problema que você conhece
        </motion.p>
        <motion.h2 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-14">
          Sua operação cresce, mas o controle não acompanha
        </motion.h2>
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PAIN_POINTS.map((p) => (
            <motion.div key={p.title} variants={fadeUp} className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-[#dc2626]" />
              </div>
              <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="font-semibold text-[#0d3019] mb-1">{p.title}</h3>
              <p className="text-sm text-[#57534e] leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── Solução ─────────────────────────────────────────────── */}
      <Section className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm font-semibold text-[#28944a] tracking-wide uppercase text-center mb-3">
          A solução
        </motion.p>
        <motion.h2 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-5">
          Um sistema que entende o fluxo real de uma empresa solar
        </motion.h2>
        <motion.p variants={fadeUp} className="text-center text-[#57534e] max-w-2xl mx-auto mb-14">
          Do primeiro contato com o lead até a entrega da obra e pós-venda — cada etapa da operação organizada, rastreável e sob controle.
        </motion.p>
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#28944a]/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#28944a]/8 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#28944a]" />
              </div>
              <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="font-semibold text-[#0d3019] mb-1">{f.title}</h3>
              <p className="text-sm text-[#57534e] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── Métricas ────────────────────────────────────────────── */}
      <Section className="max-w-4xl mx-auto">
        <motion.div variants={stagger} className="bg-[#0d3019] rounded-2xl p-10 sm:p-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <motion.div key={m.label} variants={fadeUp} className="text-center">
              <p style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-white">{m.value}</p>
              <p className="text-sm text-white/80 mt-2 leading-snug">{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── Como funciona ───────────────────────────────────────── */}
      <Section className="max-w-4xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm font-semibold text-[#28944a] tracking-wide uppercase text-center mb-3">
          Como funciona
        </motion.p>
        <motion.h2 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-14">
          4 etapas. Do lead à entrega.
        </motion.h2>
        <motion.div variants={stagger} className="space-y-4">
          {STEPS.map((s) => (
            <motion.div key={s.num} variants={fadeUp} className="bg-white rounded-xl p-6 flex items-start gap-5 border border-gray-100">
              <span style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold text-[#28944a]/20 flex-shrink-0 w-10">{s.num}</span>
              <div>
                <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="font-semibold text-[#0d3019]">{s.title}</h3>
                <p className="text-sm text-[#57534e] mt-1">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── Diferenciais ────────────────────────────────────────── */}
      <Section className="max-w-4xl mx-auto">
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 p-10 sm:p-14">
          <h2 style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold text-[#0d3019] mb-8 text-center">
            Por que não usar um sistema genérico?
          </h2>
          <div className="space-y-4">
            {[
              { bad: 'ERPs genéricos exigem consultoria de R$ 10k+ para configurar', good: 'Integra Solar já vem configurado para o fluxo solar' },
              { bad: 'Planilhas dependem da memória de quem preencheu', good: 'Dados estruturados e acessíveis por qualquer membro da equipe' },
              { bad: 'WhatsApp não tem histórico, nem rastreabilidade', good: 'Cada interação, documento e pagamento registrado por cliente' },
              { bad: 'Sistemas de CRM não entendem obra, projeto e homologação', good: 'Pipeline completo: do lead ao pós-venda com cada etapa do setor solar' },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
                <XIcon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-[#57534e] line-through">{row.bad}</p>
                  <div className="flex items-start gap-2 mt-1.5">
                    <Check className="w-4 h-4 text-[#28944a] mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-[#0d3019]">{row.good}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ── CTA Demonstração ────────────────────────────────────── */}
      <Section className="max-w-3xl mx-auto text-center">
        <motion.div variants={fadeUp}>
          <TrendingUp className="w-8 h-8 text-[#28944a] mx-auto mb-4" />
          <h2 style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl sm:text-3xl font-bold text-[#0d3019] mb-3">
            Veja funcionando antes de decidir
          </h2>
          <p className="text-[#57534e] mb-8 max-w-xl mx-auto">
            Agende uma demonstração de 20 minutos. Sem compromisso, sem pressão. Você decide se faz sentido para sua operação.
          </p>
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-[#0d3019] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#145226] transition-colors">
            <Calendar className="w-4 h-4" /> Agendar demonstração gratuita
          </button>
        </motion.div>
      </Section>

      {/* ── Planos ──────────────────────────────────────────────── */}
      <Section id="planos" className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm font-semibold text-[#28944a] tracking-wide uppercase text-center mb-3">
          Planos
        </motion.p>
        <motion.h2 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-center text-[#0d3019] mb-4">
          Escolha o plano ideal
        </motion.h2>
        <motion.p variants={fadeUp} className="text-center text-[#57534e] mb-14">7 dias grátis em qualquer plano. Sem cartão para começar.</motion.p>
        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              className={`relative bg-white rounded-2xl p-7 flex flex-col ${
                plan.highlight ? 'border-2 border-[#28944a] shadow-lg' : 'border border-gray-200'
              }`}
            >
              <span className={`self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 ${
                plan.highlight ? 'bg-[#28944a] text-white' : 'bg-gray-100 text-[#57534e]'
              }`}>
                {plan.tag}
              </span>
              <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="text-lg font-bold text-[#0d3019]">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl font-bold text-[#0d3019]">{plan.price}</span>
                <span className="text-sm text-[#57534e]">{plan.period}</span>
              </div>
              {plan.saving && <p className="mt-1 text-sm font-medium text-[#28944a]">{plan.saving}</p>}
              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#57534e]">
                    <Check className="w-4 h-4 text-[#28944a] flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${plan.id}`}
                className={`mt-7 block text-center font-semibold py-3 rounded-lg transition-colors text-sm ${
                  plan.highlight ? 'bg-[#28944a] text-white hover:bg-[#1d7035]' : 'bg-[#0d3019] text-white hover:bg-[#145226]'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <Section className="max-w-2xl mx-auto">
        <motion.h2 variants={fadeUp} style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold text-center text-[#0d3019] mb-10">
          Perguntas frequentes
        </motion.h2>
        <motion.div variants={stagger} className="space-y-2">
          {FAQ.map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-medium text-[#0d3019]">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#57534e] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <div className="px-5 pb-4 text-sm text-[#57534e] leading-relaxed">{item.a}</div>}
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── CTA Final ───────────────────────────────────────────── */}
      <Section className="max-w-3xl mx-auto text-center pb-28">
        <motion.div variants={fadeUp}>
          <Shield className="w-8 h-8 text-[#28944a] mx-auto mb-4" />
          <h2 style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl sm:text-3xl font-bold text-[#0d3019] mb-3">
            Pronto para profissionalizar sua operação?
          </h2>
          <p className="text-[#57534e] mb-8 max-w-xl mx-auto">
            Comece em minutos. 7 dias grátis. Sem compromisso. Se não fizer sentido, cancele sem burocracia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#planos" className="inline-flex items-center gap-2 bg-[#0d3019] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#145226] transition-colors">
              Começar agora <ArrowRight className="w-4 h-4" />
            </a>
            <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 text-[#0d3019] font-semibold px-7 py-3.5 rounded-lg border border-gray-200 hover:border-[#28944a] transition-colors">
              <Calendar className="w-4 h-4" /> Agendar demonstração
            </button>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={110} height={32} className="h-7 w-auto" />
          <div className="flex gap-6 text-sm text-[#57534e]">
            <Link href="/login" className="hover:text-[#1c1917]">Entrar</Link>
            <a href="#planos" className="hover:text-[#1c1917]">Planos</a>
          </div>
          <p className="text-xs text-[#57534e]">&copy; {new Date().getFullYear()} Integra Solar</p>
        </div>
      </footer>

      {/* ── Modal Demonstração ──────────────────────────────────── */}
      {showDemo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setShowDemo(false)} className="absolute top-4 right-4 text-[#57534e] hover:text-[#1c1917]">
              <XIcon className="w-5 h-5" />
            </button>
            <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="text-xl font-bold text-[#0d3019] mb-1">Agende uma demonstração</h3>
            <p className="text-sm text-[#57534e] mb-6">20 minutos. Sem compromisso. Veja se faz sentido para sua empresa.</p>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); window.open(WHATSAPP_URL, '_blank'); setShowDemo(false) }}>
              <input type="text" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Seu nome" />
              <input type="email" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="E-mail" />
              <input type="tel" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="WhatsApp" />
              <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#28944a]" placeholder="Empresa (opcional)" />
              <button type="submit" className="w-full bg-[#0d3019] text-white font-semibold py-3 rounded-lg hover:bg-[#145226] transition-colors text-sm">
                Solicitar demonstração
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
