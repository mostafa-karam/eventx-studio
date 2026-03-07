import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, HelpCircle, Ticket, Building2, CreditCard, Shield, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqCategories = [
    { id: 'all', label: 'All', icon: HelpCircle },
    { id: 'events', label: 'Events', icon: Ticket },
    { id: 'halls', label: 'Halls & Venues', icon: Building2 },
    { id: 'payments', label: 'Payments & Tickets', icon: CreditCard },
    { id: 'account', label: 'Account & Security', icon: Shield },
    { id: 'organizers', label: 'For Organizers', icon: Users },
];

const faqData = [
    { q: 'How do I browse upcoming events?', a: 'Visit the Events page from the navigation or homepage. You can filter events by category, city, date range, and price. You can also use the search bar to find specific events.', category: 'events' },
    { q: 'Can I attend free events without creating an account?', a: 'You can browse events without an account, but you need to register and verify your email to book tickets for any event — whether free or paid.', category: 'events' },
    { q: 'What happens if an event is sold out?', a: 'You can join the waitlist for sold-out events. When a seat becomes available, you will be notified and given 24 hours to complete your purchase.', category: 'events' },
    { q: 'How do I book a ticket for an event?', a: 'Navigate to the event details page, select your seat (or let the system auto-assign one), choose your payment method, and confirm the booking. You will receive a QR code ticket immediately.', category: 'payments' },
    { q: 'Can I cancel a ticket after booking?', a: 'Yes, you can cancel tickets from the "My Tickets" section in your dashboard. Cancellation policies vary by event. Refund eligibility depends on the event organizer\'s policy.', category: 'payments' },
    { q: 'What payment methods do you accept?', a: 'We accept credit cards, debit cards, PayPal, and bank transfers. Free events do not require any payment information.', category: 'payments' },
    { q: 'How do I use my QR code ticket at the event?', a: 'Show the QR code on your ticket (available in the "My Tickets" section) at the event entrance. The organizer will scan it for check-in. You can also download a PDF copy.', category: 'payments' },
    { q: 'What are halls and how do I rent one?', a: 'Halls are venue spaces of different sizes and equipment configurations. If you\'re an organizer, you can browse available halls, check availability, and submit a booking request for your event dates.', category: 'halls' },
    { q: 'How does hall booking approval work?', a: 'After submitting a booking request, the venue admin reviews it for availability and suitability. You will receive a notification when your booking is approved, rejected, or if additional information is needed.', category: 'halls' },
    { q: 'What equipment is available in the halls?', a: 'Each hall listing shows available equipment such as projectors, sound systems, microphones, Wi-Fi, stage, lighting, air conditioning, whiteboards, and catering areas. You can filter halls by required equipment.', category: 'halls' },
    { q: 'How do I create an account?', a: 'Click "Register" on the login page. Fill in your details, choose your role (attendee or organizer), and verify your email address. You\'ll receive a verification link within minutes.', category: 'account' },
    { q: 'I forgot my password. How do I reset it?', a: 'Click "Forgot Password" on the login page, enter your email, and you\'ll receive a reset link valid for 10 minutes. Follow the link to set a new password.', category: 'account' },
    { q: 'Is my account data secure?', a: 'Yes. We use bcrypt password hashing, httpOnly cookies, rate limiting, account lockout after failed attempts, session management, and audit logging. Your data is encrypted in transit and at rest.', category: 'account' },
    { q: 'How do I become an event organizer?', a: 'After creating an account, you can request a role upgrade from your profile page. Provide your organization name and reason, and an admin will review your request.', category: 'organizers' },
    { q: 'How do I create and publish an event?', a: 'From the organizer dashboard, click "Create Event". Fill in event details (title, description, date, venue, capacity, pricing), then save as draft. When ready, change the status to "Published" to make it visible to attendees.', category: 'organizers' },
    { q: 'Can I view analytics for my events?', a: 'Yes. The organizer dashboard includes analytics for views, bookings, revenue, attendee demographics, and ticket sales over time. You can also export attendee lists as CSV files.', category: 'organizers' },
];

function FAQItem({ item, isOpen, onClick }) {
    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button onClick={onClick} className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors">
                <span className="font-medium text-foreground pr-4">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                            {item.a}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function FAQPage() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);

    const filtered = faqData.filter((item) => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchesSearch = !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl translate-x-1/3 -translate-y-1/3" />
                </div>
                <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24 relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
                        <p className="text-lg text-white/80 max-w-2xl">Find quick answers to the most common questions about EventX Studio.</p>
                    </motion.div>

                    {/* Search */}
                    <div className="mt-8 relative max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" />
                    </div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Category tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {faqCategories.map((cat) => (
                        <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setOpenId(null); }}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* FAQ items */}
                <div className="space-y-3">
                    {filtered.length > 0 ? (
                        filtered.map((item, idx) => (
                            <FAQItem key={idx} item={item} isOpen={openId === idx} onClick={() => setOpenId(openId === idx ? null : idx)} />
                        ))
                    ) : (
                        <div className="text-center py-16">
                            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-lg font-medium text-foreground">No questions found</p>
                            <p className="text-sm text-muted-foreground">Try adjusting your search or category filter.</p>
                        </div>
                    )}
                </div>

                {/* CTA */}
                <div className="mt-16 text-center card p-8">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Still have questions?</h2>
                    <p className="text-muted-foreground mb-6">We're here to help. Reach out and we'll respond within 24 hours.</p>
                    <Link to="/contact" className="btn-primary inline-flex items-center gap-2">
                        Contact Support <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
