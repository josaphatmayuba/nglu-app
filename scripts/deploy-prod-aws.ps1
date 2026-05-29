param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteProdDir = "/opt/nglu-app",
  [string]$ComposeProject = "nglu_prod",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.prod",
  [switch]$PullServerCode,
  [switch]$RestartFrontendContainer,
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendDir = Join-Path $repoRoot "frontend"
$marketingDir = Join-Path $repoRoot "marketing-site"
$crmDistDir = Join-Path $frontendDir "dist"
$marketingDistDir = Join-Path $marketingDir "dist"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "nglu-prod-web-$stamp.tgz"
$localArchive = Join-Path ([System.IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$sshTarget = "$User@$HostName"
$sshArgs = @("-i", $PemPath, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new", $sshTarget)

Write-Step "Checking prerequisites"
Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"
if (-not (Test-Path $PemPath)) {
  throw "PEM key not found: $PemPath"
}
if (-not (Test-Path $frontendDir)) {
  throw "Frontend directory not found: $frontendDir"
}
if (-not (Test-Path $marketingDir)) {
  throw "Marketing directory not found: $marketingDir"
}

Write-Host "Repo: $repoRoot"
Write-Host "Target: https://ongdngolu.org ($sshTarget)"
Write-Host "PEM: $PemPath"

if (-not $DryRun -and $ConfirmProduction -ne "DEPLOY_PROD") {
  throw "Production deploy requires -ConfirmProduction DEPLOY_PROD. Use -DryRun to test without deploying."
}

if (-not $SkipTests) {
  Write-Step "Running frontend unit tests (gate)"
  Push-Location $frontendDir
  try {
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Frontend unit tests failed - deploy aborted. Fix tests or rerun with -SkipTests for an emergency deploy." }
  }
  finally {
    Pop-Location
  }
} else {
  Write-Step "Skipping unit tests by request (-SkipTests)"
}

if (-not $SkipLocalBuild) {
  Write-Step "Checking production routing contract"
  Push-Location $repoRoot
  try {
    node scripts/check-routing-contract.mjs
  }
  finally {
    Pop-Location
  }

  Write-Step "Building CRM frontend for AWS production"
  Push-Location $frontendDir
  try {
    npm run build:prod
  }
  finally {
    Pop-Location
  }

  Write-Step "Building marketing site for AWS production"
  Push-Location $marketingDir
  try {
    npm run build
  }
  finally {
    Pop-Location
  }
}
else {
  Write-Step "Skipping local builds by request"
}

if (-not (Test-Path $crmDistDir)) {
  throw "frontend/dist not found. Run without -SkipLocalBuild or build the CRM frontend first."
}
if (-not (Test-Path $marketingDistDir)) {
  throw "marketing-site/dist not found. Run without -SkipLocalBuild or build the marketing site first."
}

Write-Step "Packing production web artifacts"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $repoRoot
try {
  tar -czf $localArchive frontend/dist marketing-site/dist
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

$pullServer = if ($PullServerCode) { "true" } else { "false" }

$remoteScript = @"
set -euo pipefail

LOCK_DIR="/tmp/nglu-prod-deploy.lock"
LOCK_META="`$LOCK_DIR/meta.txt"

if ! mkdir "`$LOCK_DIR" 2>/dev/null; then
  echo "Another production deployment is already running."
  if [ -f "`$LOCK_META" ]; then
    cat "`$LOCK_META"
  fi
  exit 42
fi

cleanup() {
  rm -rf "`$LOCK_DIR"
}
trap cleanup EXIT

{
  echo "started_at=`$(date -Iseconds)"
  echo "user=`$(whoami)"
  echo "host=`$(hostname)"
  echo "archive=$remoteArchive"
} > "`$LOCK_META"

echo "[remote] production lock acquired"

if [ "$pullServer" = "true" ]; then
  echo "[remote] pulling master in $RemoteProdDir"
  cd "$RemoteProdDir"
  git fetch origin
  git checkout master
  git pull --ff-only origin master
fi

echo "[remote] replacing built artifact contents without deleting mounted dist directories"
sudo mkdir -p "$RemoteProdDir/frontend/dist" "$RemoteProdDir/marketing-site/dist"
sudo find "$RemoteProdDir/frontend/dist" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo find "$RemoteProdDir/marketing-site/dist" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar -xzf "$remoteArchive" -C "$RemoteProdDir"
sudo chown -R "$User":"$User" "$RemoteProdDir/frontend/dist" "$RemoteProdDir/marketing-site/dist"
rm -f "$remoteArchive"

cd "$RemoteProdDir"
FE_IMG="$ComposeProject-frontend"

# (#1) Tag the current working frontend image as a rollback point.
FE_HAVE_PREV=0
if docker image inspect "`$FE_IMG:latest" >/dev/null 2>&1; then
  docker tag "`$FE_IMG:latest" "`$FE_IMG:previous"
  FE_HAVE_PREV=1
  echo "[remote] tagged current frontend image as `$FE_IMG:previous (rollback point)"
fi

echo "[remote] building prod frontend image from updated dist files..."
if ! docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" build frontend; then
  echo "[remote] FRONTEND BUILD FAILED — running site untouched, nothing deployed"
  exit 1
fi

echo "[remote] recreating prod frontend container..."
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --force-recreate --no-deps frontend

check_web() {
  for i in `$(seq 1 15); do
    if curl -fsSIL https://ongdngolu.org/ >/dev/null 2>&1 \
       && curl -fsSIL https://ongdngolu.org/crm >/dev/null 2>&1 \
       && curl -fsS https://ongdngolu.org/api/health 2>/dev/null | grep -q '"status":"ok"'; then
      return 0
    fi
    sleep 3
  done
  return 1
}

if check_web; then
  echo "[remote] smoke ok: marketing root, crm entry, API health"
else
  echo "[remote] FRONTEND HEALTH CHECK FAILED"
  if [ "`$FE_HAVE_PREV" = "1" ]; then
    echo "[remote] ROLLING BACK frontend to previous image"
    docker tag "`$FE_IMG:previous" "`$FE_IMG:latest"
    docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --force-recreate --no-deps frontend
    if check_web; then
      echo "[remote] ROLLED BACK — previous frontend is live again"
    else
      echo "[remote] ROLLBACK still unhealthy — manual intervention required"
    fi
  else
    echo "[remote] no previous frontend image to roll back to"
  fi
  exit 1
fi
"@

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to $sshTarget`:$remoteArchive"
  Write-Host "Would run remote production deployment script with lock /tmp/nglu-prod-deploy.lock"
  Write-Host "Real production deploy requires: -ConfirmProduction DEPLOY_PROD"
  exit 0
}

Write-Step "Uploading production artifacts"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

Write-Step "Deploying on AWS production with lock"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) {
  throw "Remote prod deploy failed (exit $sshExit). The server attempted an automatic rollback to the previous working frontend - check the remote output above to confirm it is healthy."
}

if (-not $SkipSmoke) {
  Write-Step "Local production routing smoke"
  Push-Location $repoRoot
  try {
    node scripts/smoke-routing-contract.mjs --base https://ongdngolu.org
  }
  finally {
    Pop-Location
  }
}

Write-Step "Done"
Write-Host "Manual browser validation still required before Jira Done: open https://ongdngolu.org, /crm, login, and verify the released work."
