/**
 * Image understanding is now handled directly by Gemini multimodal
 * in analyzePipeline.ts via inlineData. This module is kept for
 * potential future use with dedicated vision models.
 */
export async function understandImage(_input: string) {
  return 'Imagem processada via Gemini multimodal.'
}
