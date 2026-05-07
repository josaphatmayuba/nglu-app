# NgluERP Docker Startup Script for PowerShell

Write-Host "NgluERP Docker Setup" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
$dockerCheck = & { docker --version } 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Docker Compose is available
$composeCheck = & { docker-compose --version } 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose is not available" -ForegroundColor Red
    Write-Host "Please ensure you have Docker Desktop version 2.3 or higher"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Docker is installed and ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting containers..."
Write-Host ""

# Start the containers
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start containers" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "NgluERP is starting..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Mailpit:  http://localhost:8025"
Write-Host ""
Write-Host "Waiting for services to be ready (this may take 2-3 minutes on first startup)..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Checking service status..."
docker-compose ps

Write-Host ""
Write-Host "View logs with: docker-compose logs -f" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
