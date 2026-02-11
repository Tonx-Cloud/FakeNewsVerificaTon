import { NextResponse } from 'next/server'
import { isGeminiConfigured } from '@/lib/gemini'
import { analyzePipeline } from '@/lib/analyzePipeline'
import { createServerSupabase } from '@/lib/supabaseServer'
import { checkRateLimitAsync } from '@/lib/rateLimitUpstash'
import { analyzeSchema, sanitizeForLLM, isValidUrl } from '@/lib/validations'
import { extractFromUrl, isYouTubeUrl } from '@/lib/services/extractor'
import { extractAudioTranscript } from '@/lib/services/extractor.audio'

export const runtime = 'nodejs'

/** CORS headers — same-origin in practice, wildcard is safe */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

/* Preflight CORS */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/** Helper to return JSON with CORS headers */
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { ...CORS, ...extra } })
}

export async function POST(req: Request) {
  try {
    // ── 1. Rate limit by IP ──
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const rl = await checkRateLimitAsync(ip)

    if (!rl.allowed) {
      return json({ ok: false, error: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um minuto.' }, 429, { 'Retry-After': '60' })
    }

    // ── 2. Parse body ──
    const body = await req.json()

    // ── 3. Validate input ──
    const parsed = analyzeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Dados inválidos.'
      return json({ ok: false, error: 'VALIDATION', message: firstError }, 400)
    }

    const { inputType, content } = parsed.data

    // ── 4. Check Gemini config ──
    if (!isGeminiConfigured()) {
      console.error('[api/check] GEMINI_API_KEY not configured')
      return json({ ok: false, error: 'SERVER_MISCONFIG', message: 'GEMINI_API_KEY não configurada no servidor (Vercel).' }, 503)
    }

    // ── 5. Extract content from URL if inputType=link ──
    let textForAnalysis = content
    let sourceUrl: string | undefined
    let effectiveInputType: string = inputType  // track if it becomes youtube_transcript
    const extractionWarnings: string[] = []

    if (inputType === 'link') {
      if (!isValidUrl(content.trim())) {
        return json({ ok: false, error: 'VALIDATION', message: 'URL inválida. Verifique o formato e tente novamente.' }, 400)
      }

      const isYT = isYouTubeUrl(content.trim())
      console.log(`[api/check] URL extraction — isYouTube: ${isYT}, url: ${content.trim().slice(0, 100)}`)

      const extraction = await extractFromUrl(content.trim())

      if (!extraction.ok || !extraction.text) {
        console.warn(`[api/check] Extraction failed: ${extraction.error}`)
        return json({ ok: false, error: 'EXTRACTION_FAILED', message: extraction.error || 'Não foi possível extrair conteúdo do link.' }, 422)
      }

      textForAnalysis = extraction.text
      sourceUrl = extraction.sourceUrl
      extractionWarnings.push(...extraction.warnings)

      if (isYT) {
        effectiveInputType = 'youtube_transcript'
        console.log(`[api/check] YouTube transcript obtained: ${textForAnalysis.length} chars`)
      }
    }

    // ── 5b. Extract transcript from audio if inputType=audio ──
    if (inputType === 'audio') {
      console.log(`[api/check] Audio transcription via Whisper-SRT...`)
      const audioResult = await extractAudioTranscript(content)

      if (!audioResult.ok || !audioResult.text) {
        console.warn(`[api/check] Audio extraction failed: ${audioResult.error}`)
        return json({ ok: false, error: 'EXTRACTION_FAILED', message: audioResult.error || 'Não foi possível transcrever o áudio.' }, 422)
      }

      textForAnalysis = audioResult.text
      effectiveInputType = 'audio_transcript'
      extractionWarnings.push(...audioResult.warnings)
      console.log(`[api/check] Audio transcript obtained: ${textForAnalysis.length} chars`)
    }

    // ── 6. Sanitize text before LLM (text, link, youtube and audio transcript types) ──
    if (effectiveInputType === 'text' || effectiveInputType === 'youtube_transcript' || effectiveInputType === 'audio_transcript' || inputType === 'link') {
      textForAnalysis = sanitizeForLLM(textForAnalysis, 10_000)
    }

    // ── 7. Run analysis pipeline ──
    const result = await analyzePipeline(effectiveInputType, textForAnalysis)

    // Attach extraction metadata
    if (sourceUrl) {
      result.meta = result.meta || {}
      result.meta.sourceUrl = sourceUrl
    }
    if (extractionWarnings.length > 0) {
      result.meta = result.meta || {}
      result.meta.warnings = [
        ...(result.meta.warnings || []),
        ...extractionWarnings,
      ]
    }

    // ── 8. Persist to Supabase (best-effort) ──
    try {
      const supabase = createServerSupabase()
      const inputSummary = (inputType === 'link' ? `[${content.trim()}] ` : '') + textForAnalysis.slice(0, 500)

      await supabase.from('analyses').insert({
        input_type: inputType,
        input_summary: inputSummary,
        scores: result.scores,
        verdict: result.summary?.verdict || 'Inconclusivo',
        report_markdown: result.reportMarkdown,
        claims: result.claims || [],
        fingerprint: result.meta?.fingerprint || null,
        is_flagged: (result.scores?.fakeProbability || 0) >= 70,
      })
    } catch (dbErr) {
      console.error('[api/check] Supabase insert failed (non-blocking):', dbErr)
    }

    // ── 9. Update trending aggregation (best-effort) ──
    try {
      const supabase = createServerSupabase()
      const fp = result.meta?.fingerprint
      if (fp && result.summary?.headline) {
        const { data: existing } = await supabase
          .from('trending_items')
          .select('id, occurrences')
          .eq('fingerprint', fp)
          .maybeSingle()

        if (existing) {
          await supabase.from('trending_items').update({
            occurrences: (existing.occurrences || 1) + 1,
            last_seen: new Date().toISOString(),
            score_fake_probability: result.scores?.fakeProbability || 0,
          }).eq('id', existing.id)
        } else {
          await supabase.from('trending_items').insert({
            title: result.summary.headline,
            reason: result.summary.oneParagraph?.slice(0, 300) || '',
            fingerprint: fp,
            sample_claims: (result.claims || []).slice(0, 3),
            score_fake_probability: result.scores?.fakeProbability || 0,
            occurrences: 1,
            last_seen: new Date().toISOString(),
          })
        }
      }
    } catch (trendErr) {
      console.error('[api/check] trending update failed (non-blocking):', trendErr)
    }

    return json(result)
  } catch (err: any) {
    console.error('[api/check] error:', err)
    return json({ ok: false, error: 'ANALYZE_FAILED', message: 'Falha ao analisar no servidor. Tente novamente.' }, 500)
  }
}
