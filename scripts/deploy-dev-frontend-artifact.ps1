param(
  [string]$KeyPath = "$env:USERPROFILE\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$Server = "admin@16.54.167.125",
  [string]$RemoteAppPath = "/opt/nglu-app-dev",
  [switch]$SkipBuild
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendPath = Join-Path $repoRoot "frontend"
$distPath = Join-Path $frontendPath "dist"
$artifactPath = Join-Path $env:TEMP "nglu-dev-frontend-dist.tgz"
$remoteArtifact = "/tmp/nglu-dev-frontend-dist.tgz"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

if (-not $SkipBuild) {
  Push-Location $frontendPath
  try {
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
      npm.cmd run build:dev
    } else {
      npm run build:dev
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $distPath)) {
  throw "frontend/dist not found. Run without -SkipBuild or create the dev build first."
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $repoRoot
try {
  tar -czf $artifactPath frontend/dist
} finally {
  Pop-Location
}

scp -i $KeyPath -o StrictHostKeyChecking=no $artifactPath "${Server}:${remoteArtifact}"

$remoteScript = @"
set -euo pipefail
cd '$RemoteAppPath'
git fetch origin develop
git pull --ff-only origin develop
mkdir -p frontend/dist
find frontend/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf '$remoteArtifact'
grep -R "https://dev.ongdngolu.org/api" frontend/dist >/dev/null
curl -fsSI https://dev.ongdngolu.org/crm >/dev/null
curl -fsSI https://dev.ongdngolu.org/admin/dashboard >/dev/null
rm -f '$remoteArtifact'
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no $Server $remoteScript

Write-Host "Dev frontend artifact deployed to https://dev.ongdngolu.org/crm"
