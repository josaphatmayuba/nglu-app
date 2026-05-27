param(
  [string]$PemPath = "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$HostName = "16.54.167.125",
  [string]$User = "admin",
  [string]$RemoteDir = "/opt/stalwart-mail",
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
$sourceDir = Join-Path $repoRoot "mail\stalwart"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "stalwart-mail-$stamp.tgz"
$localArchive = Join-Path ([System.IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$sshTarget = "$User@$HostName"
$sshArgs = @("-i", $PemPath, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new", $sshTarget)

Write-Step "Checking prerequisites"
Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"
if (-not (Test-Path $PemPath)) { throw "PEM key not found: $PemPath" }
if (-not (Test-Path $sourceDir)) { throw "Stalwart source directory not found: $sourceDir" }

Write-Host "Target: $sshTarget"
Write-Host "Remote dir: $RemoteDir"

Write-Step "Packing Stalwart compose files"
if (Test-Path $localArchive) {
  Remove-Item -LiteralPath $localArchive -Force
}
Push-Location $repoRoot
try {
  tar -czf $localArchive mail/stalwart
}
finally {
  Pop-Location
}

$remoteScript = @"
set -euo pipefail

echo "[remote] checking docker"
docker --version
docker compose version

echo "[remote] checking occupied ports"
sudo ss -tulpn | grep -E ':(25|465|587|993|8088)\b' || true

echo "[remote] installing compose files into $RemoteDir"
sudo mkdir -p "$RemoteDir"
sudo tar -xzf "$remoteArchive" -C /tmp
sudo cp /tmp/mail/stalwart/docker-compose.yml "$RemoteDir/docker-compose.yml"
sudo cp /tmp/mail/stalwart/.env.example "$RemoteDir/.env.example"
sudo cp /tmp/mail/stalwart/README.md "$RemoteDir/README.md"
sudo rm -rf /tmp/mail
rm -f "$remoteArchive"

if [ ! -f "$RemoteDir/.env" ]; then
  sudo cp "$RemoteDir/.env.example" "$RemoteDir/.env"
  sudo sed -i "s/CHANGE_THIS_PASSWORD/`$(openssl rand -base64 24 | tr -d '\n')/" "$RemoteDir/.env"
  echo "[remote] created $RemoteDir/.env with generated recovery password"
else
  echo "[remote] keeping existing $RemoteDir/.env"
fi

sudo chown -R "$User":"$User" "$RemoteDir"

echo "[remote] starting stalwart"
cd "$RemoteDir"
docker compose up -d

echo "[remote] status"
docker compose ps
docker logs stalwart-mail --tail 40

echo ""
echo "[remote] Open: http://mail.ongdngolu.org:8088/admin"
echo "[remote] If DNS is not ready: http://$HostName:8088/admin"
echo "[remote] Recovery admin is in $RemoteDir/.env"
"@

if ($DryRun) {
  Write-Step "Dry run complete"
  Write-Host "Would copy $localArchive to ${sshTarget}:$remoteArchive"
  Write-Host "Would install/start Stalwart in $RemoteDir"
  exit 0
}

Write-Step "Uploading archive"
& scp -i $PemPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new $localArchive "${sshTarget}:$remoteArchive"

Write-Step "Installing Stalwart on AWS"
($remoteScript -replace "`r`n", "`n").TrimStart([char]0xFEFF) | & ssh @sshArgs "bash -s"
if ($LASTEXITCODE -ne 0) { throw "Remote Stalwart install failed" }

Write-Step "Done"
Write-Host "Open http://mail.ongdngolu.org:8088/admin after DNS/firewall is ready."
