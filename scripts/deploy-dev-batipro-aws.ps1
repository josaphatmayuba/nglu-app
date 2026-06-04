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
$batiproPath  = Join-Path $repoRoot "batipro-app"
$distPath     = Join-Path $batiproPath "dist"
$artifactPath = Join-Path $env:TEMP "nglu-dev-batipro-dist.tgz"
$remoteArtifact = "/tmp/nglu-dev-batipro-dist.tgz"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}
if (-not (Test-Path $batiproPath)) {
  throw "batipro-app directory not found: $batiproPath"
}

if (-not $SkipBuild) {
  Push-Location $batiproPath
  try {
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
      npm.cmd exec vite -- build
    } else {
      npm exec vite -- build
    }
    if ($LASTEXITCODE -ne 0) { throw "batipro-app build failed" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $distPath)) {
  throw "batipro-app/dist not found. Run without -SkipBuild or create the build first."
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $repoRoot
try {
  tar -czf $artifactPath batipro-app/dist
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
sudo chmod -R u+w batipro-app 2>/dev/null || true
mkdir -p batipro-app/dist
sudo find batipro-app/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar --warning=no-unknown-keyword -xzf '$remoteArtifact'
sudo chown -R admin:admin batipro-app/dist
sudo chmod -R a+rX batipro-app/dist
curl -fsSI https://dev.ongdngolu.org/batipro/ >/dev/null
rm -f '$remoteArtifact'
echo 'batipro-app dev deployed'
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no $Server $remoteScript

Write-Host "Dev BatiPro deployed to https://dev.ongdngolu.org/batipro/"
