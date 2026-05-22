param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteDevDir = "/opt/nglu-app-dev",
  [string]$RemoteProdDir = "/opt/nglu-app",
  [string]$ComposeProject = "nglu_prod",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.prod",
  [switch]$PullServerCode,
  [switch]$RestartFrontendContainer,
  [switch]$SkipLocalBuild,
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendDir = Join-Path $repoRoot "frontend"
$distDir = Join-Path $frontendDir "dist"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "nglu-dev-frontend-$stamp.tgz"
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

Write-Host "Repo: $repoRoot"
Write-Host "Target: https://dev.ongdngolu.org ($sshTarget)"
Write-Host "PEM: $PemPath"

if (-not $SkipLocalBuild) {
  Write-Step "Building frontend for AWS dev"
  Push-Location $frontendDir
  try {
    npm run build:dev
  }
  finally {
    Pop-Location
  }
}
else {
  Write-Step "Skipping local build by request"
}

if (-not (Test-Path $distDir)) {
  throw "frontend/dist not found. Run without -SkipLocalBuild or build the frontend first."
}

Write-Step "Packing frontend/dist"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $repoRoot
try {
  tar -czf $localArchive frontend/dist
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

$pullServer = if ($PullServerCode) { "true" } else { "false" }
$restartFrontend = if ($RestartFrontendContainer) { "true" } else { "false" }

$remoteScript = @"
set -euo pipefail

LOCK_DIR="/tmp/nglu-dev-deploy.lock"
LOCK_META="`$LOCK_DIR/meta.txt"

if ! mkdir "`$LOCK_DIR" 2>/dev/null; then
  echo "Another dev deployment is already running."
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

echo "[remote] lock acquired"

if [ "$pullServer" = "true" ]; then
  echo "[remote] pulling develop in $RemoteDevDir"
  cd "$RemoteDevDir"
  git fetch origin
  git checkout develop
  git pull --ff-only origin develop
fi

echo "[remote] replacing frontend/dist contents without removing the mounted dist directory"
mkdir -p "$RemoteDevDir/frontend/dist"
find "$RemoteDevDir/frontend/dist" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$remoteArchive" -C "$RemoteDevDir"
rm -f "$remoteArchive"

if [ "$restartFrontend" = "true" ]; then
  echo "[remote] recreating frontend container"
  cd "$RemoteProdDir"
  docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --force-recreate --no-deps frontend
fi

echo "[remote] deployed files:"
ls -la "$RemoteDevDir/frontend/dist" | head

echo "[remote] smoke checks"
curl -fsSIL https://dev.ongdngolu.org/ >/tmp/nglu-dev-smoke-root.txt
curl -fsSIL https://dev.ongdngolu.org/admin/company-setting >/tmp/nglu-dev-smoke-admin.txt
grep -R "https://dev.ongdngolu.org/api" "$RemoteDevDir/frontend/dist" >/dev/null

echo "[remote] smoke ok: root, admin route, dev API target"
"@

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to $sshTarget`:$remoteArchive"
  Write-Host "Would run remote deployment script with lock /tmp/nglu-dev-deploy.lock"
  exit 0
}

Write-Step "Uploading archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

Write-Step "Deploying on AWS dev with lock"
$remoteScript | & ssh @sshArgs "bash -s"

if (-not $SkipSmoke) {
  Write-Step "Local HTTP smoke checks"
  $root = Invoke-WebRequest -Uri "https://dev.ongdngolu.org/" -Method Head -UseBasicParsing
  $admin = Invoke-WebRequest -Uri "https://dev.ongdngolu.org/admin/company-setting" -Method Head -UseBasicParsing
  Write-Host "Root status: $($root.StatusCode)"
  Write-Host "Admin route status: $($admin.StatusCode)"
}

Write-Step "Done"
Write-Host "Manual browser validation still required before Jira Done: login demo/5555 on https://dev.ongdngolu.org and verify the delivered feature."
