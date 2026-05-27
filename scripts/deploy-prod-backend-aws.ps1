param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteProdDir = "/opt/nglu-app",
  [string]$ComposeProject = "nglu_prod",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.prod",
  [switch]$SkipLocalBuild,
  [switch]$SkipSmoke,
  [switch]$DryRun,
  [string]$ConfirmProduction
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
  param([string]$CommandName)
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $CommandName"
  }
}

$repoRoot    = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir  = Join-Path $repoRoot "backend2"
$distDir     = Join-Path $backendDir "dist"
$stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "nglu-prod-backend-$stamp.tgz"
$localArchive  = Join-Path ([System.IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$sshTarget   = "$User@$HostName"
$sshArgs     = @("-i", $PemPath, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new", $sshTarget)

Write-Step "Checking prerequisites"
Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"
if (-not (Test-Path $PemPath)) {
  throw "PEM key not found: $PemPath"
}
if (-not (Test-Path $backendDir)) {
  throw "backend2 directory not found: $backendDir"
}

Write-Host "Repo:   $repoRoot"
Write-Host "Target: https://ongdngolu.org ($sshTarget)"
Write-Host "PEM:    $PemPath"

if (-not $DryRun -and $ConfirmProduction -ne "DEPLOY_PROD") {
  throw "Production deploy requires -ConfirmProduction DEPLOY_PROD. Use -DryRun to test without deploying."
}

if (-not $SkipLocalBuild) {
  Write-Step "Building backend2 (NestJS)"
  Push-Location $backendDir
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "backend2 build failed" }
  }
  finally {
    Pop-Location
  }
} else {
  Write-Step "Skipping local build by request"
}

if (-not (Test-Path $distDir)) {
  throw "backend2/dist not found. Run without -SkipLocalBuild or build first."
}

Write-Step "Packing backend2/dist"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $backendDir
try {
  tar -czf $localArchive dist drizzle
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to ${sshTarget}:$remoteArchive"
  Write-Host "Would replace $RemoteProdDir/backend2/dist and restart nglu_prod_backend2"
  exit 0
}

Write-Step "Uploading backend2/dist archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

$remoteScript = @"
set -euo pipefail

LOCK_DIR="/tmp/nglu-prod-backend-deploy.lock"
LOCK_META="`$LOCK_DIR/meta.txt"

if ! mkdir "`$LOCK_DIR" 2>/dev/null; then
  echo "Another production backend deployment is already running."
  if [ -f "`$LOCK_META" ]; then cat "`$LOCK_META"; fi
  exit 42
fi

cleanup() { rm -rf "`$LOCK_DIR"; }
trap cleanup EXIT

{
  echo "started_at=`$(date -Iseconds)"
  echo "user=`$(whoami)"
  echo "archive=$remoteArchive"
} > "`$LOCK_META"

echo "[remote] production backend lock acquired"
echo "[remote] replacing backend2/dist and drizzle"
sudo rm -rf "$RemoteProdDir/backend2/dist"
sudo rm -rf "$RemoteProdDir/backend2/drizzle"
mkdir -p "$RemoteProdDir/backend2"
tar -xzf "$remoteArchive" -C "$RemoteProdDir/backend2"
rm -f "$remoteArchive"
echo "[remote] restarting backend2 (nglu_prod_backend2)"
cd "$RemoteProdDir"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate --build backend2
echo "[remote] waiting for backend2 to be ready"
sleep 20
echo "[remote] health check"
curl -fsS https://ongdngolu.org/api/health || echo "Health check failed (may retry)"
echo ""
echo "[remote] backend2 logs (last 10 lines)"
docker logs nglu_prod_backend2 --tail 10
"@

Write-Step "Deploying backend2 on AWS production"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) { throw "Remote prod deploy script failed (exit $sshExit)" }

if (-not $SkipSmoke) {
  Write-Step "Local smoke checks"
  $health = Invoke-WebRequest -Uri "https://ongdngolu.org/api/health" -Method Get -UseBasicParsing
  Write-Host "API health: $($health.StatusCode)  $($health.Content)"
  if ($health.Content -notlike '*"status":"ok"*') {
    throw "API health check failed: $($health.Content)"
  }
}

Write-Step "Done"
Write-Host "Backend2 deployed to ongdngolu.org. Validate in the browser before marking Jira Done."
