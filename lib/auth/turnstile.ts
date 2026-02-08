import 'server-only'

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || ''
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileResult {
  success: boolean
  errorCodes: string[]
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns { success: true } if valid, { success: false, errorCodes } otherwise.
 *
 * If TURNSTILE_SECRET_KEY is not configured, all requests pass (dev mode).
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<TurnstileResult> {
  // Dev mode: skip verification if secret not configured
  if (!TURNSTILE_SECRET) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not configured — skipping verification (dev mode)')
    return { success: true, errorCodes: [] }
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] }
  }

  try {
    const body: Record<string, string> = {
      secret: TURNSTILE_SECRET,
      response: token,
    }
    if (ip) body.remoteip = ip

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`[turnstile] API returned HTTP ${res.status}`)
      return { success: false, errorCodes: [`http-${res.status}`] }
    }

    const data = await res.json() as { success: boolean; 'error-codes'?: string[] }

    return {
      success: data.success,
      errorCodes: data['error-codes'] || [],
    }
  } catch (err: any) {
    console.error('[turnstile] Verification error:', err?.message)
    return { success: false, errorCodes: ['network-error'] }
  }
}
