import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { checkRateLimitAsync } from '@/lib/rateLimitUpstash'
import { verifyTurnstile } from '@/lib/auth/turnstile'
import { subscribeSchema } from '@/lib/validations'

export async function POST(req: Request) {
  try {
    // ── Rate limit ──
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const rl = await checkRateLimitAsync(`sub:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const body = await req.json()

    // ── Turnstile verification ──
    const captcha = await verifyTurnstile(body.turnstileToken, ip)
    if (!captcha.success) {
      return NextResponse.json(
        { ok: false, error: 'CAPTCHA_FAILED', message: 'Verificação anti-bot falhou. Recarregue a página.' },
        { status: 403 },
      )
    }

    // ── Validate with Zod ──
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Dados inválidos.'
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: firstError },
        { status: 400 },
      )
    }

    const { name, email, whatsapp } = parsed.data

    const supabase = createServerSupabase()

    // Check for duplicates by email
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      await supabase.from('subscribers').update({
        last_active: new Date().toISOString(),
        name: name || undefined,
        whatsapp: whatsapp || undefined,
      }).eq('id', existing.id)
      return NextResponse.json({ ok: true, message: 'Cadastro atualizado com sucesso!' })
    }

    // Check for duplicates by whatsapp
    if (whatsapp) {
      const { data: existingWa } = await supabase
        .from('subscribers')
        .select('id')
        .eq('whatsapp', whatsapp)
        .maybeSingle()

      if (existingWa) {
        await supabase.from('subscribers').update({
          last_active: new Date().toISOString(),
          name: name || undefined,
          email,
        }).eq('id', existingWa.id)
        return NextResponse.json({ ok: true, message: 'Cadastro atualizado com sucesso!' })
      }
    }

    // Insert new subscriber
    const { error } = await supabase.from('subscribers').insert({
      name: name || null,
      email,
      whatsapp: whatsapp || null,
      accepted_terms_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Subscribe insert error:', error)
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Erro ao salvar. Tente novamente.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, message: 'Inscrição realizada com sucesso!' })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
