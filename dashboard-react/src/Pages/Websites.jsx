import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Globe, Plus, Trash2, Copy, Check, Code } from 'lucide-react';

export default function Websites() {
  const { websites, fetchWebsites, addWebsite, deleteWebsite } = useStore();
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await addWebsite(domain);
    
    if (result.success) {
      setSuccess('Website added successfully!');
      setDomain('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleDelete = async (websiteId) => {
    if (!confirm('Delete this website and all subscribers?')) return;
    
    const result = await deleteWebsite(websiteId);
    
    if (result.success) {
      setSuccess('Website deleted');
      setTimeout(() => setSuccess(''), 3000);
      if (selectedWebsite?.websiteId === websiteId) {
        setSelectedWebsite(null);
      }
    } else {
      setError(result.error);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const getIntegrationCode = (website) => {
    return `<!-- Add to your website's <head> -->
<script src="https://akchirpy.github.io/web-push-service/web-push-sdk.js"></script>
<script>
  const pushSDK = new WebPushSDK({
    apiKey: '${website.apiKey}',
    serverUrl: 'https://web-production-0538b.up.railway.app'
  });
  
  pushSDK.init().then(() => {
    console.log('Push notifications ready!');
  });
  
  // Subscribe user
  function subscribeUser() {
    pushSDK.subscribe()
      .then(() => alert('Subscribed!'))
      .catch(console.error);
  }
</script>

<!-- Add subscribe button anywhere -->
<button onclick="subscribeUser()">
  🔔 Get Notifications
</button>`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Websites</h1>
          <p className="text-gray-600 mt-1">Manage your websites and integration</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Add Website Form */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Website</h2>
        
        <form onSubmit={handleAddWebsite} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com or https://example.com"
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <span className="loading"></span>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add Website
              </>
            )}
          </button>
        </form>
      </div>

      {/* Websites List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {websites.length === 0 ? (
          <div className="col-span-2 card text-center py-12">
            <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites yet</h3>
            <p className="text-gray-500">Add your first website above to get started</p>
          </div>
        ) : (
          websites.map((website) => (
            <div key={website.websiteId} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-chirpy-primary" />
                    <h3 className="text-lg font-bold text-gray-900">{website.domain}</h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    {website.subscriberCount} subscribers
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(website.websiteId)}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* API Key */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
                    Website API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={website.apiKey}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(website.apiKey, website.apiKey)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copiedKey === website.apiKey ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Integration Button */}
                <button
                  onClick={() => setSelectedWebsite(
                    selectedWebsite?.websiteId === website.websiteId ? null : website
                  )}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-chirpy-primary/10 text-chirpy-primary hover:bg-chirpy-primary/20 rounded-lg font-semibold transition-colors"
                >
                  <Code className="h-4 w-4" />
                  {selectedWebsite?.websiteId === website.websiteId ? 'Hide' : 'Show'} Integration Code
                </button>

                {/* Integration Code */}
                {selectedWebsite?.websiteId === website.websiteId && (
                  <div className="mt-4">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                        {getIntegrationCode(website)}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(getIntegrationCode(website), 'code-' + website.websiteId)}
                        className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-semibold transition-colors"
                      >
                        {copiedKey === 'code-' + website.websiteId ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>💡 <strong>WordPress users:</strong> Use our <a href="#" className="text-chirpy-primary hover:underline">WordPress plugin</a> for easier integration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
