# Comprehensive Codebase Map

This document exhaustively breaks down every single module in the `backend/` directory, acting as a compass for new developers onboarding into the EventX Studio backend.

## Root Level Anatomy
```text
backend/
├── __tests__/       # Automated Testing Suites 
├── config/          # Configurations & Native Setups
├── controllers/     # Express Request Handlers
├── docs/            # EventX Knowledge Base
├── logs/            # Winston Log Artifacts
├── middleware/      # Interceptors & Security Checks
├── models/          # Data Structures (Mongoose)
├── routes/          # API Map definitions
├── scripts/         # Database Manipulators & Seeders
├── services/        # EventX Core Logic & Atomic DB Operations
├── uploads/         # Local Storage (if AWS S3 disabled)
├── utils/           # Stateless Generic Helpers
├── package.json     # Node Dependencies & NPM run scripts
└── server.js        # The Node Application Bootstrap File
```

---

## 1. `config/` (Bootstrap Configurations)
Contains immutable system bootstrapping mechanisms that need to exist prior to the application layer starting.
- **`db.js`**: Standardized fallback logic managing connectivity with Mongoose URI parsing.
- **`passport.js`**: (If configured) Outlines external authentication logic (e.g., Google OAuth).

## 2. `utils/` (Stateless Helpers)
Standalone files encapsulating complex, repeatable abstractions out of the mainstream paths.
- **`logger.js`**: Instantiates `winston`, setting up colorized console transmissions and persistent Daily/File transports matching into `logs/app.log`.
- **`sendEmail.js`**: Defines the `nodemailer` transporter. Pulls configurations dynamically from `process.env` and maps output to fallback systems if credentials are omitted.
- **`asyncHandler.js`**: A vital Node paradigm encapsulating generic Try/Catch error catching automatically resolving rejected Promises asynchronously to the global Error Handler.
- **`generateToken.js`**: Helper functions wrapping `jsonwebtoken.sign`.

## 3. `scripts/` (Global Database Operators)
Isolated scripts leveraging the `/models` strictly out of the active server lifecycle.
- **`seed.js`**: The master dataset building script. Flushes collections and uses `@faker-js/faker` to synthesize robust local testing states.
- **`verify-countries.js`**: Corrects validation issues in old legacy user databases by mapping misspelled geographical coordinates.
- **Data Cleanup**: Smaller scripts like `sync-event-stats.js` exist for background chron jobs forcing internal recalculations of seated counts against true ticket checks.

## 4. `uploads/` (Static Deliverables)
A publicly mapped express root capturing multipart/form-data.
- Used specifically by `multer` (in `/middleware/upload.js`) to locally store User Avatars, Event Banners, and physical Hall layout blueprints if the server lacks AWS S3 Bucket credentials.

## 5. `server.js` (The Core Entry Point)
A dense file fulfilling standard execution lifecycle phases:
1. **Preflight Checks**: Verifies existence of required `.env` attributes (`JWT_SECRET`, `MONGODB_URI`). Hard exits if deficient.
2. **Setup Subsystems**: Executes `connectDB()`, initializes the internal winston logger.
3. **Bind Middlewares**: Express properties (`express.json()`), CORS, Rate Limiters, CSRF mappings, Helmet injection.
4. **Mount Routes**: Overlays the `/routes` directories into `/api/*`.
5. **Attach Trailing Handlers**: Hooks `errorHandler` middleware definitively to catch all 500 exceptions escaping routes sequentially.
6. **Listener Action**: Fires `app.listen()` broadcasting server up-state via port `5000`.
