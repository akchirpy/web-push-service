import { useEffect } from 'react';
import { useStore } from '../store';
import { Globe, Users, Send, TrendingUp, ArrowUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Overview() {
  const { user, websites, campaigns, fetchWebsites, fetchCampaigns, fetchAnalytics, analytics } = useStore();

  useEffect(() => {
    fetchWebsites();
    fetchCampaigns();
    fetchAnalytics();
  }, []);

  const totalSubscribers = websites.reduce((sum, site) => sum + site.subscriberCount, 0);
  const totalCampaigns = campaigns.filter(c => c.status === 'sent').length;
  const clickRate = user?.clickRate || analytics?.avgCTR || 0;

  const stats = [
    {
      name: 'Total Websites',
      value: websites.length,
      icon: Globe,
      color: 'blue',
      change: '+0',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      name: 'Total Subscribers',
      value: totalSubscribers.toLocaleString(),
      icon: Users,
      color: 'green',
      change: '+12%',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      name: 'Campaigns Sent',
      value: totalCampaigns,
      icon: Send,
      color: 'orange',
      change: '+8',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    {
      name: 'Click Rate',
      value: `${clickRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'purple',
      change: '+2.3%',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    }
  ];

  // Mock data for chart
  const chartData = [
    { name: 'Mon', subscribers: 40 },
    { name: 'Tue', subscribers: 55 },
    { name: 'Wed', subscribers: 48 },
    { name: 'Thu', subscribers: 72 },
    { name: 'Fri', subscribers: 85 },
    { name: 'Sat', subscribers: 95 },
    { name: 'Sun', subscribers: totalSubscribers }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-semibold">{stat.change}</span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subscriber Growth Chart */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Subscriber Growth</h2>
          <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="subscribers" 
              stroke="#FF6B35" 
              strokeWidth={3}
              dot={{ fill: '#FF6B35', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Campaigns</h2>
        
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns yet</p>
            <p className="text-sm text-gray-400 mt-2">Create your first campaign to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.slice(0, 5).map((campaign) => (
              <div 
                key={campaign.campaignId} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {campaign.websiteDomain} • {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{campaign.stats.sent}</p>
                    <p className="text-gray-500">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{campaign.stats.clicked}</p>
                    <p className="text-gray-500">Clicked</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-chirpy-primary">{campaign.ctr}%</p>
                    <p className="text-gray-500">CTR</p>
                  </div>
                </div>
                <span className={`badge ${campaign.status === 'sent' ? 'badge-sent' : 'badge-draft'} ml-4`}>
                  {campaign.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
