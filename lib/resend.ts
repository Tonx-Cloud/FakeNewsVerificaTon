export function buildDigestEmailPayload(to: string, items: any[], frequency: string) {
  const subject = frequency === 'weekly' ? 'Fake News Verificaton — Fakes em alta (semana)' : 'Fake News Verificaton — Fakes em alta (últimas 24h)'

  const rows = (items || []).slice(0, frequency === 'weekly' ? 10 : 5).map((it: any, i:number) => `\n    <li><strong>${i+1}. ${it.title}</strong><br/>${it.reason || ''}<br/>Visto ${it.occurrences} vezes — Última: ${it.last_seen}</li>`).join('')

  const html = `\n    <html><body style="font-family:system-ui,Arial,sans-serif;color:#111">\n      <h2>Fake News Verificaton — Fakes em alta</h2>\n      <ol>${rows}</ol>\n      <p><a href="${(process.env.PUBLIC_APP_URL || '#') + '/alerts'}">Ver alertas</a></p>\n      <hr/>\n      <small>Análise assistida por IA (Gemini). Não substitui fact-checking.</small>\n      <p><a href="${(process.env.PUBLIC_APP_URL || '#') + '/api/unsubscribe?token=TOKEN'}">Descadastrar</a></p>\n    </body></html>\n  `

  return {
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    html
  }
}

export async function sendEmail(payload: { from: string; to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`resend send failed: ${res.status} ${txt}`)
  }

  return res.json()
}
