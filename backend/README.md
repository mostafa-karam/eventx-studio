# Backend dev notes

Run server:

```powershell
npm install
npm run dev
```

Smoke test booking (requires a valid user JWT):

```powershell
# set env and run
$env:PAYMENT_TOKEN = '<user_jwt>' ; node test/book-smoke.js
```

The smoke test will request a test payment token then call `/api/tickets/book` with the issued `transactionId`.
