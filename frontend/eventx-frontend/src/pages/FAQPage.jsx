import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, ChevronDown, CreditCard, HelpCircle, Search, Shield, Ticket, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
    { q: 'Can I attend free events without creating an account?', a: 'You can browse events without an account, but you need to register and verify your email to book tickets for any event - whether free or paid.', category: 'events' },
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <button onClick={onClick} className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-secondary/70">
                <span className="font-semibold text-slate-950 dark:text-foreground">{item.q}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600 dark:border-border dark:text-muted-foreground">
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
        <div className="min-h-screen bg-[#f4f7fb] dark:bg-background">
            <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-border dark:bg-background/85">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-muted-foreground dark:hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Home
                    </Link>
                    <Link to="/contact" className="hidden items-center gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900 dark:text-blue-300 sm:inline-flex">
                        Contact support
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            <main>
                <section className="border-b border-slate-200/80 bg-white dark:border-border dark:bg-card">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:py-16">
                        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
                                <HelpCircle className="h-4 w-4" />
                                Help center
                            </div>
                            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-foreground sm:text-5xl">
                                Answers before you need a ticket.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-muted-foreground sm:text-lg">
                                Search common questions about events, halls, payments, accounts, and organizer workflows.
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-border dark:bg-secondary">
                            <label className="relative block">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search questions..."
                                    className="min-h-12 w-full rounded-md border-slate-200 bg-white pl-12 text-base dark:bg-input"
                                />
                            </label>
                        </motion.div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <aside className="space-y-3">
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-muted-foreground">Browse by topic</p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                {faqCategories.map((cat) => {
                                    const isActive = activeCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setActiveCategory(cat.id);
                                                setOpenId(null);
                                            }}
                                            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition-colors ${isActive ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-secondary'}`}
                                        >
                                            <cat.icon className="h-4 w-4 shrink-0" />
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <div>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <p className="text-sm text-slate-500 dark:text-muted-foreground">{filtered.length} matching questions</p>
                                <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300">
                                    Still need help
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="space-y-3">
                                {filtered.length > 0 ? (
                                    filtered.map((item, idx) => (
                                        <FAQItem key={idx} item={item} isOpen={openId === idx} onClick={() => setOpenId(openId === idx ? null : idx)} />
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-border dark:bg-card">
                                        <HelpCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                                        <p className="text-lg font-semibold text-slate-950 dark:text-foreground">No questions found</p>
                                        <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Try adjusting your search or category filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
