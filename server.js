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
const users = new Map(); // userId -> { email, masterApiKey, websites: [], createdAt }
const websites = new Map(); // websiteId -> { userId, domain, apiKey, subscriptions: [], createdAt }
const subscriptions = new Map(); // subscriptionId -> { websiteId, subscription, metadata: {}, createdAt }
const campaigns = new Map(); // campaignId -> { websiteId, name, title, body, icon, url, segmentId, status, stats, createdAt, sentAt }
const segments = new Map(); // segmentId -> { websiteId, name, rules: [], createdAt }
const clicks = new Map(); // clickId -> { campaignId, subscriptionId, clickedAt }
const deliveries = new Map(); // deliveryId -> { campaignId, subscriptionId, deliveredAt }

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();
console.log('VAPID Keys (save these to .env):');
console.log('PUBLIC:', vapidKeys.publicKey);
console.log('PRIVATE:', vapidKeys.privateKey);

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@chirpyweb.com',
  process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey,
  process.env.VAPID_PRIVATE_KEY || vapidKeys.privateKey
);

// ===== USER MANAGEMENT =====

app.post('/api/users/register', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const userId = uuidv4();
  const masterApiKey = uuidv4();
  
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
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey
  });
});

app.get('/api/users/info', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

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
  
  // Get campaign stats
  const userCampaigns = Array.from(campaigns.values()).filter(c => {
    const website = websites.get(c.websiteId);
    return website && website.userId === user.userId;
  });
  
  const totalCampaigns = userCampaigns.filter(c => c.status === 'sent').length;
  const totalClicks = Array.from(clicks.values()).filter(click => {
    const campaign = campaigns.get(click.campaignId);
    return campaign && userCampaigns.includes(campaign);
  }).length;
  
  const totalDeliveries = Array.from(deliveries.values()).filter(delivery => {
    const campaign = campaigns.get(delivery.campaignId);
    return campaign && userCampaigns.includes(campaign);
  }).length;
  
  const clickRate = totalDeliveries > 0 ? ((totalClicks / totalDeliveries) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    userId: user.userId,
    email: user.email,
    websiteCount: user.websites.length,
    totalSubscribers,
    totalCampaigns,
    clickRate: parseFloat(clickRate),
    websites: userWebsites
  });
});

// ===== WEBSITE MANAGEMENT =====

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

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const existingWebsite = Array.from(websites.values()).find(
    w => w.userId === user.userId && w.domain === cleanDomain
  );

  if (existingWebsite) {
    return res.status(400).json({ error: 'Website already added' });
  }

  const websiteId = uuidv4();
  const websiteApiKey = uuidv4();
  
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
    apiKey: websiteApiKey
  });
});

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

  // Remove subscriptions
  website.subscriptions.forEach(subId => {
    subscriptions.delete(subId);
  });

  // Remove campaigns
  Array.from(campaigns.keys()).forEach(campaignId => {
    const campaign = campaigns.get(campaignId);
    if (campaign.websiteId === websiteId) {
      campaigns.delete(campaignId);
    }
  });

  // Remove segments
  Array.from(segments.keys()).forEach(segmentId => {
    const segment = segments.get(segmentId);
    if (segment.websiteId === websiteId) {
      segments.delete(segmentId);
    }
  });

  websites.delete(websiteId);
  user.websites = user.websites.filter(id => id !== websiteId);

  res.json({
    success: true,
    message: 'Website deleted successfully'
  });
});

// ===== SUBSCRIPTION MANAGEMENT =====

app.post('/api/subscribe', (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];
  const { subscription, metadata = {} } = req.body;

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
    metadata: {
      userAgent: metadata.userAgent || '',
      platform: metadata.platform || 'unknown',
      browser: metadata.browser || 'unknown',
      country: metadata.country || 'unknown',
      city: metadata.city || 'unknown',
      subscribedAt: new Date()
    },
    createdAt: new Date()
  };

  subscriptions.set(subscriptionId, subData);
  website.subscriptions.push(subscriptionId);

  res.json({
    success: true,
    subscriptionId
  });
});

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
      platform: sub.metadata.platform,
      browser: sub.metadata.browser,
      country: sub.metadata.country,
      subscribedAt: sub.metadata.subscribedAt,
      createdAt: sub.createdAt
    };
  });

  res.json({
    success: true,
    count: subs.length,
    subscriptions: subs
  });
});

// ===== SEGMENT MANAGEMENT =====

app.post('/api/segments/create', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { websiteId, name, rules } = req.body;

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

  const segmentId = uuidv4();
  const segment = {
    segmentId,
    websiteId,
    name,
    rules: rules || [],
    createdAt: new Date()
  };

  segments.set(segmentId, segment);

  res.json({
    success: true,
    segment
  });
});

app.get('/api/segments/:websiteId', (req, res) => {
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

  const websiteSegments = Array.from(segments.values())
    .filter(s => s.websiteId === websiteId);

  res.json({
    success: true,
    segments: websiteSegments
  });
});

app.delete('/api/segments/:segmentId', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { segmentId } = req.params;

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const segment = segments.get(segmentId);
  if (!segment) {
    return res.status(404).json({ error: 'Segment not found' });
  }

  const website = websites.get(segment.websiteId);
  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  
  if (!website || website.userId !== user.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  segments.delete(segmentId);

  res.json({
    success: true
  });
});

// Filter subscribers by segment rules
function filterSubscribersBySegment(subscribers, rules) {
  if (!rules || rules.length === 0) {
    return subscribers;
  }

  return subscribers.filter(subId => {
    const sub = subscriptions.get(subId);
    if (!sub) return false;

    return rules.every(rule => {
      const { field, operator, value } = rule;
      const fieldValue = sub.metadata[field];

      switch (operator) {
        case 'is':
          return fieldValue === value;
        case 'is_not':
          return fieldValue !== value;
        case 'contains':
          return fieldValue && fieldValue.toLowerCase().includes(value.toLowerCase());
        case 'not_contains':
          return !fieldValue || !fieldValue.toLowerCase().includes(value.toLowerCase());
        default:
          return true;
      }
    });
  });
}

// ===== CAMPAIGN MANAGEMENT =====

app.post('/api/campaigns/create', async (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { websiteId, name, title, body, icon, url, segmentId, schedule } = req.body;

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

  const campaignId = uuidv4();
  const campaign = {
    campaignId,
    websiteId,
    name,
    title,
    body,
    icon: icon || '',
    url: url || '/',
    segmentId: segmentId || null,
    schedule: schedule || null,
    status: schedule ? 'scheduled' : 'draft',
    stats: {
      sent: 0,
      delivered: 0,
      clicked: 0,
      failed: 0
    },
    createdAt: new Date(),
    sentAt: null
  };

  campaigns.set(campaignId, campaign);

  res.json({
    success: true,
    campaign
  });
});

app.post('/api/campaigns/:campaignId/send', async (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  const { campaignId } = req.params;

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const campaign = campaigns.get(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const website = websites.get(campaign.websiteId);
  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  
  if (!website || website.userId !== user.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Get target subscribers
  let targetSubscribers = website.subscriptions;
  
  if (campaign.segmentId) {
    const segment = segments.get(campaign.segmentId);
    if (segment) {
      targetSubscribers = filterSubscribersBySegment(targetSubscribers, segment.rules);
    }
  }

  const payload = JSON.stringify({
    title: campaign.title,
    body: campaign.body,
    icon: campaign.icon,
    url: campaign.url,
    campaignId: campaign.campaignId
  });

  const results = {
    sent: 0,
    delivered: 0,
    failed: 0
  };

  // Send notifications
  for (const subId of targetSubscribers) {
    const subData = subscriptions.get(subId);
    if (subData) {
      try {
        await webpush.sendNotification(subData.subscription, payload);
        results.sent++;
        results.delivered++;
        
        // Track delivery
        const deliveryId = uuidv4();
        deliveries.set(deliveryId, {
          deliveryId,
          campaignId,
          subscriptionId: subId,
          deliveredAt: new Date()
        });
        
      } catch (error) {
        results.failed++;
        
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          subscriptions.delete(subId);
          website.subscriptions = website.subscriptions.filter(id => id !== subId);
        }
      }
    }
  }

  // Update campaign stats
  campaign.stats.sent = results.sent;
  campaign.stats.delivered = results.delivered;
  campaign.stats.failed = results.failed;
  campaign.status = 'sent';
  campaign.sentAt = new Date();

  res.json({
    success: true,
    sent: results.sent,
    delivered: results.delivered,
    failed: results.failed,
    campaign
  });
});

app.get('/api/campaigns/:websiteId', (req, res) => {
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

  const websiteCampaigns = Array.from(campaigns.values())
    .filter(c => c.websiteId === websiteId)
    .map(c => ({
      ...c,
      ctr: c.stats.delivered > 0 ? ((c.stats.clicked / c.stats.delivered) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    campaigns: websiteCampaigns
  });
});

app.get('/api/campaigns/all/list', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userCampaigns = Array.from(campaigns.values())
    .filter(c => {
      const website = websites.get(c.websiteId);
      return website && website.userId === user.userId;
    })
    .map(c => {
      const website = websites.get(c.websiteId);
      return {
        ...c,
        websiteDomain: website.domain,
        ctr: c.stats.delivered > 0 ? ((c.stats.clicked / c.stats.delivered) * 100).toFixed(1) : 0
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    campaigns: userCampaigns
  });
});

// ===== CLICK TRACKING =====

app.post('/api/track/click', (req, res) => {
  const { campaignId, subscriptionId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  const campaign = campaigns.get(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Track click
  const clickId = uuidv4();
  clicks.set(clickId, {
    clickId,
    campaignId,
    subscriptionId: subscriptionId || 'unknown',
    clickedAt: new Date()
  });

  // Update campaign stats
  campaign.stats.clicked++;

  res.json({
    success: true,
    clickId
  });
});

// ===== ANALYTICS =====

app.get('/api/analytics/overview', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];

  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Get user's campaigns
  const userCampaigns = Array.from(campaigns.values()).filter(c => {
    const website = websites.get(c.websiteId);
    return website && website.userId === user.userId;
  });

  const totalSent = userCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalDelivered = userCampaigns.reduce((sum, c) => sum + c.stats.delivered, 0);
  const totalClicked = userCampaigns.reduce((sum, c) => sum + c.stats.clicked, 0);
  const totalFailed = userCampaigns.reduce((sum, c) => sum + c.stats.failed, 0);

  const avgCTR = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : 0;
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 100;

  res.json({
    success: true,
    analytics: {
      totalSent,
      totalDelivered,
      totalClicked,
      totalFailed,
      avgCTR: parseFloat(avgCTR),
      deliveryRate: parseFloat(deliveryRate)
    }
  });
});

// ===== LEGACY ENDPOINT (for backward compatibility) =====

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

  // Create a quick campaign
  const campaignId = uuidv4();
  const campaign = {
    campaignId,
    websiteId: website.websiteId,
    name: 'Quick Send',
    title,
    body,
    icon: icon || '',
    url: url || '/',
    segmentId: null,
    schedule: null,
    status: 'sent',
    stats: { sent: 0, delivered: 0, clicked: 0, failed: 0 },
    createdAt: new Date(),
    sentAt: new Date()
  };

  campaigns.set(campaignId, campaign);

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon.png',
    url: url || '/',
    campaignId
  });

  const results = { success: 0, failed: 0 };

  for (const subId of website.subscriptions) {
    const subData = subscriptions.get(subId);
    if (subData) {
      try {
        await webpush.sendNotification(subData.subscription, payload);
        results.success++;
        campaign.stats.sent++;
        campaign.stats.delivered++;
        
        const deliveryId = uuidv4();
        deliveries.set(deliveryId, {
          deliveryId,
          campaignId,
          subscriptionId: subId,
          deliveredAt: new Date()
        });
      } catch (error) {
        results.failed++;
        campaign.stats.failed++;
        
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
    failed: results.failed
  });
});

// ===== UTILITY ENDPOINTS =====

app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    users: users.size,
    websites: websites.size,
    subscriptions: subscriptions.size,
    campaigns: campaigns.size,
    segments: segments.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ChirpyWeb Backend running on port ${PORT}`);
  console.log(`📊 Stats: ${users.size} users, ${websites.size} websites, ${subscriptions.size} subscribers`);
  console.log(`📤 Campaigns: ${campaigns.size}, Segments: ${segments.size}`);
});

