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

// Retrieve Master API Key by email
app.post('/api/users/retrieve-key', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid email required' 
    });
  }

  const user = Array.from(users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      error: 'No account found with this email address' 
    });
  }

  // In production, you would:
  // 1. Generate a temporary reset token
  // 2. Send it via email
  // 3. User clicks link to view their key
  // For now, we'll return it directly (NOT RECOMMENDED FOR PRODUCTION)
  
  res.json({
    success: true,
    email: user.email,
    masterApiKey: user.masterApiKey,
    message: 'Master API Key retrieved successfully',
    warning: 'In production, this would be sent to your email address'
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

app.post('/api/subscribe', async (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];
  const { subscription, metadata = {} } = req.body;

  if (!websiteApiKey) {
    return res.status(401).json({ error: 'Website API key required' });
  }

  const website = Array.from(websites.values()).find(w => w.apiKey === websiteApiKey);
  
  if (!website) {
    return res.status(401).json({ error: 'Invalid website API key' });
  }

  // Get IP address for geolocation
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             'unknown';
  
  // Try to get location from IP
  let country = metadata.country || 'Unknown';
  let city = metadata.city || 'Unknown';
  
  // Skip geolocation for localhost/private IPs
  const isLocalhost = ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.');
  
  if (!isLocalhost && ip !== 'unknown') {
    try {
      // Using ipapi.co free tier (1000 requests/day)
      const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
        timeout: 2000 // 2 second timeout
      });
      
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        country = geoData.country_name || country;
        city = geoData.city || city;
      }
    } catch (error) {
      console.log('Geolocation lookup failed, using defaults:', error.message);
      // Continue with Unknown values
    }
  }

  const subscriptionId = uuidv4();
  const subData = {
    id: subscriptionId,
    websiteId: website.websiteId,
    subscription,
    metadata: {
      userAgent: metadata.userAgent || '',
      platform: metadata.platform || 'Unknown',
      browser: metadata.browser || 'Unknown',
      country: country,
      city: city,
      timezone: metadata.timezone || '',
      language: metadata.language || '',
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
  const { websiteId, name, title, body, icon, image, url, actions, segmentId, schedule } = req.body;

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
    image: image || '',
    url: url || '/',
    actions: actions || [],
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
    image: campaign.image || undefined,
    url: campaign.url,
    actions: campaign.actions || undefined,
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

// Get subscriber growth analytics
app.get('/api/analytics/subscriber-growth', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  
  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const { startDate, endDate } = req.query;
  
  // Get all user's websites
  const userWebsites = Array.from(websites.values())
    .filter(w => w.userId === user.userId);
  
  const websiteIds = userWebsites.map(w => w.websiteId);
  
  // Get all subscriptions for user's websites
  const userSubscriptions = Array.from(subscriptions.values())
    .filter(sub => websiteIds.includes(sub.websiteId));
  
  // Parse date range
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999); // Include full end date
  
  // Group subscriptions by date
  const dailyGrowth = {};
  const currentDate = new Date(start);
  
  // Initialize all dates in range with 0
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyGrowth[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Count subscriptions by date
  userSubscriptions.forEach(sub => {
    const subDate = new Date(sub.createdAt);
    if (subDate >= start && subDate <= end) {
      const dateKey = subDate.toISOString().split('T')[0];
      if (dailyGrowth[dateKey] !== undefined) {
        dailyGrowth[dateKey]++;
      }
    }
  });
  
  // Convert to array format with day names
  const growthData = Object.entries(dailyGrowth)
    .map(([date, count]) => {
      const d = new Date(date);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        date,
        day: dayNames[d.getDay()],
        subscribers: count,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  res.json({
    success: true,
    growth: growthData,
    totalInRange: Object.values(dailyGrowth).reduce((sum, count) => sum + count, 0),
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  });
});

// Get detailed subscriber information
app.get('/api/analytics/subscribers', (req, res) => {
  const masterApiKey = req.headers['x-api-key'];
  
  if (!masterApiKey) {
    return res.status(401).json({ error: 'Master API key required' });
  }

  const user = Array.from(users.values()).find(u => u.masterApiKey === masterApiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Get all user's websites
  const userWebsites = Array.from(websites.values())
    .filter(w => w.userId === user.userId);
  
  const websiteIds = userWebsites.map(w => w.websiteId);
  
  // Get all subscriptions for user's websites
  const userSubscriptions = Array.from(subscriptions.values())
    .filter(sub => websiteIds.includes(sub.websiteId));
  
  // Analyze subscriber data
  const platformBreakdown = {};
  const browserBreakdown = {};
  const countryBreakdown = {};
  const cityBreakdown = {};
  
  userSubscriptions.forEach(sub => {
    const metadata = sub.metadata || {};
    
    // Platform
    const platform = metadata.platform || 'Unknown';
    platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    
    // Browser
    const browser = metadata.browser || 'Unknown';
    browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;
    
    // Country
    const country = metadata.country || 'Unknown';
    countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
    
    // City
    const city = metadata.city || 'Unknown';
    cityBreakdown[city] = (cityBreakdown[city] || 0) + 1;
  });
  
  // Get per-website stats
  const websiteStats = userWebsites.map(website => {
    const websiteSubscriptions = userSubscriptions.filter(sub => sub.websiteId === website.websiteId);
    
    // Get recent growth (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubs = websiteSubscriptions.filter(sub => new Date(sub.createdAt) >= sevenDaysAgo);
    
    return {
      websiteId: website.websiteId,
      domain: website.domain,
      totalSubscribers: websiteSubscriptions.length,
      recentGrowth: recentSubs.length,
      createdAt: website.createdAt
    };
  });
  
  // Sort breakdowns by count
  const sortBreakdown = (breakdown) => {
    return Object.entries(breakdown)
      .map(([key, value]) => ({ name: key, count: value, percentage: ((value / userSubscriptions.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  };
  
  res.json({
    success: true,
    subscribers: {
      total: userSubscriptions.length,
      platformBreakdown: sortBreakdown(platformBreakdown),
      browserBreakdown: sortBreakdown(browserBreakdown),
      countryBreakdown: sortBreakdown(countryBreakdown).slice(0, 10), // Top 10 countries
      cityBreakdown: sortBreakdown(cityBreakdown).slice(0, 10), // Top 10 cities
      websiteStats: websiteStats.sort((a, b) => b.totalSubscribers - a.totalSubscribers)
    }
  });
});

// ===== LEGACY ENDPOINT (for backward compatibility) =====

app.post('/api/notifications/send', async (req, res) => {
  const websiteApiKey = req.headers['x-api-key'];
  const { title, body, icon, image, url, actions, subscriptionIds } = req.body;

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
    name: subscriptionIds ? 'Test Send' : 'Quick Send',
    title,
    body,
    icon: icon || '',
    image: image || '',
    url: url || '/',
    actions: actions || [],
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
    image: image || undefined,
    url: url || '/',
    actions: actions || undefined,
    campaignId
  });

  const results = { success: 0, failed: 0 };

  // If specific subscriptionIds provided, send only to those
  const targetSubscriptions = subscriptionIds && subscriptionIds.length > 0 
    ? subscriptionIds 
    : website.subscriptions;

  for (const subId of targetSubscriptions) {
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
