@echo off
echo ==========================================
echo    REDCODE SYSTEM - STARTUP SCRIPT
echo ==========================================
echo.

echo [1/2] Building Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/2] Starting Go Backend...
cd backend
go run main.go
if %errorlevel% neq 0 (
    echo Error starting backend!
    pause
    exit /b %errorlevel%
)
pause

