'use client'
import { useState } from 'react'

type TabType = 'text' | 'link' | 'image' | 'audio'
type LoadingState = 'idle' | 'loading' | 'error' | 'success'

interface ApiError {
  ok: false
  error: string
  message: string
}

interface ReportResult {
  ok: true
  meta: any
  scores: any
  summary: any
  claims: any
  similar: any
  reportMarkdown: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState<LoadingState>('idle')
  const [report, setReport] = useState<ReportResult | null>(null)
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [showNeutrality, setShowNeutrality] = useState(false)

  const handleAnalyze = async () => {
    if (!content.trim()) return
    setLoading('loading')
    setApiError(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputType: activeTab, content })
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setApiError(data as ApiError)
        setLoading('error')
      } else {
        setReport(data as ReportResult)
        setLoading('success')
      }
    } catch (err) {
      console.error(err)
      setApiError({
        ok: false,
        error: 'NETWORK_ERROR',
        message: 'Erro de conexao. Tente novamente.'
      })
      setLoading('error')
    }
  }

  const copyWhatsApp = () => {
    const text = `Oi! Recebi aquela mensagem e resolvi analisar com o FakeNewsZeiTon.\nO resultado foi: ${report?.summary?.verdict || 'Inconclusivo'} (risco estimado de fake: ${report?.scores?.fakeProbability || 0}%).\nTalvez seja melhor confirmar em fontes confiaveis antes de compartilhar.\nVamos evitar desinformacao`
    navigator.clipboard.writeText(text)
    alert('Copiado! Cole no WhatsApp.')
  }

  const copyReport = () => {
    navigator.clipboard.writeText(report?.reportMarkdown || '')
    alert('Relatorio copiado!')
  }

  const downloadReport = () => {
    const blob = new Blob([report?.reportMarkdown || ''], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relatorio-fakenewszeiton.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyPixKey = () => {
    navigator.clipboard.writeText('6deb665d-6e79-4959-839e-6831db7307fb')
    alert('Chave PIX copiada!')
  }

  return (
    <main className="min-h-screen bg-white text-slate-800 pb-12">
      {/* A) HEADER MINIMAL */}
      <header className="py-4 px-6 border-b">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold">FakeNewsZeiTon</h1>
          <div className="flex gap-3">
            <a href="/alerts" className="text-xs text-slate-500 hover:underline">Alertas</a>
            <a href="/auth" className="text-xs text-slate-500 hover:underline">Entrar</a>
          </div>
        </div>
      </header>

      {/* B) HERO */}
      <section className="px-6 py-6 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-3">
          Verifique informacoes antes de compartilhar
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Analise mensagens do WhatsApp e redes sociais para identificar sinais de desinformacao, vies ou manipulacao — especialmente em periodos de debate politico.
        </p>
        <p className="text-xs text-slate-400">
          Analise assistida por IA (OpenAI). Nao substitui checagem profissional.
        </p>
      </section>

      {/* C) COMO FUNCIONA */}
      <section className="px-6 py-4 max-w-lg mx-auto">
        <h3 className="text-sm font-semibold mb-3">Como funciona</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="text-xs">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-600 font-bold">1</div>
            Cole ou envie o conteudo
          </div>
          <div className="text-xs">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-600 font-bold">2</div>
            A IA analisa sinais de manipulacao
          </div>
          <div className="text-xs">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-600 font-bold">3</div>
            Receba o relatorio
          </div>
        </div>
      </section>

      {/* D) PAINEL DE ANALISE */}
      <section className="px-6 py-4 max-w-lg mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {(['text', 'link', 'image', 'audio'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded border ${
                activeTab === tab ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {tab === 'text' ? 'Texto' : tab === 'link' ? 'Link' : tab === 'image' ? 'Imagem' : 'Audio'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border rounded-lg p-4">
          {activeTab === 'text' && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole o texto da mensagem..."
              className="w-full h-40 resize-none text-sm focus:outline-none"
            />
          )}
          {activeTab === 'link' && (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole o link..."
              className="w-full text-sm focus:outline-none"
            />
          )}
          {(activeTab === 'image' || activeTab === 'audio') && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 mb-3">
                {activeTab === 'image' ? 'Enviar imagem' : 'Enviar audio'}
              </p>
              <input
                type="file"
                accept={activeTab === 'image' ? 'image/*' : 'audio/*'}
                className="text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (ev) => setContent(ev.target?.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
              />
              {content && (
                <p className="text-xs text-green-600 mt-2">Arquivo carregado!</p>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleAnalyze}
          disabled={loading === 'loading' || !content.trim()}
          className="w-full mt-4 bg-slate-800 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {loading === 'loading' ? 'Analisando...' : 'Analisar'}
        </button>

        {/* Error Amigavel */}
        {loading === 'error' && apiError && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-amber-800">Ops! Algo deu errado</h4>
                {apiError.error === 'SERVER_MISCONFIG' ? (
                  <div className="mt-2">
                    <p className="text-xs text-amber-700">
                      Configuracao incompleta: a chave da OpenAI nao esta definida no servidor (Vercel).
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Se voce e o dono do site, verifique os logs da Vercel e adicione a variavel <code>OPENAI_API_KEY</code> nas configuracoes de ambiente.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs text-amber-700">
                      Servidor nao conseguiu analisar agora.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Se voce e o dono do site, verifique os logs da Vercel Functions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* E) RESULTADO */}
      {loading === 'success' && report && (
        <section className="px-6 py-4 max-w-lg mx-auto">
          <div className="border rounded-lg p-4 bg-slate-50">
            {/* Headline + Veredito */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">{report?.summary?.headline || 'Resultado da Analise'}</h3>
              <p className={`text-sm font-medium mt-1 ${
                report?.summary?.verdict === 'Provavel fake' ? 'text-red-600' :
                report?.summary?.verdict === 'Provavel verdadeiro' ? 'text-green-600' :
                'text-amber-600'
              }`}>
                {report?.summary?.verdict || 'Inconclusivo'}
              </p>
            </div>

            {/* Barras */}
            <div className="space-y-2 mb-4">
              {(['fakeProbability', 'verifiableTruth', 'biasFraming', 'manipulationRisk'] as const).map((key) => {
                const labels: Record<string, string> = {
                  fakeProbability: 'Risco de fake',
                  verifiableTruth: 'Verificavel',
                  biasFraming: 'Vies/ Framing',
                  manipulationRisk: 'Risco de manipulacao'
                }
                const value = report?.scores?.[key] || 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{labels[key]}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          key === 'fakeProbability' ? 'bg-red-500' :
                          key === 'verifiableTruth' ? 'bg-green-500' :
                          'bg-amber-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resumo */}
            <p className="text-sm text-slate-600 mb-4">
              {report?.summary?.oneParagraph || report?.summary?.headline}
            </p>

            {/* Acoes */}
            <div className="flex gap-2">
              <button onClick={copyReport} className="flex-1 border border-slate-300 py-2 rounded text-xs">
                Copiar resumo
              </button>
              <button onClick={downloadReport} className="flex-1 border border-slate-300 py-2 rounded text-xs">
                Baixar .md
              </button>
            </div>
          </div>
        </section>
      )}

      {/* F) FONTES E REFERENCIAS */}
      <section className="px-6 py-6 max-w-lg mx-auto">
        <p className="text-xs text-slate-400 mb-3">
          Use tambem fontes independentes e reconhecidas para confirmar informacoes.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <a href="https://lupa.uol.com.br" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Agencia Lupa</a>
          <a href="https://aosfatos.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Aos Fatos</a>
          <a href="https://g1.globo.com/fato-ou-fake" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Fato ou Fake (g1)</a>
          <a href="https://politica.estadao.com.br/verificacao" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Estadao Verifica</a>
          <a href="https://checar.afp.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">AFP Checamos</a>
          <a href="https://www.reuters.com/fact-check" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Reuters Fact Check</a>
          <a href="https://www.ap.org/fact-check" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">AP Fact Check</a>
          <a href="https://www.politifact.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">PolitiFact</a>
          <a href="https://www.snopes.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Snopes</a>
        </div>
      </section>

      {/* G) AGORA FAC A SUA PARTE */}
      <section className="px-6 py-6 max-w-lg mx-auto">
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-2">Agora faca a sua parte</h3>
          <p className="text-xs text-slate-600 mb-4">
            Mostre este relatorio para quem te enviou a mensagem e evite compartilhar conteudos sem checagem. Desinformacao afeta pessoas reais.
          </p>
          <button
            onClick={copyWhatsApp}
            className="w-full bg-green-500 text-white py-3 rounded-lg font-medium text-sm"
          >
            Copiar mensagem para WhatsApp
          </button>
        </div>
      </section>

      {/* H) NEUTRALIDADE */}
      <section className="px-6 py-4 max-w-lg mx-auto">
        <button
          onClick={() => setShowNeutrality(!showNeutrality)}
          className="text-xs text-slate-400 hover:underline"
        >
          {showNeutrality ? 'Ocultar' : 'Mostrar'} compromisso de neutralidade
        </button>
        {showNeutrality && (
          <div className="mt-3 p-4 bg-slate-50 rounded text-xs text-slate-600">
            <h4 className="font-semibold mb-2">Neutralidade por metodo (nao por opiniao)</h4>
            <p className="mb-2">
              O FakeNewsZeiTon nao apoia candidatos, partidos ou ideologias. A analise e guiada por metodo: extramos as afirmacoes, avaliamos a evidencia disponivel no proprio conteudo, verificamos consistencia logica, apontamos possiveis tecnicas de manipulacao e sugerimos caminhos para verificacao em multiplas fontes confiaveis.
            </p>
            <p className="mb-2">
              Quando nao ha base suficiente para concluir, o resultado e indicado como "Inconclusivo".
            </p>
            <p>
              Analise assistida por IA (Gemini). Nao substitui agencias profissionais de checagem.
            </p>
          </div>
        )}
      </section>

      {/* I) PIX */}
      <section className="px-6 py-6 max-w-lg mx-auto">
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-2">Ajude o desenvolvedor</h3>
          <p className="text-xs text-slate-500 mb-3">
            Este projeto e independente e mantido de forma voluntaria. Se ele te ajudou, considere apoiar.
          </p>
          <div className="p-4 bg-slate-50 rounded">
            <p className="text-xs text-slate-400 mb-2">Chave PIX (clique para copiar)</p>
            <button
              onClick={copyPixKey}
              className="w-full text-left text-sm bg-white px-4 py-3 rounded border hover:bg-slate-100 font-mono break-all"
            >
              6deb665d-6e79-4959-839e-6831db7307fb
            </button>
            <p className="text-xs text-slate-300 mt-2">
              A doacao e opcional e nao influencia analises ou resultados.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-xs text-slate-300 mt-8">
        FakeNewsZeiTon — Neutralidade por metodo
      </footer>
    </main>
  )
}
