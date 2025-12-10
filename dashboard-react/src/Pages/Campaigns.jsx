import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Plus, X, TrendingUp } from 'lucide-react';

export default function Campaigns() {
  const { websites, campaigns, fetchWebsites, fetchCampaigns, createAndSendCampaign } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    websiteId: '',
    name: '',
    title: '',
    body: '',
    icon: '',
    url: '',
    segmentId: null
  });

  useEffect(() => {
    fetchWebsites();
    fetchCampaigns();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await createAndSendCampaign(formData);
    
    if (result.success) {
      setSuccess(`Campaign sent to ${result.sent} subscribers!`);
      setFormData({
        websiteId: '',
        name: '',
        title: '',
        body: '',
        icon: '',
        url: '',
        segmentId: null
      });
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Create and manage your notification campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="h-5 w-5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              New Campaign
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {success}
        </div>
      )}

      {/* Campaign Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Campaign</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Summer Sale 2024"
                  required
                />
              </div>

              {/* Website Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website *
                </label>
                <select
                  name="websiteId"
                  value={formData.websiteId}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select website...</option>
                  {websites.map((website) => (
                    <option key={website.websiteId} value={website.websiteId}>
                      {website.domain} ({website.subscriberCount} subscribers)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notification Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 🎉 50% Off Everything!"
                required
                maxLength={65}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/65 characters
              </p>
            </div>

            {/* Notification Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                name="body"
                value={formData.body}
                onChange={handleChange}
                className="input-field"
                rows="3"
                placeholder="e.g., Limited time offer! Shop now and save big..."
                required
                maxLength={240}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.body.length}/240 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Icon URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Icon URL (Optional)
                </label>
                <input
                  type="url"
                  name="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/icon.png"
                />
              </div>

              {/* Click URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Click URL (Optional)
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/sale"
                />
              </div>
            </div>

            {/* Preview */}
            {formData.title && formData.body && (
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <p className="text-sm font-semibold text-gray-600 mb-3">Preview:</p>
                <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
                  <div className="flex gap-3">
                    {formData.icon && (
                      <img src={formData.icon} alt="" className="w-12 h-12 rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-1">{formData.title}</p>
                      <p className="text-sm text-gray-600">{formData.body}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !formData.websiteId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="loading"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send Campaign Now
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign History */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Campaign History</h2>
        
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500">Create your first campaign to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.campaignId}
                className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                      <span className={`badge ${
                        campaign.status === 'sent' ? 'badge-sent' : 
                        campaign.status === 'scheduled' ? 'badge-scheduled' : 
                        'badge-draft'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {campaign.websiteDomain} • {new Date(campaign.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-gray-200">
                    <TrendingUp className="h-4 w-4 text-chirpy-primary" />
                    <span className="font-bold text-chirpy-primary">{campaign.ctr}% CTR</span>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-1">{campaign.title}</p>
                  <p className="text-sm text-gray-600">{campaign.body}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{campaign.stats.sent}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{campaign.stats.delivered}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Delivered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{campaign.stats.clicked}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{campaign.stats.failed}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Failed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
