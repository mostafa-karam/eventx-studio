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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
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
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Target className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Center</h1>
              <p className="text-gray-600">Create, manage and analyze marketing campaigns</p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview (real data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Campaigns */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCampaigns || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-white text-gray-700">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Reach */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Reach</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRecipients?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-white text-gray-700">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Open Rate */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Avg Open Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgOpenRate || 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-white text-gray-700">
                <Eye className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Generated */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Revenue Generated</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${stats.revenue?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-white text-gray-700">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - only Campaigns since analytics/templates have no real data */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit border">
        {[{ key: 'campaigns', label: 'Campaigns', icon: Target }].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(key)}
            className={`flex items-center space-x-2 ${
              activeTab === key 
                ? 'bg-white shadow-md border border-gray-200 text-gray-900' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Campaigns List */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-semibold text-gray-900">Campaign Management</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search campaigns..."
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    Sort
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {campaigns.length === 0 ? (
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-500 mb-4">Create your first marketing campaign to get started</p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-white text-gray-700">
                          {getTypeIcon(campaign.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{campaign.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Event: {campaign.eventName}
                            </p>
                            <p className="text-sm text-gray-600">
                              Created {campaign.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getStatusColor(campaign.status)} border font-medium`}>
                          {campaign.status === 'active' && <Play className="w-3 h-3 mr-1" />}
                          {campaign.status === 'draft' && <Edit className="w-3 h-3 mr-1" />}
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Badge>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>

                    {campaign.sent > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg border">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Send className="w-5 h-5 text-blue-600 mr-2" />
                            <p className="text-2xl font-bold text-gray-900">{campaign.sent.toLocaleString()}</p>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Sent</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Eye className="w-5 h-5 text-green-600 mr-2" />
                            <p className="text-2xl font-bold text-green-600">
                              {calculateRate(campaign.opened, campaign.sent)}%
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Open Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Target className="w-5 h-5 text-blue-600 mr-2" />
                            <p className="text-2xl font-bold text-blue-600">
                              {calculateRate(campaign.clicked, campaign.sent)}%
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Click Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                            <p className="text-2xl font-bold text-purple-600">{campaign.conversions}</p>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Conversions</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
