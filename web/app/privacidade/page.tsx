import Link from 'next/link'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4 sm:px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[#28944a] hover:underline mb-8 inline-block">← Voltar</Link>
        <h1 style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl font-bold text-[#0d3019] mb-8">Política de Privacidade</h1>
        <div className="prose prose-sm text-[#57534e] space-y-6">
          <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">1. Dados Coletados</h2>
          <p>Coletamos os seguintes dados para prestação do serviço:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, nome da empresa.</li>
            <li><strong>Dados de clientes:</strong> informações inseridas por você sobre seus clientes (nome, telefone, endereço, dados do projeto solar).</li>
            <li><strong>Documentos:</strong> arquivos enviados por você (contratos, ARTs, notas fiscais, comprovantes).</li>
            <li><strong>Dados de uso:</strong> logs de acesso e interações com a plataforma.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[#0d3019]">2. Finalidade do Tratamento</h2>
          <p>Utilizamos seus dados para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestação do serviço contratado (gestão de clientes, projetos e financeiro).</li>
            <li>Comunicação sobre o serviço (notificações, atualizações, suporte).</li>
            <li>Melhoria da plataforma e correção de problemas.</li>
            <li>Cumprimento de obrigações legais.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[#0d3019]">3. Compartilhamento</h2>
          <p>Seus dados podem ser compartilhados com:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase:</strong> infraestrutura de banco de dados e autenticação.</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação.</li>
            <li><strong>Gateway de pagamento:</strong> processamento de cobranças (Asaas/Stripe).</li>
            <li><strong>ConvertAPI:</strong> conversão de documentos (somente conteúdo do documento, sem dados pessoais).</li>
          </ul>
          <p>Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">4. Armazenamento e Segurança</h2>
          <p>Os dados são armazenados em infraestrutura segura (Supabase/AWS) com criptografia em trânsito (TLS) e em repouso. O acesso é controlado por autenticação e isolamento por organização (multi-tenant).</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">5. Seus Direitos (LGPD)</h2>
          <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão de seus dados.</li>
            <li>Revogar o consentimento para tratamento de dados.</li>
            <li>Solicitar a portabilidade dos dados.</li>
          </ul>
          <p>Para exercer seus direitos, entre em contato pelo e-mail ou WhatsApp disponíveis na página de Contato.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">6. Retenção de Dados</h2>
          <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após o cancelamento, os dados são mantidos por 30 dias para exportação e depois excluídos permanentemente.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">7. Cookies</h2>
          <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento ou publicidade.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">8. Alterações</h2>
          <p>Esta Política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação na Plataforma.</p>

          <h2 className="text-lg font-semibold text-[#0d3019]">9. Contato</h2>
          <p>Para questões sobre privacidade e proteção de dados, entre em contato pelo WhatsApp: (63) 99221-7642.</p>
        </div>
      </div>
    </div>
  )
}
