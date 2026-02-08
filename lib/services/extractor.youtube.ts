import 'server-only'
import type { ExtractionResult } from './extractor.web'

const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/

/**
 * Extract transcript/captions from a YouTube video.
 * Uses the youtube-transcript package (no browser automation).
 */
export async function extractYouTubeTranscript(url: string): Promise<ExtractionResult> {
  const warnings: string[] = []
  const match = url.match(YOUTUBE_ID_REGEX)

  if (!match || !match[1]) {
    return {
      ok: false,
      error: 'Não foi possível identificar o ID do vídeo no link do YouTube.',
      warnings,
    }
  }

  const videoId = match[1]

  try {
    // Dynamic import to avoid bundling issues
    const { YoutubeTranscript } = await import('youtube-transcript')

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'pt',
    })

    if (!transcriptItems || transcriptItems.length === 0) {
      // Try without language preference
      const fallbackItems = await YoutubeTranscript.fetchTranscript(videoId).catch(() => null)

      if (!fallbackItems || fallbackItems.length === 0) {
        return {
          ok: false,
          error: 'Inconclusivo: este vídeo não possui legenda/transcrição disponível para análise. Cole a transcrição ou envie o áudio.',
          warnings,
        }
      }

      warnings.push('Transcrição obtida em idioma alternativo (não pt-BR).')
      const text = fallbackItems.map(item => item.text).join(' ').trim()
      return buildTranscriptResult(text, videoId, url, warnings)
    }

    const text = transcriptItems.map(item => item.text).join(' ').trim()
    return buildTranscriptResult(text, videoId, url, warnings)
  } catch (err: any) {
    const msg = err?.message || ''

    // Common error: transcript disabled
    if (msg.includes('disabled') || msg.includes('not available') || msg.includes('Could not')) {
      return {
        ok: false,
        error: 'Inconclusivo: este vídeo não possui legenda/transcrição disponível para análise. Cole a transcrição ou envie o áudio.',
        warnings,
      }
    }

    return {
      ok: false,
      error: `Erro ao obter transcrição do YouTube: ${msg || 'erro desconhecido'}. Cole a transcrição ou envie o áudio.`,
      warnings,
    }
  }
}

function buildTranscriptResult(
  text: string,
  videoId: string,
  url: string,
  warnings: string[],
): ExtractionResult {
  // Normalize whitespace
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()

  if (cleaned.length < 100) {
    return {
      ok: false,
      error: 'Inconclusivo: transcrição muito curta para análise. Cole a transcrição completa ou envie o áudio.',
      warnings,
    }
  }

  // Cap at 10k chars
  if (cleaned.length > 10_000) {
    cleaned = cleaned.slice(0, 10_000)
    warnings.push('Transcrição truncada em 10.000 caracteres.')
  }

  return {
    ok: true,
    text: `[Transcrição do vídeo YouTube: ${videoId}]\n\n${cleaned}`,
    title: `Vídeo YouTube: ${videoId}`,
    sourceUrl: url,
    warnings,
  }
}
