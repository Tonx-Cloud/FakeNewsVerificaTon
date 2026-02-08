import { NextResponse } from 'next/server'
import { isGeminiConfigured } from '@/lib/gemini'
import { analyzePipeline } from '@/lib/analyzePipeline'
import { createServerSupabase } from '@/lib/supabaseServer'
import { checkRateLimitAsync } from '@/lib/rateLimitUpstash'
import { verifyTurnstile } from '@/lib/auth/turnstile'
import { analyzeSchema, sanitizeForLLM, isValidUrl } from '@/lib/validations'
import { extractFromUrl } from '@/lib/services/extractor'

export const runtime = 'nodejs'

/* Preflight CORS — evita 405 em requests cross-origin */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: Request) {
  try {
    // ── 1. Rate limit by IP ──
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const rl = await checkRateLimitAsync(ip)

    if (!rl.allowed) {
      return NextResponse.json({
        ok: false,
        error: 'RATE_LIMITED',
        message: 'Muitas requisições. Aguarde um minuto.',
      }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    // ── 2. Turnstile verification ──
    const body = await req.json()
    const turnstileResult = await verifyTurnstile(body.turnstileToken, ip)
    if (!turnstileResult.success) {
      return NextResponse.json({
        ok: false,
        error: 'CAPTCHA_FAILED',
        message: 'Verificação anti-bot falhou. Recarregue a página e tente novamente.',
      }, { status: 403 })
    }

    // ── 3. Validate input ──
    const parsed = analyzeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Dados inválidos.'
      return NextResponse.json({
        ok: false,
        error: 'VALIDATION',
        message: firstError,
      }, { status: 400 })
    }

    const { inputType, content } = parsed.data

    // ── 4. Check Gemini config ──
    if (!isGeminiConfigured()) {
      console.error('[api/analyze] GEMINI_API_KEY not configured')
      return NextResponse.json({
        ok: false,
        error: 'SERVER_MISCONFIG',
        message: 'GEMINI_API_KEY não configurada no servidor (Vercel).',
      }, { status: 503 })
    }

    // ── 5. Extract content from URL if inputType=link ──
    let textForAnalysis = content
    let sourceUrl: string | undefined
    const extractionWarnings: string[] = []

    if (inputType === 'link') {
      if (!isValidUrl(content.trim())) {
        return NextResponse.json({
          ok: false,
          error: 'VALIDATION',
          message: 'URL inválida. Verifique o formato e tente novamente.',
        }, { status: 400 })
      }

      const extraction = await extractFromUrl(content.trim())

      if (!extraction.ok || !extraction.text) {
        return NextResponse.json({
          ok: false,
          error: 'EXTRACTION_FAILED',
          message: extraction.error || 'Não foi possível extrair conteúdo do link.',
        }, { status: 422 })
      }

      textForAnalysis = extraction.text
      sourceUrl = extraction.sourceUrl
      extractionWarnings.push(...extraction.warnings)
    }

    // ── 6. Sanitize text before LLM (text and link types) ──
    if (inputType === 'text' || inputType === 'link') {
      textForAnalysis = sanitizeForLLM(textForAnalysis, 10_000)
    }

    // ── 7. Run analysis pipeline ──
    const result = await analyzePipeline(
      inputType === 'link' ? 'text' : inputType,
      textForAnalysis,
    )

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
      console.error('[api/analyze] Supabase insert failed (non-blocking):', dbErr)
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
      console.error('[api/analyze] trending update failed (non-blocking):', trendErr)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[api/analyze] error:', err)
    return NextResponse.json({
      ok: false,
      error: 'ANALYZE_FAILED',
      message: 'Falha ao analisar no servidor. Tente novamente.',
    }, { status: 500 })
  }
}
