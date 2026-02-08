import 'server-only'
import crypto from 'crypto'
import { getGemini } from './gemini'

const SYSTEM_PROMPT = `You are a neutral content analyst. Analyze the following content for signs of disinformation, bias, and manipulation.

RULES:
- NEVER support candidates, parties, or ideologies
- ONLY evaluate explicit claims, not opinions or rhetoric
- Separate facts from opinions and lack of evidence
- In political contexts, evaluate claims only, never judge people or groups
- Prefer "Inconclusivo" when there is insufficient basis to conclude
- Use neutral language, no partisan rhetoric
- When analyzing images, describe what you see and evaluate text/claims visible in the image
- When analyzing audio transcriptions, evaluate the spoken claims

Return ONLY valid JSON (no markdown fences) with these fields:
{
  "meta": { "id": string, "createdAt": string, "inputType": string, "language": "pt-BR", "mode": "mvp_no_external_sources", "warnings": string[] },
  "scores": { "fakeProbability": 0-100, "verifiableTruth": 0-100, "biasFraming": 0-100, "manipulationRisk": 0-100 },
  "summary": { "headline": string, "oneParagraph": string, "verdict": "Provavel fake" | "Provavel verdadeiro" | "Inconclusivo" },
  "claims": [{ "claim": string, "assessment": string, "confidence": number }],
  "similar": { "searchQueries": string[], "externalChecks": string[] },
  "reportMarkdown": string
}`

/**
 * Parse a data-URL (e.g. "data:image/png;base64,iVBOR...")
 * Returns { mimeType, base64Data } or null if not a valid data-URL.
 */
function parseDataUrl(content: string): { mimeType: string; base64Data: string } | null {
  const match = content.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return { mimeType: match[1], base64Data: match[2] }
}

export async function analyzePipeline(inputType: string, content: string) {
  const fingerprint = crypto.createHash('sha256').update(content || '').digest('hex')

  const genai = getGemini()
  const model = genai.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })

  // Build parts array for Gemini (supports multimodal)
  const parts: any[] = []

  if (inputType === 'image' || inputType === 'audio') {
    const dataUrl = parseDataUrl(content)
    if (dataUrl) {
      // Send the binary inline as inlineData for Gemini multimodal
      parts.push({
        inlineData: {
          mimeType: dataUrl.mimeType,
          data: dataUrl.base64Data
        }
      })
      const mediaLabel = inputType === 'image'
        ? 'The user uploaded an image. Describe what you see and analyze any text, claims or manipulation signs in it.'
        : 'The user uploaded an audio file. Transcribe what you hear and analyze any claims, bias or manipulation signs.'
      parts.push({ text: `${SYSTEM_PROMPT}\n\n${mediaLabel}` })
    } else {
      // Fallback: treat as plain text (URL or pasted text)
      const normalized = content.slice(0, 20000)
      parts.push({ text: `${SYSTEM_PROMPT}\n\nContent to analyze:\n${normalized}` })
    }
  } else {
    // text or link — plain text prompt
    const normalized = content.slice(0, 20000)
    parts.push({ text: `${SYSTEM_PROMPT}\n\nContent to analyze:\n${normalized}` })
  }

  const result = await model.generateContent(parts)
  const response = await result.response
  let txt = String(response.text()).trim()

  // Strip markdown code fences if Gemini wraps the JSON
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let parsed: any = null
  try {
    parsed = JSON.parse(txt)
  } catch {
    parsed = {
      meta: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: ['Analise baseada apenas no conteudo fornecido. Nao substitui verificacao profissional.'] },
      scores: { fakeProbability: 50, verifiableTruth: 20, biasFraming: 40, manipulationRisk: 30 },
      summary: { headline: 'Resultado Inconclusivo', oneParagraph: 'Nao ha base suficiente para uma conclusao definitiva. Recomendamos verificar em fontes confiaveis.', verdict: 'Inconclusivo' },
      claims: [],
      similar: { searchQueries: [], externalChecks: [] },
      reportMarkdown: `# Relatorio de Analise\n\n---\n\n**Nota:** Este e um resultado inicial. Para conclusoes definitivas, consulte agencias de checagem profissionais.`
    }
  }

  // Ensure required fields exist
  parsed.meta = parsed.meta || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: [] }
  parsed.scores = parsed.scores || { fakeProbability: 0, verifiableTruth: 0, biasFraming: 0, manipulationRisk: 0 }
  parsed.summary = parsed.summary || { headline: 'Resultado', oneParagraph: '', verdict: 'Inconclusivo' }
  parsed.claims = parsed.claims || []
  parsed.similar = parsed.similar || { searchQueries: [], externalChecks: [] }
  parsed.reportMarkdown = parsed.reportMarkdown || ''
  parsed.meta.fingerprint = fingerprint
  parsed.ok = true

  return parsed
}
