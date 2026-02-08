import React from 'react'
import { createSupabaseServerClient } from '../../lib/supabaseAuth'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const supabase = createSupabaseServerClient()

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch top trending items (public, no auth required)
  const { data: trending } = await supabase
    .from('trending_items')
    .select('*')
    .order('score_fake_probability', { ascending: false })
    .limit(20)

  // If logged in, get profile for notification preferences
  let profile: any = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    profile = data
  }

  return (
    <main className="min-h-screen bg-white p-6 text-slate-800">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Fakes em Alta</h1>
          <a href="/" className="text-sm text-slate-500 hover:underline">← Inicio</a>
        </div>

        {/* Trending list */}
        {(!trending || trending.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Nenhum item em alta ainda.</p>
            <p className="text-slate-300 text-xs mt-2">Faca uma analise na pagina inicial para comecar a popular esta lista.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trending.map((item: any, i: number) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">
                      <span className="text-slate-400 mr-2">#{i + 1}</span>
                      {item.title}
                    </h3>
                    {item.reason && (
                      <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      (item.score_fake_probability || 0) >= 70 ? 'bg-red-100 text-red-700' :
                      (item.score_fake_probability || 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.score_fake_probability || 0}% fake
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span>Visto {item.occurrences || 1}x</span>
                  {item.last_seen && (
                    <span>Ultimo: {new Date(item.last_seen).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auth / notification section */}
        <div className="mt-8 border-t pt-6">
          {!user ? (
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-3">
                Entre para receber alertas por email quando novos fakes surgirem.
              </p>
              <a
                href="/auth"
                className="inline-block bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
              >
                Entrar com email
              </a>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Logado como <strong>{user.email}</strong>
              </p>
              <p className="text-xs text-slate-400">
                Notificacoes por email: {profile?.notify_enabled ? 'Ativadas' : 'Desativadas'}
                {profile?.notify_enabled && ` (${profile?.notify_frequency || 'daily'})`}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
