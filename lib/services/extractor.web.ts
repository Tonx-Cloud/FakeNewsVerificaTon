import 'server-only'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export interface ExtractionResult {
  ok: boolean
  text?: string
  title?: string
  sourceUrl?: string
  error?: string
  warnings: string[]
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
]

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

const FETCH_TIMEOUT_MS = 8_000
const MIN_CONTENT_LENGTH = 200

/**
 * Fetch HTML from a web page and extract its main textual content
 * using jsdom + @mozilla/readability (no browser automation).
 */
export async function extractWebContent(url: string): Promise<ExtractionResult> {
  const warnings: string[] = []

  let html: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) {
      return {
        ok: false,
        error: `Não foi possível acessar a página (HTTP ${res.status}). Verifique o link ou cole o texto diretamente.`,
        warnings,
      }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        ok: false,
        error: 'O link não aponta para uma página HTML. Cole o texto da página diretamente.',
        warnings,
      }
    }

    html = await res.text()
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        error: 'Tempo esgotado ao acessar a página (8s). Cole o texto diretamente.',
        warnings,
      }
    }
    return {
      ok: false,
      error: `Erro ao acessar a página: ${err?.message || 'erro desconhecido'}. Cole o texto diretamente.`,
      warnings,
    }
  }

  // Parse with jsdom + Readability
  let textContent = ''
  let title = ''

  try {
    const dom = new JSDOM(html, { url })
    const doc = dom.window.document

    // Remove noise elements before Readability processes
    const noiseSelectors = ['script', 'style', 'nav', 'footer', 'aside', 'iframe', 'noscript', '.ad', '.ads', '.advertisement', '[role="navigation"]', '[role="banner"]']
    noiseSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove())
    })

    const reader = new Readability(doc)
    const article = reader.parse()

    if (article && article.textContent) {
      textContent = article.textContent.trim()
      title = article.title || ''
    }
  } catch {
    warnings.push('Readability falhou; tentando fallback com heurística.')
  }

  // Fallback: simple heuristic if Readability fails or returns too little
  if (textContent.length < MIN_CONTENT_LENGTH) {
    try {
      const dom = new JSDOM(html, { url })
      const doc = dom.window.document

      // Remove noise
      doc.querySelectorAll('script, style, nav, footer, aside, iframe, noscript').forEach(el => el.remove())

      // Try article/main first, then all <p> tags
      const mainEl = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role="main"]')
      const paragraphs = (mainEl || doc.body)?.querySelectorAll('p') || []
      const texts: string[] = []
      paragraphs.forEach(p => {
        const t = p.textContent?.trim()
        if (t && t.length > 20) texts.push(t)
      })

      const fallbackText = texts.join('\n\n')
      if (fallbackText.length > textContent.length) {
        textContent = fallbackText
        if (!warnings.includes('Readability falhou; tentando fallback com heurística.')) {
          warnings.push('Conteúdo extraído com heurística (pode conter ruído).')
        }
      }
    } catch {
      // ignore fallback errors
    }
  }

  // Normalize whitespace
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (textContent.length < MIN_CONTENT_LENGTH) {
    return {
      ok: false,
      error: 'Inconclusivo: não foi possível extrair conteúdo suficiente. Cole o texto da página.',
      warnings,
    }
  }

  // Cap at 10k chars
  if (textContent.length > 10_000) {
    textContent = textContent.slice(0, 10_000)
    warnings.push('Conteúdo truncado em 10.000 caracteres.')
  }

  return {
    ok: true,
    text: textContent,
    title: title || undefined,
    sourceUrl: url,
    warnings,
  }
}
