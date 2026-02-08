'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const recover = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth confirm error:', error)
          setErrorMsg('Erro ao recuperar sessao. Tente fazer login novamente.')
          setStatus('error')
          return
        }

        if (session) {
          setStatus('success')
          setTimeout(() => router.push('/'), 1500)
        } else {
          // Session set via cookies by route.ts — redirect anyway
          setStatus('success')
          setTimeout(() => router.push('/'), 2000)
        }
      } catch (err) {
        console.error('Auth confirm exception:', err)
        setErrorMsg('Erro inesperado. Tente novamente.')
        setStatus('error')
      }
    }

    recover()
  }, [router])

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        {status === 'loading' && (
          <div className="animate-fade-in">
            <svg className="spinner w-10 h-10 mx-auto mb-4 text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">Autenticando...</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recuperando sua sessao.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <span className="text-5xl block mb-4">✅</span>
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">Login confirmado!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Redirecionando para a pagina principal...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
            <span className="text-5xl block mb-4">❌</span>
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Erro na autenticacao</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{errorMsg}</p>
            <a href="/auth" className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition">
              Tentar novamente
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
