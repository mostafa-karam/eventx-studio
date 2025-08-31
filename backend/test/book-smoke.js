// Simple smoke test for booking endpoints
// Usage: PAYMENT_TOKEN=<user_jwt> node test/book-smoke.js
// Requires a running local server and a valid user JWT in PAYMENT_TOKEN env var

const fetch = require('node-fetch');
const API = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TOKEN = process.env.PAYMENT_TOKEN;

if (!TOKEN) {
    console.error('Please set PAYMENT_TOKEN env var to a valid user JWT');
    process.exit(1);
}

(async () => {
    try {
        // Get list of events
        const evRes = await fetch(`${API}/events`);
        const evJson = await evRes.json();
        const events = evJson.data?.events || [];
        if (!events.length) {
            console.error('No events available to test');
            return;
        }
        const ev = events.find(e => e.pricing && e.pricing.type !== 'free') || events[0];
        console.log('Using event:', ev._id, ev.title);

        // Request payment token
        const payRes = await fetch(`${API}/payments/test-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
            body: JSON.stringify({ eventId: ev._id })
        });
        const payJson = await payRes.json();
        if (!payRes.ok) throw new Error('Failed to get payment token: ' + JSON.stringify(payJson));
        const { transactionId, token } = payJson.data;
        console.log('Got tx:', transactionId);

        // Book one ticket
        const bookRes = await fetch(`${API}/tickets/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
            body: JSON.stringify({ eventId: ev._id, paymentMethod: 'credit_card', transactionId })
        });
        const bookJson = await bookRes.json();
        console.log('Book response:', bookRes.status, bookJson);
    } catch (err) {
        console.error(err);
    }
})();
