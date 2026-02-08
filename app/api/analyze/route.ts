import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { analyzePipeline } from '../../../lib/analyzePipeline'

export const runtime = "nodejs"

const BodySchema = z.object({
  inputType: z.enum(['text', 'link', 'image', 'audio']),
  content: z.string()
})

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      console.error("[api/analyze] OPENAI_API_KEY not configured")
      return NextResponse.json({
        ok: false,
        error: "SERVER_MISCONFIG",
        message: "OPENAI_API_KEY nao configurada no servidor (Vercel)."
      }, { status: 503 })
    }

    const body = await req.json()
    const parsed = BodySchema.parse(body)

    const client = new OpenAI({ apiKey })
    const result = await analyzePipeline(client, parsed.inputType, parsed.content)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[api/analyze] error:", err)
    return NextResponse.json({
      ok: false,
      error: "ANALYZE_FAILED",
      message: "Falha ao analisar no servidor. Tente novamente."
    }, { status: 500 })
  }
}
