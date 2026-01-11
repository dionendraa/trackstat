#!/bin/bash
echo "=========================================="
echo "   REDCODE SYSTEM - STARTUP SCRIPT"
echo "=========================================="
echo ""

echo "[1/2] Building Frontend..."
cd frontend && npm run build
if [ $? -ne 0 ]; then
    echo "Error building frontend!"
    exit 1
fi
cd ..

echo ""
echo "[2/2] Starting Go Backend..."
cd backend && go run main.go
if [ $? -ne 0 ]; then
    echo "Error starting backend!"
    exit 1
fi

