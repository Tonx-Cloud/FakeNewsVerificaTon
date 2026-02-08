'use client'
import { useState, useCallback } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import CaptchaWrapper from '@/components/auth/captcha-wrapper'

export default function SubscribePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const onCaptchaVerify = useCallback((token: string) => setTurnstileToken(token), [])
  const onCaptchaExpire = useCallback(() => setTurnstileToken(''), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('E-mail é obrigatório.')
      setStatus('error')
      return
    }
    if (!acceptedTerms) {
      setErrorMsg('Você precisa aceitar os Termos e Política de Privacidade.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          whatsapp: whatsapp.trim() || null,
          acceptedTerms: true,
          turnstileToken: turnstileToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Erro ao cadastrar. Tente novamente.')
        setStatus('error')
        setCaptchaKey(k => k + 1)
        setTurnstileToken('')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setStatus('error')
      setCaptchaKey(k => k + 1)
      setTurnstileToken('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      <Nav />

      <div className="max-w-md mx-auto px-6 pt-8 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold dark:text-white mb-2">Inscrever-se</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Receba alertas de desinformação e resumos semanais.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center animate-fade-in">
            <span className="text-4xl block mb-3">✅</span>
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Cadastro realizado!</h2>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Você será notificado quando houver atualizações importantes.
            </p>
            <a href="/" className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition">
              Voltar para análise
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">
                  Como gostaria de ser chamado <span className="text-slate-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Email (obrigatório) */}
              <div>
                <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">
                  E-mail <span className="text-red-400 text-xs">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* WhatsApp (opcional) */}
              <div>
                <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">
                  WhatsApp <span className="text-slate-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+55 11 91234-5678"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Checkbox LGPD */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500/50"
                />
                <label htmlFor="accept-terms" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Li e concordo com os{' '}
                  <a href="/terms" target="_blank" className="text-brand-600 dark:text-brand-400 underline hover:no-underline">Termos de Uso</a>
                  {' '}e a{' '}
                  <a href="/privacy" target="_blank" className="text-brand-600 dark:text-brand-400 underline hover:no-underline">Política de Privacidade</a>.
                </label>
              </div>
            </div>

            {/* Captcha */}
            <CaptchaWrapper
              onVerify={onCaptchaVerify}
              onExpire={onCaptchaExpire}
              resetKey={captchaKey}
              className="my-2"
            />

            {/* Error */}
            {status === 'error' && errorMsg && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || !acceptedTerms}
              className="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="spinner w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  Cadastrando...
                </>
              ) : '📬 Cadastrar'}
            </button>

            <p className="text-[10px] text-slate-400 text-center">
              Seus dados são usados apenas para envio de alertas. Sem spam.
            </p>
          </form>
        )}
      </div>

      <Footer />
    </main>
  )
}
