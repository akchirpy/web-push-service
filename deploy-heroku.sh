#!/bin/bash

echo "🚀 Heroku Quick Deploy Script"
echo "=============================="
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed."
    echo "Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo "✅ Heroku CLI detected"
echo ""

# Check if in backend directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

echo ""
echo "🔐 Please login to Heroku..."
heroku login

echo ""
echo "🏗️  Creating Heroku app..."
read -p "Enter app name (or press enter for random name): " APP_NAME

if [ -z "$APP_NAME" ]; then
    heroku create
else
    heroku create "$APP_NAME"
fi

echo ""
echo "⚙️  Now we need to set up VAPID keys."
echo "Run 'npm start' locally to generate keys, then:"
echo ""
echo "  heroku config:set VAPID_PUBLIC_KEY='your_public_key'"
echo "  heroku config:set VAPID_PRIVATE_KEY='your_private_key'"
echo "  heroku config:set VAPID_EMAIL='your-email@example.com'"
echo ""
read -p "Press enter when you've set the config variables..."

echo ""
echo "🚀 Deploying to Heroku..."
git push heroku main 2>/dev/null || git push heroku master

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Opening your app..."
heroku open

echo ""
echo "📊 View logs with: heroku logs --tail"
echo "🎉 Your app is now live!"
