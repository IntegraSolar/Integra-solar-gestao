// web/lib/simuladores/hibrido/memorial-pdf.ts
import { montarMemorial } from './memorial-conteudo'
import { desenharCabecalho, desenharSecoes } from './documento-pdf'
import type { DadosMemorial } from './documento-tipos'
import type { EmpresaProposta } from '../proposta-empresa'

export async function gerarMemorialPdf(
  dados: DadosMemorial, empresa: EmpresaProposta
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const y = desenharCabecalho(
    doc, empresa, 'MEMORIAL DESCRITIVO',
    `Emitido em ${new Date().toLocaleDateString('pt-BR')}`
  )
  desenharSecoes(doc, autoTable as never, montarMemorial(dados), y)

  const cliente = dados.dados.clienteNome.trim() || 'projeto'
  doc.save(`memorial-descritivo-${cliente.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
