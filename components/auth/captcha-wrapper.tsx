'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2_000
const RENDER_TIMEOUT_MS = 10_000

interface CaptchaWrapperProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (errorCode?: string) => void
  onStatusChange?: (status: CaptchaStatus) => void
  /** Reset trigger — increment to force re-render */
  resetKey?: number
  className?: string
}

export type CaptchaStatus = 'loading' | 'ready' | 'verified' | 'error' | 'retrying'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

/**
 * Reusable Cloudflare Turnstile captcha wrapper with auto-retry.
 * Loads the Turnstile script once and renders the widget.
 * If NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, renders nothing (dev mode).
 *
 * Resilience features:
 * - Auto-retry on error (up to 3 times with increasing delay)
 * - Timeout detection: if widget doesn't respond within 10s, retry
 * - Manual retry button in the UI after all retries exhausted
 * - Status callbacks for parent component awareness
 */
export default function CaptchaWrapper({
  onVerify,
  onExpire,
  onError,
  onStatusChange,
  resetKey = 0,
  className = '',
}: CaptchaWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [status, setStatus] = useState<CaptchaStatus>('loading')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<CaptchaStatus>('loading')

  // Skip if no site key configured (dev mode)
  if (!TURNSTILE_SITE_KEY) {
    return null
  }

  const updateStatus = useCallback((s: CaptchaStatus) => {
    statusRef.current = s
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // Load Turnstile script once
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (document.getElementById('cf-turnstile-script')) {
      if (window.turnstile) setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit'
    script.async = true
    script.defer = true

    window.onTurnstileLoad = () => {
      setScriptLoaded(true)
    }

    script.onerror = () => {
      console.error('[captcha] Failed to load Turnstile script')
      updateStatus('error')
    }

    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount — other components may use it
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!scriptLoaded || !window.turnstile || !containerRef.current) return

    // Clean up previous widget
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current) } catch {}
      widgetIdRef.current = null
    }

    // Clear container
    containerRef.current.innerHTML = ''

    // Clear previous timers
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }

    updateStatus('loading')

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
          updateStatus('verified')
          setRetryCount(0)
          onVerify(token)
        },
        'expired-callback': () => {
          updateStatus('ready')
          onExpire?.()
        },
        'error-callback': (errorCode?: string) => {
          console.warn(`[captcha] Widget error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, errorCode)
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }

          if (retryCount < MAX_RETRIES) {
            updateStatus('retrying')
            const delay = RETRY_DELAY_MS * (retryCount + 1)
            retryTimerRef.current = setTimeout(() => {
              setRetryCount(c => c + 1)
            }, delay)
          } else {
            updateStatus('error')
            onError?.(errorCode as string | undefined)
          }
          return true
        },
        theme: 'auto',
        size: 'flexible',
        retry: 'auto',
        'retry-interval': RETRY_DELAY_MS,
      })

      // Timeout: if widget doesn't resolve within 10s, auto-retry
      timeoutRef.current = setTimeout(() => {
        const cur = statusRef.current
        if (cur !== 'verified' && cur !== 'ready' && retryCount < MAX_RETRIES) {
          console.warn(`[captcha] Render timeout (attempt ${retryCount + 1}/${MAX_RETRIES})`)
          updateStatus('retrying')
          setRetryCount(c => c + 1)
        } else if (cur !== 'verified' && cur !== 'ready') {
          updateStatus('error')
        }
      }, RENDER_TIMEOUT_MS)

    } catch (err) {
      console.error('[captcha] Render failed:', err)
      if (retryCount < MAX_RETRIES) {
        updateStatus('retrying')
        retryTimerRef.current = setTimeout(() => {
          setRetryCount(c => c + 1)
        }, RETRY_DELAY_MS)
      } else {
        updateStatus('error')
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, resetKey, retryCount])

  // Manual retry handler
  const handleManualRetry = () => {
    setRetryCount(0)
  }

  return (
    <div className={`${className}`}>
      <div ref={containerRef} className="flex justify-center" />

      {/* Status indicators */}
      {status === 'retrying' && (
        <p className="text-xs text-amber-500 dark:text-amber-400 text-center mt-2 animate-pulse">
          ⏳ Verificação anti-bot carregando... tentativa {retryCount + 1}/{MAX_RETRIES}
        </p>
      )}

      {status === 'error' && (
        <div className="text-center mt-2">
          <p className="text-xs text-red-500 dark:text-red-400 mb-2">
            ❌ Verificação anti-bot não carregou. Possível interferência de extensão do navegador.
          </p>
          <button
            type="button"
            onClick={handleManualRetry}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium
              bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300
              hover:bg-brand-100 dark:hover:bg-brand-900/50 transition"
          >
            🔄 Tentar novamente
          </button>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Dica: teste em aba anônima (sem extensões) ou desative ad-blockers.
          </p>
        </div>
      )}
    </div>
  )
}
