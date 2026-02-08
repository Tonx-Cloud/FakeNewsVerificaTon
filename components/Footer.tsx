export default function Footer() {
  return (
    <footer className="text-center text-xs text-slate-400 dark:text-slate-500 pb-8 pt-4">
      <div className="max-w-4xl mx-auto px-6">
        <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-6">
          <p className="font-medium">Fake News Verificaton — Neutralidade por método</p>
          <div className="flex justify-center gap-4 mt-3">
            <a href="/sobre" className="hover:text-brand-500 transition">Sobre nós</a>
            <a href="/alerts" className="hover:text-brand-500 transition">Alertas</a>
            <a href="/subscribe" className="hover:text-brand-500 transition">Inscrever-se</a>
            <a href="/privacy" className="hover:text-brand-500 transition">Privacidade</a>
            <a href="/terms" className="hover:text-brand-500 transition">Termos</a>
          </div>
          <p className="mt-3 text-slate-300 dark:text-slate-600">
            Análise assistida por IA. Não substitui checagem profissional.
          </p>
        </div>
      </div>
    </footer>
  )
}
