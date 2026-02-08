import 'server-only'

/**
 * Rate limiter using @upstash/ratelimit + @upstash/redis.
 *
 * If UPSTASH_REDIS_REST_URL is not configured, falls back to
 * the existing in-memory rate limiter (dev/preview mode).
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''

let rateLimiter: { limit: (identifier: string) => Promise<{ success: boolean; remaining: number; reset: number }> } | null = null

async function getUpstashLimiter() {
  if (rateLimiter) return rateLimiter

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({
    url: UPSTASH_URL,
    token: UPSTASH_TOKEN,
  })

  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 req/min
    analytics: true,
    prefix: 'fnv:ratelimit',
  })

  return rateLimiter
}

// ── In-memory fallback (kept for dev) ──
const windowMs = 60_000
const maxRequests = 10
const hits = new Map<string, number[]>()

setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter(t => now - t < windowMs)
    if (valid.length === 0) hits.delete(key)
    else hits.set(key, valid)
  }
}, 300_000)

function inMemoryCheck(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs)

  if (timestamps.length >= maxRequests) {
    hits.set(ip, timestamps)
    return { allowed: false, remaining: 0 }
  }

  timestamps.push(now)
  hits.set(ip, timestamps)
  return { allowed: true, remaining: maxRequests - timestamps.length }
}

/**
 * Check rate limit for an identifier (usually IP).
 * Uses Upstash Redis if configured, otherwise in-memory.
 */
export async function checkRateLimitAsync(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = await getUpstashLimiter()

  if (limiter) {
    const result = await limiter.limit(identifier)
    return { allowed: result.success, remaining: result.remaining }
  }

  return inMemoryCheck(identifier)
}

/**
 * Synchronous check (in-memory only).
 * Kept for backwards compatibility.
 * @deprecated Use checkRateLimitAsync instead.
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  return inMemoryCheck(ip)
}
