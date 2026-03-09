import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Users, Building2, Star, Calendar, ChevronRight, Wifi, Monitor, Coffee, Car, Accessibility, Wind } from 'lucide-react';

const halls = [
    { name: 'Grand Ballroom', capacity: 1000, size: '2,500 m²', price: '$5,000/day', tag: 'Events', color: 'from-purple-600 to-indigo-600' },
    { name: 'Conference Hall A', capacity: 300, size: '800 m²', price: '$1,500/day', tag: 'Conferences', color: 'from-blue-600 to-cyan-600' },
    { name: 'Workshop Studio', capacity: 80, size: '200 m²', price: '$400/day', tag: 'Workshops', color: 'from-emerald-600 to-teal-600' },
    { name: 'Exhibition Hall', capacity: 600, size: '1,800 m²', price: '$3,000/day', tag: 'Exhibitions', color: 'from-orange-600 to-rose-600' },
];

const amenities = [
    { icon: Wifi, label: 'High-Speed WiFi' },
    { icon: Monitor, label: 'AV Equipment' },
    { icon: Coffee, label: 'Catering Services' },
    { icon: Car, label: 'Parking (500 spots)' },
    { icon: Accessibility, label: 'Fully Accessible' },
    { icon: Wind, label: 'Climate Control' },
];

const stats = [
    { value: '10,000+', label: 'Events Hosted' },
    { value: '500K+', label: 'Attendees Served' },
    { value: '15', label: 'Years of Excellence' },
    { value: '98%', label: 'Client Satisfaction' },
];

export default function VenueLandingPage() {
    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Hero */}
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900" />
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #6366f1 0%, transparent 50%), radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 50%)' }} />
                <div className="relative text-center text-white px-6 max-w-5xl mx-auto">
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">Rated #1 Venue in the Region</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                        EventX <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Studio</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-indigo-200 mb-4 max-w-3xl mx-auto leading-relaxed">
                        A world-class multi-hall venue for conferences, concerts, exhibitions, workshops, and private events.
                    </p>
                    <p className="text-indigo-300 mb-10 flex items-center justify-center gap-2">
                        <MapPin className="w-4 h-4" /> 123 Venue Boulevard, Downtown District
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/halls"
                            className="inline-flex items-center gap-2 bg-white text-indigo-900 font-bold px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all shadow-2xl hover:shadow-white/20 hover:-translate-y-1">
                            Browse Halls <ChevronRight className="w-5 h-5" />
                        </Link>
                        <Link to="/events"
                            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all">
                            Upcoming Events
                        </Link>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
            </section>

            {/* Stats */}
            <section className="py-16 px-6 bg-white">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map(s => (
                        <div key={s.label} className="text-center">
                            <div className="text-4xl font-black text-indigo-600 mb-2">{s.value}</div>
                            <div className="text-gray-500 font-medium">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Halls */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black text-gray-900 mb-4">Our Halls</h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            From intimate workshops to grand exhibitions — we have the perfect space for any occasion.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {halls.map(hall => (
                            <div key={hall.name} className="group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                <div className={`h-40 bg-gradient-to-br ${hall.color} relative flex items-end p-6`}>
                                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                                        {hall.tag}
                                    </span>
                                    <Building2 className="absolute right-6 top-6 w-12 h-12 text-white/30" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{hall.name}</h3>
                                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Up to {hall.capacity.toLocaleString()}</span>
                                        <span>{hall.size}</span>
                                        <span className="font-semibold text-indigo-600">{hall.price}</span>
                                    </div>
                                    <Link to="/halls"
                                        className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 group-hover:gap-3 transition-all">
                                        Book This Hall <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <Link to="/halls"
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg">
                            View All Halls <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Amenities */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black text-gray-900 mb-4">Venue Amenities</h2>
                        <p className="text-gray-500 text-lg">Everything you need for a seamless, memorable event.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {amenities.map(a => (
                            <div key={a.label} className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <a.icon className="w-6 h-6 text-indigo-600" />
                                </div>
                                <span className="font-semibold text-gray-800">{a.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="py-20 px-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-black mb-4">Ready to Book?</h2>
                    <p className="text-indigo-200 text-lg mb-10">Our team is available 7 days a week to help you plan your perfect event.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {[
                            { icon: Phone, label: '+1 (555) 000-1234', sub: 'Mon–Fri 9am–6pm' },
                            { icon: Mail, label: 'hello@eventxstudio.com', sub: 'We reply within 2 hours' },
                            { icon: Clock, label: 'Open 7 Days', sub: '6:00 AM – 11:00 PM' },
                        ].map(c => (
                            <div key={c.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <c.icon className="w-6 h-6 text-indigo-300 mx-auto mb-3" />
                                <p className="font-semibold">{c.label}</p>
                                <p className="text-indigo-300 text-sm">{c.sub}</p>
                            </div>
                        ))}
                    </div>
                    <Link to="/contact"
                        className="inline-flex items-center gap-2 bg-white text-indigo-900 font-bold px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all shadow-2xl">
                        Get in Touch <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
