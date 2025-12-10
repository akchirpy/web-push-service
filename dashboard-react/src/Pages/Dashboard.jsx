import { useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  LayoutDashboard, 
  Globe, 
  Send, 
  Target, 
  BarChart3, 
  LogOut 
} from 'lucide-react';
import Overview from './Overview';
import Websites from './Websites';
import Campaigns from './Campaigns';
import Segments from './Segments';
import Analytics from './Analytics';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchWebsites } = useStore();

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Websites', path: '/dashboard/websites', icon: Globe },
    { name: 'Campaigns', path: '/dashboard/campaigns', icon: Send },
    { name: 'Segments', path: '/dashboard/segments', icon: Target },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-chirpy-primary to-chirpy-secondary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <img 
                src="https://chirpyweb.com/wp-content/uploads/2022/09/Chirpy-Web-Logo-Full.svg" 
                alt="ChirpyWeb" 
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                {user?.email || localStorage.getItem('userEmail')}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-4 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-chirpy-primary text-chirpy-primary'
                      : 'border-transparent text-gray-600 hover:text-chirpy-primary hover:bg-orange-50'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}
