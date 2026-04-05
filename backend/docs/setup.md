# EventX Studio Backend Setup Guide

This guide covers everything you need to know to assemble, configure, and develop the EventX Studio Backend locally or in production.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0+` (LTS recommended).
- **Package Manager**: npm `v9+` or `pnpm` (pnpm is highly recommended due to the monorepo-style structure).
- **MongoDB**: `v6.0+` (Either local community server or Atlas Cloud).

## Installation

1. Switch into the backend directory:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   # Or using pnpm: pnpm install
   ```

## Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

### Critical Environment Variables Explained

The EventX backend strictly enforces the presence of certain environment variables. If they are missing, `server.js` will intentionally hard-crash on startup.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | `development`, `test`, or `production`. Dictates logging and error stack verbosity. | `development` |
| `PORT` | Listening port for Express. Defaults to `5000`. | `5000` |
| `MONGODB_URI` | **(Required)** Connection string to MongoDB. | `mongodb://localhost:27017/eventx` |
| `JWT_SECRET` | **(Required)** Cryptographic secret for signing auth tokens. (e.g. `openssl rand -hex 64`) | `supersecret` |
| `JWT_REFRESH_SECRET`| Cryptographic secret for rotation logic. Safely defaults to `JWT_SECRET + "_refresh"` if blank. | `superrefreshsecret` |
| `CSRF_SECRET` | **(Required)** Secret seed used by `csrf-csrf`. | `my_csrf_key` |
| `FRONTEND_URL` | Cross-Origin restriction URL, allows cookies and data to pass safely to Vite. | `http://localhost:5173` |

### Email Debugging Log
If you do not configure Nodemailer (`EMAIL_HOST`), the application will suppress SMTP transmission and instead route outbound emails as log outputs. Local debugging writes to your OS temp directory (e.g. `C:\Users\Admin\AppData\Local\Temp\eventx-emails.log`). 

---

## Running the Application

### Local Development
To start the backend with `nodemon` (auto-restarts on save):
```bash
npm run dev
```

### Production Execution
To start the backend cleanly without watchers:
```bash
npm start
```

## Initializing The Database

When you launch a clean MongoDB server, it will be empty.
We provide an exhaustive, hyper-realistic faker script to completely populate all features (Categories, Halls, Events, Users, Bookings).

Run the global seed script:
```bash
npm run seed
```

> [!TIP]
> The seeded admin credentials are always deterministic: **admin@eventx.com** / **password123**.
> You can also try **organizer@techx.com** or **venue@eventx.com**.
