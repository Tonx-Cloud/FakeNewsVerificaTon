'use client'
import { useState, useMemo } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

function useSupabase(): SupabaseClient | null {
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createClient(url, key)
  }, [])
}

export default function AuthPage() {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !supabase) {
      setError('Configuracao Supabase indisponivel.')
      return
    }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
      }
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-white p-6 text-slate-800">
        <div className="max-w-md mx-auto text-center mt-20">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Verifique seu email</h1>
          <p className="text-sm text-slate-500">
            Enviamos um link magico para <strong>{email}</strong>.
            <br />Clique no link para entrar.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="mt-6 text-sm text-slate-400 hover:underline"
          >
            Tentar outro email
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 text-slate-800">
      <div className="max-w-md mx-auto mt-20">
        <h1 className="text-xl font-semibold mb-2">Entrar no Fake News Verificaton</h1>
        <p className="text-sm text-slate-500 mb-6">
          Use seu email para receber um link magico de acesso. Sem senha necessaria.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium block mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-slate-800 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link magico'}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-6 text-center">
          Ao entrar, voce pode salvar historico de analises e receber alertas de fakes em alta.
        </p>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-slate-500 hover:underline">← Voltar para a pagina inicial</a>
        </div>
      </div>
    </main>
  )
}
