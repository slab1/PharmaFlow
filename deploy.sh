#!/bin/bash
# PharmaFlow Deployment Script

echo "🚀 Deploying PharmaFlow..."

# Build the app
echo "📦 Building..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

echo "✅ Done!"
