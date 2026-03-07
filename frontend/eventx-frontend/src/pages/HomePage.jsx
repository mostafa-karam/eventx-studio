import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, BarChart3, Megaphone, Ticket, ShieldCheck, Sparkles, Star, ArrowRight, Users, Globe, Zap, TrendingUp, Menu, X } from 'lucide-react';

const HomePage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({ tickets: 0, rating: 0, uplift: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Event Director at TechCorp",
      content: "EventX Studio transformed how we manage our conferences. The analytics alone saved us 20+ hours per event.",
      rating: 5,
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Community Manager",
      content: "The marketing tools are incredible. We saw a 45% increase in attendance after switching to EventX Studio.",
      rating: 5,
      avatar: "MR"
    },
    {
      name: "Emily Watson",
      role: "Startup Founder",
      content: "Simple, powerful, and affordable. Perfect for our growing startup's event needs.",
      rating: 5,
      avatar: "EW"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animateStats = () => {
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;

      let step = 0;
      const timer = setInterval(() => {
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setAnimatedStats({
          tickets: Math.floor(120000 * easeOut),
          rating: (9.4 * easeOut).toFixed(1),
          uplift: Math.floor(37 * easeOut)
        });

        step++;
        if (step > steps) clearInterval(timer);
      }, stepTime);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateStats();
        observer.disconnect();
      }
    });

    const statsSection = document.getElementById('stats-section');
    if (statsSection) observer.observe(statsSection);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white grid place-items-center font-bold shadow-sm">EX</div>
            <span className="text-lg sm:text-xl font-semibold text-gray-900">EventX Studio</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
            <Link to="/events" className="hover:text-gray-900">Events</Link>
            <Link to="/halls" className="hover:text-gray-900">Halls</Link>
            <Link to="/calendar" className="hover:text-gray-900">Calendar</Link>
            <a href="#features" className="hover:text-gray-900">Features</a>
            <Link to="/about" className="hover:text-gray-900">About</Link>
            <Link to="/contact" className="hover:text-gray-900">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:flex px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 items-center justify-center">Sign in</Link>
            <Link to="/auth" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow flex items-center justify-center">Get started</Link>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-6 py-4 space-y-3 text-sm text-gray-700 shadow-lg">
            <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">Events</Link>
            <Link to="/halls" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">Halls</Link>
            <Link to="/calendar" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">Calendar</Link>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">Features</a>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">About</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">Contact</Link>
            <Link to="/faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-600">FAQ</Link>
            <div className="pt-2 border-t flex gap-3">
              <Link to="/auth" className="flex-1 text-center py-2 rounded-md border border-gray-300 hover:bg-gray-50">Sign in</Link>
              <Link to="/auth" className="flex-1 text-center py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Get started</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm text-blue-700 border-blue-200">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> All‑in‑one event platform
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Plan, promote, and
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">sell out</span> your events
            </h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Create beautiful event pages, run targeted campaigns, accept payments, and track success — all in one powerful dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="group px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                Create your account
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">Learn more</a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2 hover:text-emerald-600 transition-colors"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure auth</div>
              <div className="flex items-center gap-2 hover:text-blue-600 transition-colors"><BarChart3 className="h-4 w-4 text-blue-600" /> Real‑time insights</div>
              <div className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><Ticket className="h-4 w-4 text-indigo-600" /> Ticketing built‑in</div>
            </div>
          </div>

          {/* Enhanced Visual Panel */}
          <div className="relative animate-fade-in-up animation-delay-300">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-xl"></div>
            <div className="relative rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-blue-50 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Upcoming
                  </div>
                  <div className="font-semibold text-gray-900">Product Launch 2025</div>
                  <div className="text-sm text-emerald-600 mt-1 font-medium">Tickets sold: 1,248</div>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-indigo-50 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Campaign CTR
                  </div>
                  <div className="font-semibold text-gray-900">5.3%</div>
                  <div className="mt-2 h-2 bg-gray-100 rounded overflow-hidden">
                    <div className="h-2 w-2/3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-emerald-50 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Satisfaction
                  </div>
                  <div className="font-semibold text-gray-900">4.7 / 5</div>
                  <div className="text-sm text-gray-500 mt-1">Based on 862 reviews</div>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-green-50 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Revenue
                  </div>
                  <div className="font-semibold text-green-600">$83,420</div>
                  <div className="text-sm text-gray-500 mt-1">Last 30 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Features */}
        <section id="features" className="mt-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to run great events</h2>
            <p className="mt-4 text-lg text-gray-600">Powerful tools, simple workflows, exceptional results.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <div className="group p-6 rounded-xl border bg-white hover:shadow-lg hover:border-blue-200 transition-all duration-300">
              <div className="flex items-center gap-3 text-blue-700 font-semibold">
                <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <CalendarDays className="h-5 w-5" />
                </div>
                Create
              </div>
              <div className="mt-4 font-semibold text-gray-900 text-lg">Design stunning event pages</div>
              <p className="mt-3 text-gray-600 leading-relaxed">Use professional templates, categories, and rich media to craft the perfect attendee experience.</p>
              <div className="mt-4 text-sm text-blue-600 font-medium group-hover:text-blue-700">Learn more →</div>
            </div>
            <div className="group p-6 rounded-xl border bg-white hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
              <div className="flex items-center gap-3 text-indigo-700 font-semibold">
                <div className="p-2 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                  <Megaphone className="h-5 w-5" />
                </div>
                Engage
              </div>
              <div className="mt-4 font-semibold text-gray-900 text-lg">Market to your audience</div>
              <p className="mt-3 text-gray-600 leading-relaxed">Built‑in campaigns, smart notifications, and audience insights to maximize attendance.</p>
              <div className="mt-4 text-sm text-indigo-600 font-medium group-hover:text-indigo-700">Learn more →</div>
            </div>
            <div className="group p-6 rounded-xl border bg-white hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
              <div className="flex items-center gap-3 text-emerald-700 font-semibold">
                <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <BarChart3 className="h-5 w-5" />
                </div>
                Analyze
              </div>
              <div className="mt-4 font-semibold text-gray-900 text-lg">Track performance</div>
              <p className="mt-3 text-gray-600 leading-relaxed">Real‑time dashboards and detailed analytics to measure success and optimize future events.</p>
              <div className="mt-4 text-sm text-emerald-600 font-medium group-hover:text-emerald-700">Learn more →</div>
            </div>
          </div>
        </section>

        {/* Animated Stats */}
        <section id="stats-section" className="mt-20">
          <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-wider">Platform highlights (demo data)</p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-8 rounded-xl border bg-gradient-to-br from-white to-blue-50 text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl font-bold text-blue-600">{animatedStats.tickets.toLocaleString()}+</div>
              <div className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-1">
                <Ticket className="h-4 w-4" /> Tickets processed
              </div>
            </div>
            <div className="p-8 rounded-xl border bg-gradient-to-br from-white to-emerald-50 text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl font-bold text-emerald-600">{animatedStats.rating}/10</div>
              <div className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-1">
                <Star className="h-4 w-4" /> Average organizer rating
              </div>
            </div>
            <div className="p-8 rounded-xl border bg-gradient-to-br from-white to-indigo-50 text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl font-bold text-indigo-600">+{animatedStats.uplift}%</div>
              <div className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" /> Attendance uplift
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900">Loved by event organizers worldwide</h3>
            <p className="mt-2 text-gray-600">See what our customers have to say about their experience.</p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl border bg-white shadow-lg">
              <div className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-lg text-gray-700 mb-6 leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {testimonials[currentTestimonial].avatar}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{testimonials[currentTestimonial].name}</div>
                    <div className="text-sm text-gray-600">{testimonials[currentTestimonial].role}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-6 gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  onClick={() => setCurrentTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-16">
          <h3 className="text-xl font-semibold text-gray-900">Frequently asked questions</h3>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border bg-white">
              <div className="font-medium text-gray-900">Can I sell tickets?</div>
              <p className="mt-2 text-sm text-gray-600">Yes, built‑in ticketing lets you create tiers, track sales, and scan at the door.</p>
            </div>
            <div className="p-6 rounded-xl border bg-white">
              <div className="font-medium text-gray-900">Do you support teams?</div>
              <p className="mt-2 text-sm text-gray-600">Collaborate with admins and assign roles for secure access control.</p>
            </div>
            <div className="p-6 rounded-xl border bg-white">
              <div className="font-medium text-gray-900">Is there an API?</div>
              <p className="mt-2 text-sm text-gray-600">You can integrate data with your stack. Contact us for access.</p>
            </div>
            <div className="p-6 rounded-xl border bg-white">
              <div className="font-medium text-gray-900">Can I migrate my data?</div>
              <p className="mt-2 text-sm text-gray-600">We provide import tools and support to bring your events over.</p>
            </div>
          </div>
        </section>

        {/* Enhanced Final CTA */}
        <section id="pricing" className="mt-24 rounded-3xl border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border bg-white shadow-sm text-blue-700 border-blue-200 mb-6">
              <Users className="h-4 w-4" /> Join 10,000+ event organizers
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to host your best event yet?</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Join EventX Studio today and transform how you create, promote, and manage events. Get started in minutes.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth" className="group px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                Get started — it's free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="text-gray-600 hover:text-gray-800 underline-offset-4 hover:underline transition-colors">See features first</a>
            </div>
            <div className="mt-8 flex justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                Free forever plan
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm">EX</div>
                <span className="font-semibold text-gray-900">EventX Studio</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">The all-in-one platform for venue management and event hosting.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link to="/events" className="hover:text-gray-700">Browse Events</Link></li>
                <li><Link to="/halls" className="hover:text-gray-700">Explore Halls</Link></li>
                <li><Link to="/calendar" className="hover:text-gray-700">Event Calendar</Link></li>
                <li><Link to="/auth" className="hover:text-gray-700">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link to="/about" className="hover:text-gray-700">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-gray-700">Contact</Link></li>
                <li><Link to="/terms" className="hover:text-gray-700">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-gray-700">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:support@eventx.studio" className="hover:text-gray-700">support@eventx.studio</a></li>
                <li><a href="tel:+15551234567" className="hover:text-gray-700">+1 (555) 123-4567</a></li>
                <li><Link to="/faq" className="hover:text-gray-700">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-gray-700">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <div>© {new Date().getFullYear()} EventX Studio. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-gray-600">Twitter</a>
              <a href="#" className="hover:text-gray-600">LinkedIn</a>
              <a href="#" className="hover:text-gray-600">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
