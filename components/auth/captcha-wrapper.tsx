'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

interface CaptchaWrapperProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  /** Reset trigger — increment to force re-render */
  resetKey?: number
  className?: string
}

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
 * Reusable Cloudflare Turnstile captcha wrapper.
 * Loads the Turnstile script once and renders the widget.
 * If NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, renders nothing (dev mode).
 */
export default function CaptchaWrapper({
  onVerify,
  onExpire,
  onError,
  resetKey = 0,
  className = '',
}: CaptchaWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Skip if no site key configured
  if (!TURNSTILE_SITE_KEY) {
    return null
  }

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

    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount — other components may use it
    }
  }, [])

  // Render widget when script is loaded
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

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
      theme: 'auto',
      size: 'flexible',
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  }, [scriptLoaded, resetKey, onVerify, onExpire, onError])

  return (
    <div
      ref={containerRef}
      className={`flex justify-center ${className}`}
    />
  )
}
