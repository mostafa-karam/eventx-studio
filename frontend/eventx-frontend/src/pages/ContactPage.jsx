import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone, MapPin, Clock, Send, ArrowLeft, MessageSquare, HelpCircle, Bug, Lightbulb, CheckCircle2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const contactReasons = [
    { id: 'general', label: 'General Inquiry', icon: MessageSquare, color: 'text-blue-500' },
    { id: 'technical', label: 'Technical Support', icon: Bug, color: 'text-red-500' },
    { id: 'billing', label: 'Billing Question', icon: HelpCircle, color: 'text-yellow-500' },
    { id: 'feature-request', label: 'Feature Request', icon: Lightbulb, color: 'text-purple-500' },
];

export default function ContactPage() {
    const { user, isAuthenticated } = useAuth();
//     const navigate = useNavigate();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        category: 'general',
        subject: '',
        message: '',
    });

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.message.trim()) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            if (isAuthenticated) {
                // Submit as support ticket if logged in
                const res = await fetch(`${API}/support`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        subject: form.subject,
                        description: form.message,
                        category: form.category,
                        priority: 'medium',
                    }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
            }
            setSubmitted(true);
            toast.success('Message sent successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-right" richColors />

            {/* Hero */}
            <section className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl translate-x-1/3 translate-y-1/3" />
                </div>
                <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get In Touch</h1>
                        <p className="text-lg text-white/80 max-w-2xl">
                            Have a question, need support, or want to share feedback? We'd love to hear from you.
                        </p>
                    </motion.div>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
                <div className="grid lg:grid-cols-3 gap-10">

                    {/* Contact Info Sidebar */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
                        <div className="card p-6 space-y-6">
                            <h2 className="text-xl font-bold text-foreground">Contact Information</h2>
                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Mail className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-medium text-foreground">Email</p>
                                        <a href="mailto:support@eventxstudio.com" className="text-sm text-muted-foreground hover:text-blue-600 transition-colors">support@eventxstudio.com</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"><Phone className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-medium text-foreground">Phone</p>
                                        <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"><MapPin className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-medium text-foreground">Address</p>
                                        <p className="text-sm text-muted-foreground">123 Event Street, Suite 100<br />San Francisco, CA 94102</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"><Clock className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-medium text-foreground">Business Hours</p>
                                        <p className="text-sm text-muted-foreground">Mon–Fri: 9AM – 6PM EST<br />Sat–Sun: 10AM – 4PM EST</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick links */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
                            <div className="space-y-2">
                                <Link to="/faq" className="block text-sm text-muted-foreground hover:text-blue-600 transition-colors">→ Frequently Asked Questions</Link>
                                <Link to="/about" className="block text-sm text-muted-foreground hover:text-blue-600 transition-colors">→ About EventX Studio</Link>
                                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-blue-600 transition-colors">→ Terms of Service</Link>
                                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-blue-600 transition-colors">→ Privacy Policy</Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                        <div className="card p-6 sm:p-8">
                            <AnimatePresence mode="wait">
                                {submitted ? (
                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h2>
                                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                            {isAuthenticated
                                                ? 'Your support ticket has been created. We\'ll get back to you within 24 hours.'
                                                : 'Thank you for reaching out. We\'ll respond to your inquiry within 24 hours.'}
                                        </p>
                                        <div className="flex gap-3 justify-center">
                                            <button onClick={() => { setSubmitted(false); setForm({ ...form, subject: '', message: '' }); }} className="btn-primary">
                                                Send Another Message
                                            </button>
                                            <Link to="/" className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-secondary transition-colors">
                                                Back to Home
                                            </Link>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.form key="form" onSubmit={handleSubmit} className="space-y-6">
                                        <h2 className="text-2xl font-bold text-foreground mb-1">Send Us a Message</h2>
                                        <p className="text-muted-foreground text-sm mb-4">Fill out the form below and we'll get back to you shortly.</p>

                                        {/* Reason selector */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Reason for Contact</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {contactReasons.map((r) => (
                                                    <button key={r.id} type="button" onClick={() => setForm({ ...form, category: r.id })}
                                                        className={`p-3 rounded-lg border text-center transition-all text-sm ${form.category === r.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-border hover:border-blue-300'}`}>
                                                        <r.icon className={`w-5 h-5 mx-auto mb-1 ${r.color}`} />
                                                        <span className="text-foreground text-xs font-medium">{r.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                                                <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name"
                                                    className="w-full" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                                                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com"
                                                    className="w-full" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Subject *</label>
                                            <input name="subject" value={form.subject} onChange={handleChange} required placeholder="What is this about?"
                                                className="w-full" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Message *</label>
                                            <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Tell us more about your inquiry..."
                                                className="w-full resize-none" />
                                        </div>

                                        <button type="submit" disabled={loading}
                                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                            {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="w-4 h-4" />}
                                            {loading ? 'Sending…' : 'Send Message'}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
