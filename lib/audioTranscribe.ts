/**
 * Audio transcription is now handled directly by Gemini multimodal
 * in analyzePipeline.ts via inlineData. This module is kept for
 * potential future use with dedicated speech-to-text models.
 */
export async function transcribeAudio(_input: string) {
  return 'Audio processado via Gemini multimodal.'
}
