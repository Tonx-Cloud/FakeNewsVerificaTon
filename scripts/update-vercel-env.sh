#!/usr/bin/env bash
set -euo pipefail

# update-vercel-env.sh
# Usage: set VERCEL_TOKEN and the NEW_* env vars before running.
# Example:
# export VERCEL_TOKEN="..."
# export NEW_OPENAI_KEY="sk-..."
# export NEW_RESEND_KEY="re-..."
# export NEW_SUPABASE_SERVICE_ROLE="sb_secret_..."
# export NEW_PUBLIC_APP_URL="https://your-app.vercel.app"
# export NEW_CRON_SECRET="$(openssl rand -hex 32)"
# export NEW_UNSUB_SECRET="$(openssl.rand -hex 32)"
# ./scripts/update-vercel-env.sh

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "ERROR: set VERCEL_TOKEN in your environment (https://vercel.com/account/tokens)"
  exit 1
fi

PROJECT_NAME="${PROJECT_NAME:-FakeNewsZeiTon}"
PROJECT_ID="${PROJECT_ID:-}"

: "${NEW_OPENAI_KEY:?set NEW_OPENAI_KEY}"
: "${NEW_OPENAI_MODEL:=gpt-4o-mini}"
: "${NEW_RESEND_KEY:?set NEW_RESEND_KEY}"
: "${NEW_SUPABASE_SERVICE_ROLE:?set NEW_SUPABASE_SERVICE_ROLE}"
: "${NEW_FROM_EMAIL:=FakeNewsZeiTon <onboarding@resend.dev>}"
: "${NEW_PUBLIC_APP_URL:?set NEW_PUBLIC_APP_URL}"
: "${NEW_CRON_SECRET:?set NEW_CRON_SECRET}"
: "${NEW_UNSUB_SECRET:?set NEW_UNSUB_SECRET}"

get_project_id() {
  if [ -n "$PROJECT_ID" ]; then
    echo "$PROJECT_ID"
    return
  fi
  echo "Fetching project id for $PROJECT_NAME..."
  PROJECT_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects?name=${PROJECT_NAME}" | jq -r '.projects[0].id')
  if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo "ERROR: cannot determine PROJECT_ID for $PROJECT_NAME"
    exit 1
  fi
  echo "$PROJECT_ID"
}

upsert_env() {
  name="$1"; value="$2"; scope="${3:-production}"
  pid=$(get_project_id)
  echo "Upserting $name ($scope)..."
  existing=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects/${pid}/env" | jq -r --arg NAME "$name" '.env[]? | select(.key==$NAME) | .id')
  if [ -n "$existing" ] && [ "$existing" != "null" ]; then
    curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/${pid}/env/${existing}"
  fi

  curl -s -X POST "https://api.vercel.com/v9/projects/${pid}/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg k "$name" --arg v "$value" --arg s "$scope" '{key:$k,value:$v,target:[$s]}')" >/dev/null
  echo " -> $name done"
}

upsert_env "OPENAI_API_KEY" "$NEW_OPENAI_KEY" "production"
upsert_env "OPENAI_MODEL" "$NEW_OPENAI_MODEL" "production"
upsert_env "RESEND_API_KEY" "$NEW_RESEND_KEY" "production"
upsert_env "SUPABASE_SERVICE_ROLE_KEY" "$NEW_SUPABASE_SERVICE_ROLE" "production"
upsert_env "FROM_EMAIL" "$NEW_FROM_EMAIL" "production"
upsert_env "PUBLIC_APP_URL" "$NEW_PUBLIC_APP_URL" "production"
upsert_env "CRON_SECRET" "$NEW_CRON_SECRET" "production"
upsert_env "UNSUB_SECRET" "$NEW_UNSUB_SECRET" "production"

echo "All environment variables upserted. Consider triggering a production deploy: vercel --prod"
