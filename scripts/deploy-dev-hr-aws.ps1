param(
  [string]$KeyPath = "$env:USERPROFILE\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$Server = "admin@16.54.167.125",
  [string]$RemoteAppPath = "/opt/nglu-app-dev",
  [switch]$SkipBuild,
  [switch]$SkipGitPull
)

# Deploys hr-app/dist to the dev server.
# Nginx bind-mounts /opt/nglu-app-dev/hr-app/dist -> html-hr-dev,
# served at https://dev.ongdngolu.org/hr/.
$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command "ssh"
Require-Command "scp"
Require-Command "tar"

$repoRoot       = Resolve-Path (Join-Path $PSScriptRoot "..")
$hrPath         = Join-Path $repoRoot "hr-app"
$distPath       = Join-Path $hrPath "dist"
$artifactPath   = Join-Path $env:TEMP "nglu-dev-hr-dist.tgz"
$remoteArtifact = "/tmp/nglu-dev-hr-dist.tgz"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}
if (-not (Test-Path $hrPath)) {
  throw "hr-app directory not found: $hrPath"
}

if (-not $SkipBuild) {
  Push-Location $hrPath
  try {
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
      npm.cmd run build
    } else {
      npm run build
    }
    if ($LASTEXITCODE -ne 0) { throw "hr-app build failed" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $distPath)) {
  throw "hr-app/dist not found. Run without -SkipBuild or create the build first."
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $repoRoot
try {
  tar -czf $artifactPath hr-app/dist
} finally {
  Pop-Location
}

scp -i $KeyPath -o StrictHostKeyChecking=no $artifactPath "${Server}:${remoteArtifact}"

$gitPullLine = if ($SkipGitPull) { "" } else { @"
git fetch origin develop || true
git pull --ff-only origin develop || echo '[deploy] git pull ignored (non-fast-forward); continuing with local dist'
"@ }

$remoteScript = @"
set -euo pipefail
cd '$RemoteAppPath'
$gitPullLine
sudo chmod -R u+w hr-app 2>/dev/null || true
mkdir -p hr-app/dist
# Empty the dist dir contents without deleting the dir itself (preserve bind-mount inode).
sudo find hr-app/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar --warning=no-unknown-keyword -xzf '$remoteArtifact'
# tar via sudo writes root-owned files; make them readable by nginx.
sudo chown -R admin:admin hr-app/dist
sudo chmod -R a+rX hr-app/dist
curl -fsSI https://dev.ongdngolu.org/hr/ >/dev/null
rm -f '$remoteArtifact'
echo 'hr-app dev deployed'
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no $Server $remoteScript

Write-Host "Dev HR deployed to https://dev.ongdngolu.org/hr/"
