'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Users, FileText, DollarSign, Wrench, FolderOpen, BarChart2,
  Check, ChevronDown, ArrowRight, X as XIcon,
  Calendar, AlertTriangle, TrendingUp, Clock, Shield, MessageCircle,
  Headphones, RefreshCw, Zap, GitBranch, BatteryCharging, LineChart,
} from 'lucide-react'

const WHATSAPP_NUMBER = '5563992217642'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent('Gostaria de agendar uma apresentação da plataforma Integra Solar!')
const WHATSAPP_FLOAT_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent('Olá! Vim pelo site da Integra Solar e gostaria de conhecer a plataforma.')

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
  { icon: Wrench, title: 'Gestão de obras', desc: 'Prazos, equipes, adaptações, checklist e acompanhamento da entrega. Cada instalação sob controle.' },
  { icon: FolderOpen, title: 'Documentação completa', desc: 'ART, projeto, parecer de acesso, NF, romaneio — organizados por cliente e etapa.' },
  { icon: BarChart2, title: 'Indicadores reais', desc: 'Ticket médio, SLA por etapa, crescimento, conversão. Dados para decisão, não para decoração.' },
  { icon: BatteryCharging, title: 'Simulador híbrido e off-grid', desc: 'Cargas, banco de baterias, dimensionamento e autonomia. Memorial técnico e relatório comercial em PDF.' },
  { icon: LineChart, title: 'Viabilidade de usinas de investimento', desc: 'Payback, VPL, TIR e projeção de 25 anos. Mostre ao investidor o retorno antes de ele perguntar.' },
]

const STEPS = [
  { num: '01', title: 'Cadastre o lead', desc: 'Registre a oportunidade com dados do cliente, consumo e tipo de instalação.' },
  { num: '02', title: 'Gere o orçamento', desc: 'Dimensione o sistema, calcule custos e margem, exporte em PDF profissional.' },
  { num: '03', title: 'Gerencie o projeto', desc: 'Contratos, financeiro, documentação, compras e obra — cada etapa rastreada.' },
  { num: '04', title: 'Entregue e acompanhe', desc: 'Checklist de entrega, acompanhamento da obra e pós-venda com NPS do cliente.' },
]

const METRICS = [
  { value: '70%', label: 'menos tempo em tarefas administrativas' },
  { value: '3x', label: 'mais visibilidade sobre prazos e entregas' },
  { value: '0', label: 'documentos perdidos por projeto' },
  { value: '100%', label: 'do financeiro rastreável por cliente' },
]

const FAQ = [
  { q: 'Preciso de treinamento para usar?', a: 'O sistema foi feito para quem não tem tempo de aprender ferramentas complexas. A interface é intuitiva e o onboarding guiado faz parte do processo de implantação.' },
  { q: 'Funciona para empresas pequenas?', a: 'Sim. O Integra Solar atende desde o integrador solo até empresas com dezenas de instalações por mês. Você usa o que precisa.' },
  { q: 'Meus dados ficam seguros?', a: 'Os dados ficam em infraestrutura de nível bancário (Supabase/AWS) com criptografia, backups automáticos e isolamento por organização.' },
  { q: 'Consigo migrar meus dados atuais?', a: 'Sim. Oferecemos suporte para importação de dados. Você não precisa começar do zero.' },
  { q: 'Como funciona o acesso à plataforma?', a: 'O acesso é liberado após uma apresentação comercial. Nossa equipe faz um onboarding personalizado para garantir que você aproveite ao máximo desde o primeiro dia.' },
  { q: 'A Integra Solar gerencia aplicativos de monitoramento?', a: 'Não. A plataforma gerencia os processos internos de uma empresa integradora de energia solar: CRM, orçamentos, financeiro, obras, documentação e pós-venda. O acompanhamento da geração continua sendo feito pelo aplicativo do fabricante do inversor.' },
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
          backgroundSize: '90%',
          opacity: 0.07,
        }}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={180} height={52} className="h-10 sm:h-11 w-auto" />
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-[#57534e] hover:text-[#1c1917] px-4 py-2 hidden sm:block">Entrar</Link>
            <button onClick={() => setShowDemo(true)} className="text-sm font-semibold bg-[#28944a] text-white px-5 py-2.5 rounded-lg hover:bg-[#1d7035] transition-colors">
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
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-[#28944a] text-white font-semibold px-7 py-3.5 rounded-lg text-base hover:bg-[#1d7035] transition-colors">
            Agendar demonstração <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.section>

      {/* ── Construída com integradores (150+) ──────────────────── */}
      <Section className="max-w-4xl mx-auto !pt-10 !pb-14">
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10"
        >
          <div className="flex-shrink-0 flex flex-col items-center text-center sm:border-r sm:border-gray-100 sm:pr-10">
            <span style={{ fontFamily: "'Sora', sans-serif" }} className="text-5xl sm:text-6xl font-bold text-[#28944a] leading-none">
              150+
            </span>
            <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#57534e]">
              Integradores ouvidos
            </span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 style={{ fontFamily: "'Sora', sans-serif" }} className="text-xl sm:text-2xl font-bold text-[#0d3019] mb-2 leading-snug">
              Construída com quem já vive a rotina do setor solar
            </h2>
            <p className="text-[#57534e] leading-relaxed">
              Mais de 150 integradores foram entrevistados para chegarmos ao produto ideal —
              cada funcionalidade nasceu de uma necessidade real do dia a dia de uma empresa
              integradora de energia solar.
            </p>
          </div>
        </motion.div>
      </Section>

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
        <motion.div variants={fadeUp} className="flex justify-center mb-5">
          <Image src="/Logo integra solar - sem nome.png" alt="Integra Solar" width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16" />
        </motion.div>
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

      {/* ── Diferenciais extras ───────────────────────────────── */}
      <Section className="max-w-5xl mx-auto !pt-4 !pb-16">
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { icon: Headphones, title: 'Suporte técnico ágil e especializado', desc: 'Atendimento rápido com quem entende do setor solar — sem filas, sem respostas genéricas.' },
            { icon: RefreshCw, title: 'Plataforma que evolui com o integrador', desc: 'Estamos sempre melhorando com base no seu feedback. Mande suas sugestões pelo suporte!' },
            { icon: Zap, title: 'Propostas rápidas em PDF', desc: 'Cálculos automáticos e configuráveis — gere orçamentos profissionais em segundos, não em horas.' },
            { icon: GitBranch, title: 'Fluxo automático do fechamento à entrega da obra', desc: 'Aprovou o contrato e o cliente segue sozinho pelas etapas: financeiro, documentação, compras, instalação e entrega. Ninguém precisa lembrar de mover nada.' },
          ].map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="bg-[#28944a]/5 rounded-xl p-6 border border-[#28944a]/10">
              <div className="w-10 h-10 rounded-lg bg-[#28944a]/10 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-[#28944a]" />
              </div>
              <h3 style={{ fontFamily: "'Sora', sans-serif" }} className="font-semibold text-[#0d3019] mb-1">{item.title}</h3>
              <p className="text-sm text-[#57534e] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── Métricas ────────────────────────────────────────────── */}
      <Section className="max-w-4xl mx-auto">
        <motion.div variants={stagger} className="bg-[#28944a] rounded-2xl p-10 sm:p-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <motion.div key={m.label} variants={fadeUp} className="text-center">
              <p style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl sm:text-4xl font-bold text-white">{m.value}</p>
              <p className="text-sm text-white/90 mt-2 leading-snug">{m.label}</p>
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
              { bad: 'Utilizar diversos softwares e planilhas para controlar a empresa', good: 'Tudo centralizado em um único lugar dentro da Integra Solar' },
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
          <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-[#28944a] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#1d7035] transition-colors">
            <Calendar className="w-4 h-4" /> Agendar demonstração
          </button>
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
            Fale com nosso time, veja a plataforma funcionando e comece a estruturar sua operação com quem entende do setor solar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 bg-[#28944a] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#1d7035] transition-colors">
              <Calendar className="w-4 h-4" /> Agendar demonstração
            </button>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0d3019] font-semibold px-7 py-3.5 rounded-lg border border-gray-200 hover:border-[#28944a] transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/Logo integra solar - Com nome.png" alt="Integra Solar" width={110} height={32} className="h-7 w-auto" />
          <div className="flex gap-6 text-sm text-[#57534e]">
            <Link href="/login" className="hover:text-[#1c1917]">Entrar</Link>
            <Link href="/termos" className="hover:text-[#1c1917]">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-[#1c1917]">Privacidade</Link>
          </div>
          <p className="text-xs text-[#57534e]">&copy; {new Date().getFullYear()} Integra Solar</p>
        </div>
      </footer>

      {/* ── Botão flutuante do WhatsApp ─────────────────────────── */}
      <a
        href={WHATSAPP_FLOAT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a Integra Solar no WhatsApp"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ background: '#25D366', color: '#fff', padding: '12px 16px', boxShadow: '0 10px 24px rgba(37,211,102,0.35)' }}
      >
        <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
        <span className="hidden sm:inline text-sm font-semibold pr-1">Fale conosco</span>
      </a>

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
              <button type="submit" className="w-full bg-[#28944a] text-white font-semibold py-3 rounded-lg hover:bg-[#1d7035] transition-colors text-sm">
                Solicitar demonstração
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
