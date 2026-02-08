import 'server-only'
import { extractWebContent, type ExtractionResult } from './extractor.web'
import { extractYouTubeTranscript } from './extractor.youtube'

const YOUTUBE_REGEX = /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/

/**
 * Detect whether a URL points to YouTube.
 */
export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url.trim())
}

/**
 * Extract readable content from a URL.
 * Routes to YouTube or generic web extractor automatically.
 */
export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  const trimmed = url.trim()

  // Validate URL
  try {
    new URL(trimmed)
  } catch {
    return {
      ok: false,
      error: 'URL inválida. Verifique o formato e tente novamente.',
      warnings: [],
    }
  }

  if (isYouTubeUrl(trimmed)) {
    return extractYouTubeTranscript(trimmed)
  }

  return extractWebContent(trimmed)
}
