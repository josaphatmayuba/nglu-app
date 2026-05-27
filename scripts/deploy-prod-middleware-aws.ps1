param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteProdDir = "/opt/nglu-app",
  [string]$ComposeProject = "nglu_prod",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.prod",
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

$repoRoot      = Resolve-Path (Join-Path $PSScriptRoot "..")
$middlewareDir = Join-Path $repoRoot "middleware"
$stamp         = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName   = "nglu-prod-middleware-$stamp.tgz"
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
Write-Host "Target: https://ongdngolu.org ($sshTarget)"
Write-Host "PEM:    $PemPath"

if (-not $DryRun -and $ConfirmProduction -ne "DEPLOY_PROD") {
  throw "Production deploy requires -ConfirmProduction DEPLOY_PROD. Use -DryRun to test without deploying."
}

# The middleware is plain Node.js (no build step). We pack src/ + package*.json.
Write-Step "Packing middleware source"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $middlewareDir
try {
  # Create archive in current dir first to avoid Windows path issues with tar,
  # then move to temp location (same fix as deploy-dev-backend-aws.ps1).
  $archiveName = Split-Path $localArchive -Leaf
  if (Test-Path package-lock.json) {
    & tar -czf $archiveName src package.json package-lock.json
  } else {
    & tar -czf $archiveName src package.json
  }
  if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }
  Move-Item -Path $archiveName -Destination $localArchive -Force
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to ${sshTarget}:$remoteArchive"
  Write-Host "Would replace $RemoteProdDir/middleware/src and rebuild nglu_prod_middleware"
  exit 0
}

Write-Step "Uploading middleware source archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

$remoteScript = @"
set -euo pipefail
echo "[remote] replacing middleware/src"
rm -rf "$RemoteProdDir/middleware/src"
mkdir -p "$RemoteProdDir/middleware"
tar -xzf "$remoteArchive" -C "$RemoteProdDir/middleware"
rm -f "$remoteArchive"
echo "[remote] rebuilding and restarting nglu_prod_middleware"
cd "$RemoteProdDir"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate --build middleware
echo "[remote] waiting for middleware to be ready"
sleep 6
echo "[remote] health check"
curl -fsS https://ongdngolu.org/api/health
echo ""
echo "[remote] middleware logs (last 10 lines)"
docker logs nglu_prod_middleware --tail 10
"@

Write-Step "Deploying middleware on AWS production"
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
Write-Host "Middleware deployed to ongdngolu.org. Validate in the browser before marking Jira Done."
