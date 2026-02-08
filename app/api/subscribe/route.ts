import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, whatsapp } = body

    // At least one contact method required
    if (!email && !whatsapp) {
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: 'Informe pelo menos um email ou WhatsApp.' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: 'Email invalido.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabase()

    // Check for duplicates (by email or whatsapp)
    if (email) {
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (existing) {
        // Update last_active instead of rejecting
        await supabase.from('subscribers').update({ last_active: new Date().toISOString(), name: name || undefined }).eq('id', existing.id)
        return NextResponse.json({ ok: true, message: 'Cadastro atualizado com sucesso!' })
      }
    }

    if (whatsapp) {
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('whatsapp', whatsapp)
        .maybeSingle()
      if (existing) {
        await supabase.from('subscribers').update({ last_active: new Date().toISOString(), name: name || undefined }).eq('id', existing.id)
        return NextResponse.json({ ok: true, message: 'Cadastro atualizado com sucesso!' })
      }
    }

    // Insert new subscriber
    const { error } = await supabase.from('subscribers').insert({
      name: name || null,
      email: email || null,
      whatsapp: whatsapp || null,
    })

    if (error) {
      console.error('Subscribe insert error:', error)
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Erro ao salvar. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: 'Inscricao realizada com sucesso!' })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
