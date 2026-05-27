<#
.SYNOPSIS
  Sync Doppler secrets to the server .env files.

.DESCRIPTION
  Downloads secrets from Doppler and writes them to
  /opt/nglu-app/.env.prod or /opt/nglu-app-dev/.env.dev on the server.
  Installs Doppler CLI on the server automatically if not present.

  Doppler project: nglu-app
  Configs: dev (dev.ongdngolu.org) | prd (ongdngolu.org)

.EXAMPLE
  # Sync dev secrets
  .\scripts\sync-env-doppler.ps1 -Environment dev -DopplerToken dp.st.dev.xxxx

  # Sync prod secrets
  .\scripts\sync-env-doppler.ps1 -Environment prod -DopplerToken dp.st.prd.xxxx

  # Dry run (no changes)
  .\scripts\sync-env-doppler.ps1 -Environment prod -DopplerToken dp.st.prd.xxxx -DryRun
#>
param(
  [Parameter(Mandatory)]
  [ValidateSet("dev", "prod")]
  [string]$Environment,

  [Parameter(Mandatory)]
  [string]$DopplerToken,

  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Test-Path $PemPath)) {
  throw "PEM key not found: $PemPath"
}

$sshTarget = "$User@$HostName"
$sshArgs = @("-i", $PemPath, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new", $sshTarget)

if ($Environment -eq "prod") {
  $remoteDir  = "/opt/nglu-app"
  $envFile    = ".env.prod"
  $dopplerCfg = "prd"
} else {
  $remoteDir  = "/opt/nglu-app-dev"
  $envFile    = ".env.dev"
  $dopplerCfg = "dev"
}

Write-Host "Server: $sshTarget"
Write-Host "Target: $remoteDir/$envFile  (Doppler config: $dopplerCfg)"

if ($DryRun) {
  Write-Step "Dry run — no changes applied"
  Write-Host "Would run on server:"
  Write-Host "  doppler secrets download --project nglu-app --config $dopplerCfg --format env --no-file > $remoteDir/$envFile"
  exit 0
}

$remoteScript = @"
set -euo pipefail

if ! command -v doppler &>/dev/null; then
  echo "[remote] installing Doppler CLI..."
  (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh
  echo "[remote] Doppler CLI installed"
fi

echo "[remote] downloading secrets (project=nglu-app, config=$dopplerCfg)..."
DOPPLER_TOKEN="$DopplerToken" doppler secrets download \
  --project nglu-app --config $dopplerCfg \
  --format env --no-file \
  > "$remoteDir/$envFile"

echo "[remote] wrote `$(wc -l < "$remoteDir/$envFile") vars to $remoteDir/$envFile"
"@

Write-Step "Syncing $Environment secrets from Doppler"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) { throw "Remote script failed (exit $sshExit)" }

Write-Step "Done"
Write-Host "$envFile refreshed from Doppler. Run the matching deploy script to apply."
