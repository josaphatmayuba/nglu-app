@echo off
REM NgluERP Docker Startup Script for Windows

echo NgluERP Docker Setup
echo ====================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose is not available
    echo Please ensure you have Docker Desktop version 2.3 or higher
    pause
    exit /b 1
)

echo Docker is installed and ready!
echo.
echo Starting containers...
echo.

REM Start the containers
docker-compose up -d

if errorlevel 1 (
    echo ERROR: Failed to start containers
    pause
    exit /b 1
)

echo.
echo ====================================
echo NgluERP is starting...
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Mailpit:  http://localhost:8025
echo.
echo Waiting for services to be ready (this may take 2-3 minutes on first startup)...
echo.
timeout /t 10

echo.
echo Checking service status...
docker-compose ps

echo.
echo View logs with: docker-compose logs -f
echo.
pause
