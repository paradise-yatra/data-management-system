#!/bin/bash
# ==============================================================================
# Paradise Yatra Main Site & API Deployment Script
# This script is triggered securely by the CRM Deployment GUI.
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status

# --- Configuration paths based on VPS inspection ---
ROOT_DIR="/var/www/paradise-yatra-main-site"
FRONTEND_DIR="$ROOT_DIR/ParadiseYatra-3f9e3de458766b6e46e903f1eef6ab5af5200888"
BACKEND_DIR="$ROOT_DIR/paradise-yatra-backend-master"

echo "[INFO] Starting deployment sequence at $(date)"

# ==============================================================================
# 0. Pull Latest Code From Root
# ==============================================================================
echo ""
echo "--------------------------------------------------------"
echo "➔ Fetching latest code"
echo "--------------------------------------------------------"
if [ ! -d "$ROOT_DIR" ]; then
    echo "[ERROR] Root directory not found at: $ROOT_DIR"
    exit 1
fi

cd "$ROOT_DIR"
echo "[INFO] Running git pull origin main in root repository..."
git pull origin main

# ==============================================================================
# 1. Deploy Frontend
# ==============================================================================
echo ""
echo "--------------------------------------------------------"
echo "➔ Deploying Frontend (Next.js)"
echo "--------------------------------------------------------"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "[ERROR] Frontend directory not found at: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

echo "[INFO] Installing frontend dependencies..."
npm install

echo "[INFO] Attempting to auto-fix npm vulnerabilities..."
# Run audit fix, but do not fail the deployment if it returns non-zero.
# We explicitly ignore errors on audit fix so the build can proceed.
npm audit fix || true
# Note: Uncomment the line below if you want force-fixes applied automatically.
# npm audit fix --force || true

echo "[INFO] Building Next.js production app..."
# We pipe through cat to prevent Next.js from aggressively clearing terminal logs during build
npm run build | cat

# Restart PM2
echo "[INFO] Restarting PM2 process (paradise-frontend)..."
pm2 restart paradise-frontend
echo "[SUCCESS] Frontend deployed successfully."

# ==============================================================================
# 2. Deploy Backend
# ==============================================================================
echo ""
echo "--------------------------------------------------------"
echo "➔ Deploying Backend (Node.js/Express)"
echo "--------------------------------------------------------"
if [ ! -d "$BACKEND_DIR" ]; then
    echo "[ERROR] Backend directory not found at: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

echo "[INFO] Installing backend dependencies..."
npm install

echo "[INFO] Attempting to auto-fix npm vulnerabilities..."
npm audit fix || true

# Restart PM2
echo "[INFO] Restarting PM2 process (paradise-backend)..."
pm2 restart paradise-backend
echo "[SUCCESS] Backend deployed successfully."

# ==============================================================================
# Finish
# ==============================================================================
echo ""
echo "--------------------------------------------------------"
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY at $(date)"
echo "--------------------------------------------------------"
exit 0
