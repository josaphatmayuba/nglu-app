param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteDevDir = "/opt/nglu-app-dev",
  [string]$ComposeProject = "nglu_dev",
  [string]$ComposeFile = "docker-compose.dev.yml",
  [string]$EnvFile = ".env.dev",
  [switch]$SkipSmoke,
  [switch]$DryRun
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

$repoRoot      = Resolve-Path (Join-Path $PSScriptRoot "..")
$middlewareDir = Join-Path $repoRoot "middleware"
$stamp         = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName   = "nglu-dev-middleware-$stamp.tgz"
$localArchive  = Join-Path ([System.IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$sshTarget     = "$User@$HostName"
$sshArgs       = @("-i", $PemPath, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new", $sshTarget)

Write-Step "Checking prerequisites"
Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"
if (-not (Test-Path $PemPath)) {
  throw "PEM key not found: $PemPath"
}
if (-not (Test-Path $middlewareDir)) {
  throw "middleware directory not found: $middlewareDir"
}

Write-Host "Repo:   $repoRoot"
Write-Host "Target: https://dev.ongdngolu.org ($sshTarget)"
Write-Host "PEM:    $PemPath"

# The middleware is plain Node.js (no build step). We pack src/ + package*.json.
Write-Step "Packing middleware source"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $middlewareDir
try {
  tar -czf $localArchive src package.json package-lock.json 2>$null
  if ($LASTEXITCODE -ne 0) {
    # package-lock.json may not exist locally; retry without it
    tar -czf $localArchive src package.json
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
  }
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to ${sshTarget}:$remoteArchive"
  Write-Host "Would replace $RemoteDevDir/middleware/src and rebuild nglu_dev_middleware"
  exit 0
}

Write-Step "Uploading middleware source archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

$remoteScript = @"
set -euo pipefail
echo "[remote] replacing middleware/src"
rm -rf "$RemoteDevDir/middleware/src"
mkdir -p "$RemoteDevDir/middleware"
tar -xzf "$remoteArchive" -C "$RemoteDevDir/middleware"
rm -f "$remoteArchive"
echo "[remote] rebuilding and restarting nglu_dev_middleware"
cd "$RemoteDevDir"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate --build middleware
echo "[remote] waiting for middleware to be ready"
sleep 6
echo "[remote] health check"
curl -fsS https://dev.ongdngolu.org/api/health
echo ""
echo "[remote] middleware logs (last 10 lines)"
docker logs nglu_dev_middleware --tail 10
"@

Write-Step "Deploying middleware on AWS dev"
$remoteScript | & ssh @sshArgs "bash -s"

if (-not $SkipSmoke) {
  Write-Step "Local smoke checks"
  $health = Invoke-WebRequest -Uri "https://dev.ongdngolu.org/api/health" -Method Get -UseBasicParsing
  Write-Host "API health: $($health.StatusCode)  $($health.Content)"
  if ($health.Content -notlike '*"status":"ok"*') {
    throw "API health check failed: $($health.Content)"
  }
}

Write-Step "Done"
Write-Host "Middleware deployed to dev.ongdngolu.org. Validate in the browser before marking Jira Done."
