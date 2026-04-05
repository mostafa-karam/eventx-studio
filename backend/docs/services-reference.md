# Services Reference (Business Logic)

The `/services` directory is the most critical infrastructure layer in the backend. Controllers should be "thin"—only parsing requests and formatting responses. If a process requires modifying multiple models simultaneously, it must be contained in a Service object to prevent concurrency bugs and race conditions.

## 1. `bookingService.js` (Atomicity Central)

The core transaction engine for the platform. Booking a ticket cannot simply be a `Ticket.create` operation.

### `bookSeat({ eventId, userId, seatNumber, payment })`
- **Verification Hook**: Looks up the target `Event`. If `event.status !== 'published'` or `availableSeats <= 0`, throws explicitly localized HTTP 400s.
- **Deduction Engine**: Subtracts internal capacity logic mathematically via `event.bookSeat(seatNumber)` which prevents double-counting inside MongoDB schemas dynamically.
- **Creation Chain**: Saves the mutated `Event`, then writes the actual `Ticket`.
- **System WebHook**: Reaches into `notificationService` dynamically pushing a 'Booking Confirmed' alert to the user.

### `cancelBooking(ticketId, userId)`
- Safely reverses the transaction. Performs an atomic `findOneAndUpdate($inc)` operation on the Event seating count to safely unlock the seat back to the pool instantly.
- Checks the `Waitlist` queue; if a pending user matches, re-sends availability `Notification`.

## 2. `analyticsService.js` (Aggregation Logic)

Pulls heavy calculation loads away from standard controllers. Leverages Node optimizations for grouping big datasets.

### `getDashboardMetrics()`
- Sums global metrics via `Ticket.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$amount" } } }])` which executes natively in C++ inside the MongoDB engine, radically reducing memory usage compared to mapping arrays inside JS blocks.

## 3. `notificationService.js` (Broadcast Signals)

A unified sender. Instead of controllers making messy `Notification.create` queries, this provides clean wrappers:
### `notify(userId, payload)`
Creates the `Notification` record safely checking inputs for `priority` and `actionUrl`.
```javascript
// Usage anywhere in the system:
notificationService.notify(user._id, {
    title: 'Event Published',
    message: 'Your event is live!',
    priority: 'high'
});
```
