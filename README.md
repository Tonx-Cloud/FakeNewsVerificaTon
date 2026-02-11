# Fake News VerificaTon

Ferramenta de análise de desinformação assistida por IA. Recebe conteúdo (texto, link, imagem ou áudio) e gera um relatório estruturado com scores, veredito, avaliação de afirmações, fontes de checagem e recomendações.

**Live:** https://fakenewsverificaton.com.br  
**Repo:** https://github.com/Tonx-Cloud/FakeNewszeiTon.git  
**Contato:** fakeNewsVerificator@gmail.com

## Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Tailwind CSS 3** (dark mode, glassmorphism, animations)
- **Gemini 2.5 Flash** (`@google/generative-ai`) — análise multimodal (texto, imagem, áudio)
- **Whisper-SRT Portal** — transcrição de áudio via Whisper AI (JWT auth, upload → poll → SRT → texto)
- **Supabase** — Auth (magic link), PostgreSQL (profiles, analyses, trending_items, subscribers)
- **Resend** — e-mails transacionais (confirmação, cancelamento, digest)
- **Upstash Redis** — rate limiting
- **react-markdown** + remark-gfm + rehype-raw — renderização de relatórios em Markdown
- **Vercel** — deploy automático + cron (`maxDuration: 180s` para análise de áudio)

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Criar projeto Supabase e rodar migration
# Execute o conteúdo de supabase/sql/001_init.sql no SQL Editor do Supabase

# 3. Copiar .env.example para .env.local e preencher as variáveis

# 4. Rodar em dev
npm run dev
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa.

| Variável | Descrição |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `GEMINI_MODEL` | Modelo (default: `gemini-2.5-flash`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (server-side) |
| `RESEND_API_KEY` | Chave da API Resend |
| `RESEND_FROM_EMAIL` | Email remetente |
| `NEXT_PUBLIC_APP_URL` | URL pública (`https://fakenewsverificaton.com.br`) |
| `CRON_SECRET` | Segredo para proteger endpoint de cron |
| `UNSUB_SECRET` | Segredo para tokens assinados (confirm/cancel) |
| `UPSTASH_REDIS_REST_URL` | URL do Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token do Redis Upstash |
| `WHISPER_EMAIL` | Email de login no Whisper-SRT Portal (auth JWT) |
| `WHISPER_PASSWORD` | Senha de login no Whisper-SRT Portal |
| `WHISPER_SRT_API_KEY` | *(opcional)* API Key do Whisper-SRT (fallback se JWT falhar) |

## Banco de dados (Supabase)

Tabelas em `supabase/sql/001_init.sql`:

- **profiles** — perfil de usuário (vinculado a auth.users)
- **analyses** — análises salvas com scores, veredito, markdown
- **trending_items** — agregação de fakes em alta (cron)
- **subscribers** — inscrições para alertas (nome, email, whatsapp)

Todas com RLS ativado. Service role gerencia via API routes.

## Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Página principal — hero, análise, resultado com Markdown, fontes, WhatsApp, PIX |
| `/auth` | Login via magic link (Supabase Auth) |
| `/subscribe` | Inscrição (double opt-in) e cancelamento de alertas |
| `/alerts` | Página de trending fakes (SSR, force-dynamic) |
| `/sobre` | Sobre o projeto, missão e equipe |
| `/methodology` | Metodologia de análise (6 etapas detalhadas) |
| `/privacy` | Política de Privacidade (LGPD) |
| `/terms` | Termos de Uso |

## API Routes

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/check` | POST | Análise de conteúdo: texto, link, imagem ou áudio (rate limit, max 4.5 MB). Acessível via rewrite `/verify` no frontend |
| `/api/subscribe` | POST | Inscrição — envia e-mail de confirmação (double opt-in) |
| `/api/subscribe/confirm` | GET | Confirma inscrição via token assinado |
| `/api/subscribe/cancel` | POST | Solicita cancelamento — envia e-mail de confirmação |
| `/api/subscribe/cancel/confirm` | GET | Confirma cancelamento e remove dados (LGPD) |
| `/api/cron/digest` | GET | Envia digest por email (protegido por CRON_SECRET) |

## Fluxo de inscrição (double opt-in)

1. Usuário preenche formulário em `/subscribe` (email obrigatório, nome e WhatsApp opcionais)
2. Aceita Termos e Política de Privacidade (checkbox obrigatório)
3. API gera token assinado (HMAC, 48h de validade) com dados do inscrito
4. E-mail de confirmação enviado via Resend
5. Usuário clica no link → dados inseridos no banco → inscrição ativa

## Fluxo de cancelamento (LGPD opt-out)

1. Usuário acessa `/subscribe` → aba "Cancelar inscrição"
2. Informa e-mail cadastrado
3. API verifica se e-mail existe (resposta genérica para evitar enumeração)
4. E-mail de confirmação de cancelamento enviado
5. Usuário clica no link → dados removidos permanentemente do banco

## Relatório Markdown

O pipeline de análise (`lib/analyzePipeline.ts`) gera um relatório Markdown estruturado server-side com:

1. **Resultado** — veredito com emoji (❌/✅/⚠️) + resumo
2. **Scores** — tabela markdown com métricas e indicadores visuais
3. **Avaliação das afirmações** — cada claim com assessment e confiança
4. **Fontes externas** — links para agências de checagem relevantes
5. **Recomendações** — passos para o usuário verificar por conta própria
6. **Pesquise você mesmo** — queries sugeridas

## Pipeline de Áudio (Whisper-SRT)

Quando o usuário envia um arquivo de áudio, o sistema executa um pipeline adicional antes da análise Gemini:

1. **Decode** — data-URL (base64) → Buffer + detecção de mime/extensão
2. **Auth** — JWT login no Whisper-SRT Portal (cache de 7h) ou fallback via API Key
3. **Upload** — envio do áudio via `POST /api/jobs` (FormData, modelo `small`, idioma `pt`)
4. **Poll** — verifica `GET /api/jobs/{id}` a cada 3s (máx. 60 tentativas = 180s)
5. **Download** — baixa o `.srt` gerado via `GET /api/jobs/{id}/download`
6. **Parse** — SRT → segmentos JSON → texto corrido (filtra instrumentais 🎵)
7. **Análise** — texto transcrito enviado ao Gemini como `audio_transcript` com prompt dedicado

Formatos suportados: MP3, WAV, M4A, OGG, WebM, FLAC, AAC (máx. 4.5 MB).

Código: `lib/services/extractor.audio.ts`  
API: [Whisper-SRT Portal](https://github.com/Tonx-Cloud/whisper-srt-portal)

## Segurança

- **CORS:** Wildcard `Access-Control-Allow-Origin: *` em todas as respostas da API (safe — API é same-origin)
- **Rewrite:** Frontend chama `/verify` que é reescrito para `/api/check` (evita interferência de extensões/filtros)
- **Retry:** 3 tentativas com backoff (1.5s, 3s) + AbortController (180s timeout) para resiliência
- **Rate Limiting:** Upstash Redis (10 req/min por IP na análise, 5 req/min na inscrição)
- **Tokens assinados:** HMAC-SHA256 com expiração para confirmação/cancelamento
- **Zod:** Validação de todos os inputs
- **RLS:** Row Level Security em todas as tabelas Supabase
- **LGPD:** Double opt-in, opt-out com eliminação de dados, política de privacidade

## Troubleshooting

### Erro de conexão / NETWORK_ERROR

O frontend possui retry automático (3 tentativas com backoff). Se o erro persistir:

| Causa | Solução |
|-------|--------|
| Extensão do navegador interferindo em requisições | Testar em **aba anônima** (sem extensões) |
| Timeout da função serverless (>180s) | Tentar com conteúdo menor |
| Instabilidade de rede | Aguardar e tentar novamente |

### Erro 429 / RATE_LIMITED

Aguarde 1 minuto. O limite é 10 análises/minuto por IP.

## Cron

Configurado em `vercel.json` — executa diariamente as 09:00 UTC:

```json
{ "crons": [{ "path": "/api/cron/digest?key=CRON_SECRET", "schedule": "0 9 * * *" }] }
```

## Neutralidade

O Fake News VerificaTon não apoia candidatos, partidos ou ideologias. A análise avalia afirmações explícitas, nunca pessoas ou grupos. Quando não há base para conclusão, o resultado é "Inconclusivo". Veja a [Metodologia](/methodology) completa.

*Análise assistida por IA (Gemini). Não substitui checagem profissional.*

