import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  BarChart3,
  Users,
  DollarSign,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ReportsCenter = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [filters, setFilters] = useState({
    reportType: '',
    dateRange: '30d',
    startDate: '',
    endDate: '',
    eventCategory: '',
    status: ''
  });

  const { token } = useAuth();
  const API_BASE_URL = 'import.meta.env.VITE_API_BASE_URL;';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data.reports);
      } else {
        // Mock data for demonstration
        setReports(generateMockReports());
      }
    } catch (error) {
      console.error('Reports fetch error:', error);
      setReports(generateMockReports());
    } finally {
      setLoading(false);
    }
  };

  const generateMockReports = () => {
    return [
      {
        _id: '1',
        name: 'Monthly Revenue Report - December 2024',
        type: 'revenue',
        status: 'completed',
        createdAt: '2024-12-01T10:00:00Z',
        fileSize: '2.4 MB',
        downloadUrl: '#',
        parameters: {
          dateRange: '30d',
          category: 'all'
        }
      },
      {
        _id: '2',
        name: 'Attendee Demographics Analysis',
        type: 'demographics',
        status: 'completed',
        createdAt: '2024-11-28T15:30:00Z',
        fileSize: '1.8 MB',
        downloadUrl: '#',
        parameters: {
          dateRange: '90d',
          category: 'technology'
        }
      },
      {
        _id: '3',
        name: 'Event Performance Summary',
        type: 'performance',
        status: 'generating',
        createdAt: '2024-12-02T09:15:00Z',
        fileSize: null,
        downloadUrl: null,
        parameters: {
          dateRange: '7d',
          category: 'all'
        }
      },
      {
        _id: '4',
        name: 'Ticket Sales Analysis - Q4 2024',
        type: 'sales',
        status: 'completed',
        createdAt: '2024-11-25T14:20:00Z',
        fileSize: '3.1 MB',
        downloadUrl: '#',
        parameters: {
          dateRange: '90d',
          category: 'business'
        }
      }
    ];
  };

  const generateReport = async (reportType) => {
    setGenerating(reportType);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: reportType,
          filters: filters
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add new report to the list
        setReports([data.data.report, ...reports]);
      } else {
        // Simulate report generation for demo
        const newReport = {
          _id: Date.now().toString(),
          name: `${getReportTypeName(reportType)} - ${new Date().toLocaleDateString()}`,
          type: reportType,
          status: 'generating',
          createdAt: new Date().toISOString(),
          fileSize: null,
          downloadUrl: null,
          parameters: { ...filters }
        };
        setReports([newReport, ...reports]);

        // Simulate completion after 3 seconds
        setTimeout(() => {
          setReports(prev => prev.map(report =>
            report._id === newReport._id
              ? { ...report, status: 'completed', fileSize: '2.1 MB', downloadUrl: '#' }
              : report
          ));
        }, 3000);
      }
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/reports/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Simulate download for demo
        alert('Report download would start here in a real implementation!');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const getReportTypeName = (type) => {
    const types = {
      revenue: 'Revenue Report',
      demographics: 'Demographics Analysis',
      performance: 'Event Performance',
      sales: 'Sales Analysis',
      attendance: 'Attendance Report',
      feedback: 'Feedback Summary'
    };
    return types[type] || 'Custom Report';
  };

  const getReportIcon = (type) => {
    const icons = {
      revenue: DollarSign,
      demographics: Users,
      performance: BarChart3,
      sales: Ticket,
      attendance: Calendar,
      feedback: FileText
    };
    return icons[type] || FileText;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-600', icon: CheckCircle },
      generating: { color: 'bg-yellow-100 text-yellow-600', icon: Clock },
      failed: { color: 'bg-red-100 text-red-600', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.completed;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const reportTypes = [
    { value: 'revenue', label: 'Revenue Report', description: 'Financial performance and revenue trends' },
    { value: 'demographics', label: 'Demographics Analysis', description: 'Attendee demographics and insights' },
    { value: 'performance', label: 'Event Performance', description: 'Event success metrics and KPIs' },
    { value: 'sales', label: 'Sales Analysis', description: 'Ticket sales patterns and trends' },
    { value: 'attendance', label: 'Attendance Report', description: 'Attendance rates and patterns' },
    { value: 'feedback', label: 'Feedback Summary', description: 'Event feedback and ratings analysis' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Reports Center</h2>
        <p className="text-gray-600 mt-2">
          Generate, manage, and download comprehensive reports about your events.
        </p>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Create custom reports with specific filters and date ranges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventCategory">Event Category</Label>
              <Select
                value={filters.eventCategory}
                onValueChange={(value) => setFilters({ ...filters, eventCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="arts">Arts</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Event Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Report Types */}
          <div>
            <Label className="text-base font-medium">Report Types</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {reportTypes.map((reportType) => {
                const Icon = getReportIcon(reportType.value);
                return (
                  <Card
                    key={reportType.value}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="h-8 w-8 text-blue-600" />
                        <Button
                          size="sm"
                          onClick={() => generateReport(reportType.value)}
                          disabled={generating === reportType.value}
                        >
                          {generating === reportType.value ? 'Generating...' : 'Generate'}
                        </Button>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {reportType.label}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {reportType.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>
            View and download your previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated</h3>
              <p className="text-gray-500">Generate your first report to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const Icon = getReportIcon(report.type);
                return (
                  <div
                    key={report._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          {report.fileSize && (
                            <span className="text-sm text-gray-600">
                              {report.fileSize}
                            </span>
                          )}
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {report.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report._id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {report.status === 'generating' && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsCenter;

