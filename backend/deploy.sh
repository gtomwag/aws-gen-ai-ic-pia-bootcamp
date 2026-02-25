#!/usr/bin/env bash
# ─── deploy.sh ─────────────────────────────────────────────
# One-command deploy for the GenAI Disruption Management POC.
# Reads settings from ../.env (project root).
# Usage:  cd backend && bash deploy.sh
# ────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

# ── Load .env ──────────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  echo "📄 Loading .env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "⚠  No .env file found at $ENV_FILE — using defaults / environment."
fi

# ── Defaults ───────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
SAM_STACK_NAME="${SAM_STACK_NAME:-genai-disruption-poc}"
USE_BEDROCK="${USE_BEDROCK:-false}"
BEDROCK_MODEL_ID="${BEDROCK_MODEL_ID:-anthropic.claude-3-haiku-20240307-v1:0}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  GenAI Disruption Management — SAM Deploy    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Stack:   $SAM_STACK_NAME"
echo "║  Region:  $AWS_REGION"
echo "║  Bedrock: $USE_BEDROCK"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Build ──────────────────────────────────────────────────
echo "🔨 sam build ..."
cd "$SCRIPT_DIR"
sam build

# ── Deploy ─────────────────────────────────────────────────
DEPLOY_ARGS=(
  --stack-name "$SAM_STACK_NAME"
  --region "$AWS_REGION"
  --capabilities CAPABILITY_IAM
  --resolve-s3
  --no-confirm-changeset
  --parameter-overrides
    "ParameterKey=UseBedrock,ParameterValue=$USE_BEDROCK"
    "ParameterKey=BedrockModelId,ParameterValue=$BEDROCK_MODEL_ID"
)

# If an explicit S3 bucket is set, use it instead of --resolve-s3
if [ -n "${S3_BUCKET:-}" ]; then
  DEPLOY_ARGS=("${DEPLOY_ARGS[@]/--resolve-s3/}")
  DEPLOY_ARGS+=(--s3-bucket "$S3_BUCKET")
fi

echo "🚀 sam deploy ..."
sam deploy "${DEPLOY_ARGS[@]}"

echo ""
echo "✅ Deploy complete. Fetching outputs..."

# ── Print outputs ──────────────────────────────────────────
sam list stack-outputs --stack-name "$SAM_STACK_NAME" --region "$AWS_REGION" --output table 2>/dev/null || true

echo ""
echo "📝 Next steps:"
echo "   1. Copy the ApiUrl from above."
echo "   2. Paste it into web/app.js  →  const API_BASE_URL = '<ApiUrl>';"
echo "   3. Open web/index.html in your browser."
