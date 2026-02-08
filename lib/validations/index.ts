import { z } from 'zod'

// ── URL validation helper ──
const urlSchema = z.string().url('URL inválida.')

// ── Analyze endpoint schema ──
export const analyzeSchema = z.object({
  inputType: z.enum(['text', 'link', 'image', 'audio'], {
    required_error: 'Tipo de entrada obrigatório.',
    invalid_type_error: 'Tipo de entrada inválido. Use: text, link, image ou audio.',
  }),
  content: z.string()
    .min(1, 'Conteúdo não pode estar vazio.')
    .max(4_500_000, 'Conteúdo excede o limite de ~4.5 MB.'),
  turnstileToken: z.string().optional(),
})

export type AnalyzeInput = z.infer<typeof analyzeSchema>

// ── Subscribe endpoint schema ──
export const subscribeSchema = z.object({
  name: z.string().max(100, 'Nome muito longo.').nullable().optional(),
  email: z.string().email('E-mail inválido.').max(320, 'E-mail muito longo.'),
  whatsapp: z.string()
    .regex(/^\+?\d[\d\s\-()]{7,20}$/, 'Formato de WhatsApp inválido.')
    .nullable()
    .optional()
    .or(z.literal('')),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você precisa aceitar os Termos e Política de Privacidade.' }),
  }),
  turnstileToken: z.string().optional(),
})

export type SubscribeInput = z.infer<typeof subscribeSchema>

// ── Alerts suggest schema ──
export const alertsSuggestSchema = z.object({
  title: z.string().min(3, 'Título muito curto.').max(500, 'Título muito longo.'),
  description: z.string().max(2000, 'Descrição muito longa.').optional(),
  turnstileToken: z.string().optional(),
})

export type AlertsSuggestInput = z.infer<typeof alertsSuggestSchema>

// ── Sanitize text for LLM ──

/**
 * Sanitize extracted text before sending to LLM.
 * Removes residual HTML tags, scripts, normalizes whitespace,
 * and caps at maxLength characters.
 */
export function sanitizeForLLM(text: string, maxLength = 10_000): string {
  let cleaned = text
    // Remove any residual HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#?\w+;/g, ' ')
    // Remove potential script content patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength)
  }

  return cleaned
}

/**
 * Validate that a string is a valid URL.
 */
export function isValidUrl(value: string): boolean {
  return urlSchema.safeParse(value).success
}
