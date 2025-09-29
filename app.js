// Show OpeningAnimation for 3 seconds after page load
document.addEventListener('DOMContentLoaded', function () {
  const popup = document.querySelector('.OpeningAnimation');
  if (popup) {
    popup.style.display = 'block';
    setTimeout(() => {
      popup.classList.add('slide-up');
      setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('slide-up');
      }, 600);
    }, 2400);
  }
});

// Minimal client-side data layer
const STORAGE_KEYS = {
  events: "events",
  tickets: "tickets",
  users: "users",
  currentUser: "currentUser"
};

function loadEvents() {
  let events = JSON.parse(localStorage.getItem(STORAGE_KEYS.events)) || [];
  if (events.length === 0) {
    events = [{
      id: generateId("evt"),
      title: "University Concert",
      description: "Live music night at the campus!",
      date: "2025-09-30T19:30",
      venue: "Main Auditorium",
      rows: 6,
      cols: 10,
      price: 49,
      seats: {}
    }];
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  }
  return events;
}
function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
}
function loadTickets() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.tickets)) || [];
}
function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEYS.tickets, JSON.stringify(tickets));
}
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function formatDate(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return dt; }
}
function seatIdToCode(seatId) {
  const [r, c] = seatId.split("-").map(Number);
  const rowCode = String.fromCharCode(65 + r); // A, B, C ...
  return `${rowCode}${c + 1}`;
}

// INDEX: list, search, sort
if (document.getElementById("event-list")) {
  const listEl = document.getElementById("event-list");
  const searchEl = document.getElementById("search");
  let sortAsc = true;

  function renderList(items) {
    listEl.innerHTML = "";
    if (items.length === 0) {
      listEl.innerHTML = '<p>No events found.</p>';
      return;
    }
    items.forEach(e => {
      const card = document.createElement("a");
      card.className = "card event-card";
      card.href = `event.html?id=${e.id}`;
      card.innerHTML = `
        <div class="card-body">
          <div class="card-header">
            <h3 class="card-title">${e.title}</h3>
            <span class="price">₱${e.price}</span>
          </div>
          <p class="muted">${formatDate(e.date)} · ${e.venue}</p>
          <p class="desc">${e.description}</p>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  function getFilteredSorted() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const events = loadEvents();
    let filtered = events.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q)
    );
    filtered.sort((a, b) => (new Date(a.date) - new Date(b.date)) * (sortAsc ? 1 : -1));
    return filtered;
  }

  function refresh() { renderList(getFilteredSorted()); }

  window.sortEvents = function sortEvents() {
    sortAsc = !sortAsc;
    refresh();
  };

  searchEl?.addEventListener("input", refresh);
  refresh();
}

// AUTH: users and session
function loadUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [];
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser));
}
function setCurrentUser(user) {
  if (user) localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEYS.currentUser);
}

// Bind auth.html forms
if (document.getElementById("admin-login")) {
  const users = loadUsers();
  // Register Admin
  document.getElementById("admin-register").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("admin-reg-name").value.trim();
    const email = document.getElementById("admin-reg-email").value.trim().toLowerCase();
    const pass = document.getElementById("admin-reg-pass").value;
    if (users.find(u => u.email === email)) { alert("Email already exists."); return; }
    users.push({ id: generateId("usr"), name, email, pass, role: "admin" });
    saveUsers(users);
    alert("Admin registered. You can login now.");
  });
  // Login Admin
  document.getElementById("admin-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-login-email").value.trim().toLowerCase();
    const pass = document.getElementById("admin-login-pass").value;
    const u = loadUsers().find(u => u.email === email && u.pass === pass && u.role === "admin");
    if (!u) { alert("Invalid credentials."); return; }
    setCurrentUser({ id: u.id, name: u.name, email: u.email, role: u.role });
    window.location.href = "admin.html";
  });
}
if (document.getElementById("user-login")) {
  // Register User
  document.getElementById("user-register").addEventListener("submit", (e) => {
    e.preventDefault();
    const users = loadUsers();
    const name = document.getElementById("user-reg-name").value.trim();
    const email = document.getElementById("user-reg-email").value.trim().toLowerCase();
    const pass = document.getElementById("user-reg-pass").value;
    if (users.find(u => u.email === email)) { alert("Email already exists."); return; }
    users.push({ id: generateId("usr"), name, email, pass, role: "user" });
    saveUsers(users);
    alert("User registered. You can login now.");
  });
  // Login User
  document.getElementById("user-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("user-login-email").value.trim().toLowerCase();
    const pass = document.getElementById("user-login-pass").value;
    const u = loadUsers().find(u => u.email === email && u.pass === pass && u.role === "user");
    if (!u) { alert("Invalid credentials."); return; }
    setCurrentUser({ id: u.id, name: u.name, email: u.email, role: u.role });
    window.location.href = "index.html";
  });
}

// NAV account area + guards
function renderAccountNav() {
  const user = getCurrentUser();
  const nav = document.querySelector("header nav");
  if (!nav) return;
  const existing = nav.querySelector(".account");
  if (existing) existing.remove();
  const span = document.createElement("span");
  span.className = "account";
  span.style.marginLeft = "12px";
  if (user) {
    span.innerHTML = `<span class="muted">${user.name} (${user.role})</span> <button class="btn light" id="logout-btn">Logout</button>`;
  } else {
    span.innerHTML = `<a href="auth.html" class="btn light">Login / Register</a>`;
  }
  nav.appendChild(span);
  const logout = document.getElementById("logout-btn");
  if (logout) logout.addEventListener("click", () => { setCurrentUser(null); window.location.href = "index.html"; });
}
renderAccountNav();

// Admin guard
if (location.pathname.endsWith("/admin.html") || location.pathname.endsWith("admin.html")) {
  const u = getCurrentUser();
  if (!u || u.role !== "admin") {
    window.location.href = "auth.html";
  }
}

// ADMIN: create, list, edit, delete
if (document.getElementById("create-event-form")) {
  const form = document.getElementById("create-event-form");
  const listEl = document.getElementById("admin-event-list");

  function renderAdminList() {
    const events = loadEvents();
    listEl.innerHTML = "";
    events
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(e => {
        const row = document.createElement("div");
        row.className = "admin-row card";
        row.innerHTML = `
          <div class="card-body">
            <div class="card-header">
              <strong>${e.title}</strong>
              <span class="muted">${formatDate(e.date)}</span>
            </div>
            <div class="muted">${e.venue} · $${e.price} · ${e.rows}x${e.cols}</div>
            <div class="actions">
              <button data-id="${e.id}" class="btn light edit">Edit</button>
              <button data-id="${e.id}" class="btn danger delete">Delete</button>
            </div>
          </div>
        `;
        listEl.appendChild(row);
      });

    listEl.querySelectorAll(".delete").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("Delete this event?")) return;
      const events = loadEvents().filter(e => e.id !== id);
      saveEvents(events);
      renderAdminList();
    }));

    listEl.querySelectorAll(".edit").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const events = loadEvents();
      const ev = events.find(e => e.id === id);
      if (!ev) return;
      // Load into form for quick edit
      form.dataset.editing = id;
      document.getElementById("title").value = ev.title;
      document.getElementById("description").value = ev.description;
      document.getElementById("date").value = ev.date;
      document.getElementById("venue").value = ev.venue;
      document.getElementById("rows").value = ev.rows;
      document.getElementById("cols").value = ev.cols;
      document.getElementById("price").value = ev.price;
    }));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const events = loadEvents();
    const editingId = form.dataset.editing;
    const payload = {
      id: editingId || generateId("evt"),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      date: document.getElementById("date").value,
      venue: document.getElementById("venue").value.trim(),
      rows: parseInt(document.getElementById("rows").value, 10),
      cols: parseInt(document.getElementById("cols").value, 10),
      price: parseFloat(document.getElementById("price").value),
      seats: editingId ? (events.find(e => e.id === editingId)?.seats || {}) : {}
    };
    if (editingId) {
      const idx = events.findIndex(e => e.id === editingId);
      events[idx] = payload;
      delete form.dataset.editing;
      alert("Event updated.");
    } else {
      events.push(payload);
      alert("Event created.");
    }
    saveEvents(events);
    form.reset();
    renderAdminList();
  });

  renderAdminList();
}

// EVENT: details + seat selection + checkout
if (document.getElementById("seat-map")) {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) {
    window.location.href = "index.html";
  }

  document.getElementById("event-title").textContent = event.title;
  document.getElementById("event-description").textContent = event.description;
  document.getElementById("event-date").textContent = formatDate(event.date);
  document.getElementById("event-venue").textContent = event.venue;

  const seatMap = document.getElementById("seat-map");
  seatMap.style.gridTemplateColumns = `repeat(${event.cols}, 36px)`;

  let selectedSeats = [];
  for (let r = 0; r < event.rows; r++) {
    for (let c = 0; c < event.cols; c++) {
      const seatId = `${r}-${c}`;
      const seat = document.createElement("button");
      seat.type = "button";
      seat.className = "seat " + (event.seats[seatId] ? "reserved" : "");
      seat.setAttribute("aria-label", `Seat ${seatId}`);
      seat.textContent = seatIdToCode(seatId);
      seat.onclick = () => {
        if (seat.classList.contains("reserved")) return;
        seat.classList.toggle("selected");
        if (selectedSeats.includes(seatId)) {
          selectedSeats = selectedSeats.filter(s => s !== seatId);
        } else {
          selectedSeats.push(seatId);
        }
        document.getElementById("summary").textContent =
          `${selectedSeats.length} seats selected | Total: ₱${(selectedSeats.length * event.price).toFixed(2)}`;
      };
      seatMap.appendChild(seat);
    }
  }

  document.getElementById("checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("You must be signed in to book a ticket. Please login or register first.");
      return;
    }
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat.");
      return;
    }
    const buyer = {
      name: document.getElementById("buyer-name").value.trim(),
      email: document.getElementById("buyer-email").value.trim()
    };
    const ticket = {
      id: generateId("tkt"),
      eventId: event.id,
      buyer,
      seats: [...selectedSeats],
      checkedIn: false,
      createdAt: new Date().toISOString()
    };
    // Reserve seats and persist
    selectedSeats.forEach(s => event.seats[s] = true);
    saveEvents(events);

    const tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    // Save last generated ticket ID for ticket.html view
    localStorage.setItem("lastTicketId", ticket.id);
    alert("Payment simulated. Ticket generated!");
    window.location.href = "ticket.html";
  });
}

// TICKET: render and QR code
if (document.getElementById("ticket")) {
  const lastId = localStorage.getItem("lastTicketId");
  const tickets = loadTickets();
  const ticket = tickets.find(t => t.id === lastId) || tickets[tickets.length - 1];
  if (!ticket) {
    document.getElementById("ticket").innerHTML = "<p>No ticket found.</p>";
  } else {
    const events = loadEvents();
    const event = events.find(e => e.id === ticket.eventId);
    document.getElementById("ticket").innerHTML = `
      <div class="card ticket-card">
        <div class="card-body">
          <h2>${event.title}</h2>
          <p class="muted">${formatDate(event.date)} · ${event.venue}</p>
          <p><strong>Seats:</strong> ${ticket.seats.map(seatIdToCode).join(", ")}</p>
          <p><strong>Buyer:</strong> ${ticket.buyer.name} (${ticket.buyer.email})</p>
          <p class="muted">Ticket ID: ${ticket.id}</p>
        </div>
      </div>
    `;
    // Wait for QRious library to load if not available yet
    const generateQRCode = () => {
      if (typeof QRious !== "undefined") {
        const ticketData = {
          ticketId: ticket.id,
          buyerName: ticket.buyer.name,
          buyerEmail: ticket.buyer.email,
          eventName: event.title,
          dateTime: formatDate(event.date),
          venue: event.venue,
          seats: ticket.seats.map(seatIdToCode).join(", ")
        };
        console.log("Generating QR code for ticket:", ticketData);
        // Create a data URL that opens a ticket details page directly
        const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>EventBuzz - Ticket Details</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .ticket { 
              background: white; 
              padding: 30px; 
              border-radius: 15px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              max-width: 400px;
              width: 100%;
            }
            .header { 
              text-align: center; 
              color: #6b46c1; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 15px;
            }
            .detail { 
              margin: 15px 0; 
              padding: 10px 0; 
              border-bottom: 1px solid #f3f4f6; 
              display: flex;
              justify-content: space-between;
            }
            .label { 
              font-weight: bold; 
              color: #374151; 
              flex: 1;
            }
            .value { 
              color: #6b7280; 
              text-align: right;
              flex: 1;
            }
            .ticket-id {
              background: #f3f4f6;
              padding: 10px;
              border-radius: 8px;
              text-align: center;
              margin-top: 20px;
              font-family: monospace;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>🎟️ EventBuzz</h1>
              <h2>${ticketData.eventName}</h2>
            </div>
            <div class="detail">
              <span class="label">Date & Time:</span>
              <span class="value">${ticketData.dateTime}</span>
            </div>
            <div class="detail">
              <span class="label">Venue:</span>
              <span class="value">${ticketData.venue}</span>
            </div>
            <div class="detail">
              <span class="label">Seats:</span>
              <span class="value">${ticketData.seats}</span>
            </div>
            <div class="detail">
              <span class="label">Buyer:</span>
              <span class="value">${ticketData.buyerName}</span>
            </div>
            <div class="detail">
              <span class="label">Email:</span>
              <span class="value">${ticketData.buyerEmail}</span>
            </div>
            <div class="ticket-id">
              <strong>Ticket ID:</strong> ${ticketData.ticketId}
            </div>
          </div>
        </body>
        </html>
      `;

        // Create a data URL that will open the ticket details directly
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(ticketHtml)}`;
        console.log("QR code data URL created:", dataUrl.substring(0, 100) + "...");

        const qrElement = document.getElementById("qrcode");
        if (qrElement) {
          new QRious({
            element: qrElement,
            value: dataUrl,
            size: 300,
            background: 'white',
            foreground: 'black',
            level: 'L',
            margin: 4
          });
          console.log("QR code generated successfully");
        } else {
          console.error("QR code element not found!");
        }
      } else {
        console.log("QRious library not loaded yet, retrying in 100ms...");
        setTimeout(generateQRCode, 100);
      }
    };

    generateQRCode();
    // Email receipt button
    const emailBtn = document.getElementById("email-receipt");
    if (emailBtn) {
      const subject = encodeURIComponent(`Your EventBuzz Ticket: ${event.title}`);
      const body = encodeURIComponent(
        `Hi ${ticket.buyer.name},\n\n` +
        `Thanks for your purchase! Here are your ticket details:\n` +
        `Event: ${event.title}\n` +
        `Date: ${formatDate(event.date)}\n` +
        `Venue: ${event.venue}\n` +
        `Seats: ${ticket.seats.map(seatIdToCode).join(', ')}\n` +
        `Ticket ID: ${ticket.id}\n\n` +
        `You can print the page or save the QR code image.\n\n` +
        `— EventBuzz`
      );
      emailBtn.addEventListener('click', () => {
        window.location.href = `mailto:${ticket.buyer.email}?subject=${subject}&body=${body}`;
      });
    }
  }
}

// CHECK-IN: validate by ID
window.checkIn = function checkIn() {
  const id = (document.getElementById("ticket-id")?.value || "").trim();
  if (!id) return;
  const tickets = loadTickets();
  const idx = tickets.findIndex(t => t.id === id);
  const resultEl = document.getElementById("checkin-result");
  if (idx === -1) {
    resultEl.textContent = "❌ Ticket not found.";
    resultEl.className = "error";
    return;
  }
  if (tickets[idx].checkedIn) {
    resultEl.textContent = "⚠️ Ticket already checked in.";
    resultEl.className = "warn";
    return;
  }
  tickets[idx].checkedIn = true;
  tickets[idx].checkedInAt = new Date().toISOString();
  saveTickets(tickets);
  resultEl.textContent = "✅ Ticket valid. Checked in!";
  resultEl.className = "success";
};

// CHECK-IN: QR file decode
if (document.getElementById("qr-file")) {
  const fileInput = document.getElementById("qr-file");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (window.QrScanner) {
        const result = await window.QrScanner.scanImage(file);

        // Check if the QR code contains a data URL with ticket HTML
        if (result.startsWith('data:text/html;charset=utf-8,')) {
          try {
            // Extract the HTML content from the data URL
            const htmlContent = decodeURIComponent(result.replace('data:text/html;charset=utf-8,', ''));

            // Parse the HTML to extract ticket data
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Extract ticket details from the HTML
            const ticketData = {
              eventName: doc.querySelector('h2')?.textContent || 'Unknown Event',
              dateTime: Array.from(doc.querySelectorAll('.detail')).find(d => d.textContent.includes('Date & Time'))?.querySelector('.value')?.textContent || 'Unknown Date',
              venue: Array.from(doc.querySelectorAll('.detail')).find(d => d.textContent.includes('Venue'))?.querySelector('.value')?.textContent || 'Unknown Venue',
              seats: Array.from(doc.querySelectorAll('.detail')).find(d => d.textContent.includes('Seats'))?.querySelector('.value')?.textContent || 'Unknown Seats',
              buyerName: Array.from(doc.querySelectorAll('.detail')).find(d => d.textContent.includes('Buyer'))?.querySelector('.value')?.textContent || 'Unknown Buyer',
              buyerEmail: Array.from(doc.querySelectorAll('.detail')).find(d => d.textContent.includes('Email'))?.querySelector('.value')?.textContent || 'Unknown Email',
              ticketId: doc.querySelector('.ticket-id')?.textContent?.replace('Ticket ID:', '').trim() || 'Unknown ID'
            };

            // Display ticket details
            displayTicketDetails(ticketData);
            // Also set the ticket ID for validation
            document.getElementById("ticket-id").value = ticketData.ticketId;
            return;
          } catch (error) {
            console.error('Error parsing ticket data from QR:', error);
          }
        }

        // Check if the QR code contains a URL with ticket data (legacy support)
        if (result.includes('ticket.html?data=')) {
          const url = new URL(result);
          const dataParam = url.searchParams.get('data');
          if (dataParam) {
            try {
              const ticketData = JSON.parse(decodeURIComponent(dataParam));
              // Display ticket details
              displayTicketDetails(ticketData);
              // Also set the ticket ID for validation
              document.getElementById("ticket-id").value = ticketData.ticketId;
              return;
            } catch (error) {
              console.error('Error parsing ticket data from QR:', error);
            }
          }
        }

        // Check if it's just a ticket ID (starts with tkt_)
        if (result.startsWith('tkt_')) {
          document.getElementById("ticket-id").value = result;
          checkIn();
          return;
        }

        // Fallback: treat as ticket ID
        document.getElementById("ticket-id").value = result;
        checkIn();
      } else {
        alert("QR decoder not loaded.");
      }
    } catch (err) {
      alert("Failed to decode QR image.");
    } finally {
      fileInput.value = "";
    }
  });
}

// Function to display ticket details from QR code
function displayTicketDetails(ticketData) {
  const resultEl = document.getElementById("checkin-result");
  resultEl.innerHTML = `
    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0369a1;">📋 Ticket Details</h3>
      <div style="display: grid; gap: 8px; font-size: 14px;">
        <div><strong>Event:</strong> ${ticketData.eventName}</div>
        <div><strong>Date & Time:</strong> ${ticketData.dateTime}</div>
        <div><strong>Venue:</strong> ${ticketData.venue}</div>
        <div><strong>Seats:</strong> ${ticketData.seats}</div>
        <div><strong>Buyer:</strong> ${ticketData.buyerName} (${ticketData.buyerEmail})</div>
        <div><strong>Ticket ID:</strong> ${ticketData.ticketId}</div>
      </div>
      <div style="margin-top: 12px;">
        <button class="btn" onclick="checkIn()">Validate & Check-in</button>
      </div>
    </div>
  `;
  resultEl.className = "success";
}
