import 'server-only'
import crypto from 'crypto'

export async function analyzePipeline(openaiClient: any, inputType: string, content: string) {
  const normalized = (content || '').slice(0, 20000)
  const fingerprint = crypto.createHash('sha256').update(normalized).digest('hex')

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

  const resp = await openaiClient.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    input: prompt,
    max_output_tokens: 800
  })

  const txt = String((resp as any).output_text || JSON.stringify(resp))
  let parsed: any = null
  try { parsed = JSON.parse(txt) } catch (e) {
    parsed = {
      meta: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: ['Analise baseada apenas no conteudo fornecido. Nao substitui verificacao profissional.'] },
      scores: { fakeProbability: 50, verifiableTruth: 20, biasFraming: 40, manipulationRisk: 30 },
      summary: { headline: 'Resultado Inconclusivo', oneParagraph: 'Nao ha base suficiente para uma conclusao definitiva. Recomendamos verificar em fontes confiaveis.', verdict: 'Inconclusivo' },
      claims: [],
      similar: { searchQueries: [], externalChecks: [] },
      reportMarkdown: `# Relatorio de Analise\n\n${normalized}\n\n---\n\n**Nota:** Este e um resultado inicial. Para conclusoes definitivas, consulte agencias de checagem profissionais.`
    }
  }

  parsed.meta = parsed.meta || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputType, language: 'pt-BR', mode: 'mvp_no_external_sources', warnings: [] }
  parsed.scores = parsed.scores || { fakeProbability: 0, verifiableTruth: 0, biasFraming: 0, manipulationRisk: 0 }
  parsed.reportMarkdown = parsed.reportMarkdown || ''
  parsed.meta.fingerprint = fingerprint

  return parsed
}
