import { openai } from './openai'
import crypto from 'crypto'

export async function analyzePipeline(inputType: string, content: string) {
  // For image/audio/link, in MVP we expect content to be text or a transcribed/extracted representation.
  const normalized = (content || '').slice(0, 20000)
  const fingerprint = crypto.createHash('sha256').update(normalized).digest('hex')

  // Build a prompt to ask OpenAI to return structured JSON matching the required schema
  const prompt = `You are a neutral content analyst. Analyze the following content for signs of disinformation, bias, and manipulation.

RULES:
- NEVER support candidates, parties, or ideologies
- ONLY evaluate explicit claims, not opinions or rhetoric
- Separate facts from opinions and lack of evidence
- In political contexts, evaluate claims only, never judge people or groups
- Prefer "Inconclusivo" when there is insufficient basis to conclude
- Use neutral language, no partisan rhetoric

Return ONLY JSON with fields: meta, scores, summary, claims, similar, reportMarkdown.

Content to analyze:
${normalized}`

  const resp = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    input: prompt,
    max_output_tokens: 800
  })

  // Try to parse JSON from output
  const txt = String((resp as any).output_text || JSON.stringify(resp))
  let parsed: any = null
  try { parsed = JSON.parse(txt) } catch (e) {
    // fallback: build a minimal response
    parsed = {
      meta: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: ['Análise baseada apenas no conteúdo fornecido. Não substitui verificação profissional.'] },
      scores: { fakeProbability: 50, verifiableTruth: 20, biasFraming: 40, manipulationRisk: 30 },
      summary: { headline: 'Resultado Inconclusivo', oneParagraph: 'Não há base suficiente para uma conclusão definitiva. Recomendamos verificar em fontes confiáveis.', verdict: 'Inconclusivo' },
      claims: [],
      similar: { searchQueries: [], externalChecks: [] },
      reportMarkdown: `# Relatório de Análise\n\n${normalized}\n\n---\n\n**Nota:** Este é um resultado inicial. Para conclusões definitivas, consulte agências de checagem profissionais.`
    }
  }

  // Ensure required fields exist
  parsed.meta = parsed.meta || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: [] }
  parsed.scores = parsed.scores || { fakeProbability: 0, verifiableTruth: 0, biasFraming: 0, manipulationRisk: 0 }
  parsed.reportMarkdown = parsed.reportMarkdown || ''

  // attach fingerprint
  parsed.meta.fingerprint = fingerprint

  return parsed
}
