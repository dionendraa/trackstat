#!/bin/bash
echo "=========================================="
echo "   REDCODE SYSTEM - STARTUP SCRIPT"
echo "=========================================="
echo ""

echo "[1/2] Starting Frontend (Port 80)..."
(cd frontend && npm run dev) &

echo "[2/2] Starting Go Backend (Port 8080)..."
cd backend && go run main.go
if [ $? -ne 0 ]; then
    echo "Error starting backend!"
    exit 1
fi

