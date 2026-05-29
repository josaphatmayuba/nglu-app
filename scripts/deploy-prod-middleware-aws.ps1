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

MW_IMG="$ComposeProject-middleware"
HEALTH_URL="https://ongdngolu.org/api/health"

echo "[remote] replacing middleware/src"
rm -rf "$RemoteProdDir/middleware/src"
mkdir -p "$RemoteProdDir/middleware"
tar -xzf "$remoteArchive" -C "$RemoteProdDir/middleware"
rm -f "$remoteArchive"

cd "$RemoteProdDir"

# (#1) Tag the current working middleware image as a rollback point.
MW_HAVE_PREV=0
if docker image inspect "`$MW_IMG:latest" >/dev/null 2>&1; then
  docker tag "`$MW_IMG:latest" "`$MW_IMG:previous"
  MW_HAVE_PREV=1
  echo "[remote] tagged current image as `$MW_IMG:previous (rollback point)"
fi

# Build the new image WITHOUT touching the running container.
echo "[remote] building new middleware image"
if ! docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" build middleware; then
  echo "[remote] BUILD FAILED — running middleware untouched, nothing deployed"
  exit 1
fi

echo "[remote] recreating nglu_prod_middleware with the new image"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate middleware

check_health() {
  for i in `$(seq 1 20); do
    if curl -fsS "`$HEALTH_URL" 2>/dev/null | grep -q '"status":"ok"'; then return 0; fi
    sleep 3
  done
  return 1
}

if check_health; then
  echo "[remote] health OK — new middleware is live"
  docker logs nglu_prod_middleware --tail 10
else
  echo "[remote] MIDDLEWARE HEALTH CHECK FAILED"
  docker logs nglu_prod_middleware --tail 30 || true
  if [ "`$MW_HAVE_PREV" = "1" ]; then
    echo "[remote] ROLLING BACK middleware to previous image"
    docker tag "`$MW_IMG:previous" "`$MW_IMG:latest"
    docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate middleware
    if check_health; then
      echo "[remote] ROLLED BACK — previous middleware is live again"
    else
      echo "[remote] ROLLBACK still unhealthy — manual intervention required"
    fi
  else
    echo "[remote] no previous middleware image to roll back to"
  fi
  exit 1
fi
"@

Write-Step "Deploying middleware on AWS production"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) {
  throw "Remote prod middleware deploy failed (exit $sshExit). The server attempted an automatic rollback to the previous working image - check the remote output above to confirm it is healthy."
}

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
