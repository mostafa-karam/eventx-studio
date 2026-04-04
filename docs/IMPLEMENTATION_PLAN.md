# EventX Studio Implementation Plan

**Generated:** April 4, 2026  
**Based on:** Repository Audit Findings  
**Workspace:** `M:\Privet\Prog lang\MAIM\eventx-studio`

## Overview

This implementation plan addresses all critical, high, and medium-priority findings from the repository audit. The plan is organized into phases with clear exit criteria, prioritized by risk and impact.

**Total Estimated Effort:** 40-50 hours  
**Priority Order:** Security → Functionality → Reliability → Quality  

## Phase 0: Restore Safe Delivery Guardrails

**Goal:** Make the codebase testable and fix immediate runtime issues  
**Duration:** 4-6 hours  
**Exit Criteria:** Tests run successfully, frontend lint passes without critical errors  

### Tasks

#### 0.1 Fix Jest ESM Compatibility
**Files:** `backend/controllers/uploadController.js`, `backend/package.json`  
**Problem:** Jest cannot parse ESM `file-type` dependency  
**Implementation:**
```javascript
// In uploadController.js, change:
const { fileTypeFromBuffer } = await import('file-type');

// To:
let fileTypeFromBuffer;
try {
  const fileType = await import('file-type');
  fileTypeFromBuffer = fileType.fileTypeFromBuffer;
} catch (err) {
  // Fallback for test environment
  fileTypeFromBuffer = () => ({ mime: 'application/octet-stream' });
}
```
**Test:** Run `npm test` in backend directory  

#### 0.2 Fix BookingPage Runtime Errors
**Files:** `frontend/eventx-frontend/src/pages/BookingPage.jsx`  
**Problem:** Undefined `paymentDetails` state causes crashes  
**Implementation:**
- Remove `paymentDetails` state declaration (already done)
- Ensure `handleProcessPayment` handles free vs paid bookings correctly
- Add proper error boundaries around payment flow

#### 0.3 Add Smoke Test Suite
**Files:** `backend/__tests__/booking.test.js`, `backend/__tests__/halls.test.js`  
**Implementation:**
- Create tests for basic auth flow
- Test free booking creation
- Test hall listing and basic booking validation
- Test ticket retrieval

#### 0.4 Reduce Critical Lint Errors
**Files:** `frontend/eventx-frontend/eslint.config.js`  
**Implementation:**
- Fix undefined variable references
- Add missing prop validations
- Remove unused imports

## Phase 1: Secure Auth and Payments

**Goal:** Eliminate critical security vulnerabilities  
**Duration:** 8-10 hours  
**Exit Criteria:** Session revocation works, no raw card data in codebase, paid booking functional  

### Tasks

#### 1.1 Implement Effective Session Revocation
**Files:** `backend/middleware/auth.js`  
**Problem:** Session deletion doesn't invalidate tokens  
**Implementation:**
```javascript
// In authenticate middleware, after finding user:
if (decoded.sessionId) {
  req.sessionId = decoded.sessionId;
  const session = user.activeSessions?.find(s => s.sessionId === decoded.sessionId);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Session has been revoked. Please log in again.'
    });
  }
  // ... rest of session update logic
}
```

#### 1.2 Remove Raw Card Data Collection
**Files:** `frontend/eventx-frontend/src/pages/BookingPage.jsx`, `backend/controllers/paymentsController.js`  
**Implementation:**
- Remove payment form fields from BookingPage
- Remove `paymentDetails` parameter from payments controller
- Update processPayment to return token without card data
- Modify booking confirmation to use payment tokens

#### 1.3 Implement PSP Token-Based Payments
**Files:** `backend/controllers/bookingController.js`, `backend/controllers/paymentsController.js`  
**Implementation:**
- Modify booking confirmation to validate payment tokens
- Update amount verification to handle discounted prices
- Add payment token verification before booking creation

#### 1.4 Fix Coupon Amount Validation
**Files:** `backend/controllers/bookingController.js`  
**Implementation:**
```javascript
// Calculate expected amount considering coupon
let expectedAmount = event.pricing?.amount || 0;
if (couponCode && event.pricing?.type === 'paid') {
  const Coupon = require('../models/Coupon');
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  if (coupon && coupon.isValid) {
    if (coupon.discountType === 'percentage') {
      expectedAmount = expectedAmount - (expectedAmount * (coupon.discountValue / 100));
    } else {
      expectedAmount = Math.max(0, expectedAmount - coupon.discountValue);
    }
  }
}
```

## Phase 2: Repair Cross-System Contracts

**Goal:** Fix API contract mismatches between frontend and backend  
**Duration:** 10-12 hours  
**Exit Criteria:** Hall booking, tickets, and notifications work end-to-end  

### Tasks

#### 2.1 Normalize Hall Booking Contracts
**Files:** `backend/middleware/validators.js`, `backend/controllers/hallBookingsController.js`, `frontend/eventx-frontend/src/components/organizer/HallBookingForm.jsx`  
**Implementation:**
- Define canonical hall booking DTO:
```javascript
{
  hall: ObjectId, // required
  startDate: Date, // required
  endDate: Date, // required
  notes: String, // optional
  event: ObjectId, // optional
  organizer: ObjectId // auto-populated
}
```
- Update all frontend forms to send this shape
- Update validator to enforce this contract

#### 2.2 Add Public Hall Detail Route
**Files:** `backend/routes/public.js`, `backend/controllers/publicController.js`  
**Implementation:**
```javascript
// In public.js
router.get('/halls/:id', publicController.getHallDetail);

// In publicController.js
exports.getHallDetail = async (req, res) => {
  const hall = await Hall.findById(req.params.id)
    .populate('venue', 'name')
    .select('-__v');
  if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });
  res.json({ success: true, data: { hall } });
};
```

#### 2.3 Fix Organizer Ticket Management
**Files:** `backend/routes/tickets.js`, `backend/controllers/ticketsController.js`, `frontend/eventx-frontend/src/components/organizer/OrganizerTickets.jsx`  
**Implementation:**
- Add organizer ticket list endpoint:
```javascript
// GET /api/tickets/organizer
exports.getOrganizerTickets = async (req, res) => {
  const tickets = await Ticket.find({
    'event.organizer': req.user._id
  }).populate('event user').sort({ createdAt: -1 });
  res.json({ success: true, data: { tickets } });
};
```
- Update frontend to use this endpoint

#### 2.4 Implement QR Check-In Flow
**Files:** `backend/controllers/ticketsController.js`, `frontend/eventx-frontend/src/components/admin/CheckInDashboard.jsx`  
**Implementation:**
- Add QR lookup endpoint:
```javascript
// POST /api/tickets/lookup-qr
exports.lookupByQR = async (req, res) => {
  const { qrCode } = req.body;
  // Decode and find ticket
  const ticket = await Ticket.findOne({ qrCode }).populate('event');
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.json({ success: true, data: { ticket } });
};
```
- Update check-in to use ticket ID from lookup

#### 2.5 Fix Notification Contracts
**Files:** `backend/controllers/notificationsController.js`, `frontend/eventx-frontend/src/components/user/UserNotifications.jsx`  
**Implementation:**
- Implement real mutation endpoints:
```javascript
exports.markAsRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
};
```
- Update frontend to use PATCH methods and correct response shape

## Phase 3: Correct Data Model Drift

**Goal:** Fix misleading or broken domain behavior  
**Duration:** 6-8 hours  
**Exit Criteria:** Domain behavior matches UI expectations  

### Tasks

#### 3.1 Fix Review Soft Delete
**Files:** `backend/models/Review.js`, `backend/controllers/reviewsController.js`  
**Implementation:**
- Update queries to exclude soft-deleted reviews:
```javascript
const reviews = await Review.find({ 
  event: req.params.eventId,
  deletedAt: { $exists: false }
});
```
- Remove unique index or modify to allow re-reviews after deletion

#### 3.2 Fix User Status Handling
**Files:** `backend/controllers/usersController.js`, `backend/models/User.js`  
**Implementation:**
- Change controller to use `isActive` field:
```javascript
user.isActive = status === 'active';
await user.save();
```

#### 3.3 Centralize Audit Constants
**Files:** `backend/models/AuditLog.js`, `backend/controllers/couponController.js`  
**Implementation:**
- Create audit constants file:
```javascript
// backend/utils/auditConstants.js
module.exports = {
  ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login'
  },
  RESOURCES: {
    USER: 'user',
    COUPON: 'coupon',
    EVENT: 'event'
  }
};
```

#### 3.4 Standardize Ticket Response Shape
**Files:** `backend/controllers/ticketsController.js`  
**Implementation:**
- Ensure all endpoints return consistent shape:
```javascript
{
  ticketId: ticket.ticketId,
  ticketNumber: ticket.ticketId, // alias for compatibility
  qrCodeImage: qrCodeDataUrl,
  // ... other fields
}
```

## Phase 4: Operational Hardening

**Goal:** Improve development and deployment experience  
**Duration:** 8-10 hours  
**Exit Criteria:** Fresh setup works, CI validates core flows  

### Tasks

#### 4.1 Update Documentation
**Files:** `README.md`, `backend/docs/setup.md`, `backend/.env.example`  
**Implementation:**
- Remove claims about Docker deployment
- Update env example to mark required fields clearly
- Add actual setup steps that work

#### 4.2 Add Frontend Environment Template
**Files:** `frontend/eventx-frontend/.env.example`  
**Implementation:**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

#### 4.3 Add CI Workflow
**Files:** `.github/workflows/ci.yml`  
**Implementation:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install backend deps
        run: cd backend && npm ci
      - name: Run backend tests
        run: cd backend && npm test
      - name: Install frontend deps
        run: cd frontend/eventx-frontend && npm ci
      - name: Lint frontend
        run: cd frontend/eventx-frontend && npm run lint
      - name: Build frontend
        run: cd frontend/eventx-frontend && npm run build
```

#### 4.4 Add Docker Support (Optional)
**Files:** `Dockerfile`, `docker-compose.yml`  
**Implementation:**
- Only if actually needed for deployment
- Multi-stage build for frontend
- Node.js container for backend

#### 4.5 Code Quality Improvements
**Files:** Various  
**Implementation:**
- Fix remaining lint errors
- Add code splitting for large bundles
- Standardize API client usage

## Testing Strategy

### Backend Tests to Add
- Session revocation scenarios
- Payment token validation
- Coupon-discounted bookings
- Hall booking DTO validation
- QR check-in flow
- Notification mutations

### Frontend Tests to Add
- Booking flow integration
- Hall booking forms
- Ticket display components
- Notification interactions

### Integration Tests
- End-to-end booking flow
- Cross-system contract validation

## Risk Mitigation

### Rollback Plan
- Each phase is independent
- Database migrations are backward compatible
- Feature flags for major changes

### Monitoring
- Add health check endpoint
- Log security events
- Monitor payment failures

### Security Validation
- Regular dependency audits
- SAST scanning in CI
- Penetration testing for payment flows

## Success Metrics

- All tests pass
- No critical security findings
- Frontend lint clean
- Documentation matches reality
- Fresh setup works in < 30 minutes
- All reported bugs fixed

## Timeline and Milestones

**Week 1:** Phase 0 (Guardrails)  
**Week 2:** Phase 1 (Security)  
**Week 3:** Phase 2 (Contracts)  
**Week 4:** Phase 3 (Data Models) + Phase 4 (Operations)  

**Total Timeline:** 4 weeks  
**Team Size:** 1-2 developers  
**Review Points:** End of each phase, security review before deployment  

## Dependencies

- Node.js 18+
- MongoDB 6+
- GitHub repository access
- Payment provider integration (future)
- CI/CD platform access

## Post-Implementation

### Maintenance Tasks
- Regular security audits
- Dependency updates
- Performance monitoring
- User feedback integration

### Future Enhancements
- Real payment provider integration
- Advanced analytics
- Mobile app
- Multi-tenant support

---

**Note:** This plan addresses all findings from the audit. Implementation should follow the phase order to minimize risk and ensure each layer builds correctly on the previous one.