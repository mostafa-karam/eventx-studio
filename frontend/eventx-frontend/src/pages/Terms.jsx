import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, FileText, Mail, Scale, ShieldAlert } from 'lucide-react';

const sections = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: 'By using EventX Studio, you agree to comply with all applicable laws and our acceptable use policies. You retain ownership of your content. We may update features from time to time.',
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    items: ['Do not misuse the platform or attempt to access data you do not own.', 'Respect attendee privacy and consent requirements.', 'Payments and refunds are subject to organizer policies.'],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: 'EventX Studio is provided "as-is". To the maximum extent permitted by law, we are not liable for lost profits, revenues, data, or indirect damages.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: 'If you have questions about these terms, contact support via the app.',
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-background">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-border dark:bg-background/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-muted-foreground dark:hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link to="/privacy" className="hidden items-center gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900 dark:text-blue-300 sm:inline-flex">
            Privacy policy
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200/80 bg-white dark:border-border dark:bg-card">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
                <Scale className="h-4 w-4" />
                Legal terms
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-foreground sm:text-5xl">Terms of Service</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-muted-foreground sm:text-lg">
                The practical rules for using EventX Studio to create, manage, promote, and attend events.
              </p>
            </div>

            <div className="mt-8 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-3 dark:border-border">
              {[
                { icon: FileText, label: 'Last updated', value: 'Aug 2025' },
                { icon: BadgeCheck, label: 'Content', value: 'Yours' },
                { icon: ShieldAlert, label: 'Use', value: 'Responsible' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-secondary">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-300">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase text-slate-500 dark:text-muted-foreground">{item.label}</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-foreground">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card lg:sticky lg:top-6">
            <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-muted-foreground">Terms sections</p>
            <nav className="space-y-1">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground">
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card sm:p-8">
            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-slate-100 pb-8 last:border-b-0 last:pb-0 dark:border-border">
                  <h2 className="text-xl font-bold text-slate-950 dark:text-foreground">{section.title}</h2>
                  {section.items ? (
                    <ul className="mt-4 grid gap-3">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-muted-foreground">{section.body}</p>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-400/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-foreground">Questions about the terms?</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">Our support team can help clarify account, billing, or event policy questions.</p>
                </div>
                <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-primary dark:text-primary-foreground">
                  <Mail className="h-4 w-4" />
                  Contact us
                </Link>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
