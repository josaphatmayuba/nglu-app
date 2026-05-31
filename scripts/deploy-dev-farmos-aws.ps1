param(
  [string]$KeyPath = "$env:USERPROFILE\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$Server = "admin@16.54.167.125",
  [string]$RemoteAppPath = "/opt/nglu-app-dev",
  [switch]$SkipBuild,
  [switch]$SkipGitPull
)

$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command "ssh"
Require-Command "scp"
Require-Command "tar"

$repoRoot     = Resolve-Path (Join-Path $PSScriptRoot "..")
$farmosPath   = Join-Path $repoRoot "farmos-app"
$distPath     = Join-Path $farmosPath "dist"
$artifactPath = Join-Path $env:TEMP "nglu-dev-farmos-dist.tgz"
$remoteArtifact = "/tmp/nglu-dev-farmos-dist.tgz"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}
if (-not (Test-Path $farmosPath)) {
  throw "farmos-app directory not found: $farmosPath"
}

if (-not $SkipBuild) {
  Push-Location $farmosPath
  try {
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
      npm.cmd run build
    } else {
      npm run build
    }
    if ($LASTEXITCODE -ne 0) { throw "farmos-app build failed" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $distPath)) {
  throw "farmos-app/dist not found. Run without -SkipBuild or create the build first."
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $repoRoot
try {
  tar -czf $artifactPath farmos-app/dist
} finally {
  Pop-Location
}

scp -i $KeyPath -o StrictHostKeyChecking=no $artifactPath "${Server}:${remoteArtifact}"

$gitPullLine = if ($SkipGitPull) { "" } else { @"
git fetch origin develop
git pull --ff-only origin develop
"@ }

$remoteScript = @"
set -euo pipefail
cd '$RemoteAppPath'
$gitPullLine
sudo chmod -R u+w farmos-app 2>/dev/null || true
mkdir -p farmos-app/dist
# Empty the dist dir contents without deleting the dir itself (preserve bind-mount inode).
sudo find farmos-app/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar -xzf '$remoteArtifact'
curl -fsSI https://dev.ongdngolu.org/farmos/ >/dev/null
rm -f '$remoteArtifact'
echo 'farmos-app dev deployed'
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no $Server $remoteScript

Write-Host "Dev FarmOS deployed to https://dev.ongdngolu.org/farmos/"
