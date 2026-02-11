import 'server-only'

/**
 * Audio extractor using Whisper-SRT Portal API.
 * Uploads audio → polls until done → downloads .srt → converts to text.
 *
 * API: https://frontend-beryl-gamma-80.vercel.app
 */

const WHISPER_API_BASE = 'https://frontend-beryl-gamma-80.vercel.app'
const MAX_POLL_ATTEMPTS = 60       // 60 × 3s = 180s máximo de espera
const POLL_INTERVAL_MS  = 3_000    // 3 segundos entre checks

export interface AudioExtractionResult {
  ok: boolean
  text?: string          // Transcrição como texto corrido
  segments?: SrtSegment[] // Segmentos individuais do SRT
  warnings: string[]
  error?: string
}

export interface SrtSegment {
  index: string
  start: string
  end: string
  text: string
  instrumental: boolean
}

/**
 * Converte um data-URL de áudio (base64) em Buffer + mimeType.
 */
function parseAudioDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')

  // Mapear mime → extensão para o nome do arquivo
  const extMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
  }
  const extension = extMap[mimeType] || 'mp3'

  return { buffer, mimeType, extension }
}

/**
 * Converte texto SRT em array de segmentos JSON.
 * Identifica segmentos instrumentais marcados com 🎵.
 */
export function srtToJson(srt: string): SrtSegment[] {
  const entries: SrtSegment[] = []
  const blocks = srt.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    const index = lines[0].trim()
    const timeLine = lines[1]
    const parts = timeLine.split(' --> ')
    if (parts.length < 2) continue

    const start = parts[0].trim()
    const end = parts[1].trim()
    const text = lines.slice(2).join(' ').trim()
    const instrumental = text === '🎵' || text.includes('🎵')

    entries.push({ index, start, end, text, instrumental })
  }

  return entries
}

/**
 * Converte segmentos SRT em texto corrido para análise.
 * Ignora segmentos instrumentais (🎵).
 */
function segmentsToText(segments: SrtSegment[]): string {
  return segments
    .filter(s => !s.instrumental)
    .map(s => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai transcrição de um áudio via Whisper-SRT Portal.
 * Recebe o conteúdo como data-URL (base64).
 */
export async function extractAudioTranscript(audioDataUrl: string): Promise<AudioExtractionResult> {
  const apiKey = process.env.WHISPER_SRT_API_KEY
  if (!apiKey) {
    console.error('[extractor.audio] WHISPER_SRT_API_KEY not configured')
    return {
      ok: false,
      error: 'Serviço de transcrição de áudio não configurado (WHISPER_SRT_API_KEY).',
      warnings: [],
    }
  }

  // 1. Decodificar data-URL para Buffer
  const parsed = parseAudioDataUrl(audioDataUrl)
  if (!parsed) {
    return {
      ok: false,
      error: 'Formato de áudio inválido. Envie um arquivo de áudio válido.',
      warnings: [],
    }
  }

  const { buffer, mimeType, extension } = parsed
  console.log(`[extractor.audio] Audio: ${mimeType}, ${(buffer.length / 1024).toFixed(0)} KB`)

  try {
    // 2. Upload para Whisper-SRT API via FormData
    const formData = new FormData()
    const uint8 = new Uint8Array(buffer)
    const blob = new Blob([uint8], { type: mimeType })
    formData.append('file', blob, `audio.${extension}`)
    formData.append('language', 'pt')
    formData.append('model', 'small')

    console.log(`[extractor.audio] Uploading to Whisper-SRT...`)
    const uploadRes = await fetch(`${WHISPER_API_BASE}/api/jobs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error(`[extractor.audio] Upload failed (${uploadRes.status}): ${errText}`)
      return {
        ok: false,
        error: `Falha ao enviar áudio para transcrição (${uploadRes.status}).`,
        warnings: [],
      }
    }

    const job = await uploadRes.json() as { id: string; status: string }
    console.log(`[extractor.audio] Job criado: ${job.id}, status: ${job.status}`)

    // 3. Poll até status != PROCESSING
    let status = job.status
    let attempts = 0

    while (status === 'PROCESSING' && attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      attempts++

      const pollRes = await fetch(`${WHISPER_API_BASE}/api/jobs/${job.id}`, {
        headers: { 'X-API-Key': apiKey },
      })

      if (!pollRes.ok) {
        console.warn(`[extractor.audio] Poll failed (${pollRes.status}), retrying...`)
        continue
      }

      const pollData = await pollRes.json() as { status: string }
      status = pollData.status
      console.log(`[extractor.audio] Poll #${attempts}: ${status}`)
    }

    if (status !== 'DONE') {
      const reason = attempts >= MAX_POLL_ATTEMPTS
        ? 'Tempo esgotado aguardando transcrição.'
        : `Transcrição falhou (status: ${status}).`
      console.error(`[extractor.audio] ${reason}`)
      return { ok: false, error: reason, warnings: [] }
    }

    // 4. Download do .srt
    console.log(`[extractor.audio] Downloading SRT...`)
    const downloadRes = await fetch(`${WHISPER_API_BASE}/api/jobs/${job.id}/download`, {
      headers: { 'X-API-Key': apiKey },
    })

    if (!downloadRes.ok) {
      console.error(`[extractor.audio] Download failed (${downloadRes.status})`)
      return {
        ok: false,
        error: 'Falha ao baixar a transcrição gerada.',
        warnings: [],
      }
    }

    const srtText = await downloadRes.text()
    console.log(`[extractor.audio] SRT received: ${srtText.length} chars`)

    // 5. Converter SRT → JSON → texto
    const segments = srtToJson(srtText)
    const fullText = segmentsToText(segments)

    if (!fullText || fullText.length < 5) {
      return {
        ok: false,
        error: 'Transcrição do áudio está vazia ou contém apenas instrumentais.',
        warnings: ['Nenhuma fala detectada no áudio.'],
      }
    }

    console.log(`[extractor.audio] Transcript: ${fullText.length} chars, ${segments.length} segments`)

    return {
      ok: true,
      text: fullText,
      segments,
      warnings: segments.some(s => s.instrumental)
        ? ['Partes instrumentais (🎵) foram identificadas e removidas da análise.']
        : [],
    }

  } catch (err: any) {
    console.error('[extractor.audio] Error:', err)
    return {
      ok: false,
      error: `Erro ao transcrever áudio: ${err.message || 'erro desconhecido'}`,
      warnings: [],
    }
  }
}
