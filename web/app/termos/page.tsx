import Link from 'next/link'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4 sm:px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[#28944a] hover:underline mb-8 inline-block">← Voltar</Link>
        <h1 style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl font-bold text-[#0d3019] mb-8">Termos de Uso</h1>
        <div className="prose prose-sm text-[#57534e] space-y-6">
          <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar a plataforma Integra Solar ("Plataforma"), você concorda com estes Termos de Uso. Se não concordar com algum termo, não utilize a Plataforma.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">2. Descrição do Serviço</h2>
          <p>O Integra Solar é uma plataforma SaaS de gestão para empresas de energia solar, oferecendo funcionalidades de CRM, gestão financeira, controle de obras, documentação e relatórios.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">3. Cadastro e Conta</h2>
          <p>Para utilizar a Plataforma, é necessário criar uma conta com informações verídicas. Você é responsável por manter a confidencialidade de suas credenciais de acesso.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">4. Planos e Pagamento</h2>
          <p>A Plataforma oferece planos pagos com diferentes funcionalidades. Os valores e condições estão descritos na página de planos. O não pagamento pode resultar na suspensão do acesso.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">5. Uso Permitido</h2>
          <p>Você se compromete a utilizar a Plataforma apenas para fins legítimos relacionados à gestão de sua empresa de energia solar, não podendo utilizar para atividades ilícitas ou que violem direitos de terceiros.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">6. Propriedade Intelectual</h2>
          <p>Todo o conteúdo, código, design e funcionalidades da Plataforma são de propriedade do Integra Solar. Os dados inseridos pelo usuário permanecem de propriedade do usuário.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">7. Privacidade</h2>
          <p>O tratamento de dados pessoais está descrito em nossa <Link href="/privacidade" className="text-[#28944a] underline">Política de Privacidade</Link>, que é parte integrante destes Termos.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">8. Cancelamento</h2>
          <p>Você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, seus dados permanecerão disponíveis por 30 dias para exportação, após o que serão excluídos.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">9. Limitação de Responsabilidade</h2>
          <p>O Integra Solar não se responsabiliza por danos indiretos, perda de dados causada por ações do usuário, ou indisponibilidade temporária da Plataforma para manutenção.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">10. Modificações</h2>
          <p>Estes Termos podem ser alterados a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação na Plataforma.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">11. Foro</h2>
          <p>Fica eleito o foro da comarca de Palmas/TO para dirimir quaisquer controvérsias decorrentes destes Termos.</p>
        </div>
      </div>
    </div>
  )
}
