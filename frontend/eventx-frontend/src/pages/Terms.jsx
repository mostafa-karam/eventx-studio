import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-gray-700">
            <p>Last updated: Aug 2025</p>
            <p>
              By using EventX Studio, you agree to comply with all applicable laws and our acceptable use policies. You
              retain ownership of your content. We may update features from time to time.
            </p>
            <h3>Acceptable Use</h3>
            <ul>
              <li>Do not misuse the platform or attempt to access data you do not own.</li>
              <li>Respect attendee privacy and consent requirements.</li>
              <li>Payments and refunds are subject to organizer policies.</li>
            </ul>
            <h3>Limitation of Liability</h3>
            <p>
              EventX Studio is provided "as-is". To the maximum extent permitted by law, we are not liable for lost
              profits, revenues, data, or indirect damages.
            </p>
            <h3>Contact</h3>
            <p>If you have questions about these terms, contact support via the app.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
