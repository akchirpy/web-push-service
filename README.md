# 🔔 Web Push Notification Service

A complete web push notification service that allows websites to collect subscribers and send push notifications.

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Step-by-step:

1. Click the "Deploy on Railway" button above
2. Sign in with GitHub
3. Click "Deploy Now"
4. Wait for deployment to complete
5. Go to your project settings and add these environment variables:
   - `VAPID_PUBLIC_KEY` - (get by running locally first)
   - `VAPID_PRIVATE_KEY` - (get by running locally first)
   - `VAPID_EMAIL` - your-email@example.com

## ✨ Features

- RESTful API for push notifications
- JavaScript SDK for easy website integration
- Admin dashboard for managing notifications
- Service Worker for handling push events
- VAPID-based secure notifications

## 📖 Documentation

See the complete documentation in the repository files:
- `START-HERE.md` - Getting started guide
- `RAILWAY-DEPLOY.md` - Railway deployment guide
- `README.md` - Complete documentation
- `ARCHITECTURE.md` - System design

## 🛠️ Local Development

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3000`

## 📱 Integration

Add to your website:

```html
<script src="path/to/web-push-sdk.js"></script>
<script>
  const pushSDK = new WebPushSDK({
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://your-app.railway.app'
  });
  
  pushSDK.init();
  pushSDK.subscribe(); // Subscribe users
</script>
```

## 📄 License

MIT License - Use freely for personal or commercial projects!

## 🆘 Support

Check the documentation files or open an issue on GitHub.
