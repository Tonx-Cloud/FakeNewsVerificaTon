'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useDarkMode } from '@/components/DarkModeProvider'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import CaptchaWrapper from '@/components/auth/captcha-wrapper'

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

/* ─── Tab config ─── */
const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'text', label: 'Texto', icon: '📝' },
  { key: 'link', label: 'Link', icon: '🔗' },
  { key: 'image', label: 'Imagem', icon: '🖼️' },
  { key: 'audio', label: 'Áudio', icon: '🎙️' },
]

/* ─── Sources config ─── */
const SOURCES = [
  { name: 'Agência Lupa', url: 'https://lupa.uol.com.br', desc: 'Maior agência de fact-checking do Brasil.' },
  { name: 'Aos Fatos', url: 'https://aosfatos.org', desc: 'Checagem apartidária e transparente.' },
  { name: 'Fato ou Fake', url: 'https://g1.globo.com/fato-ou-fake', desc: 'Serviço de checagem do portal g1.' },
  { name: 'Estadão Verifica', url: 'https://politica.estadao.com.br/verificacao', desc: 'Núcleo de verificação do Estadão.' },
  { name: 'AFP Checamos', url: 'https://checar.afp.com', desc: 'Agência France-Presse em português.' },
  { name: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check', desc: 'Fact-checking da Reuters global.' },
  { name: 'AP Fact Check', url: 'https://www.ap.org/fact-check', desc: 'Checagem da Associated Press.' },
  { name: 'PolitiFact', url: 'https://www.politifact.com', desc: 'Premiado com Pulitzer (EUA).' },
  { name: 'Snopes', url: 'https://www.snopes.com', desc: 'Referência global em desmistificação.' },
]

export default function Home() {
  const { dark } = useDarkMode()
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState<LoadingState>('idle')
  const [report, setReport] = useState<ReportResult | null>(null)
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [showNeutrality, setShowNeutrality] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [whatsCopied, setWhatsCopied] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [homeConsentChecked, setHomeConsentChecked] = useState(false)

  const onCaptchaVerify = useCallback((token: string) => setTurnstileToken(token), [])
  const onCaptchaExpire = useCallback(() => setTurnstileToken(''), [])

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
    if (!homeConsentChecked) {
      setApiError({ ok: false, error: 'CONSENT_MISSING', message: 'Para continuar, aceite os Termos e a Política de Privacidade.' })
      setLoading('error'); return
    }
    if (content.length > MAX_UPLOAD_SIZE) {
      setApiError({ ok: false, error: 'TOO_LARGE', message: 'Arquivo muito grande (máx. ~4.5 MB). Tente um menor.' })
      setLoading('error'); return
    }
    setLoading('loading'); setApiError(null)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputType: activeTab, content, turnstileToken: turnstileToken || undefined }) })
      const data = await res.json()
      if (!res.ok || !data.ok) { setApiError(data as ApiError); setLoading('error') }
      else { setReport(data as ReportResult); setLoading('success') }
      // Reset captcha on error
      if (!res.ok || !data.ok) { setCaptchaKey(k => k + 1); setTurnstileToken('') }
    } catch { setApiError({ ok: false, error: 'NETWORK_ERROR', message: 'Erro de conexão. Tente novamente.' }); setLoading('error'); setCaptchaKey(k => k + 1); setTurnstileToken('') }
  }

  const copyWhatsApp = () => {
    const txt = `Oi! Recebi aquela mensagem e resolvi analisar com o Fake News VerificaTon.\nResultado: ${report?.summary?.verdict || 'Inconclusivo'} (risco de fake: ${report?.scores?.fakeProbability || 0}%).\nConfira em: fakenewsverificaton.com.br`
    navigator.clipboard.writeText(txt); setWhatsCopied(true); setTimeout(() => setWhatsCopied(false), 2000)
  }
  const copyReport = () => { navigator.clipboard.writeText(report?.reportMarkdown || ''); alert('Relatório copiado!') }
  const downloadReport = () => {
    const b = new Blob([report?.reportMarkdown || ''], { type: 'text/markdown' })
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'relatorio-fakenewsverificaton.md'; a.click(); URL.revokeObjectURL(u)
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
        <Nav variant="hero" />

        <div ref={heroRef} className="animate-on-scroll relative z-10 text-center px-6 pt-16 pb-20 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white/95 leading-tight mb-5 tracking-tight">
            Fake <span className="text-[#1d9bf0]">News</span> VerificaTon
          </h1>
          <p className="text-white/50 text-sm sm:text-base leading-relaxed mb-3 max-w-md mx-auto">
            Verifique as informações antes de compartilhar.
          </p>
          <p className="text-white/30 text-xs">
            Análise assistida por IA. Não substitui checagem profissional.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs mt-6">
            <span className="inline-block w-1.5 h-1.5 bg-[#1d9bf0] rounded-full animate-pulse-slow" />
            Powered by Gemini AI
          </div>
        </div>
      </section>

      {/* ═══════ COMO FUNCIONA ═══════ */}
      <section ref={stepsRef} className="animate-on-scroll px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-center text-lg font-semibold mb-8 dark:text-white">Como funciona</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '📋', title: 'Cole o conteúdo', desc: 'Texto, link, imagem ou áudio' },
            { icon: '🔍', title: 'IA analisa', desc: 'Sinais de manipulação e viés' },
            { icon: '📊', title: 'Receba o relatório', desc: 'Scores, veredito e fontes' },
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
          {(activeTab === 'link' || activeTab === 'image' || activeTab === 'audio') && (
            <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Aviso: envio de link, imagem e audio esta em implantacao e pode nao funcionar corretamente.
            </div>
          )}
          {activeTab === 'text' && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole aqui o texto que deseja verificar…"
              className="w-full h-40 resize-none text-sm bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 dark:text-white"
            />
          )}
          {activeTab === 'link' && (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole o link da publicação (ex: https://…)"
              className="w-full text-sm py-2 bg-transparent focus:outline-none placeholder-slate-400 dark:text-white"
            />
          )}
          {(activeTab === 'image' || activeTab === 'audio') && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">{activeTab === 'image' ? '🖼️' : '🎙️'}</div>
              <p className="text-sm text-slate-400 mb-4">
                {activeTab === 'image' ? 'Envie uma imagem (máx. 4,5 MB)' : 'Envie um áudio (máx. 4,5 MB)'}
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
                      if (file.size > MAX_UPLOAD_SIZE) { setApiError({ ok: false, error: 'TOO_LARGE', message: 'Arquivo muito grande (máx. ~4,5 MB).' }); setLoading('error'); return }
                      const reader = new FileReader(); reader.onload = (ev) => setContent(ev.target?.result as string); reader.readAsDataURL(file)
                    }
                  }}
                />
              </label>
              {content && <p className="text-xs text-green-500 mt-3 animate-fade-in">✓ Arquivo carregado!</p>}
            </div>
          )}
        </div>

        {/* Captcha */}
        <CaptchaWrapper
          onVerify={onCaptchaVerify}
          onExpire={onCaptchaExpire}
          resetKey={captchaKey}
          className="mt-4"
        />

        {/* LGPD Consent */}
        <div className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            id="home-consent"
            checked={homeConsentChecked}
            onChange={(e) => setHomeConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500/50"
          />
          <label htmlFor="home-consent" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Li e concordo com os{' '}
            <a href="/terms" target="_blank" className="text-brand-600 dark:text-brand-400 underline hover:no-underline">Termos de Uso</a>
            {' '}e a{' '}
            <a href="/privacy" target="_blank" className="text-brand-600 dark:text-brand-400 underline hover:no-underline">Política de Privacidade</a>.
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleAnalyze}
          disabled={loading === 'loading' || !content.trim() || !homeConsentChecked}
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
                  {apiError.error === 'SERVER_MISCONFIG' ? 'Chave da IA não configurada. Verifique GEMINI_API_KEY no Vercel.' :
                   apiError.error === 'RATE_LIMITED' ? 'Muitas requisições. Aguarde um minuto.' :
                   apiError.error === 'TOO_LARGE' ? apiError.message :
                   apiError.error === 'CONSENT_MISSING' ? 'Para continuar, aceite os Termos e a Política de Privacidade.' :
                   'Servidor não conseguiu analisar. Tente novamente.'}
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
                { key: 'verifiableTruth', label: 'Verificável', color: 'bg-green-500' },
                { key: 'biasFraming', label: 'Viés / Framing', color: 'bg-amber-500' },
                { key: 'manipulationRisk', label: 'Risco de manipulação', color: 'bg-orange-500' },
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
                📋 Copiar relatório
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
        <h2 className="text-lg font-semibold text-center mb-2 dark:text-white">Fontes confiáveis</h2>
        <p className="text-xs text-slate-400 text-center mb-6">Confirme sempre em agências independentes de checagem.</p>
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
          <h3 className="text-base font-semibold mb-2 dark:text-white">Agora faça a sua parte</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Compartilhe o resultado com quem te enviou a mensagem. Desinformação afeta pessoas reais.
          </p>
          <div className="text-center font-extrabold text-2xl md:text-4xl text-red-600 mb-6">
            TODOS CONTRA AS FAKES NEWS!
          </div>
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
            <h4 className="font-semibold mb-2 text-slate-800 dark:text-white">Neutralidade por método (não por opinião)</h4>
            <p className="mb-2">O Fake News VerificaTon não apoia candidatos, partidos ou ideologias. A análise é guiada por método: extraímos as afirmações, avaliamos a evidência disponível, verificamos consistência lógica, apontamos possíveis técnicas de manipulação e sugerimos caminhos para verificação em múltiplas fontes confiáveis.</p>
            <p className="mb-2">Quando não há base suficiente para concluir, o resultado é &quot;Inconclusivo&quot;.</p>
            <p>Análise assistida por IA (Gemini). Não substitui agências profissionais de checagem.</p>
          </div>
        )}
      </section>

      {/* ═══════ PIX ═══════ */}
      <section ref={pixRef} className="animate-on-scroll px-6 py-10 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl border border-brand-200/50 dark:border-brand-800/30 shadow-md p-6 text-center">
          <span className="text-3xl mb-2 block">☕</span>
          <h3 className="text-base font-semibold mb-1 dark:text-white">Ajude o desenvolvedor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Projeto independente e voluntário. Se ajudou, considere apoiar.
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
          <p className="text-[10px] text-slate-400 mt-3">A doação é opcional e não influencia análises.</p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <Footer />
    </main>
  )
}
