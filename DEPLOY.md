# PharmaFlow - Deployment Guide

## Quick Deploy Options

### Option 1: Netlify (Recommended - Drag & Drop)
1. Go to https://netlify.com/drop
2. Drag the `pharma-app/dist` folder
3. Done! Get your URL instantly

### Option 2: Cloudflare Pages
```bash
npm install -g wrangler
wrangler pages deploy pharma-app/dist
```

### Option 3: GitHub Pages
```bash
# Initialize git and push to GitHub
git init
git add .
git commit -m "PharmaFlow v1.0.0"
# Then enable GitHub Pages in repo settings
```

### Option 4: Vercel CLI
```bash
cd pharma-app
npm i -g vercel
vercel --prod
```

## Files to Deploy
The `dist/` folder contains everything needed:
- index.html
- manifest.json (PWA manifest)
- sw.js (service worker)
- All JS/CSS assets

## After Deploying
✅ Visit the URL on Android Chrome
✅ Tap "Install App" or "Add to Home Screen"
✅ Works offline!

## Test Locally
```bash
cd pharma-app
npm run preview
# Opens http://localhost:4173
```