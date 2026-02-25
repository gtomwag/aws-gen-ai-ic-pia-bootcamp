# ─── deploy.ps1 ────────────────────────────────────────────
# One-command deploy for the GenAI Disruption Management POC.
# Reads settings from ../.env (project root).
# Usage:  cd backend; .\deploy.ps1
# ────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EnvFile   = Join-Path (Split-Path -Parent $ScriptDir) ".env"

# ── Load .env ──────────────────────────────────────────────
if (Test-Path $EnvFile) {
    Write-Host "Loading .env from $EnvFile" -ForegroundColor Cyan
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2 -and $parts[1].Trim() -ne "") {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
} else {
    Write-Host "No .env file found at $EnvFile - using defaults / environment." -ForegroundColor Yellow
}

# ── Defaults ───────────────────────────────────────────────
$AwsRegion     = if ($env:AWS_REGION)       { $env:AWS_REGION }       else { "us-east-1" }
$StackName     = if ($env:SAM_STACK_NAME)   { $env:SAM_STACK_NAME }   else { "genai-disruption-poc" }
$UseBedrock    = if ($env:USE_BEDROCK)      { $env:USE_BEDROCK }      else { "false" }
$BedrockModel  = if ($env:BEDROCK_MODEL_ID) { $env:BEDROCK_MODEL_ID } else { "anthropic.claude-3-haiku-20240307-v1:0" }
$S3Bucket      = $env:S3_BUCKET

# If a profile is set, propagate it
if ($env:AWS_PROFILE) {
    Write-Host "Using AWS profile: $env:AWS_PROFILE" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  GenAI Disruption Mgmt - SAM Deploy"
Write-Host "=========================================="
Write-Host "  Stack:   $StackName"
Write-Host "  Region:  $AwsRegion"
Write-Host "  Bedrock: $UseBedrock"
Write-Host "=========================================="
Write-Host ""

# ── Build ──────────────────────────────────────────────────
Write-Host "Building with SAM ..." -ForegroundColor Green
Push-Location $ScriptDir
try {
    sam build
    if ($LASTEXITCODE -ne 0) { throw "sam build failed" }

    # ── Deploy ─────────────────────────────────────────────
    Write-Host "Deploying with SAM ..." -ForegroundColor Green

    $deployArgs = @(
        "--stack-name", $StackName,
        "--region", $AwsRegion,
        "--capabilities", "CAPABILITY_IAM",
        "--no-confirm-changeset",
        "--parameter-overrides",
        "ParameterKey=UseBedrock,ParameterValue=$UseBedrock",
        "ParameterKey=BedrockModelId,ParameterValue=$BedrockModel"
    )

    if ($S3Bucket) {
        $deployArgs += @("--s3-bucket", $S3Bucket)
    } else {
        $deployArgs += "--resolve-s3"
    }

    sam deploy @deployArgs
    if ($LASTEXITCODE -ne 0) { throw "sam deploy failed" }

    Write-Host ""
    Write-Host "Deploy complete. Fetching outputs ..." -ForegroundColor Green

    # ── Print outputs ──────────────────────────────────────
    sam list stack-outputs --stack-name $StackName --region $AwsRegion --output table 2>$null

    # ── Upload web UI to S3 ────────────────────────────────
    Write-Host ""
    Write-Host "Uploading web UI to S3 ..." -ForegroundColor Green
    python "$ScriptDir\upload-web.py" --stack $StackName --region $AwsRegion
    if ($LASTEXITCODE -ne 0) { throw "Web upload failed" }

    Write-Host ""
    Write-Host "All done! Open the WebsiteUrl above in your browser." -ForegroundColor Green
} finally {
    Pop-Location
}
