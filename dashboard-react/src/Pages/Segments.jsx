import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Target, Plus, X, Trash2 } from 'lucide-react';

export default function Segments() {
  const { websites, segments, fetchWebsites, fetchSegments, createSegment, deleteSegment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    rules: [{ field: 'platform', operator: 'is', value: '' }]
  });

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    if (selectedWebsite) {
      fetchSegments(selectedWebsite);
    }
  }, [selectedWebsite]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWebsite) {
      setError('Please select a website');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createSegment({
      websiteId: selectedWebsite,
      ...formData
    });
    
    if (result.success) {
      setSuccess('Segment created successfully!');
      setFormData({
        name: '',
        rules: [{ field: 'platform', operator: 'is', value: '' }]
      });
      setShowForm(false);
      fetchSegments(selectedWebsite);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { field: 'platform', operator: 'is', value: '' }]
    });
  };

  const removeRule = (index) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    });
  };

  const updateRule = (index, key, value) => {
    const newRules = [...formData.rules];
    newRules[index][key] = value;
    setFormData({ ...formData, rules: newRules });
  };

  const handleDeleteSegment = async (segmentId) => {
    if (!confirm('Delete this segment?')) return;
    
    const result = await deleteSegment(segmentId);
    
    if (result.success) {
      setSuccess('Segment deleted');
      fetchSegments(selectedWebsite);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audience Segments</h1>
          <p className="text-gray-600 mt-1">Target specific groups with personalized campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
          disabled={!selectedWebsite}
        >
          {showForm ? (
            <>
              <X className="h-5 w-5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Create Segment
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
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Website Selector */}
      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Website
        </label>
        <select
          value={selectedWebsite}
          onChange={(e) => setSelectedWebsite(e.target.value)}
          className="input-field max-w-md"
        >
          <option value="">Choose a website...</option>
          {websites.map((website) => (
            <option key={website.websiteId} value={website.websiteId}>
              {website.domain}
            </option>
          ))}
        </select>
      </div>

      {/* Segment Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Segment</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Segment Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Segment Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., iOS Users in USA"
                required
              />
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Segment Rules
              </label>
              <div className="space-y-3">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex gap-3 items-center bg-gray-50 p-4 rounded-lg">
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(index, 'field', e.target.value)}
                      className="input-field"
                    >
                      <option value="platform">Platform</option>
                      <option value="browser">Browser</option>
                      <option value="country">Country</option>
                      <option value="city">City</option>
                    </select>
                    
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(index, 'operator', e.target.value)}
                      className="input-field"
                    >
                      <option value="is">is</option>
                      <option value="is_not">is not</option>
                      <option value="contains">contains</option>
                      <option value="not_contains">not contains</option>
                    </select>
                    
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      className="input-field"
                      placeholder="Value"
                      required
                    />
                    
                    {formData.rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addRule}
                className="mt-3 text-chirpy-primary hover:text-chirpy-secondary font-semibold text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Rule (AND)
              </button>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading"></span>
                ) : (
                  <>
                    <Target className="h-5 w-5" />
                    Create Segment
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

      {/* Segments List */}
      {selectedWebsite && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Segments</h2>
          
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No segments yet</h3>
              <p className="text-gray-500">Create your first segment to target specific audiences</p>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div
                  key={segment.segmentId}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{segment.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(segment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSegment(segment.segmentId)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Rules:</p>
                    {segment.rules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="bg-white px-3 py-1 rounded border border-gray-300 font-semibold">
                          {rule.field}
                        </span>
                        <span className="text-gray-500">{rule.operator}</span>
                        <span className="bg-chirpy-primary/10 text-chirpy-primary px-3 py-1 rounded font-semibold">
                          {rule.value}
                        </span>
                        {index < segment.rules.length - 1 && (
                          <span className="text-gray-400 font-semibold">AND</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
