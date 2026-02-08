# FakeNewsZeiTon

Ferramenta de analise de desinformacao assistida por IA. Recebe conteudo (texto, link, imagem ou audio) e gera um relatorio estruturado com scores, veredito, avaliacao de afirmacoes, fontes de checagem e recomendacoes.

**Live:** https://fake-newszei-ton-narb.vercel.app  
**Repo:** https://github.com/Tonx-Cloud/FakeNewszeiTon.git

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS 3** (dark mode, glassmorphism, animations)
- **Gemini 2.0 Flash** (`@google/generative-ai`) — analise multimodal (texto, imagem, audio)
- **Supabase** — Auth (magic link), PostgreSQL (profiles, analyses, trending_items, subscribers)
- **Resend** — email digests
- **react-markdown** + remark-gfm + rehype-raw — renderizacao de relatorios em Markdown
- **Vercel** — deploy automatico + cron

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Criar projeto Supabase e rodar migration
# Execute o conteudo de supabase/sql/001_init.sql no SQL Editor do Supabase

# 3. Copiar .env.example para .env.local e preencher as variaveis

# 4. Rodar em dev
npm run dev
```

## Variaveis de ambiente

| Variavel | Descricao |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `GEMINI_MODEL` | Modelo (default: `gemini-2.0-flash`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publica (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (server-side) |
| `RESEND_API_KEY` | Chave da API Resend |
| `FROM_EMAIL` | Email remetente dos digests |
| `PUBLIC_APP_URL` | URL publica do app |
| `CRON_SECRET` | Segredo para proteger endpoint de cron |
| `UNSUB_SECRET` | Segredo para tokens de unsubscribe |

## Banco de dados (Supabase)

Tabelas em `supabase/sql/001_init.sql`:

- **profiles** — perfil de usuario (vinculado a auth.users)
- **analyses** — analises salvas com scores, veredito, markdown
- **trending_items** — agregacao de fakes em alta (cron)
- **subscribers** — inscricoes para alertas (nome, email, whatsapp, opcionais)

Todas com RLS ativado. Service role gerencia via API routes.

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Pagina principal — hero, analise, resultado com Markdown, fontes, WhatsApp, PIX |
| `/auth` | Login via magic link (Supabase Auth) |
| `/auth/callback` | Callback — route.ts troca code por sessao, page.tsx confirma e redireciona |
| `/subscribe` | Inscricao para alertas (nome, email, WhatsApp — campos opcionais) |
| `/alerts` | Pagina de trending fakes (SSR, force-dynamic) |

## API Routes

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/analyze` | POST | Analise de conteudo (rate limit 10/min/IP, max 4.5 MB) |
| `/api/subscribe` | POST | Cadastro de subscriber (upsert por email/whatsapp) |
| `/api/cron/digest` | GET | Envia digest por email (protegido por CRON_SECRET) |

## Relatorio Markdown

O pipeline de analise (`lib/analyzePipeline.ts`) gera um relatorio Markdown estruturado server-side com:

1. **Resultado** — veredito com emoji (❌/✅/⚠️) + resumo
2. **Scores** — tabela markdown com metricas e indicadores visuais
3. **Avaliacao das afirmacoes** — cada claim com assessment e confianca
4. **Fontes externas** — links para agencias de checagem relevantes
5. **Recomendacoes** — passos para o usuario verificar por conta propria
6. **Pesquise voce mesmo** — queries sugeridas

O Markdown e renderizado no frontend com `react-markdown` + `remark-gfm` + `rehype-raw` com classes `prose` do Tailwind.

## Cron

Configurado em `vercel.json` — executa diariamente as 09:00 UTC:

```json
{ "crons": [{ "path": "/api/cron/digest?key=CRON_SECRET", "schedule": "0 9 * * *" }] }
```

## Neutralidade

O FakeNewsZeiTon nao apoia candidatos, partidos ou ideologias. A analise avalia afirmacoes explicitas, nunca pessoas ou grupos. Quando nao ha base para conclusao, o resultado e "Inconclusivo".

*Analise assistida por IA (Gemini). Nao substitui checagem profissional.*

