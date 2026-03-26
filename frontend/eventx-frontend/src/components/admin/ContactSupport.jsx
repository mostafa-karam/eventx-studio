import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, Mail, Clock, CheckCircle, AlertCircle, Send, Paperclip } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const ContactSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Admin Ticket Management State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
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
      setFormData({ subject: '', category: 'general', priority: 'medium', description: '', attachments: [] });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating support ticket:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setIsReplying(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      // MOCK: In a real scenario, this hits the backend /support/tickets/:id/reply
      // Since backend routes might be missing or limited for support, we mock the UI state update
      const updatedTicket = { 
        ...selectedTicket, 
        status: 'in_progress', 
        responses: selectedTicket.responses + 1,
        replies: [...(selectedTicket.replies || []), { text: replyText, date: new Date(), author: 'Admin' }]
      };
      
      setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');
    } catch (error) {
      console.error("Failed to reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const updatedTicket = { ...selectedTicket, status: newStatus };
      setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
    } catch (e) {
      console.error("Failed to update status");
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

  const WhiteCard = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
             <span className="text-gray-900">Contact Support</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Get help with your EventX Studio account</p>
        </div>
        
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-sm px-5 h-12 w-full md:w-auto mt-4 md:mt-0"
        >
          <Send className="w-5 h-5 mr-2" />
          {showCreateForm ? 'Cancel Ticket' : 'New Ticket'}
        </Button>
      </div>

      {/* Quick Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <WhiteCard className="group hover:border-blue-300 hover:shadow-md transition-all duration-300 bg-white hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Live Chat</h3>
            <p className="text-sm font-medium text-gray-500 mb-5 text-center">Chat with our support team in real-time</p>
            <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1 font-bold tracking-wide">Online</Badge>
        </WhiteCard>

        <WhiteCard className="group hover:border-green-300 hover:shadow-md transition-all duration-300 bg-white hover:bg-green-50/10 cursor-pointer flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Phone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Phone Support</h3>
            <p className="text-sm font-medium text-gray-500 mb-5 text-center">Call us at +1 (555) 123-4567</p>
            <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1 font-bold tracking-wide">9 AM - 6 PM EST</Badge>
        </WhiteCard>

        <WhiteCard className="group hover:border-purple-300 hover:shadow-md transition-all duration-300 bg-white hover:bg-purple-50/10 cursor-pointer flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Email Support</h3>
            <p className="text-sm font-medium text-gray-500 mb-5 text-center">support@eventxstudio.com</p>
            <Badge className="bg-blue-100 text-blue-800 border-0 px-3 py-1 font-bold tracking-wide">24/7 Response</Badge>
        </WhiteCard>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <WhiteCard>
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-900">Create Support Ticket</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 h-12 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 h-12 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                  >
                    <option value="general">General Question</option>
                    <option value="technical">Technical Issue</option>
                    <option value="bug">Bug Report</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 h-12 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-gray-700">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all resize-y"
                  placeholder="Please provide detailed information about your issue..."
                />
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-gray-700">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center">
                  <Paperclip className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="font-bold text-gray-700 text-lg">
                    Drag and drop files here
                  </p>
                  <p className="text-sm font-medium text-gray-500 mt-1">
                    or click to browse (.jpg, .png, .pdf, .doc)
                  </p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                <Button type="submit" className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-sm px-6 h-12">
                  <Send className="w-5 h-5 mr-2" />
                  Submit Ticket
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                  className="font-bold border-gray-200 text-gray-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl h-12 px-6"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </WhiteCard>
      )}

      {/* Support Tickets */}
      <WhiteCard>
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Your Support Tickets</h2>
          <div className="flex space-x-2">
            <Button variant="outline" className="h-9 px-4 rounded-xl font-bold border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm">All</Button>
            <Button variant="outline" className="h-9 px-4 rounded-xl font-bold border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm">Open</Button>
            <Button variant="outline" className="h-9 px-4 rounded-xl font-bold border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm">Resolved</Button>
          </div>
        </div>

        <div className="p-0">
          {tickets.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <MessageCircle className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">No support tickets</h3>
              <p className="text-gray-500 font-medium mb-6">You haven't created any support tickets yet.</p>
              <Button onClick={() => setShowCreateForm(true)} className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-sm px-6 h-12">
                <Send className="w-5 h-5 mr-2" />
                Create Your First Ticket
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => {
                return (
                  <div key={ticket.id} className="p-6 hover:bg-blue-50/30 transition-colors flex flex-col lg:flex-row lg:items-center gap-6 group">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 border border-gray-100 flex-shrink-0">
                        {getCategoryIcon(ticket.category)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">{ticket.subject}</h3>
                          <Badge className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border-0 ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border-0 ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <span className="text-gray-900">#{ticket.id}</span>
                          <span>Created: {formatDate(ticket.createdAt)}</span>
                          <span>Updated: {formatDate(ticket.updatedAt)}</span>
                          <span>{ticket.responses} responses</span>
                          <span className="text-blue-600 border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-md">Assigned: {ticket.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center lg:justify-end">
                      <Button onClick={() => setSelectedTicket(ticket)} variant="outline" className="font-bold border-gray-200 text-gray-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 rounded-xl shadow-sm bg-white w-full lg:w-auto h-11 px-5">
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </WhiteCard>

      {/* FAQ Section */}
      <WhiteCard>
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <div key={index} className="flex gap-4 items-start group">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black flex-shrink-0 group-hover:scale-110 transition-transform">
                    {index + 1}
                </div>
                <div>
                    <h4 className="font-extrabold text-gray-900 mb-2 leading-tight">{faq.question}</h4>
                    <p className="text-sm font-medium text-gray-500 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WhiteCard>

      {/* View Ticket Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-3xl">
          {selectedTicket && (
            <>
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <DialogTitle className="text-xl font-extrabold text-gray-900 flex items-center gap-3">
                    {selectedTicket.subject}
                    <Badge className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border-0 ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                    Ticket #{selectedTicket.id} • Created {formatDate(selectedTicket.createdAt)}
                  </DialogDescription>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                {/* Original Query */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">U</div>
                     <div>
                       <p className="text-sm font-bold text-gray-900">User</p>
                       <p className="text-xs font-medium text-gray-500">{formatDate(selectedTicket.createdAt)}</p>
                     </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Replies Thread */}
                {selectedTicket.replies?.map((reply, idx) => (
                  <div key={idx} className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 ml-8">
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">A</div>
                       <div>
                         <p className="text-sm font-bold text-gray-900">{reply.author}</p>
                         <p className="text-xs font-medium text-gray-500">{formatDate(reply.date)}</p>
                       </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{reply.text}</p>
                  </div>
                ))}

                {/* Reply Box */}
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <div className="pt-4 border-t border-gray-100">
                    <label className="text-sm font-bold text-gray-700 mb-2 block">Your Response</label>
                    <Textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the user here..."
                      className="min-h-[100px] border-gray-200 rounded-xl focus:ring-blue-100 resize-none"
                    />
                    <div className="mt-3 flex justify-end gap-3">
                      <Button variant="outline" className="font-bold rounded-xl" onClick={() => handleStatusChange('resolved')}>
                         Mark as Resolved
                      </Button>
                      <Button 
                        onClick={handleReply} 
                        disabled={isReplying || !replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
                      >
                         Send Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSupport;
