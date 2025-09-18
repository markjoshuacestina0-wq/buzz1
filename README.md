# EventBuzz (Event Ticket Booking)

A minimalist, modern front-end prototype for event discovery, seat selection, simulated checkout, ticket generation (with QR), and attendee check-in. Runs fully client-side with HTML/CSS/JS and localStorage.

## Run

- Open `index.html` in a modern browser (Chrome/Edge/Firefox). No server required..

## Features

- Events list with keyword search and sort by date
- Event details with seat map (available, selected, reserved)
- Simulated checkout: collects buyer info, reserves seats, generates a ticket
- Ticket page with QR code, printable layout
- Check-in page: paste ticket ID or upload a QR image to validate and mark checked-in
- Admin page: create, edit, delete events; persisted in localStorage

## Persistence

Data is stored in `localStorage`:
- `events` – array of event objects (with seat reservation map)
- `tickets` – array of tickets (with check-in state)

Sample data is auto-populated on first load.

## Libraries (CDN)

- QR code generation: `qrious` (`ticket.html`)
- QR image decoding: `qr-scanner` (`checkin.html`)

Both are client-side only and loaded from public CDNs.

## Simulated Payment

Payment is simulated. Clicking “Pay (Simulated)” creates the ticket, reserves the selected seats, and navigates to the ticket page. No real payment is processed.

## Accessibility & Responsive

- Semantic HTML and focusable seat buttons
- Responsive card grid and controls

## Optional ideas

- CSV export of attendee list
- More seat map legends and sections
- Multiple tickets per order and order history view



