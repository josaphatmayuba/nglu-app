param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteDevDir = "/opt/nglu-app-dev",
  [string]$ComposeProject = "nglu_dev",
  [string]$ComposeFile = "docker-compose.dev.yml",
  [string]$EnvFile = ".env.dev",
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

$repoRoot    = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir  = Join-Path $repoRoot "backend2"
$distDir     = Join-Path $backendDir "dist"
$stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "nglu-dev-backend-$stamp.tar.gz"
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
Write-Host "Target: https://dev.ongdngolu.org ($sshTarget)"
Write-Host "PEM:    $PemPath"

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
# Create .tar.gz in the backend2 directory first, then move to temp
# This avoids Windows path issues with tar
Push-Location $backendDir
try {
  & tar -czf $archiveName dist
  if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }
  # Move archive to final location
  Move-Item -Path $archiveName -Destination $localArchive -Force
}
finally {
  Pop-Location
}
Write-Host "Archive: $localArchive"

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to ${sshTarget}:$remoteArchive"
  Write-Host "Would replace $RemoteDevDir/backend2/dist and restart nglu_dev_backend2"
  exit 0
}

Write-Step "Uploading backend2/dist archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

$remoteScript = @"
set -euo pipefail
echo "[remote] replacing backend2/dist"
rm -rf "$RemoteDevDir/backend2/dist"
mkdir -p "$RemoteDevDir/backend2/dist"
tar -xzf "$remoteArchive" -C "$RemoteDevDir/backend2"
rm -f "$remoteArchive"
echo "[remote] restarting nglu_dev_backend2"
cd "$RemoteDevDir"
docker compose -p "$ComposeProject" -f "$ComposeFile" --env-file "$EnvFile" up -d --no-deps --force-recreate --build backend2
echo "[remote] waiting for backend2 to be ready"
for i in {1..60}; do
  if curl -fsS https://dev.ongdngolu.org/api/health 2>/dev/null; then
    echo "[remote] backend2 is ready"
    break
  fi
  echo "[remote] waiting... ($i/60)"
  sleep 2
done
echo "[remote] health check"
curl -fsS https://dev.ongdngolu.org/api/health
echo ""
echo "[remote] backend2 logs (last 10 lines)"
docker logs nglu_dev_backend2 --tail 10
"@

Write-Step "Deploying backend2 on AWS dev"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEA
if ($sshExit -ne 0) { throw "Remote deploy script failed (exit $sshExit)" }

if (-not $SkipSmoke) {
  Write-Step "Local smoke checks"
  $health = Invoke-WebRequest -Uri "https://dev.ongdngolu.org/api/health" -Method Get -UseBasicParsing
  Write-Host "API health: $($health.StatusCode)  $($health.Content)"
  if ($health.Content -notlike '*"status":"ok"*') {
    throw "API health check failed: $($health.Content)"
  }
}

Write-Step "Done"
Write-Host "Backend2 deployed to dev.ongdngolu.org. Validate in the browser before marking Jira Done."
