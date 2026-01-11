@echo off
echo ==========================================
echo    REDCODE SYSTEM - STARTUP SCRIPT
echo ==========================================
echo.

echo [1/2] Starting Frontend (Port 80)...
start /b cmd /c "cd frontend && npm run dev"

echo [2/2] Starting Go Backend (Port 8080)...
cd backend
go run main.go
if %errorlevel% neq 0 (
    echo Error starting backend!
    pause
    exit /b %errorlevel%
)
pause

