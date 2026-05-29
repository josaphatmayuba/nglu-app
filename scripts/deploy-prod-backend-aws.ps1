param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteProdDir = "/opt/nglu-app",
  [string]$ComposeProject = "nglu_prod",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.prod",
  [switch]$SkipLocalBuild,
  [switch]$SkipTests,
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

if (-not $SkipTests) {
  Write-Step "Running backend unit tests (gate)"
  Push-Location $backendDir
  try {
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Backend unit tests failed - deploy aborted. Fix tests or rerun with -SkipTests for an emergency deploy." }
  }
  finally {
    Pop-Location
  }
} else {
  Write-Step "Skipping unit tests by request (-SkipTests)"
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
foreach ($f in @("package.json", "package-lock.json")) {
  if (-not (Test-Path (Join-Path $backendDir $f))) {
    throw "backend2/$f not found - required so the prod image installs the right deps."
  }
}

# package.json + package-lock.json must ship too: Dockerfile.prod runs `npm ci`
# from the server copy, so a stale lock silently drops newly added deps.
Write-Step "Packing backend2/dist + package manifests"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $backendDir
try {
  tar -czf $localArchive dist drizzle package.json package-lock.json
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

IMG="$ComposeProject-backend2"
HEALTH_URL="https://ongdngolu.org/api/health"

echo "[remote] replacing build context (dist, drizzle, package manifests)"
sudo rm -rf "$RemoteProdDir/backend2/dist"
sudo rm -rf "$RemoteProdDir/backend2/drizzle"
sudo rm -f "$RemoteProdDir/backend2/package.json" "$RemoteProdDir/backend2/package-lock.json"
mkdir -p "$RemoteProdDir/backend2"
tar -xzf "$remoteArchive" -C "$RemoteProdDir/backend2"
rm -f "$remoteArchive"

cd "$RemoteProdDir"

# --- (#3) Back up the DB before the new container runs migrations ---
echo "[remote] backing up prod DB before migrations"
DBH=`$(sudo grep -E "^DB_HOST=" "$EnvFile" | cut -d= -f2)
DBP=`$(sudo grep -E "^DB_PORT=" "$EnvFile" | cut -d= -f2)
DBN=`$(sudo grep -E "^DB_DATABASE=" "$EnvFile" | cut -d= -f2)
DBU=`$(sudo grep -E "^DB_USERNAME=" "$EnvFile" | cut -d= -f2)
DBPW=`$(sudo grep -E "^DB_PASSWORD=" "$EnvFile" | cut -d= -f2-)
sudo mkdir -p "$RemoteProdDir/backups"
BACKUP="$RemoteProdDir/backups/pre-deploy-$stamp.sql.gz"
if docker run --rm mysql:8 mysqldump -h "`$DBH" -P "`$DBP" -u "`$DBU" -p"`$DBPW" --single-transaction --quick --no-tablespaces "`$DBN" 2>/dev/null | gzip | sudo tee "`$BACKUP" >/dev/null && [ "`$(sudo stat -c%s "`$BACKUP" 2>/dev/null || echo 0)" -gt 100 ]; then
  echo "[remote] DB backup OK -> `$BACKUP"
else
  echo "[remote] DB BACKUP FAILED — aborting (running app untouched)"
  exit 1
fi

# --- (#1) Tag the current working image as a rollback point ---
HAVE_PREV=0
if docker image inspect "`$IMG:latest" >/dev/null 2>&1; then
  docker tag "`$IMG:latest" "`$IMG:previous"
  HAVE_PREV=1
  echo "[remote] tagged current image as `$IMG:previous (rollback point)"
fi

# --- Build the new image WITHOUT touching the running container ---
echo "[remote] building new backend2 image"
if ! docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" build backend2; then
  echo "[remote] BUILD FAILED — running app untouched, nothing deployed"
  exit 1
fi

# --- Recreate with the freshly built image ---
echo "[remote] recreating backend2 with the new image"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate backend2

check_health() {
  for i in `$(seq 1 20); do
    if curl -fsS "`$HEALTH_URL" 2>/dev/null | grep -q '"status":"ok"'; then return 0; fi
    sleep 4
  done
  return 1
}

if check_health; then
  echo "[remote] health OK — new version is live"
  docker logs nglu_prod_backend2 --tail 10
else
  echo "[remote] HEALTH CHECK FAILED for the new version"
  docker logs nglu_prod_backend2 --tail 30 || true
  if [ "`$HAVE_PREV" = "1" ]; then
    echo "[remote] ROLLING BACK to previous image"
    docker tag "`$IMG:previous" "`$IMG:latest"
    docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate backend2
    if check_health; then
      echo "[remote] ROLLED BACK — previous working version is live again"
    else
      echo "[remote] ROLLBACK still unhealthy — manual intervention required"
    fi
  else
    echo "[remote] no previous image available to roll back to"
  fi
  exit 1
fi
"@

Write-Step "Deploying backend2 on AWS production"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) {
  throw "Remote prod deploy failed (exit $sshExit). The server attempted an automatic rollback to the previous working image - check the remote output above to confirm it is healthy."
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
Write-Host "Backend2 deployed to ongdngolu.org. Validate in the browser before marking Jira Done."
