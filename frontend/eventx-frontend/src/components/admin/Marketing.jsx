import React, { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  TrendingUp,
  Send,
  Eye,
  Target,
  Calendar,
  PlusCircle,
  Filter,
  Search,
  Edit,
  Play
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

const Marketing = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/marketing/campaigns`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setStats(data.stats || {});
      } else {
        setCampaigns([]);
        setStats({});
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      setCampaigns([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'social':
        return <Users className="w-4 h-4" />;
      case 'sms':
        return <Send className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const calculateRate = (numerator, denominator) => {
    if (denominator === 0) return 0;
    return ((numerator / denominator) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full animate-pulse">
        <div className="h-12 bg-gray-200 rounded-xl w-64 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const WhiteCard = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-gray-900">Marketing Center</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Create, manage and analyze marketing campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-gray-900 hover:bg-black text-white shadow-md rounded-xl">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview (real data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'Total Campaigns', value: stats.totalCampaigns || 0, icon: Target, color: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 text-blue-600' },
          { title: 'Total Reach', value: stats.totalRecipients?.toLocaleString() || '0', icon: Users, color: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 text-violet-600' },
          { title: 'Avg Open Rate', value: `${stats.avgOpenRate || 0}%`, icon: Eye, color: 'from-teal-400 to-emerald-600', lightBg: 'bg-teal-50 text-teal-600' },
          { title: 'Revenue Generated', value: `$${stats.revenue?.toLocaleString() || '0'}`, icon: TrendingUp, color: 'from-amber-400 to-orange-500', lightBg: 'bg-amber-50 text-amber-600' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-center h-[120px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
              <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>

              <div className="relative z-10 flex justify-between items-center">
                <div className="flex-1 pr-3">
                  <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1.5">{stat.title}</p>
                  <h3 className={`text-[28px] font-black tracking-tight leading-none truncate capitalize text-gray-900`}>{stat.value}</h3>
                </div>
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightBg} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
          );
        })}
      </div>

      {/* Tabs - only Campaigns since analytics/templates have no real data */}
      <div className="space-x-1 bg-gray-100 p-1 rounded-lg w-fit border">
        {[{ key: 'campaigns', label: 'Campaigns', icon: Target }].map(({ key, label, icon }) => {
          const TabIcon = icon;
          return (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className={`flex items-center space-x-2 ${activeTab === key
                ? 'bg-white shadow-md border border-gray-200 text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{label}</span>
            </Button>
          );
        })}
      </div>

      {/* Campaigns List */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <WhiteCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-5 bg-gray-50/50">
            <div className="hidden md:flex items-center space-x-3 mb-2 sm:mb-0">
              <Target className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-extrabold text-gray-900">Campaign Management</h2>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-9 w-full bg-white border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-100"
                />
              </div>
              <Button variant="outline" className="rounded-xl font-bold text-gray-600 border-gray-200 hover:bg-white bg-transparent">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" className="rounded-xl font-bold text-gray-600 border-gray-200 hover:bg-white bg-transparent">
                Sort
              </Button>
            </div>
          </WhiteCard>

          {campaigns.length === 0 ? (
            <WhiteCard>
              <div className="py-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                  <Target className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-500 font-medium mb-6">Create your first marketing campaign to get started</p>
                <Button className="bg-gray-900 hover:bg-black text-white rounded-xl shadow-md">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Campaign
                </Button>
              </div>
            </WhiteCard>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <WhiteCard key={campaign.id} className="hover:shadow-md transition-shadow flex flex-col group">
                  <div className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-gray-100 bg-gray-50 text-gray-700 shadow-sm">
                          {getTypeIcon(campaign.type)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{campaign.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs font-bold text-gray-500 uppercase flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              Event: {campaign.eventName}
                            </p>
                            <p className="text-xs font-bold text-gray-500 uppercase">
                              Created {new Date(campaign.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center md:self-start space-x-4">
                        <Badge className={`${getStatusColor(campaign.status)} font-bold tracking-wider uppercase text-[10px] px-2 py-0.5 rounded-full border-0`}>
                          {campaign.status === 'active' && <Play className="w-3 h-3 mr-1 inline" />}
                          {campaign.status === 'draft' && <Edit className="w-3 h-3 mr-1 inline" />}
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>

                    {campaign.sent > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100/50 mt-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Send className="w-4 h-4 text-gray-400 mr-2" />
                            <p className="text-xl font-black text-gray-900">{campaign.sent.toLocaleString()}</p>
                          </div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sent</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Eye className="w-4 h-4 text-emerald-500 mr-2" />
                            <p className="text-xl font-black text-emerald-600">
                              {calculateRate(campaign.opened, campaign.sent)}%
                            </p>
                          </div>
                          <p className="text-xs font-bold text-emerald-700/70 uppercase tracking-widest">Open Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Target className="w-4 h-4 text-blue-500 mr-2" />
                            <p className="text-xl font-black text-blue-600">
                              {calculateRate(campaign.clicked, campaign.sent)}%
                            </p>
                          </div>
                          <p className="text-xs font-bold text-blue-700/70 uppercase tracking-widest">Click Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <TrendingUp className="w-4 h-4 text-purple-500 mr-2" />
                            <p className="text-xl font-black text-purple-600">{campaign.conversions}</p>
                          </div>
                          <p className="text-xs font-bold text-purple-700/70 uppercase tracking-widest">Conversions</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 p-3 bg-gray-50/50 flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl shadow-sm font-semibold border-gray-200 text-gray-700 hover:bg-white hover:text-blue-600 bg-transparent">
                      <Eye className="h-4 w-4 mr-1.5" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl shadow-sm font-semibold border-gray-200 text-gray-700 hover:bg-white hover:text-blue-600 bg-transparent">
                      <Edit className="h-4 w-4 mr-1.5" />
                      Edit Campaign
                    </Button>
                  </div>
                </WhiteCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Only Campaigns section remains */}
    </div>
  );
};

export default Marketing;
