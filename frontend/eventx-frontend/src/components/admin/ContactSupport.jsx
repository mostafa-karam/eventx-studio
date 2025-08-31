import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, Mail, Clock, CheckCircle, AlertCircle, Send, Paperclip } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const ContactSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: '',
    attachments: []
  });

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const fetchSupportTickets = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/support/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const newTicket = {
        id: `SUP-${String(tickets.length + 1).padStart(3, '0')}`,
        ...formData,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        responses: 0,
        assignedTo: 'Support Team'
      };

      setTickets([newTicket, ...tickets]);
      setFormData({
        subject: '',
        category: 'general',
        priority: 'medium',
        description: '',
        attachments: []
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating support ticket:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'technical':
        return <AlertCircle className="w-4 h-4" />;
      case 'bug':
        return <AlertCircle className="w-4 h-4" />;
      case 'billing':
        return <Mail className="w-4 h-4" />;
      case 'general':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Support</h1>
            <p className="text-gray-600">Get help with your EventX Studio account</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Quick Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-4">Chat with our support team in real-time</p>
            <Badge className="bg-green-100 text-green-800">Online</Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 mb-4">Call us at +1 (555) 123-4567</p>
            <Badge className="bg-yellow-100 text-yellow-800">9 AM - 6 PM EST</Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-4">support@eventxstudio.com</p>
            <Badge className="bg-blue-100 text-blue-800">24/7 Response</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General Question</option>
                    <option value="technical">Technical Issue</option>
                    <option value="bug">Bug Report</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please provide detailed information about your issue..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4 mr-2" />
                  Submit Ticket
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Support Tickets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Your Support Tickets</h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">All</Button>
            <Button variant="outline" size="sm">Open</Button>
            <Button variant="outline" size="sm">Resolved</Button>
          </div>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets</h3>
              <p className="text-gray-600 mb-4">
                You haven't created any support tickets yet.
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Create Your First Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(ticket.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>#{ticket.id}</span>
                          <span>Created {formatDate(ticket.createdAt)}</span>
                          <span>Updated {formatDate(ticket.updatedAt)}</span>
                          <span>{ticket.responses} responses</span>
                          <span>Assigned to {ticket.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                question: "How do I create a new event?",
                answer: "Navigate to the Events section and click 'New Event'. Fill in the required details and publish your event."
              },
              {
                question: "How can I track ticket sales?",
                answer: "Go to the Analytics dashboard to view real-time ticket sales, revenue, and attendee insights."
              },
              {
                question: "Can I customize my event page?",
                answer: "Yes, you can customize colors, add images, and modify the layout in the Event Settings."
              },
              {
                question: "How do I export attendee data?",
                answer: "In the Attendee Insights section, click the 'Export' button to download attendee data as CSV or Excel."
              }
            ].map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                <p className="text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSupport;
