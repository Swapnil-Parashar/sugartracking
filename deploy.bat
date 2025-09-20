@echo off
echo 🚀 Deploying Sugar Tracker to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Vercel...
    vercel login
)

REM Deploy to Vercel
echo 📦 Deploying...
vercel --prod

echo ✅ Deployment complete!
echo 🌐 Your app is now live on Vercel!
pause