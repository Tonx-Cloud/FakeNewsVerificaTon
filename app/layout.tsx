import './globals.css'
import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://fakenewsverificaton.com.br'),
  title: 'Fake News Verificaton — Verifique antes de compartilhar',
  description: 'Analise mensagens do WhatsApp e redes sociais para identificar sinais de desinformacao, vies ou manipulacao. Ferramenta gratuita e independente.',
  openGraph: {
    title: 'Fake News Verificaton — Verifique antes de compartilhar',
    description: 'Analise conteudos suspeitos com IA antes de compartilhar. Neutralidade por metodo.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Fake News Verificaton',
    url: 'https://fakenewsverificaton.com.br',
  },
  twitter: {
    card: 'summary',
    title: 'Fake News Verificaton',
    description: 'Analise de desinformacao com IA. Verifique antes de compartilhar.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  )
}
