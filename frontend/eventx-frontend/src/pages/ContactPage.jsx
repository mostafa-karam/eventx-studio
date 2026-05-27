import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft,
    ArrowRight,
    Bug,
    CheckCircle2,
    Clock,
    HelpCircle,
    LifeBuoy,
    Lightbulb,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const contactReasons = [
    { id: 'general', label: 'General', hint: 'Questions, partnerships, and feedback', icon: MessageSquare, color: 'text-blue-600', active: 'border-blue-500 bg-blue-50 text-blue-950' },
    { id: 'technical', label: 'Support', hint: 'Bugs, access, and product issues', icon: Bug, color: 'text-rose-600', active: 'border-rose-500 bg-rose-50 text-rose-950' },
    { id: 'billing', label: 'Billing', hint: 'Invoices, refunds, and payments', icon: HelpCircle, color: 'text-amber-600', active: 'border-amber-500 bg-amber-50 text-amber-950' },
    { id: 'feature-request', label: 'Ideas', hint: 'Feature requests and improvements', icon: Lightbulb, color: 'text-emerald-600', active: 'border-emerald-500 bg-emerald-50 text-emerald-950' },
];

const contactMethods = [
    { label: 'Email', value: 'support@eventxstudio.com', detail: 'Best for documents and detailed questions.', icon: Mail, color: 'text-blue-600 bg-blue-50' },
    { label: 'Phone', value: '+1 (555) 123-4567', detail: 'For urgent venue or ticketing issues.', icon: Phone, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Office', value: '123 Event Street, Suite 100', detail: 'San Francisco, CA 94102', icon: MapPin, color: 'text-violet-600 bg-violet-50' },
    { label: 'Hours', value: 'Mon-Fri, 9AM-6PM EST', detail: 'Weekend support from 10AM-4PM.', icon: Clock, color: 'text-amber-600 bg-amber-50' },
];

const quickLinks = [
    { label: 'Frequently Asked Questions', to: '/faq' },
    { label: 'About EventX Studio', to: '/about' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Privacy Policy', to: '/privacy' },
];

export default function ContactPage() {
    const { user, isAuthenticated } = useAuth();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        category: 'general',
        subject: '',
        message: '',
    });

    const selectedReason = contactReasons.find((reason) => reason.id === form.category) || contactReasons[0];

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
        <div className="min-h-screen bg-[#f4f7fb] dark:bg-background">
            <Toaster position="top-right" richColors />

            <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-border dark:bg-background/85">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-muted-foreground dark:hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Home
                    </Link>
                    <div className="hidden items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground sm:flex">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Secure support desk
                    </div>
                </div>
            </header>

            <main>
                <section className="border-b border-slate-200/80 bg-white dark:border-border dark:bg-card">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:py-16">
                        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
                                <LifeBuoy className="h-4 w-4" />
                                EventX support
                            </div>
                            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-foreground sm:text-5xl">
                                Talk to the team behind your events.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-muted-foreground sm:text-lg">
                                Send us the details and we will route your message to the right team for venue, ticketing, account, or billing help.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.1 }}
                            className="grid gap-3 sm:grid-cols-3"
                        >
                            {[
                                { label: 'First reply', value: '< 24h' },
                                { label: 'Priority', value: selectedReason.label },
                                { label: 'Status', value: isAuthenticated ? 'Ticket ready' : 'Message ready' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-secondary">
                                    <div className="text-xs font-medium uppercase text-slate-500 dark:text-muted-foreground">{item.label}</div>
                                    <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-foreground">{item.value}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                                <AnimatePresence mode="wait">
                                    {submitted ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className="px-6 py-14 text-center sm:px-10"
                                        >
                                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                                                <CheckCircle2 className="h-9 w-9" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-950 dark:text-foreground">Message sent</h2>
                                            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                                                {isAuthenticated
                                                    ? 'Your support ticket has been created. We will get back to you within 24 hours.'
                                                    : 'Thanks for reaching out. We will respond to your inquiry within 24 hours.'}
                                            </p>
                                            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                                                <button
                                                    onClick={() => {
                                                        setSubmitted(false);
                                                        setForm({ ...form, subject: '', message: '' });
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-primary dark:text-primary-foreground"
                                                >
                                                    Send another message
                                                </button>
                                                <Link to="/" className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-secondary">
                                                    Back to home
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.form key="form" onSubmit={handleSubmit} className="p-5 sm:p-8">
                                            <div className="mb-7 flex flex-col gap-3 border-b border-slate-200 pb-6 dark:border-border sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-slate-950 dark:text-foreground">Send a message</h2>
                                                    <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">Choose the reason and add enough detail for a fast reply.</p>
                                                </div>
                                                <div className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-secondary dark:text-muted-foreground">
                                                    <selectedReason.icon className={`h-4 w-4 ${selectedReason.color}`} />
                                                    {selectedReason.label}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <fieldset>
                                                    <legend className="mb-3 block text-sm font-semibold text-slate-900 dark:text-foreground">Reason for contact</legend>
                                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                        {contactReasons.map((reason) => {
                                                            const isActive = form.category === reason.id;
                                                            return (
                                                                <button
                                                                    key={reason.id}
                                                                    type="button"
                                                                    onClick={() => setForm({ ...form, category: reason.id })}
                                                                    className={`min-h-[112px] rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm dark:hover:bg-secondary ${isActive ? reason.active : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-border dark:bg-card dark:text-foreground'}`}
                                                                    aria-pressed={isActive}
                                                                >
                                                                    <reason.icon className={`mb-3 h-5 w-5 ${reason.color}`} />
                                                                    <span className="block text-sm font-semibold">{reason.label}</span>
                                                                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-muted-foreground">{reason.hint}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </fieldset>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                                                        Name
                                                        <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name" className="mt-2 min-h-11 w-full rounded-md border-slate-200 bg-slate-50 dark:bg-input" />
                                                    </label>
                                                    <label className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                                                        Email
                                                        <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" className="mt-2 min-h-11 w-full rounded-md border-slate-200 bg-slate-50 dark:bg-input" />
                                                    </label>
                                                </div>

                                                <label className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                                                    Subject
                                                    <input name="subject" value={form.subject} onChange={handleChange} required placeholder="What should we know first?" className="mt-2 min-h-11 w-full rounded-md border-slate-200 bg-slate-50 dark:bg-input" />
                                                </label>

                                                <label className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                                                    Message
                                                    <textarea name="message" value={form.message} onChange={handleChange} required rows={6} placeholder="Share dates, event names, ticket IDs, account emails, screenshots, or anything else that helps." className="mt-2 w-full resize-none rounded-md border-slate-200 bg-slate-50 dark:bg-input" />
                                                </label>

                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary dark:text-primary-foreground"
                                                >
                                                    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-b-white" /> : <Send className="h-4 w-4" />}
                                                    {loading ? 'Sending...' : 'Send message'}
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-5">
                            <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm dark:border-border">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
                                        <LifeBuoy className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Need faster help?</h2>
                                        <p className="text-sm text-slate-300">Use the direct channel that fits your request.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {contactMethods.map((method) => (
                                    <div key={method.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
                                        <div className="flex gap-4">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${method.color}`}>
                                                <method.icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{method.label}</p>
                                                <p className="mt-1 break-words text-sm text-slate-700 dark:text-muted-foreground">{method.value}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{method.detail}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
                                <h3 className="text-sm font-semibold text-slate-950 dark:text-foreground">Helpful links</h3>
                                <div className="mt-3 divide-y divide-slate-100 dark:divide-border">
                                    {quickLinks.map((link) => (
                                        <Link key={link.to} to={link.to} className="flex items-center justify-between gap-3 py-3 text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-muted-foreground dark:hover:text-foreground">
                                            <span>{link.label}</span>
                                            <ArrowRight className="h-4 w-4 shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.aside>
                    </div>
                </section>
            </main>
        </div>
    );
}
