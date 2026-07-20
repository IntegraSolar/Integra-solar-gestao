'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CartaoTabela } from '@/lib/simuladores/cartao/tabelas-actions'
import { valorAParcelar, calcularTabelaCartao } from '@/lib/simuladores/cartao/calculo'
import { gerarPropostaCartaoPdf } from '@/lib/simuladores/cartao/proposta-cartao-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/proposta-empresa'

type Props = { tabelas: CartaoTabela[]; empresa: EmpresaProposta }
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toFixed(2)}%`
const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

export function SimuladorCartao({ tabelas, empresa }: Props) {
  const [proposta, setProposta] = useState(0)
  const [entrada, setEntrada] = useState(0)
  const [repassar, setRepassar] = useState(true)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCidade, setClienteCidade] = useState('')

  const parcelar = valorAParcelar(proposta, entrada)
  const calculadas = useMemo(
    () => tabelas.map((t) => ({ tabela: t, opcoes: calcularTabelaCartao(parcelar, t.taxas, repassar) })),
    [tabelas, parcelar, repassar],
  )

  async function pdf() {
    await gerarPropostaCartaoPdf({
      empresa, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
      valorProposta: proposta, entrada, valorParcelar: parcelar, repassar,
      tabelas: calculadas.map((c) => ({ nome: c.tabela.nome, observacao: c.tabela.observacao, opcoes: c.opcoes })),
    })
  }

  if (tabelas.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2 text-[var(--theme-text,#1a2340)]">Parcelamento no cartão</h1>
        <p className="text-sm text-[#6b7280]">Nenhuma tabela de taxa configurada.{' '}
          <Link href="/simuladores/parcelamento-cartao/tabelas" className="text-[#3b6fd6] underline">Configurar tabelas</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Parcelamento no cartão</h1>
        <Link href="/simuladores/parcelamento-cartao/tabelas" className="text-xs text-[#3b6fd6] underline">Configurar tabelas</Link>
      </div>

      <div className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <label className="text-xs">Valor da proposta (R$)<input type="number" step="any" className={N} value={String(proposta)} onChange={(e) => setProposta(Number(e.target.value) || 0)} /></label>
        <label className="text-xs">Entrada (R$)<input type="number" step="any" className={N} value={String(entrada)} onChange={(e) => setEntrada(Number(e.target.value) || 0)} /></label>
        <div className="text-xs">Valor a parcelar
          <div className="mt-1 rounded border px-2 py-1 bg-[#F1F3F7] text-[#555] border-[#E0E3EE] font-mono">{brl(parcelar)}</div>
        </div>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={repassar} onChange={(e) => setRepassar(e.target.checked)} /> Repassar taxa ao cliente
        </label>
        <label className="text-xs">Cliente (opcional)<input className={N} value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></label>
        <label className="text-xs">Cidade/UF<input className={N} value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} /></label>
        <button onClick={pdf} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 h-fit">Gerar PDF</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
        {calculadas.map(({ tabela, opcoes }) => (
          <div key={tabela.id} className="rounded-xl border p-3">
            <div className="text-sm font-semibold">{tabela.nome}</div>
            {tabela.observacao && <div className="text-[11px] text-[#6b7280] mb-1">{tabela.observacao}</div>}
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left border-b"><th className="py-1 pr-2">Plano</th><th className="py-1 pr-2">Taxa</th><th className="py-1 pr-2">Total</th><th className="py-1 pr-2">Parcela</th></tr></thead>
              <tbody>
                {opcoes.map((o) => (
                  <tr key={o.parcelas} className="border-b">
                    <td className="py-1 pr-2">{o.parcelas}x</td>
                    <td className="py-1 pr-2 font-mono">{pct(o.taxa)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(o.valorTotal)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(o.valorParcela)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
