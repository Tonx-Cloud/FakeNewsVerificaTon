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
- For externalChecks, think about whether any major fact-checking organizations (Agencia Lupa, Aos Fatos, Fato ou Fake/g1, Estadao Verifica, AFP Checamos, Reuters Fact Check, AP Fact Check, PolitiFact, Snopes) have likely covered this topic. If so, include objects with title, url, publisher, and summary fields. If not sure, return an empty array.

Return ONLY valid JSON (no markdown fences) with these fields:
{
  "meta": { "id": string, "createdAt": string, "inputType": string, "language": "pt-BR", "mode": "mvp_no_external_sources", "warnings": string[] },
  "scores": { "fakeProbability": 0-100, "verifiableTruth": 0-100, "biasFraming": 0-100, "manipulationRisk": 0-100 },
  "summary": { "headline": string, "oneParagraph": string, "verdict": "Provavel fake" | "Provavel verdadeiro" | "Inconclusivo" },
  "claims": [{ "claim": string, "assessment": string, "confidence": number }],
  "similar": { "searchQueries": string[], "externalChecks": [{ "title": string, "url": string, "publisher": string, "summary": string }] },
  "recommendations": string[]
}

IMPORTANT: Do NOT include a reportMarkdown field. The server will generate it from the structured data.`

/**
 * Parse a data-URL (e.g. "data:image/png;base64,iVBOR...")
 * Returns { mimeType, base64Data } or null if not a valid data-URL.
 */
function parseDataUrl(content: string): { mimeType: string; base64Data: string } | null {
  const match = content.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return { mimeType: match[1], base64Data: match[2] }
}

/** Emoji for risk level */
function riskEmoji(val: number): string {
  if (val >= 70) return '🔴'
  if (val >= 40) return '🟡'
  return '🟢'
}

/** Generate rich Markdown report from structured data */
function buildReportMarkdown(parsed: any): string {
  const s = parsed.scores || {}
  const summary = parsed.summary || {}
  const claims = parsed.claims || []
  const similar = parsed.similar || {}
  const recs = parsed.recommendations || []

  const verdictEmoji = summary.verdict === 'Provavel fake' ? '❌' : summary.verdict === 'Provavel verdadeiro' ? '✅' : '⚠️'

  let md = ''

  // ── Section 1: Result
  md += `# 📰 Resultado da Analise\n\n`
  md += `### ${verdictEmoji} Veredito: ${summary.verdict || 'Inconclusivo'}\n\n`
  md += `**${summary.headline || ''}**\n\n`
  md += `${summary.oneParagraph || ''}\n\n`
  md += `---\n\n`

  // ── Section 2: Scores
  md += `## 📊 Scores\n\n`
  md += `| Metrica | Valor | Nivel |\n`
  md += `|---------|------:|-------|\n`
  md += `| Risco de fake | ${s.fakeProbability ?? 0}% | ${riskEmoji(s.fakeProbability ?? 0)} |\n`
  md += `| Verificavel | ${s.verifiableTruth ?? 0}% | ${riskEmoji(100 - (s.verifiableTruth ?? 0))} |\n`
  md += `| Vies / Framing | ${s.biasFraming ?? 0}% | ${riskEmoji(s.biasFraming ?? 0)} |\n`
  md += `| Risco de manipulacao | ${s.manipulationRisk ?? 0}% | ${riskEmoji(s.manipulationRisk ?? 0)} |\n\n`

  // ── Section 3: Claims
  if (claims.length > 0) {
    md += `## 🔍 Avaliacao das afirmacoes\n\n`
    claims.forEach((c: any, i: number) => {
      md += `### ${i + 1}. "${c.claim}"\n\n`
      md += `- **Avaliacao:** ${c.assessment}\n`
      md += `- **Confianca:** ${c.confidence ?? '?'}%\n\n`
    })
  }

  // ── Section 4: External checks
  const checks = similar.externalChecks || []
  if (checks.length > 0) {
    md += `## 🌐 Fontes externas de checagem\n\n`
    if (typeof checks[0] === 'object') {
      checks.forEach((ch: any) => {
        md += `- **[${ch.title}](${ch.url})** — *${ch.publisher}*\n`
        if (ch.summary) md += `  ${ch.summary}\n`
      })
    } else {
      checks.forEach((ch: string) => { md += `- ${ch}\n` })
    }
    md += `\n`
  }

  // ── Section 5: Recommendations
  md += `## 💡 Recomendacoes\n\n`
  if (recs.length > 0) {
    recs.forEach((r: string, i: number) => { md += `${i + 1}. ${r}\n` })
  } else {
    md += `1. Verifique as afirmacoes em agencias de checagem profissionais\n`
    md += `2. Compare com multiplas fontes antes de compartilhar\n`
    md += `3. Desconfie de conteudos com apelo emocional exagerado\n`
    md += `4. Observe se ha fontes citadas e se sao confiaveis\n`
  }
  md += `\n`

  // ── Section 6: Search queries
  const queries = similar.searchQueries || []
  if (queries.length > 0) {
    md += `## 🔎 Pesquise voce mesmo\n\n`
    queries.forEach((q: string) => { md += `- \`${q}\`\n` })
    md += `\n`
  }

  // ── Footer
  md += `---\n\n`
  md += `*Analise assistida por IA (Gemini). Nao substitui checagem profissional.*\n`
  md += `*Consulte: [Agencia Lupa](https://lupa.uol.com.br), [Aos Fatos](https://aosfatos.org), [Fato ou Fake](https://g1.globo.com/fato-ou-fake)*\n`

  return md
}

export async function analyzePipeline(inputType: string, content: string) {
  const fingerprint = crypto.createHash('sha256').update(content || '').digest('hex')

  // Self-reference guard: skip AI analysis for our own domain
  if (inputType === 'link') {
    try {
      const urlObj = new URL(content.trim())
      if (
        urlObj.hostname.includes('fakenewsverificaton') ||
        urlObj.hostname.includes('fakenewszeiton') ||
        urlObj.hostname.includes('fake-newszei-ton')
      ) {
        const selfResult = {
          ok: true as const,
          meta: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'self_reference', warnings: [], fingerprint },
          scores: { fakeProbability: 0, verifiableTruth: 100, biasFraming: 0, manipulationRisk: 0 },
          summary: { headline: 'Site oficial do Fake News Verificaton', oneParagraph: 'Este e o site oficial do Fake News Verificaton. O sistema nao analisa o proprio dominio.', verdict: 'Provavel verdadeiro' as const },
          claims: [],
          similar: { searchQueries: [], externalChecks: [] },
          recommendations: [],
          reportMarkdown: '',
        }
        selfResult.reportMarkdown = buildReportMarkdown(selfResult)
        return selfResult
      }
    } catch { /* URL invalida — continua normalmente */ }
  }

  const genai = getGemini()
  const model = genai.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })

  // Build parts array for Gemini (supports multimodal)
  const parts: any[] = []

  if (inputType === 'image' || inputType === 'audio') {
    const dataUrl = parseDataUrl(content)
    if (dataUrl) {
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
      const normalized = content.slice(0, 20000)
      parts.push({ text: `${SYSTEM_PROMPT}\n\nContent to analyze:\n${normalized}` })
    }
  } else {
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
      recommendations: []
    }
  }

  // Ensure required fields exist
  parsed.meta = parsed.meta || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: [] }
  parsed.scores = parsed.scores || { fakeProbability: 0, verifiableTruth: 0, biasFraming: 0, manipulationRisk: 0 }
  parsed.summary = parsed.summary || { headline: 'Resultado', oneParagraph: '', verdict: 'Inconclusivo' }
  parsed.claims = parsed.claims || []
  parsed.similar = parsed.similar || { searchQueries: [], externalChecks: [] }
  parsed.recommendations = parsed.recommendations || []
  parsed.meta.fingerprint = fingerprint
  parsed.ok = true

  // Build rich Markdown report server-side
  parsed.reportMarkdown = buildReportMarkdown(parsed)

  return parsed
}
