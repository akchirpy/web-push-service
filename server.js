const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with database in production)
const users = new Map(); // userId -> { apiKey, subscriptions[] }
const subscriptions = new Map(); // subscriptionId -> subscription data

// Generate VAPID keys (do this once and store in .env)
const vapidKeys = webpush.generateVAPIDKeys();
console.log('VAPID Keys (save these to .env):');
console.log('PUBLIC:', vapidKeys.publicKey);
console.log('PRIVATE:', vapidKeys.privateKey);

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey,
  process.env.VAPID_PRIVATE_KEY || vapidKeys.privateKey
);

// ===== USER/API KEY ROUTES =====

// Create a new user and get API key
app.post('/api/users/register', (req, res) => {
  const userId = uuidv4();
  const apiKey = uuidv4();
  
  users.set(userId, {
    userId,
    apiKey,
    subscriptions: [],
    createdAt: new Date()
  });

  res.json({
    success: true,
    userId,
    apiKey,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey
  });
});

// Get user info by API key
app.get('/api/users/info', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.apiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  res.json({
    success: true,
    userId: user.userId,
    subscriberCount: user.subscriptions.length
  });
});

// ===== SUBSCRIPTION ROUTES =====

// Subscribe a user to push notifications
app.post('/api/subscribe', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const { subscription } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.apiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const subscriptionId = uuidv4();
  const subData = {
    id: subscriptionId,
    userId: user.userId,
    subscription,
    createdAt: new Date()
  };

  subscriptions.set(subscriptionId, subData);
  user.subscriptions.push(subscriptionId);

  res.json({
    success: true,
    subscriptionId
  });
});

// Get all subscriptions for a user
app.get('/api/subscriptions', (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.apiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userSubscriptions = user.subscriptions.map(subId => {
    const sub = subscriptions.get(subId);
    return {
      id: sub.id,
      createdAt: sub.createdAt
    };
  });

  res.json({
    success: true,
    count: userSubscriptions.length,
    subscriptions: userSubscriptions
  });
});

// ===== NOTIFICATION ROUTES =====

// Send push notification to all subscribers
app.post('/api/notifications/send', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const { title, body, icon, url } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.apiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body required' });
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon.png',
    url: url || '/'
  });

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // Send to all subscribers
  for (const subId of user.subscriptions) {
    const subData = subscriptions.get(subId);
    if (subData) {
      try {
        await webpush.sendNotification(subData.subscription, payload);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          subscriptionId: subId,
          error: error.message
        });
        
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          subscriptions.delete(subId);
          user.subscriptions = user.subscriptions.filter(id => id !== subId);
        }
      }
    }
  }

  res.json({
    success: true,
    sent: results.success,
    failed: results.failed,
    errors: results.errors
  });
});

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Web Push Service running on port ${PORT}`);
  console.log(`Save VAPID keys to .env file for production use`);
});
