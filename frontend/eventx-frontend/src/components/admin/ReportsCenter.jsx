import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
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
    eventCategory: 'all',
    status: 'all'
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/reports`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data.reports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Reports fetch error:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };


  const generateReport = async (reportType) => {
    setGenerating(reportType);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: reportType, filters: filters }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add new report to the list
        setReports([data.data.report, ...reports]);
      } else {
        console.error('Failed to generate report');
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
        headers: {},
        credentials: 'include'
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
        console.error('Failed to download report');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
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
             <span className="text-gray-900">Reports Center</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Generate, manage, and download comprehensive reports about your events.
          </p>
        </div>
      </div>

      {/* Report Generation */}
      <WhiteCard>
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h2 className="text-lg font-bold text-gray-900">Generate New Report</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Create custom reports with specific filters and date ranges
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="dateRange" className="text-sm font-bold text-gray-700">Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl focus:ring-blue-500 font-medium text-gray-900">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                  <SelectItem value="7d" className="font-medium">Last 7 days</SelectItem>
                  <SelectItem value="30d" className="font-medium">Last 30 days</SelectItem>
                  <SelectItem value="90d" className="font-medium">Last 90 days</SelectItem>
                  <SelectItem value="1y" className="font-medium">Last year</SelectItem>
                  <SelectItem value="custom" className="font-medium">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="eventCategory" className="text-sm font-bold text-gray-700">Event Category</Label>
              <Select
                value={filters.eventCategory}
                onValueChange={(value) => setFilters({ ...filters, eventCategory: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl focus:ring-blue-500 font-medium text-gray-900">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                  <SelectItem value="all" className="font-medium">All categories</SelectItem>
                  <SelectItem value="technology" className="font-medium">Technology</SelectItem>
                  <SelectItem value="business" className="font-medium">Business</SelectItem>
                  <SelectItem value="arts" className="font-medium">Arts</SelectItem>
                  <SelectItem value="sports" className="font-medium">Sports</SelectItem>
                  <SelectItem value="education" className="font-medium">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="status" className="text-sm font-bold text-gray-700">Event Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl focus:ring-blue-500 font-medium text-gray-900">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                  <SelectItem value="all" className="font-medium">All statuses</SelectItem>
                  <SelectItem value="draft" className="font-medium">Draft</SelectItem>
                  <SelectItem value="published" className="font-medium">Published</SelectItem>
                  <SelectItem value="completed" className="font-medium">Completed</SelectItem>
                  <SelectItem value="cancelled" className="font-medium">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 border border-gray-100 rounded-xl mt-4">
              <div className="space-y-2.5">
                <Label htmlFor="startDate" className="text-sm font-bold text-gray-700">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="bg-white border-gray-200 rounded-lg focus:ring-blue-500 font-medium text-gray-900"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="endDate" className="text-sm font-bold text-gray-700">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="bg-white border-gray-200 rounded-lg focus:ring-blue-500 font-medium text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Report Types */}
          <div className="pt-4 border-t border-gray-100">
            <Label className="text-sm font-bold text-gray-700 block mb-4">Select Report Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {reportTypes.map((reportType) => {
                const Icon = getReportIcon(reportType.value);
                const isGenerating = generating === reportType.value;
                return (
                  <div
                    key={reportType.value}
                    className="group border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-300 bg-white hover:bg-blue-50/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {reportType.label}
                            </h4>
                            <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2">
                            {reportType.description}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100">
                        <Button
                            className={`w-full font-bold shadow-sm rounded-xl transition-all ${isGenerating ? 'bg-blue-100 text-blue-700' : 'bg-gray-900 hover:bg-black text-white group-hover:bg-blue-600'}`}
                            onClick={() => generateReport(reportType.value)}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Generating...</span>
                            ) : 'Generate Report'}
                        </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </WhiteCard>

      {/* Generated Reports */}
      <WhiteCard>
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generated Reports</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">
              View and download your previously generated reports
            </p>
          </div>
          <Badge className="bg-white text-gray-700 border-gray-200 shadow-sm">{reports.length} Reports</Badge>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-100 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <FileText className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">No reports generated</h3>
              <p className="text-gray-500 font-medium">Generate your first report to see it here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map((report) => {
                const Icon = getReportIcon(report.type);
                return (
                  <div
                    key={report._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-gray-50/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-lg">{report.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          {report.fileSize && (
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">
                              {report.fileSize}
                            </span>
                          )}
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {report.status === 'completed' && (
                        <Button
                          variant="outline"
                          className="font-bold border-gray-200 text-gray-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 rounded-xl shadow-sm bg-white w-full sm:w-auto"
                          onClick={() => downloadReport(report._id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {report.status === 'generating' && (
                        <div className="flex items-center text-sm font-bold text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <Clock className="h-4 w-4 mr-2 animate-spin text-gray-400" />
                          Generating...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </WhiteCard>
    </div>
  );
};

export default ReportsCenter;

