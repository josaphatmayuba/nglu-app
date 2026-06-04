#requires -Version 5.1
<#
Déploie en une passe : backend2 → migrations BD dev → farmos-app dist → domus-app dist.
Idempotent : ré-applique sans danger (les ALTER échouent silencieusement si la
colonne/table existe déjà — voir comment Drizzle gère les redos).

Usage :
  scripts\deploy-dev-all.ps1                    # tout
  scripts\deploy-dev-all.ps1 -SkipBackend
  scripts\deploy-dev-all.ps1 -SkipMigrations
  scripts\deploy-dev-all.ps1 -SkipFarmos
  scripts\deploy-dev-all.ps1 -SkipBatiPro
  scripts\deploy-dev-all.ps1 -Migrations @("0060_*.sql","0061_*.sql")
#>
param(
  [string]$KeyPath = "$env:USERPROFILE\Downloads\LightsailDefaultKey-ca-central-1 (3).pem",
  [string]$Server  = "admin@16.54.167.125",
  [string]$RemoteAppPath = "/opt/nglu-app-dev",
  [string[]]$Migrations = @(),
  [switch]$SkipBackend,
  [switch]$SkipMigrations,
  [switch]$SkipFarmos,
  [switch]$SkipBatiPro,
  [switch]$SkipDomus,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Section($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }

if (-not (Test-Path $KeyPath)) { throw "SSH key not found: $KeyPath" }

# ── 1. Backend2 (NestJS) ─────────────────────────────────────────────────
if (-not $SkipBackend) {
  Section "Deploying backend2"
  if ($SkipBuild) {
    & "$repoRoot\scripts\deploy-dev-backend-aws.ps1" -SkipLocalBuild
  } else {
    & "$repoRoot\scripts\deploy-dev-backend-aws.ps1"
  }
  if ($LASTEXITCODE -ne 0) { throw "Backend deploy failed" }
} else { Section "Skipping backend2 (by flag)" }

# ── 2. Migrations Drizzle (manuelles, drift connu) ───────────────────────
if (-not $SkipMigrations) {
  Section "Applying DB migrations"
  # Auto-discover si pas spécifié : tout ce qui est dans drizzle/ et non encore vu.
  # Par défaut on applique celles passées en argument. Sinon : rien.
  if (-not $Migrations -or $Migrations.Count -eq 0) {
    Write-Host "No -Migrations specified, skipping. Pass -Migrations @('0060_*.sql',...) to apply."
  } else {
    $tmpScript = Join-Path $env:TEMP "_apply_migrations.sh"
    $remoteScript = "/tmp/_apply_migrations.sh"
    $filesToUpload = @()
    $applyLines = @()
    foreach ($pat in $Migrations) {
      $files = Get-ChildItem "$repoRoot\backend2\drizzle\$pat" -ErrorAction SilentlyContinue
      foreach ($f in $files) {
        $filesToUpload += $f.FullName
        $applyLines += "echo '-- applying $($f.Name) --'"
        $applyLines += "sed '/^--> statement-breakpoint$/d' /tmp/$($f.Name) > /tmp/$($f.Name).mysql"
        $applyLines += "docker exec -i nglu_dev_mysql mysql -u`"`$DBU`" -p`"`$DBPW`" `"`$DBN`" < /tmp/$($f.Name).mysql"
        $applyLines += "rm -f /tmp/$($f.Name)"
        $applyLines += "rm -f /tmp/$($f.Name).mysql"
      }
    }
    if ($filesToUpload.Count -eq 0) { throw "No migration files matched: $($Migrations -join ', ')" }
    $script = @"
#!/usr/bin/env bash
set -e
cd $RemoteAppPath
DBU=`$(sudo grep -E '^DB_USERNAME=' .env.dev | cut -d= -f2)
DBPW=`$(sudo grep -E '^DB_PASSWORD=' .env.dev | cut -d= -f2-)
DBN=`$(sudo grep -E '^DB_DATABASE=' .env.dev | cut -d= -f2)
echo "DB: `$DBN as `$DBU"
$($applyLines -join "`n")
rm -f $remoteScript
echo "-- restarting backend2 --"
docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev restart backend2
echo OK
"@
    [System.IO.File]::WriteAllText($tmpScript, ($script -replace "`r`n","`n"), [System.Text.UTF8Encoding]::new($false))
    & scp -i $KeyPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new @filesToUpload $tmpScript "${Server}:/tmp/"
    if ($LASTEXITCODE -ne 0) { throw "scp failed" }
    & ssh -i $KeyPath -o IdentitiesOnly=yes $Server "bash $remoteScript"
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }
  }
} else { Section "Skipping migrations (by flag)" }

# ── 3. FarmOS app (Vite SPA) ─────────────────────────────────────────────
if (-not $SkipFarmos) {
  Section "Deploying farmos-app"
  # Le script existant peut écrire sur stderr (warnings tar) — on tolère.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  if ($SkipBuild) {
    & "$repoRoot\scripts\deploy-dev-farmos-aws.ps1" -SkipBuild -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  } else {
    & "$repoRoot\scripts\deploy-dev-farmos-aws.ps1" -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  }
  $ErrorActionPreference = $prev
}

# ── 4. Domus app (Vite SPA) ──────────────────────────────────────────────
if (-not $SkipBatiPro) {
  Section "Deploying batipro-app"
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  if ($SkipBuild) {
    & "$repoRoot\scripts\deploy-dev-batipro-aws.ps1" -SkipBuild -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  } else {
    & "$repoRoot\scripts\deploy-dev-batipro-aws.ps1" -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  }
  $ErrorActionPreference = $prev
}

if (-not $SkipDomus) {
  Section "Deploying domus-app"
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  if ($SkipBuild) {
    & "$repoRoot\scripts\deploy-dev-domus-aws.ps1" -SkipBuild -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  } else {
    & "$repoRoot\scripts\deploy-dev-domus-aws.ps1" -SkipGitPull 2>&1 | ForEach-Object { Write-Host $_ }
  }
  $ErrorActionPreference = $prev
}

Section "All done"
Write-Host "Backend:  https://dev.ongdngolu.org/api/health"
Write-Host "FarmOS:   https://dev.ongdngolu.org/farmos/"
Write-Host "BatiPro:  https://dev.ongdngolu.org/batipro/"
Write-Host "Domus:    https://dev.ongdngolu.org/domus/"
