#!/usr/bin/env pwsh
# restore-vercel-env.ps1
# Script interativo para restaurar TODAS as variáveis de ambiente no projeto Vercel
# Execute: .\scripts\restore-vercel-env.ps1

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Restaurar variáveis de ambiente — Vercel" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cole os valores abaixo. Copie de cada dashboard." -ForegroundColor Yellow
Write-Host ""

# Coletar valores
$vars = @{}

Write-Host "── Supabase (Settings > API) ──" -ForegroundColor Green
$vars["NEXT_PUBLIC_SUPABASE_URL"]    = Read-Host "NEXT_PUBLIC_SUPABASE_URL (ex: https://xxx.supabase.co)"
$vars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY (anon/public key)"
$vars["SUPABASE_SERVICE_ROLE_KEY"]   = Read-Host "SUPABASE_SERVICE_ROLE_KEY (service_role key)"

Write-Host ""
Write-Host "── Google Gemini (aistudio.google.com/apikey) ──" -ForegroundColor Green
$vars["GEMINI_API_KEY"]  = Read-Host "GEMINI_API_KEY (AIza...)"
$vars["GEMINI_MODEL"]    = "gemini-2.0-flash"
Write-Host "  GEMINI_MODEL = gemini-2.0-flash (padrão)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "── Cloudflare Turnstile ──" -ForegroundColor Green
$vars["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] = Read-Host "NEXT_PUBLIC_TURNSTILE_SITE_KEY (0x4...)"
$vars["TURNSTILE_SECRET_KEY"]           = Read-Host "TURNSTILE_SECRET_KEY (0x4...)"

Write-Host ""
Write-Host "── Upstash Redis (console.upstash.com) ──" -ForegroundColor Green
$vars["UPSTASH_REDIS_REST_URL"]   = Read-Host "UPSTASH_REDIS_REST_URL (https://xxx.upstash.io)"
$vars["UPSTASH_REDIS_REST_TOKEN"] = Read-Host "UPSTASH_REDIS_REST_TOKEN (AX...)"

Write-Host ""
Write-Host "── Resend (resend.com/api-keys) ──" -ForegroundColor Green
$vars["RESEND_API_KEY"]    = Read-Host "RESEND_API_KEY (re_...)"
$vars["RESEND_FROM_EMAIL"] = "alertas@fakenewsverificaton.com.br"
Write-Host "  RESEND_FROM_EMAIL = alertas@fakenewsverificaton.com.br (padrão)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "── App ──" -ForegroundColor Green
$vars["NEXT_PUBLIC_APP_URL"] = "https://fakenewsverificaton.com.br"
Write-Host "  NEXT_PUBLIC_APP_URL = https://fakenewsverificaton.com.br (padrão)" -ForegroundColor DarkGray

# Gerar secrets aleatórios
$vars["CRON_SECRET"]  = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$vars["UNSUB_SECRET"] = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Write-Host "  CRON_SECRET  = (gerado automaticamente)" -ForegroundColor DarkGray
Write-Host "  UNSUB_SECRET = (gerado automaticamente)" -ForegroundColor DarkGray

# Validar — todos obrigatórios devem ter valor
$required = @("NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","GEMINI_API_KEY","NEXT_PUBLIC_TURNSTILE_SITE_KEY","TURNSTILE_SECRET_KEY","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","RESEND_API_KEY")
$missing = $required | Where-Object { [string]::IsNullOrWhiteSpace($vars[$_]) }
if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "ERRO: Variáveis obrigatórias vazias:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Abortando." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Adicionando $($vars.Count) variáveis ao projeto Vercel..." -ForegroundColor Cyan

$scopes = "production,preview,development"
$errors = 0

foreach ($kv in $vars.GetEnumerator()) {
    $name = $kv.Key
    $val  = $kv.Value
    Write-Host -NoNewline "  $name ... "
    try {
        # Remover existente (ignora erro se não existe)
        vercel env rm $name $scopes --yes 2>$null | Out-Null
        # Adicionar nova
        $val | vercel env add $name $scopes 2>&1 | Out-Null
        Write-Host "OK" -ForegroundColor Green
    } catch {
        Write-Host "FALHOU" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "Todas as variáveis restauradas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora faça o deploy:" -ForegroundColor Yellow
    Write-Host "  vercel --prod" -ForegroundColor White
} else {
    Write-Host "$errors variáveis falharam. Verifique acima." -ForegroundColor Red
}
Write-Host ""
