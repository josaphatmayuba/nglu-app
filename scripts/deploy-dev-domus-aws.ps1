param(
  [string]$KeyPath = "$env:USERPROFILE\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$Server = "admin@16.54.167.125",
  [string]$RemoteAppPath = "/opt/nglu-app-dev",
  [switch]$SkipBuild,
  [switch]$SkipGitPull
)

# Déploie domus-app/dist sur le serveur dev. Calqué sur deploy-dev-farmos-aws.ps1.
# Le conteneur nginx bind-monte /opt/nglu-app-dev/domus-app/dist -> html-domus-dev,
# servi sous https://dev.ongdngolu.org/domus/.
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
$domusPath    = Join-Path $repoRoot "domus-app"
$distPath     = Join-Path $domusPath "dist"
$artifactPath = Join-Path $env:TEMP "nglu-dev-domus-dist.tgz"
$remoteArtifact = "/tmp/nglu-dev-domus-dist.tgz"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}
if (-not (Test-Path $domusPath)) {
  throw "domus-app directory not found: $domusPath"
}

if (-not $SkipBuild) {
  Push-Location $domusPath
  try {
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
      npm.cmd run build
    } else {
      npm run build
    }
    if ($LASTEXITCODE -ne 0) { throw "domus-app build failed" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $distPath)) {
  throw "domus-app/dist not found. Run without -SkipBuild or create the build first."
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $repoRoot
try {
  tar -czf $artifactPath domus-app/dist
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
sudo chmod -R u+w domus-app 2>/dev/null || true
mkdir -p domus-app/dist
# Empty the dist dir contents without deleting the dir itself (preserve bind-mount inode).
sudo find domus-app/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar --warning=no-unknown-keyword -xzf '$remoteArtifact'
# tar via sudo writes root-owned files; make them readable by nginx.
sudo chown -R admin:admin domus-app/dist
sudo chmod -R a+rX domus-app/dist
curl -fsSI https://dev.ongdngolu.org/domus/ >/dev/null
rm -f '$remoteArtifact'
echo 'domus-app dev deployed'
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no $Server $remoteScript

Write-Host "Dev Domus deployed to https://dev.ongdngolu.org/domus/"
