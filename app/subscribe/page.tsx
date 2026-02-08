'use client'
import { useState, useCallback, useEffect } from 'react'

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

export default function SubscribePage() {
  const { dark, toggle } = useDarkMode()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() && !whatsapp.trim()) {
      setErrorMsg('Informe pelo menos um email ou WhatsApp.')
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
          email: email.trim() || null,
          whatsapp: whatsapp.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Erro ao cadastrar. Tente novamente.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Erro de conexao. Tente novamente.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <a href="/" className="text-slate-700 dark:text-slate-200 text-sm font-medium tracking-wide hover:text-brand-600 transition">
          ← FakeNewsZeiTon
        </a>
        <button onClick={toggle} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition text-lg" title="Alternar tema">
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      <div className="max-w-md mx-auto px-6 pt-8 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold dark:text-white mb-2">Inscrever-se</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Receba alertas de desinformacao e resumos semanais. Todos os campos sao opcionais — preencha pelo menos um contato.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center animate-fade-in">
            <span className="text-4xl block mb-3">✅</span>
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Cadastro realizado!</h2>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Voce sera notificado quando houver atualizacoes importantes.
            </p>
            <a href="/" className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition">
              Voltar para analise
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">
                  Nome <span className="text-slate-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">
                  Email <span className="text-slate-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* WhatsApp */}
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
            </div>

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
              disabled={status === 'loading'}
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
              Seus dados sao usados apenas para envio de alertas. Sem spam.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
