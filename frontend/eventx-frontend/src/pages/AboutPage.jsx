import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Clock, Calendar, Users, Building2, Shield, Star, ArrowRight, Globe } from 'lucide-react';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-600 text-white grid place-items-center font-bold shadow-sm">EX</div>
                        <span className="text-lg font-semibold text-gray-900">EventX Studio</span>
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/events" className="text-gray-600 hover:text-gray-900">Events</Link>
                        <Link to="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</Link>
                        <Link to="/halls" className="text-gray-600 hover:text-gray-900">Halls</Link>
                        <Link to="/auth" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Sign in</Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">About EventX Studio</h1>
                    <p className="mt-4 text-xl text-blue-100 max-w-2xl mx-auto">
                        The premier venue management and event hosting platform. We connect organizers with world-class halls to create unforgettable experiences.
                    </p>
                </div>
            </section>

            <main className="max-w-7xl mx-auto px-6 py-16">
                {/* Mission */}
                <section className="text-center mb-20">
                    <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
                    <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        EventX Studio simplifies venue management by providing a centralized platform where venue administrators can manage halls,
                        organizers can book spaces and create events, and attendees can discover and purchase tickets — all in one place.
                    </p>
                </section>

                {/* What We Offer */}
                <section className="mb-20">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">What We Offer</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Building2, title: 'Multiple Halls', desc: 'Various hall sizes and configurations for conferences, concerts, workshops, exhibitions, and more.', color: 'text-blue-600', bg: 'bg-blue-50' },
                            { icon: Calendar, title: 'Easy Booking', desc: 'Reserve halls for specific dates and times with our streamlined booking approval system.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { icon: Users, title: 'Attendee Management', desc: 'Sell tickets online, manage seat assignments, and track attendance with QR code check-in.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { icon: Shield, title: 'Secure Platform', desc: '2FA authentication, session management, and enterprise-grade security for all users.', color: 'text-red-600', bg: 'bg-red-50' },
                            { icon: Star, title: 'Analytics & Insights', desc: 'Track event performance, revenue, and attendee demographics with real-time dashboards.', color: 'text-amber-600', bg: 'bg-amber-50' },
                            { icon: Globe, title: 'Marketing Tools', desc: 'Built-in campaign management to promote your events and reach your target audience.', color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map(item => (
                            <div key={item.title} className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
                                <div className={`p-3 rounded-lg ${item.bg} w-fit`}>
                                    <item.icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works */}
                <section className="mb-20">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { step: '1', title: 'Browse Halls', desc: 'Explore available halls with capacity, equipment, and pricing details' },
                            { step: '2', title: 'Book a Hall', desc: 'Select your dates and submit a booking request for venue approval' },
                            { step: '3', title: 'Create Event', desc: 'Set up your event with details, pricing, and seat configuration' },
                            { step: '4', title: 'Sell Tickets', desc: 'Attendees browse events and purchase tickets online' },
                        ].map(item => (
                            <div key={item.step} className="text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mx-auto">
                                    {item.step}
                                </div>
                                <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
                                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact */}
                <section id="contact" className="bg-white rounded-2xl border p-10">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Contact Us</h2>
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Have questions about our venue or need help with an event? Get in touch with our team — we're here to help.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Email</p>
                                        <p className="text-sm text-gray-500">support@eventx.studio</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <Phone className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Phone</p>
                                        <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Address</p>
                                        <p className="text-sm text-gray-500">123 Event Avenue, Conference City, CC 10001</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Business Hours</p>
                                        <p className="text-sm text-gray-500">Mon-Fri: 9:00 AM - 6:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent! We will get back to you soon.'); }}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What is this about?" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea required rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Tell us more..." />
                                </div>
                                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                    Send Message
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-10 text-sm text-gray-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>© {new Date().getFullYear()} EventX Studio</div>
                    <div className="flex items-center gap-4">
                        <Link to="/terms" className="hover:text-gray-700">Terms</Link>
                        <Link to="/privacy" className="hover:text-gray-700">Privacy</Link>
                        <a href="#contact" className="hover:text-gray-700">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AboutPage;
