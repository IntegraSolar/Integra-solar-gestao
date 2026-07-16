'use client'
import { useMemo, useState, useTransition } from 'react'
import type { ConcessionariaRow } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { salvarSimulacao, deleteSimulacao, type SimulacaoResumo } from '@/lib/simuladores/viabilidade/simulacoes-actions'
import { montarViabilidadeInput, PREMISSAS_DEFAULT, type CamposSimulador } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import { gerarPropostaPdf } from '@/lib/simuladores/viabilidade/proposta-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'

type Props = { concessionarias: ConcessionariaRow[]; simulacoes: SimulacaoResumo[]; empresa: EmpresaProposta }

const CAMPOS_INICIAIS: CamposSimulador = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2', valorInvestimento: 154413.82,
  descontoLocacao: 0.2, pctFinanciado: 0,
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

export function SimuladorViabilidade({ concessionarias, simulacoes, empresa }: Props) {
  const [concId, setConcId] = useState<string>(concessionarias[0]?.id ?? '')
  const [campos, setCampos] = useState<CamposSimulador>(CAMPOS_INICIAIS)
  const [avancadas, setAvancadas] = useState(false)
  const [modeloPainel, setModeloPainel] = useState('')
  const [modeloInversor, setModeloInversor] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCidade, setClienteCidade] = useState('')
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  const conc = concessionarias.find((c) => c.id === concId)
  const resultado = useMemo(() => (conc ? calcularViabilidade(montarViabilidadeInput(campos, conc)) : null), [campos, conc])

  const setNum = (k: keyof CamposSimulador, v: string) =>
    setCampos((c) => ({ ...c, [k]: v === '' ? 0 : Number(v) }))
  const setPrem = (k: keyof typeof PREMISSAS_DEFAULT, v: string) =>
    setCampos((c) => ({ ...c, premissas: { ...c.premissas, [k]: v === '' ? 0 : Number(v) } }))
  const premVal = (k: keyof typeof PREMISSAS_DEFAULT) =>
    (campos.premissas?.[k] as number | undefined) ?? (PREMISSAS_DEFAULT[k] as number)

  function salvar() {
    if (!conc || !resultado) return
    start(async () => {
      const res = await salvarSimulacao({
        nome: nome || `${conc.nome} ${Math.round((resultado.kwp))}kWp`,
        concessionariaId: conc.id, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
        tir: resultado.capitalProprio.tir, vpl: resultado.capitalProprio.vpl,
        paybackAnos: resultado.capitalProprio.paybackAnos,
        input: montarViabilidadeInput(campos, conc) as unknown as Record<string, unknown>,
      })
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setMsg({ text: res.success ?? '', erro: false })
      window.location.reload()
    })
  }

  async function pdf() {
    if (!conc || !resultado) return
    await gerarPropostaPdf({
      empresa, clienteNome: clienteNome || null, clienteCidade: clienteCidade || null,
      concessionariaNome: conc.nome, modeloPainel, modeloInversor,
      input: montarViabilidadeInput(campos, conc), resultado,
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta simulação?')) return
    start(async () => { await deleteSimulacao(id); window.location.reload() })
  }

  const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Viabilidade de usina</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">Escolha a concessionária, ajuste os dados e veja o retorno ao vivo.</p>
      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <label className="text-xs block">Concessionária
              <select className="mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]"
                value={concId} onChange={(e) => setConcId(e.target.value)}>
                {concessionarias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
              <label className="text-xs">Nº de painéis<input type="number" step="any" className={N} value={String(campos.numPaineis)} onChange={(e) => setNum('numPaineis', e.target.value)} /></label>
              <label className="text-xs">Potência do painel (Wp)<input type="number" step="any" className={N} value={String(campos.potenciaPainelWp)} onChange={(e) => setNum('potenciaPainelWp', e.target.value)} /></label>
              <label className="text-xs">Nº de inversores<input type="number" step="any" className={N} value={String(campos.numInversores)} onChange={(e) => setNum('numInversores', e.target.value)} /></label>
              <label className="text-xs">Potência do inversor (kW)<input type="number" step="any" className={N} value={String(campos.potenciaInversorKw)} onChange={(e) => setNum('potenciaInversorKw', e.target.value)} /></label>
              <label className="text-xs">Fator de capacidade<input type="number" step="any" className={N} value={String(campos.fatorCapacidade)} onChange={(e) => setNum('fatorCapacidade', e.target.value)} /></label>
              <label className="text-xs">Modalidade
                <select className={N} value={campos.modalidade} onChange={(e) => setCampos((c) => ({ ...c, modalidade: e.target.value as 'GD1' | 'GD2' }))}>
                  <option value="GD1">GD1</option><option value="GD2">GD2</option>
                </select>
              </label>
              <label className="text-xs">CAPEX (R$)<input type="number" step="any" className={N} value={String(campos.valorInvestimento)} onChange={(e) => setNum('valorInvestimento', e.target.value)} /></label>
              <label className="text-xs">Desconto do consumidor<input type="number" step="any" className={N} value={String(campos.descontoLocacao)} onChange={(e) => setNum('descontoLocacao', e.target.value)} /></label>
              <label className="text-xs">Financiamento (%)<input type="number" step="any" className={N} value={String(campos.pctFinanciado)} onChange={(e) => setNum('pctFinanciado', e.target.value)} /></label>
              <label className="text-xs">Modelo do painel<input className={N} value={modeloPainel} onChange={(e) => setModeloPainel(e.target.value)} /></label>
              <label className="text-xs">Modelo do inversor<input className={N} value={modeloInversor} onChange={(e) => setModeloInversor(e.target.value)} /></label>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <button type="button" className="text-sm font-semibold" onClick={() => setAvancadas((v) => !v)}>
              {avancadas ? '▾' : '▸'} Premissas avançadas
            </button>
            {avancadas && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {(['reajusteTarifaAnual', 'tma', 'impostoPct', 'opexPct', 'degradacaoAnual', 'd23', 'jurosAnual', 'prazoMeses', 'horizonteAnos', 'anoInicial'] as const).map((k) => (
                  <label key={k} className="text-xs">{k}
                    <input type="number" step="any" className={N} value={String(premVal(k))} onChange={(e) => setPrem(k, e.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">Cliente (opcional)<input className={N} value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></label>
            <label className="text-xs">Cidade/UF<input className={N} value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} /></label>
            <label className="text-xs">Nome da simulação<input className={N} value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 rounded-xl border p-4 bg-[var(--theme-card,#fff)]">
          {resultado ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">TIR</div><div className="font-bold">{pct(resultado.capitalProprio.tir)}</div></div>
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">VPL</div><div className="font-bold text-xs">{brl(resultado.capitalProprio.vpl)}</div></div>
                <div className="rounded border p-2"><div className="text-[10px] opacity-70">Payback</div><div className="font-bold">{resultado.capitalProprio.paybackAnos}a</div></div>
              </div>
              <div className="mt-3 text-xs text-[#555] space-y-1">
                <div>Potência: <b>{resultado.kwp.toFixed(2)} kWp</b> ({resultado.tipoUsina})</div>
                <div>Geração anual: <b>{resultado.geracaoAnualKwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh</b></div>
                <div>Com financiamento — TIR {pct(resultado.comFinanciamento.tir)} · VPL {brl(resultado.comFinanciamento.vpl)}</div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">Salvar simulação</button>
                <button onClick={pdf} className="rounded border text-sm px-3 py-1.5">Gerar PDF</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6b7280]">Cadastre uma concessionária primeiro (aba Concessionárias).</p>
          )}
        </div>
      </div>

      {simulacoes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-2">Simulações salvas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left border-b"><th className="py-1 pr-2">Nome</th><th className="py-1 pr-2">TIR</th><th className="py-1 pr-2">VPL</th><th className="py-1 pr-2">Payback</th><th></th></tr></thead>
              <tbody>
                {simulacoes.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-1 pr-2 font-medium">{s.nome}</td>
                    <td className="py-1 pr-2 font-mono">{pct(s.tir)}</td>
                    <td className="py-1 pr-2 font-mono">{brl(s.vpl)}</td>
                    <td className="py-1 pr-2 font-mono">{s.paybackAnos}a</td>
                    <td className="py-1 pr-2"><button className="text-[#c0392b]" onClick={() => excluir(s.id)}>excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
