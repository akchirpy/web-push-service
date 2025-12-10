import { useEffect } from 'react';
import { useStore } from '../store';
import { BarChart3, TrendingUp, Send, MousePointerClick, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const { analytics, campaigns, fetchAnalytics, fetchCampaigns } = useStore();

  useEffect(() => {
    fetchAnalytics();
    fetchCampaigns();
  }, []);

  const stats = [
    {
      name: 'Total Sent',
      value: analytics?.totalSent || 0,
      icon: Send,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      name: 'Delivered',
      value: analytics?.totalDelivered || 0,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      name: 'Total Clicks',
      value: analytics?.totalClicked || 0,
      icon: MousePointerClick,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    {
      name: 'Failed',
      value: analytics?.totalFailed || 0,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    }
  ];

  // Prepare data for charts
  const topCampaigns = campaigns
    .filter(c => c.status === 'sent')
    .sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))
    .slice(0, 5)
    .map(c => ({
      name: c.name.substring(0, 20) + (c.name.length > 20 ? '...' : ''),
      ctr: parseFloat(c.ctr),
      clicks: c.stats.clicked,
      sent: c.stats.sent
    }));

  const deliveryData = [
    { name: 'Delivered', value: analytics?.totalDelivered || 0, color: '#10b981' },
    { name: 'Failed', value: analytics?.totalFailed || 0, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Track your campaign performance and engagement</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Rate */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Delivery Rate</h2>
          <div className="flex items-end gap-2 mb-6">
            <span className="text-4xl font-bold text-chirpy-primary">
              {analytics?.deliveryRate?.toFixed(1) || 0}%
            </span>
            <span className="text-gray-500 mb-2">delivery rate</span>
          </div>
          
          {deliveryData[0].value > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={deliveryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deliveryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          
          <div className="flex justify-center gap-6 mt-4">
            {deliveryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Average CTR */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Average Click-Through Rate</h2>
          <div className="flex items-end gap-2 mb-6">
            <span className="text-4xl font-bold text-chirpy-primary">
              {analytics?.avgCTR?.toFixed(1) || 0}%
            </span>
            <span className="text-gray-500 mb-2">average CTR</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Your CTR</span>
                <span className="font-semibold">{analytics?.avgCTR?.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-chirpy-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((analytics?.avgCTR || 0) * 10, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Industry Average</span>
                <span className="font-semibold">3.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gray-400 h-3 rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {analytics?.avgCTR > 3.2 ? (
                <span className="text-green-600 font-semibold">🎉 Great job! You're above the industry average.</span>
              ) : (
                <span className="text-gray-600">💡 Tip: Try A/B testing different titles and CTAs to improve CTR.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Campaigns by CTR</h2>
        
        {topCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaign data yet</h3>
            <p className="text-gray-500">Send campaigns to see performance analytics</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCampaigns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'CTR %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="ctr" 
                  fill="#FF6B35"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              {topCampaigns.map((campaign, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-chirpy-primary mb-1">
                    {campaign.ctr}%
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{campaign.name}</div>
                  <div className="text-xs text-gray-500">
                    {campaign.clicks} clicks / {campaign.sent} sent
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Campaign Summary Table */}
      {campaigns.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">All Campaigns Summary</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Campaign</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Sent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Delivered</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Clicked</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 10).map((campaign) => (
                  <tr key={campaign.campaignId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-500">{campaign.websiteDomain}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${
                        campaign.status === 'sent' ? 'badge-sent' : 
                        campaign.status === 'scheduled' ? 'badge-scheduled' : 
                        'badge-draft'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{campaign.stats.sent}</td>
                    <td className="py-3 px-4 text-right">{campaign.stats.delivered}</td>
                    <td className="py-3 px-4 text-right">{campaign.stats.clicked}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-chirpy-primary">{campaign.ctr}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
