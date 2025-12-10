import { create } from 'zustand';

const API_URL = 'https://web-production-0538b.up.railway.app';

export const useStore = create((set, get) => ({
  // Auth state
  user: null,
  masterApiKey: localStorage.getItem('masterApiKey') || null,
  isAuthenticated: !!localStorage.getItem('masterApiKey'),

  // Data state
  websites: [],
  campaigns: [],
  segments: [],
  analytics: null,
  loading: false,
  error: null,

  // Auth actions
  login: async (apiKey) => {
    try {
      const response = await fetch(`${API_URL}/api/users/info`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('masterApiKey', apiKey);
        localStorage.setItem('userEmail', data.email);
        set({ 
          user: data, 
          masterApiKey: apiKey, 
          isAuthenticated: true,
          error: null 
        });
        return { success: true };
      } else {
        set({ error: data.error });
        return { success: false, error: data.error };
      }
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  signup: async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (data.success) {
        return { 
          success: true, 
          masterApiKey: data.masterApiKey,
          email: data.email 
        };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  logout: () => {
    localStorage.clear();
    set({ 
      user: null, 
      masterApiKey: null, 
      isAuthenticated: false,
      websites: [],
      campaigns: [],
      segments: [],
      analytics: null
    });
  },

  // Website actions
  fetchWebsites: async () => {
    const { masterApiKey } = get();
    set({ loading: true });

    try {
      const response = await fetch(`${API_URL}/api/websites`, {
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      if (data.success) {
        set({ websites: data.websites, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addWebsite: async (domain) => {
    const { masterApiKey, fetchWebsites } = get();

    try {
      const response = await fetch(`${API_URL}/api/websites/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': masterApiKey
        },
        body: JSON.stringify({ domain })
      });
      const data = await response.json();

      if (data.success) {
        await fetchWebsites();
        return { success: true, website: data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteWebsite: async (websiteId) => {
    const { masterApiKey, fetchWebsites } = get();

    try {
      const response = await fetch(`${API_URL}/api/websites/${websiteId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      if (data.success) {
        await fetchWebsites();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Campaign actions
  fetchCampaigns: async () => {
    const { masterApiKey } = get();
    set({ loading: true });

    try {
      const response = await fetch(`${API_URL}/api/campaigns/all/list`, {
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      if (data.success) {
        set({ campaigns: data.campaigns, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createAndSendCampaign: async (campaignData) => {
    const { masterApiKey, fetchCampaigns } = get();

    try {
      // Create campaign
      const createResponse = await fetch(`${API_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': masterApiKey
        },
        body: JSON.stringify(campaignData)
      });
      const createData = await createResponse.json();

      if (!createData.success) {
        return { success: false, error: createData.error };
      }

      // Send campaign
      const sendResponse = await fetch(`${API_URL}/api/campaigns/${createData.campaign.campaignId}/send`, {
        method: 'POST',
        headers: { 'X-API-Key': masterApiKey }
      });
      const sendData = await sendResponse.json();

      if (sendData.success) {
        await fetchCampaigns();
        return { 
          success: true, 
          sent: sendData.sent,
          campaign: sendData.campaign 
        };
      } else {
        return { success: false, error: sendData.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Segment actions
  fetchSegments: async (websiteId) => {
    const { masterApiKey } = get();

    try {
      const response = await fetch(`${API_URL}/api/segments/${websiteId}`, {
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      if (data.success) {
        set({ segments: data.segments });
        return { success: true, segments: data.segments };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createSegment: async (segmentData) => {
    const { masterApiKey } = get();

    try {
      const response = await fetch(`${API_URL}/api/segments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': masterApiKey
        },
        body: JSON.stringify(segmentData)
      });
      const data = await response.json();

      if (data.success) {
        return { success: true, segment: data.segment };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteSegment: async (segmentId) => {
    const { masterApiKey } = get();

    try {
      const response = await fetch(`${API_URL}/api/segments/${segmentId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      return data.success ? { success: true } : { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Analytics actions
  fetchAnalytics: async () => {
    const { masterApiKey } = get();

    try {
      const response = await fetch(`${API_URL}/api/analytics/overview`, {
        headers: { 'X-API-Key': masterApiKey }
      });
      const data = await response.json();

      if (data.success) {
        set({ analytics: data.analytics });
      }
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Utility
  clearError: () => set({ error: null }),
}));
