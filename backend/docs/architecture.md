# Backend Architecture

EventX Studio Backend is designed fundamentally around an expanded **MVC+S (Model-View-Controller + Service)** architectural pattern mounted on `Express.js` and `Mongoose`. By offloading heavy business logic out of the Controllers and into a dedicated `services` layer, the system maintains strict DRY (Don't Repeat Yourself) compliance and makes atomic actions (like simultaneously booking a ticket and reducing empty seats) highly reliable.

## Data Flow Pipeline

When a client makes an HTTP request to the API, it follows a strict lifecycle ring:

````mermaid
graph TD
    A[Client Request HTTP] --> B[Express Router 'routes/']
    B --> C{Security Middleware 'middleware/'}
    C -->|JWT/CSRF Fail| X[Error Handler '40X']
    C -->|Pass| D[Controller 'controllers/']
    D --> E{Validation check}
    E -->|Invalid Params| X
    E -->|Valid| F[Service Layer 'services/']
    F --> G[(MongoDB - 'models/')]
    G --> F
    F --> D
    D --> H[Client Response JSON]
    X --> H
````

### 1. Routing (`routes/`)
All endpoints are strictly defined in `server.js` and mounted securely. 
For example, `/api/events` maps to `routes/events.js`. The route files are exceedingly thin; their only job is to pipe the URL to the exact right Controller and string together any preceding Middlewares (like `auth.js` or `RBAC` role checks).

### 2. Middleware Security Ring (`middleware/`)
Before execution can reach the Controller, requests must pass through standard Middlewares:
- **Helmet**: Shields app from well-known web vulnerabilities by setting HTTP headers.
- **csrf-csrf**: Verifies X-CSRF-Token headers against session hashes.
- **auth / rbac**: `auth.protect` asserts that a user is successfully logged in (and refreshes tokens if applicable). `rbac.authorize('admin')` validates the role explicitly.

### 3. Controllers (`controllers/`)
Controllers process the exact parameters of the HTTP request. They handle `req.body`, `req.params`, and parse out `req.user`.
A successful controller does almost zero "real calculations". It simply asks the Service Layer to do the heavy lifting, wraps the Service's data into a `{ success: true, data: X }` JSON envelope, and transmits the `res`.

### 4. Service Layer (`services/`)
*This is the heart of the custom EventX MVC+S logic.*
Features that mutate data across multiple distinct Database Models simultaneously (e.g., booking a ticket = `Ticket.create` + `Event.analytics++` + `Notification.create`) are grouped atomically into the Service layer.

If a controller attempts these multi-table operations independently, the system becomes highly prone to Race Conditions. The Service Layer utilizes localized transactions and locking mechanisms to execute them safely.

### 5. Models (`models/`)
Mongoose defines the exact casting schemas for the database.
All schemas exploit advanced features such as:
- **Soft Deletion Plugins**: Objects aren't wiped; they are `isDeleted = true`.
- **Pre-Save Hooks**: Hashing passwords (`User`) and auto-generating slugs.
- **Virtuals**: Dynamically calculating Event statuses based on the date without permanently saving them locally.

---

## Directory Roles & Guidelines

- **`config/`**: Setup variables, database boots, passport strategies, and `.env` parsing algorithms.
- **`utils/`**: Stateless helper classes (sendEmail hooks, winston Logging integrations, asynchronous catch wrappers).
- **`logs/`**: If winston doesn't push logs to an external Datadog/Splunk instance, it aggregates here.

## Error Handling Paradigm

Error handling is universally centralized.
Controllers are typically wrapped in an `asyncHandler` logic (or massive try/catch blocks). Instead of formatting `res.status(404)` inside deep files, `services` literally `throw new Error('Not found')` containing an `error.status = 404`. 
The catch blocks pass this down to the universal `error.js` final middleware, which guarantees clients *always* receive a normalized error layout:
```json
{
  "success": false,
  "message": "Actual failure reason"
}
```
