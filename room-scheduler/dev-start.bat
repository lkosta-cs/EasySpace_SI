@echo off
setlocal enabledelayedexpansion

title EasySpace Dev Environment
color 0A

echo.
echo  ================================================
echo   EasySpace - Starting Development Environment
echo  ================================================
echo.

REM ─── Check we are in the right folder ───────────────────────────────────────
if not exist "docker-compose.yml" (
    echo  [ERROR] docker-compose.yml not found.
    echo  Please run this script from the room-scheduler root folder.
    echo.
    pause
    exit /b 1
)

if not exist "backend\RoomScheduler.API\RoomScheduler.API.csproj" (
    echo  [ERROR] Backend project not found.
    echo  Please run this script from the room-scheduler root folder.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo  [ERROR] Frontend project not found.
    echo  Please run this script from the room-scheduler root folder.
    echo.
    pause
    exit /b 1
)

REM ─── Check Docker is running ─────────────────────────────────────────────────
echo  [1/4] Checking Docker Desktop is running...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Docker Desktop is not running.
    echo  Please open Docker Desktop and wait for the whale icon
    echo  to appear in your taskbar, then run this script again.
    echo.
    pause
    exit /b 1
)
echo         Docker is running.
echo.

REM ─── Start database and mailhog ──────────────────────────────────────────────
echo  [2/4] Starting database and MailHog...
docker compose up db mailhog -d
if errorlevel 1 (
    echo.
    echo  [ERROR] Failed to start Docker services.
    echo  Try running: docker compose down, then run this script again.
    echo.
    pause
    exit /b 1
)
echo         Database and MailHog are up.
echo.

REM ─── Start backend in a new window ───────────────────────────────────────────
echo  [3/4] Starting .NET backend with hot reload...
start "EasySpace API" cmd /k "cd /d %~dp0backend\RoomScheduler.API && echo. && echo  Starting API... && echo  Swagger will be at http://localhost:5239/swagger && echo. && dotnet watch run"
echo         Backend starting in a new window.
echo.

REM ─── Wait a moment so API window is visible ──────────────────────────────────
timeout /t 2 /nobreak >nul

REM ─── Start frontend in a new window ──────────────────────────────────────────
echo  [4/4] Starting React frontend with hot reload...
start "EasySpace Frontend" cmd /k "cd /d %~dp0frontend && echo. && echo  Starting frontend... && echo  App will be at http://localhost:5173 && echo. && npm run dev"
echo         Frontend starting in a new window.
echo.

REM ─── Print summary ───────────────────────────────────────────────────────────
echo  ================================================
echo   All services are starting up!
echo  ================================================
echo.
echo   Wait ~10 seconds for everything to be ready,
echo   then open these URLs in your browser:
echo.
echo   App          http://localhost:5173
echo   Swagger      http://localhost:5239/swagger
echo   MailHog      http://localhost:8025
echo   pgAdmin      http://localhost:5050
echo.
echo   SuperAdmin   superadmin@roomscheduler.local
echo   Password     SuperAdmin123!
echo.
echo  ================================================
echo   To stop everything when done for the day:
echo   1. Close the API and Frontend terminal windows
echo   2. Run: docker compose down
echo  ================================================
echo.

REM ─── Ask if user wants to open the browser ───────────────────────────────────
set /p OPEN="  Open http://localhost:5173 in browser now? (y/n): "
if /i "!OPEN!"=="y" (
    timeout /t 8 /nobreak >nul
    start "" "http://localhost:5173"
)

echo.
echo  This window can be closed. The API and Frontend
echo  are running in their own terminal windows.
echo.
pause
