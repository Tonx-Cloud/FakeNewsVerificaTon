'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

type TabType = 'text' | 'link' | 'image' | 'audio'
type LoadingState = 'idle' | 'loading' | 'error' | 'success'

interface ApiError { ok: false; error: string; message: string }
interface ReportResult { ok: true; meta: any; scores: any; summary: any; claims: any; similar: any; reportMarkdown: string }

/* ─── Intersection Observer hook for scroll animations ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const observed = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el || observed.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible')
        observed.current = true
        obs.unobserve(e.target)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  })
  return ref
}

/* ─── Dark mode hook ─── */
function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true); document.documentElement.classList.add('dark')
    }
  }, [])
  const toggle = useCallback(() => {
    setDark(d => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])
  return { dark, toggle }
}

/* ─── Tab config ─── */
const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'text', label: 'Texto', icon: '📝' },
  { key: 'link', label: 'Link', icon: '🔗' },
  { key: 'image', label: 'Imagem', icon: '🖼️' },
  { key: 'audio', label: 'Audio', icon: '🎙️' },
]

/* ─── Sources config ─── */
const SOURCES = [
  { name: 'Agencia Lupa', url: 'https://lupa.uol.com.br', desc: 'Maior agencia de fact-checking do Brasil.' },
  { name: 'Aos Fatos', url: 'https://aosfatos.org', desc: 'Checagem apartidaria e transparente.' },
  { name: 'Fato ou Fake', url: 'https://g1.globo.com/fato-ou-fake', desc: 'Servico de checagem do portal g1.' },
  { name: 'Estadao Verifica', url: 'https://politica.estadao.com.br/verificacao', desc: 'Nucleo de verificacao do Estadao.' },
  { name: 'AFP Checamos', url: 'https://checar.afp.com', desc: 'Agencia France-Presse em portugues.' },
  { name: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check', desc: 'Fact-checking da Reuters global.' },
  { name: 'AP Fact Check', url: 'https://www.ap.org/fact-check', desc: 'Checagem da Associated Press.' },
  { name: 'PolitiFact', url: 'https://www.politifact.com', desc: 'Premiado com Pulitzer (EUA).' },
  { name: 'Snopes', url: 'https://www.snopes.com', desc: 'Referencia global em desmistificacao.' },
]

export default function Home() {
  const { dark, toggle } = useDarkMode()
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState<LoadingState>('idle')
  const [report, setReport] = useState<ReportResult | null>(null)
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [showNeutrality, setShowNeutrality] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [whatsCopied, setWhatsCopied] = useState(false)

  const MAX_UPLOAD_SIZE = 4_500_000

  /* scroll-reveal refs */
  const heroRef = useScrollReveal()
  const stepsRef = useScrollReveal()
  const inputRef = useScrollReveal()
  const sourcesRef = useScrollReveal()
  const whatsRef = useScrollReveal()
  const pixRef = useScrollReveal()

  /* ─── handlers ─── */
  const handleAnalyze = async () => {
    if (!content.trim()) return
    if (content.length > MAX_UPLOAD_SIZE) {
      setApiError({ ok: false, error: 'TOO_LARGE', message: 'Arquivo muito grande (max ~4.5 MB). Tente um menor.' })
      setLoading('error'); return
    }
    setLoading('loading'); setApiError(null)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputType: activeTab, content }) })
      const data = await res.json()
      if (!res.ok || !data.ok) { setApiError(data as ApiError); setLoading('error') }
      else { setReport(data as ReportResult); setLoading('success') }
    } catch { setApiError({ ok: false, error: 'NETWORK_ERROR', message: 'Erro de conexao. Tente novamente.' }); setLoading('error') }
  }

  const copyWhatsApp = () => {
    const txt = `Oi! Recebi aquela mensagem e resolvi analisar com o FakeNewsZeiTon.\nResultado: ${report?.summary?.verdict || 'Inconclusivo'} (risco de fake: ${report?.scores?.fakeProbability || 0}%).\nConfirme em fontes confiaveis antes de compartilhar!`
    navigator.clipboard.writeText(txt); setWhatsCopied(true); setTimeout(() => setWhatsCopied(false), 2000)
  }
  const copyReport = () => { navigator.clipboard.writeText(report?.reportMarkdown || ''); alert('Relatorio copiado!') }
  const downloadReport = () => {
    const b = new Blob([report?.reportMarkdown || ''], { type: 'text/markdown' })
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'relatorio-fakenewszeiton.md'; a.click(); URL.revokeObjectURL(u)
  }
  const copyPixKey = () => {
    navigator.clipboard.writeText('6deb665d-6e79-4959-839e-6831db7307fb')
    setPixCopied(true); setTimeout(() => setPixCopied(false), 2500)
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">

      {/* ═══════ HERO ═══════ */}
      <section className="hero-gradient relative overflow-hidden">
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <span className="text-white/90 text-sm font-medium tracking-wide">FakeNewsZeiTon</span>
          <div className="flex items-center gap-4">
            <a href="/alerts" className="text-white/70 text-xs hover:text-white transition">Alertas</a>
            <a href="/subscribe" className="text-white/70 text-xs hover:text-white transition">Inscrever-se</a>
            <a href="/auth" className="text-white/70 text-xs hover:text-white transition">Entrar</a>
            <button onClick={toggle} className="text-white/60 hover:text-white transition text-lg" title="Alternar tema">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>

        <div ref={heroRef} className="animate-on-scroll relative z-10 text-center px-6 pt-8 pb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs mb-6 shimmer-badge animate-shimmer">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
            Powered by AI — Gemini
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Verifique as informacoes<br/>antes de compartilhar.
          </h1>
          <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-2">
            Descubra o que e fato ou fake!
          </p>
          <p className="text-white/50 text-xs">
            Analise assistida por IA. Nao substitui checagem profissional.
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />
      </section>

      {/* ═══════ COMO FUNCIONA ═══════ */}
      <section ref={stepsRef} className="animate-on-scroll px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-center text-lg font-semibold mb-8 dark:text-white">Como funciona</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '📋', title: 'Cole o conteudo', desc: 'Texto, link, imagem ou audio' },
            { icon: '🔍', title: 'IA analisa', desc: 'Sinais de manipulacao e vies' },
            { icon: '📊', title: 'Receba o relatorio', desc: 'Scores, veredito e fontes' },
          ].map((step, i) => (
            <div key={i} className="step-connector flex flex-col items-center">
              <div className="card-hover w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-slate-800 rounded-2xl shadow-md flex items-center justify-center text-3xl sm:text-4xl mb-3 border border-slate-100 dark:border-slate-700">
                {step.icon}
              </div>
              <p className="text-sm font-medium text-center dark:text-white">{step.title}</p>
              <p className="text-xs text-slate-400 text-center mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PAINEL DE ANÁLISE ═══════ */}
      <section ref={inputRef} className="animate-on-scroll px-6 pb-10 max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="flex justify-center gap-1 mb-5">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setContent('') }}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-200
                ${activeTab === key
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 tab-active'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`
              }
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Input card */}
        <div className="glass rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-5">
          {activeTab === 'text' && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole aqui o texto que deseja verificar..."
              className="w-full h-40 resize-none text-sm bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 dark:text-white"
            />
          )}
          {activeTab === 'link' && (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole o link da publicacao (ex: https://...)"
              className="w-full text-sm py-2 bg-transparent focus:outline-none placeholder-slate-400 dark:text-white"
            />
          )}
          {(activeTab === 'image' || activeTab === 'audio') && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">{activeTab === 'image' ? '🖼️' : '🎙️'}</div>
              <p className="text-sm text-slate-400 mb-4">
                {activeTab === 'image' ? 'Envie uma imagem (max 4.5 MB)' : 'Envie um audio (max 4.5 MB)'}
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 rounded-xl text-sm font-medium cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-900/50 transition">
                Escolher arquivo
                <input
                  type="file"
                  accept={activeTab === 'image' ? 'image/*' : 'audio/*'}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > MAX_UPLOAD_SIZE) { setApiError({ ok: false, error: 'TOO_LARGE', message: 'Arquivo muito grande (max ~4.5 MB).' }); setLoading('error'); return }
                      const reader = new FileReader(); reader.onload = (ev) => setContent(ev.target?.result as string); reader.readAsDataURL(file)
                    }
                  }}
                />
              </label>
              {content && <p className="text-xs text-green-500 mt-3 animate-fade-in">✓ Arquivo carregado!</p>}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleAnalyze}
          disabled={loading === 'loading' || !content.trim()}
          className="w-full mt-5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading === 'loading' ? (
            <>
              <svg className="spinner w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              Analisando...
            </>
          ) : 'Analisar'}
        </button>

        {/* Error */}
        {loading === 'error' && apiError && (
          <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Ops! Algo deu errado</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {apiError.error === 'SERVER_MISCONFIG' ? 'Chave da IA nao configurada. Verifique GEMINI_API_KEY no Vercel.' :
                   apiError.error === 'RATE_LIMITED' ? 'Muitas requisicoes. Aguarde um minuto.' :
                   apiError.error === 'TOO_LARGE' ? apiError.message :
                   'Servidor nao conseguiu analisar. Tente novamente.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════ RESULTADO ═══════ */}
      {loading === 'success' && report && (
        <section className="px-6 pb-10 max-w-2xl mx-auto animate-fade-in-up">
          <div className="glass rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-6">
            {/* Headline */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">{report.summary?.headline || 'Resultado'}</h3>
              <span className={`inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                report.summary?.verdict === 'Provavel fake'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : report.summary?.verdict === 'Provavel verdadeiro'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {report.summary?.verdict || 'Inconclusivo'}
              </span>
            </div>

            {/* Score bars */}
            <div className="space-y-3 mb-6">
              {([
                { key: 'fakeProbability', label: 'Risco de fake', color: 'bg-red-500' },
                { key: 'verifiableTruth', label: 'Verificavel', color: 'bg-green-500' },
                { key: 'biasFraming', label: 'Vies / Framing', color: 'bg-amber-500' },
                { key: 'manipulationRisk', label: 'Risco de manipulacao', color: 'bg-orange-500' },
              ] as const).map(({ key, label, color }) => {
                const v = report.scores?.[key] || 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1"><span className="dark:text-slate-300">{label}</span><span className="font-semibold">{v}%</span></div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full score-bar-fill ${color}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              {report.summary?.oneParagraph || report.summary?.headline}
            </p>

            {/* Full Markdown Report */}
            {report.reportMarkdown && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-white prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-table:text-sm prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {report.reportMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button onClick={copyReport} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                📋 Copiar relatorio
              </button>
              <button onClick={downloadReport} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                ⬇️ Baixar .md
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ FONTES ═══════ */}
      <section ref={sourcesRef} className="animate-on-scroll px-6 py-10 max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold text-center mb-2 dark:text-white">Fontes confiaveis</h2>
        <p className="text-xs text-slate-400 text-center mb-6">Confirme sempre em agencias independentes de checagem.</p>
        <div className="grid grid-cols-3 gap-3">
          {SOURCES.map(s => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group card-hover bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm text-center"
            >
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">{s.name}</p>
              <p className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{s.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ═══════ WHATSAPP ═══════ */}
      <section ref={whatsRef} className="animate-on-scroll px-6 py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-6 text-center">
          <h3 className="text-base font-semibold mb-2 dark:text-white">Agora faca a sua parte</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Compartilhe o resultado com quem te enviou a mensagem. Desinformacao afeta pessoas reais.
          </p>
          <button
            onClick={copyWhatsApp}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold text-white text-sm shadow-lg transition-all duration-200"
            style={{ background: '#25D366' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {whatsCopied ? '✓ Copiado!' : 'Copiar mensagem para WhatsApp'}
          </button>
        </div>
      </section>

      {/* ═══════ NEUTRALIDADE ═══════ */}
      <section className="px-6 py-4 max-w-2xl mx-auto">
        <button
          onClick={() => setShowNeutrality(!showNeutrality)}
          className="text-xs text-slate-400 hover:text-brand-500 transition mx-auto block"
        >
          {showNeutrality ? '▲ Ocultar' : '▼ Mostrar'} compromisso de neutralidade
        </button>
        {showNeutrality && (
          <div className="mt-4 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 animate-fade-in leading-relaxed">
            <h4 className="font-semibold mb-2 text-slate-800 dark:text-white">Neutralidade por metodo (nao por opiniao)</h4>
            <p className="mb-2">O FakeNewsZeiTon nao apoia candidatos, partidos ou ideologias. A analise e guiada por metodo: extraimos as afirmacoes, avaliamos a evidencia disponivel, verificamos consistencia logica, apontamos possiveis tecnicas de manipulacao e sugerimos caminhos para verificacao em multiplas fontes confiaveis.</p>
            <p className="mb-2">Quando nao ha base suficiente para concluir, o resultado e &quot;Inconclusivo&quot;.</p>
            <p>Analise assistida por IA (Gemini). Nao substitui agencias profissionais de checagem.</p>
          </div>
        )}
      </section>

      {/* ═══════ PIX ═══════ */}
      <section ref={pixRef} className="animate-on-scroll px-6 py-10 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl border border-brand-200/50 dark:border-brand-800/30 shadow-md p-6 text-center">
          <span className="text-3xl mb-2 block">☕</span>
          <h3 className="text-base font-semibold mb-1 dark:text-white">Ajude o desenvolvedor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Projeto independente e voluntario. Se ajudou, considere apoiar.
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Chave PIX</p>
            <p className="font-mono text-sm text-slate-700 dark:text-slate-200 break-all mb-3">
              6deb665d-6e79-4959-839e-6831db7307fb
            </p>
            <button
              onClick={copyPixKey}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                pixCopied
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/25'
              }`}
            >
              {pixCopied ? '✓ Copiado!' : '📋 Copiar chave PIX'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">A doacao e opcional e nao influencia analises.</p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 pb-8 pt-4">
        FakeNewsZeiTon — Neutralidade por metodo
      </footer>
    </main>
  )
}
