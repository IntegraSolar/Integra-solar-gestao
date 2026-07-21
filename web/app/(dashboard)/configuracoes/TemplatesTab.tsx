'use client'

import { useState, useTransition, useRef } from 'react'
import { TEMPLATES, blocosDoTemplate } from '@/lib/apresentacoes/templates'
import { TEMAS } from '@/lib/apresentacoes/temas'
import { BLOCOS_VALIDOS, ROTULOS_BLOCO, type BlocoId } from '@/lib/apresentacoes/tipos'
import { TEXTOS_PADRAO, type TextosApresentacao, type ItemGarantia, type ItemEtapa, type ItemPasso } from '@/lib/apresentacoes/textos'
import { salvarConfigApresentacao, uploadLogo, type ConfigApresentacaoCompleta } from '@/lib/apresentacoes/config-actions'

/** Blocos que todo template exige — não podem ser removidos pelo usuário. */
const BLOCOS_OBRIGATORIOS: BlocoId[] = ['cover', 'contato']

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 bg-white/5'
const labelCls = 'text-xs text-white/50 mb-1 block'
const cardCls = 'rounded-2xl p-5 border border-white/10 space-y-4'
const cardStyle = { background: 'var(--theme-surface)' }

function moverBloco(blocos: BlocoId[], index: number, direcao: -1 | 1): BlocoId[] {
  const alvo = index + direcao
  if (alvo < 0 || alvo >= blocos.length) return blocos
  const copia = [...blocos]
  ;[copia[index], copia[alvo]] = [copia[alvo], copia[index]]
  return copia
}

function hexValido(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

export default function TemplatesTab({ initialConfig }: { initialConfig: ConfigApresentacaoCompleta }) {
  const [template, setTemplate] = useState(initialConfig.template)
  const [tema, setTema] = useState(initialConfig.tema)
  const [blocos, setBlocos] = useState<BlocoId[]>(initialConfig.blocos)
  const [textos, setTextos] = useState<TextosApresentacao>(initialConfig.textos)
  const [corPrincipal, setCorPrincipal] = useState(initialConfig.cor_principal)
  const [corSecundaria, setCorSecundaria] = useState(initialConfig.cor_secundaria)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialConfig.logo_url)

  const [salvando, startSalvar] = useTransition()
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [uploadPending, startUpload] = useTransition()
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({})

  const disponiveis = BLOCOS_VALIDOS.filter((b) => !blocos.includes(b))

  function handleTrocarTemplate(novoTemplate: string) {
    setTemplate(novoTemplate)
    setTema(TEMPLATES[novoTemplate]?.temaPadrao ?? 'minimal-white')
    setBlocos(blocosDoTemplate(novoTemplate))
  }

  function handleToggleBloco(bloco: BlocoId) {
    if (BLOCOS_OBRIGATORIOS.includes(bloco)) return
    setBlocos((prev) => prev.filter((b) => b !== bloco))
  }

  function handleAdicionarBloco(bloco: BlocoId) {
    setBlocos((prev) => [...prev, bloco])
  }

  function handleMover(index: number, direcao: -1 | 1) {
    setBlocos((prev) => moverBloco(prev, index, direcao))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErro(null)
    startUpload(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadLogo(fd)
      if (result.error) { setUploadErro(result.error); return }
      if (result.url) setLogoUrl(result.url)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleSecao(chave: string) {
    setSecoesAbertas((prev) => ({ ...prev, [chave]: !prev[chave] }))
  }

  function restaurarSecao(chave: keyof TextosApresentacao) {
    setTextos((prev) => ({ ...prev, [chave]: TEXTOS_PADRAO[chave] }))
  }

  function handleSalvar() {
    setErro(null)
    setSalvo(false)
    startSalvar(async () => {
      const result = await salvarConfigApresentacao({
        template,
        tema,
        blocos,
        textos,
        cor_principal: corPrincipal,
        cor_secundaria: corSecundaria,
      })
      if (result.error) { setErro(result.error); return }
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-white/50 text-sm">
        Configuração padrão da apresentação comercial: é o ponto de partida de toda proposta nova.
        O vendedor ainda pode ajustar modelo, tema e blocos numa proposta específica.
      </p>

      {/* ── Identidade visual ────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-semibold text-white">Identidade visual</h3>

        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10"
            style={{ background: 'var(--theme-input-bg)' }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logomarca" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-white/30">Sem logo</span>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer"
              disabled={uploadPending}
            />
            <p className="text-xs text-white/30">PNG, JPEG, WEBP ou SVG — máx. 2 MB.</p>
            {uploadPending && <p className="text-xs text-white/50">Enviando...</p>}
            {uploadErro && <p className="text-xs text-red-400">{uploadErro}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cor principal</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexValido(corPrincipal) ? corPrincipal : '#FFD080'}
                onChange={(e) => setCorPrincipal(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                className={inputCls}
                value={corPrincipal}
                onChange={(e) => setCorPrincipal(e.target.value)}
                placeholder="#FFD080"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cor secundária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexValido(corSecundaria) ? corSecundaria : '#0a0e1a'}
                onChange={(e) => setCorSecundaria(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                className={inputCls}
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                placeholder="#0a0e1a"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modelo padrão ────────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-semibold text-white">Modelo padrão</h3>

        <div>
          <label className={labelCls}>Template</label>
          <select
            value={template}
            onChange={(e) => handleTrocarTemplate(e.target.value)}
            className={inputCls}
          >
            {Object.values(TEMPLATES).map((t) => (
              <option key={t.id} value={t.id}>{t.nome} — {t.descricao}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Tema</label>
          <div className="flex items-center gap-2">
            <select
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              className={inputCls}
            >
              {Object.values(TEMAS).map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <span
              className="w-8 h-8 rounded-md flex-shrink-0 border border-white/10"
              style={{ background: TEMAS[tema]?.corDestaque ?? '#000' }}
              title={TEMAS[tema]?.corDestaque}
            />
          </div>
        </div>
      </div>

      {/* ── Blocos padrão ────────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-semibold text-white">Blocos padrão</h3>

        <div>
          <label className={labelCls}>Blocos ativos</label>
          <div className="flex flex-col gap-1.5">
            {blocos.map((bloco, index) => {
              const obrigatorio = BLOCOS_OBRIGATORIOS.includes(bloco)
              return (
                <div
                  key={bloco}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10"
                  style={{ background: 'var(--theme-input-bg)' }}
                >
                  <input
                    type="checkbox"
                    checked
                    disabled={obrigatorio}
                    onChange={() => handleToggleBloco(bloco)}
                    className="w-3.5 h-3.5 accent-green-500"
                  />
                  <span className="text-xs flex-1 text-white/70">
                    {ROTULOS_BLOCO[bloco]}
                    {obrigatorio && <span className="text-white/30"> (obrigatório)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMover(index, -1)}
                    disabled={index === 0}
                    className="text-xs px-1.5 text-white/40 disabled:opacity-30"
                    aria-label={`Mover ${ROTULOS_BLOCO[bloco]} para cima`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMover(index, 1)}
                    disabled={index === blocos.length - 1}
                    className="text-xs px-1.5 text-white/40 disabled:opacity-30"
                    aria-label={`Mover ${ROTULOS_BLOCO[bloco]} para baixo`}
                  >
                    ↓
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {disponiveis.length > 0 && (
          <div>
            <label className={labelCls}>Adicionar bloco</label>
            <div className="flex flex-wrap gap-1.5">
              {disponiveis.map((bloco) => (
                <button
                  key={bloco}
                  type="button"
                  onClick={() => handleAdicionarBloco(bloco)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors"
                  style={{ background: 'var(--theme-input-bg)' }}
                >
                  + {ROTULOS_BLOCO[bloco]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Textos dos blocos ────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-semibold text-white">Textos dos blocos</h3>

        <SecaoLista
          titulo="Garantias"
          aberta={!!secoesAbertas.garantias}
          onToggle={() => toggleSecao('garantias')}
          onRestaurar={() => restaurarSecao('garantias')}
        >
          {textos.garantias.map((item, i) => (
            <ItemGarantiaCampo
              key={i}
              item={item}
              onChange={(novo) =>
                setTextos((prev) => ({
                  ...prev,
                  garantias: prev.garantias.map((it, idx) => (idx === i ? novo : it)),
                }))
              }
            />
          ))}
        </SecaoLista>

        <SecaoLista
          titulo="Etapas do projeto"
          aberta={!!secoesAbertas.timeline}
          onToggle={() => toggleSecao('timeline')}
          onRestaurar={() => restaurarSecao('timeline')}
        >
          {textos.timeline.map((item, i) => (
            <ItemEtapaCampo
              key={i}
              item={item}
              onChange={(novo) =>
                setTextos((prev) => ({
                  ...prev,
                  timeline: prev.timeline.map((it, idx) => (idx === i ? novo : it)),
                }))
              }
            />
          ))}
        </SecaoLista>

        <SecaoLista
          titulo="Como funciona"
          aberta={!!secoesAbertas.como_funciona}
          onToggle={() => toggleSecao('como_funciona')}
          onRestaurar={() => restaurarSecao('como_funciona')}
        >
          {textos.como_funciona.map((item, i) => (
            <ItemPassoCampo
              key={i}
              item={item}
              onChange={(novo) =>
                setTextos((prev) => ({
                  ...prev,
                  como_funciona: prev.como_funciona.map((it, idx) => (idx === i ? novo : it)),
                }))
              }
            />
          ))}
        </SecaoLista>

        <SecaoLista
          titulo="Fluxo da instalação"
          aberta={!!secoesAbertas.fluxo}
          onToggle={() => toggleSecao('fluxo')}
          onRestaurar={() => restaurarSecao('fluxo')}
        >
          {textos.fluxo.map((item, i) => (
            <ItemPassoCampo
              key={i}
              item={item}
              onChange={(novo) =>
                setTextos((prev) => ({
                  ...prev,
                  fluxo: prev.fluxo.map((it, idx) => (idx === i ? novo : it)),
                }))
              }
            />
          ))}
        </SecaoLista>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className={labelCls}>Frase de abertura</label>
            <input
              className={inputCls}
              value={textos.abertura ?? ''}
              onChange={(e) => setTextos((prev) => ({ ...prev, abertura: e.target.value || null }))}
              placeholder="Ex: Sua energia, seu futuro."
            />
          </div>
          <div>
            <label className={labelCls}>Mensagem de encerramento</label>
            <input
              className={inputCls}
              value={textos.encerramento ?? ''}
              onChange={(e) => setTextos((prev) => ({ ...prev, encerramento: e.target.value || null }))}
              placeholder="Ex: Obrigado pela confiança."
            />
          </div>
        </div>
      </div>

      {/* ── Salvar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar'}
        </button>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
    </div>
  )
}

function SecaoLista({
  titulo,
  aberta,
  onToggle,
  onRestaurar,
  children,
}: {
  titulo: string
  aberta: boolean
  onToggle: () => void
  onRestaurar: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:text-white transition-colors"
        style={{ background: 'var(--theme-input-bg)' }}
      >
        <span className="font-medium">{titulo}</span>
        <span className="text-white/40 text-xs">{aberta ? '▲ recolher' : '▼ expandir'}</span>
      </button>
      {aberta && (
        <div className="p-4 space-y-3">
          {children}
          <button
            type="button"
            onClick={onRestaurar}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Restaurar padrão
          </button>
        </div>
      )}
    </div>
  )
}

function ItemGarantiaCampo({ item, onChange }: { item: ItemGarantia; onChange: (v: ItemGarantia) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-2 border-b border-white/5 last:border-0">
      <input className={inputCls} value={item.titulo} onChange={(e) => onChange({ ...item, titulo: e.target.value })} placeholder="Título" />
      <input className={inputCls} value={item.prazo} onChange={(e) => onChange({ ...item, prazo: e.target.value })} placeholder="Prazo" />
      <input className={inputCls} value={item.descricao} onChange={(e) => onChange({ ...item, descricao: e.target.value })} placeholder="Descrição" />
    </div>
  )
}

function ItemEtapaCampo({ item, onChange }: { item: ItemEtapa; onChange: (v: ItemEtapa) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2 border-b border-white/5 last:border-0">
      <input className={inputCls} value={item.titulo} onChange={(e) => onChange({ ...item, titulo: e.target.value })} placeholder="Título" />
      <input className={inputCls} value={item.descricao} onChange={(e) => onChange({ ...item, descricao: e.target.value })} placeholder="Descrição" />
    </div>
  )
}

function ItemPassoCampo({ item, onChange }: { item: ItemPasso; onChange: (v: ItemPasso) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2 border-b border-white/5 last:border-0">
      <input className={inputCls} value={item.titulo} onChange={(e) => onChange({ ...item, titulo: e.target.value })} placeholder="Título" />
      <input className={inputCls} value={item.descricao} onChange={(e) => onChange({ ...item, descricao: e.target.value })} placeholder="Descrição" />
    </div>
  )
}
