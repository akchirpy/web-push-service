import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Mail, Key, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signup, login } = useStore();
  
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signup(email);
    
    if (result.success) {
      setNewApiKey(result.masterApiKey);
      setShowApiKey(true);
      setSuccess('Account created successfully!');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(apiKey || newApiKey);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chirpy-primary to-chirpy-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://chirpyweb.com/wp-content/uploads/2022/09/Chirpy-Web-Logo-Full.svg" 
            alt="ChirpyWeb" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to ChirpyWeb</h1>
          <p className="text-white/80">Your Real-Time Audience Engagement Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!showApiKey ? (
            // Signup Form
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get Started</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="loading"></span>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-semibold">
                    Already have an account?
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Master API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Paste your API key"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !apiKey}
                  className="btn-secondary w-full"
                >
                  {loading ? <span className="loading"></span> : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            // Show API Key
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Account Created! 🎉
                </h2>
                <p className="text-gray-600">
                  Save your Master API Key below
                </p>
              </div>

              <div className="bg-gray-900 text-white p-4 rounded-lg mb-4 font-mono text-sm break-all">
                {newApiKey}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
                <strong>⚠️ Important:</strong> Save this key somewhere safe. You'll need it to login.
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="loading"></span>
                ) : (
                  'Continue to Dashboard →'
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/80 text-sm">
          <p>© 2024 ChirpyWeb. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
