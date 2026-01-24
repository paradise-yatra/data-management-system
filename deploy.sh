#!/bin/bash

# Deployment Script for Identity Management System
# Run this from: /var/www/paradise-yatra-data-management-system

echo "🚀 Starting deployment..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Step 2: Build frontend
echo "🏗️  Building frontend..."
npm run build

# Step 3: Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Step 4: Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart identity-management-api || pm2 start ecosystem.config.js

# Step 5: Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs identity-management-api"

