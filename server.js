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
const users = new Map(); // userId -> { email, apiKey, websites: [], createdAt }
const websites = new Map(); // websiteId -> { userId, domain, apiKey, subscriptions: [], createdAt }
const subscriptions = new Map(); // subscriptionId -> { websiteId, subscription, createdAt }

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

// ===== USER MANAGEMENT ROUTES =====

// Create new user account
app.post('/api/users/register', (req, res) => {
  const { email } = req.body;

  // Simple email validation
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Check if email already exists
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const userId = uuidv4();
  const masterApiKey = uuidv4(); // Master API key for the user
  
  users.set(userId, {
    userId,
    email,
    masterApiKey,
    websites: [],
    createdAt: new Date()
  });

  res.json({
    success: true,
    userId,
    email,
    masterApiKey,
    message: 'Account created successfully',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey
  });
});

// Get user info by master API key
app.get('/api/users/info', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Get website count and total subscribers
  const userWebsites = user.websites.map(websiteId => {
    const site = websites.get(websiteId);
    return {
      websiteId: site.websiteId,
      domain: site.domain,
      subscriberCount: site.subscriptions.length,
      createdAt: site.createdAt
    };
  });

  const totalSubscribers = userWebsites.reduce((sum, site) => sum + site.subscriberCount, 0);

  res.json({
    success: true,
    userId: user.userId,
    email: user.email,
    websiteCount: user.websites.length,
    totalSubscribers,
    websites: userWebsites
  });
});

// ===== WEBSITE MANAGEMENT ROUTES =====

// Add a new website
app.post('/api/websites/add', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { domain } = req.body;

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  if (!domain) {
    return res.status(400).json({ error: 'Domain required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Clean up domain (remove protocol, trailing slash)
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Check if domain already exists for this user
  const existingWebsite = Array.from(websites.values()).find(
    w => w.userId === user.userId && w.domain === cleanDomain
  );

  if (existingWebsite) {
    return res.status(400).json({ error: 'Website already added' });
  }

  const websiteId = uuidv4();
  const websiteApiKey = uuidv4(); // Unique API key for this website
  
  const website = {
    websiteId,
    userId: user.userId,
    domain: cleanDomain,
    apiKey: websiteApiKey,
    subscriptions: [],
    createdAt: new Date()
  };

  websites.set(websiteId, website);
  user.websites.push(websiteId);

  res.json({
    success: true,
    websiteId,
    domain: cleanDomain,
    apiKey: websiteApiKey,
    message: 'Website added successfully. Use this API key in your SDK.'
  });
});

// Get all websites for a user
app.get('/api/websites', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userWebsites = user.websites.map(websiteId => {
    const site = websites.get(websiteId);
    return {
      websiteId: site.websiteId,
      domain: site.domain,
      apiKey: site.apiKey,
      subscriberCount: site.subscriptions.length,
      createdAt: site.createdAt
    };
  });

  res.json({
    success: true,
    websites: userWebsites
  });
});

// Delete a website
app.delete('/api/websites/:websiteId', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { websiteId } = req.params;

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const website = websites.get(websiteId);
  
  if (!website || website.userId !== user.userId) {
    return res.status(404).json({ error: 'Website not found' });
  }

  // Remove all subscriptions for this website
  website.subscriptions.forEach(subId => {
    subscriptions.delete(subId);
  });

  // Remove website
  websites.delete(websiteId);
  user.websites = user.websites.filter(id => id !== websiteId);

  res.json({
    success: true,
    message: 'Website deleted successfully'
  });
});

// ===== SUBSCRIPTION ROUTES =====

// Subscribe a user to push notifications (uses website API key)
app.post('/api/subscribe', (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];
  const { subscription } = req.body;

  if (!websiteApiKey) {
    return res.status(401).json({ error: 'Website API key required' });
  }

  const website = Array.from(websites.values()).find(w => w.apiKey === websiteApiKey);
  
  if (!website) {
    return res.status(401).json({ error: 'Invalid website API key' });
  }

  const subscriptionId = uuidv4();
  const subData = {
    id: subscriptionId,
    websiteId: website.websiteId,
    subscription,
    createdAt: new Date()
  };

  subscriptions.set(subscriptionId, subData);
  website.subscriptions.push(subscriptionId);

  res.json({
    success: true,
    subscriptionId,
    message: 'Subscribed successfully'
  });
});

// Get all subscriptions for a website
app.get('/api/subscriptions', (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];

  if (!websiteApiKey) {
    return res.status(401).json({ error: 'Website API key required' });
  }

  const website = Array.from(websites.values()).find(w => w.apiKey === websiteApiKey);
  
  if (!website) {
    return res.status(401).json({ error: 'Invalid website API key' });
  }

  const subs = website.subscriptions.map(subId => {
    const sub = subscriptions.get(subId);
    return {
      id: sub.id,
      createdAt: sub.createdAt
    };
  });

  res.json({
    success: true,
    count: subs.length,
    subscriptions: subs
  });
});

// ===== NOTIFICATION ROUTES =====

// Send push notification to all subscribers of a website
app.post('/api/notifications/send', async (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];
  const { title, body, icon, url } = req.body;

  if (!websiteApiKey) {
    return res.status(401).json({ error: 'Website API key required' });
  }

  const website = Array.from(websites.values()).find(w => w.apiKey === websiteApiKey);
  
  if (!website) {
    return res.status(401).json({ error: 'Invalid website API key' });
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

  // Send to all subscribers of this website
  for (const subId of website.subscriptions) {
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
          website.subscriptions = website.subscriptions.filter(id => id !== subId);
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
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    users: users.size,
    websites: websites.size,
    subscriptions: subscriptions.size
  });
});

app.listen(PORT, () => {
  console.log(`Web Push Service running on port ${PORT}`);
  console.log(`Save VAPID keys to .env file for production use`);
  console.log(`Users: ${users.size}, Websites: ${websites.size}, Subscriptions: ${subscriptions.size}`);
});
