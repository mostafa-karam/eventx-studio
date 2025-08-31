import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border bg-white shadow-sm text-blue-700 border-blue-100">
            Privacy & Data Protection
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: Aug 2025</p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg">Your privacy matters</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-gray-700">
            <p>
              We collect the minimum data necessary to operate EventX Studio and deliver core features like event
              creation, ticketing, and analytics. We never sell your data.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-1">
                <div className="sticky top-4 space-y-2">
                  <a href="#data-we-collect" className="block text-sm text-gray-700 hover:text-gray-900">Data we collect</a>
                  <a href="#how-we-use-data" className="block text-sm text-gray-700 hover:text-gray-900">How we use data</a>
                  <a href="#data-retention" className="block text-sm text-gray-700 hover:text-gray-900">Data retention</a>
                  <a href="#your-rights" className="block text-sm text-gray-700 hover:text-gray-900">Your rights</a>
                  <a href="#security" className="block text-sm text-gray-700 hover:text-gray-900">Security</a>
                  <a href="#contact" className="block text-sm text-gray-700 hover:text-gray-900">Contact</a>
                </div>
              </div>

              <div className="md:col-span-2 space-y-8">
                <section id="data-we-collect">
                  <h3 className="text-base font-semibold text-gray-900">Data We Collect</h3>
                  <ul className="list-disc pl-5">
                    <li>Account details: name, email, password (hashed), profile info</li>
                    <li>Event and ticket information you create or manage</li>
                    <li>Usage analytics: device type, pages visited, feature usage (aggregated)</li>
                    <li>Support interactions and feedback (if you contact us)</li>
                  </ul>
                </section>

                <section id="how-we-use-data">
                  <h3 className="text-base font-semibold text-gray-900">How We Use Data</h3>
                  <ul className="list-disc pl-5">
                    <li>Provide core features and personalize your experience</li>
                    <li>Secure accounts, prevent abuse, and detect fraud</li>
                    <li>Improve performance and inform product decisions</li>
                    <li>Send important service communications</li>
                  </ul>
                </section>

                <section id="data-retention">
                  <h3 className="text-base font-semibold text-gray-900">Data Retention</h3>
                  <p>
                    We retain data only as long as necessary to provide the service and comply with legal obligations.
                    You can request deletion of your account data; some records (e.g., transaction logs) may be
                    retained for compliance.
                  </p>
                </section>

                <section id="your-rights">
                  <h3 className="text-base font-semibold text-gray-900">Your Rights</h3>
                  <ul className="list-disc pl-5">
                    <li>Access, correct, or delete your personal data</li>
                    <li>Export your data (upon request)</li>
                    <li>Opt out of non-essential communications</li>
                  </ul>
                </section>

                <section id="security">
                  <h3 className="text-base font-semibold text-gray-900">Security</h3>
                  <p>
                    We use industry-standard security practices, including transport encryption, hashed passwords, and
                    access controls. Report vulnerabilities to our team via support.
                  </p>
                </section>

                <section id="contact">
                  <h3 className="text-base font-semibold text-gray-900">Contact</h3>
                  <p>
                    Questions about this policy? Contact support via the app or email <a className="text-blue-600 hover:underline" href="mailto:privacy@eventx.example">privacy@eventx.example</a>.
                  </p>
                </section>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
