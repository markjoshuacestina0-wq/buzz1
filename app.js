// Show OpeningAnimation for 3 seconds after page load
document.addEventListener('DOMContentLoaded', function() {
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

// AUTH: users and session (very basic, localStorage only)
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

// Bind auth.html forms if present
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

// EVENT: details + seat selection + checkout (simulated)
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

    // Also set last generated ticket for ticket.html view
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
    if (typeof QRious !== "undefined") {
      new QRious({
        element: document.getElementById("qrcode"),
        value: ticket.id.toString(),
        size: 200,
      });
    }
    // Email receipt button (mailto draft)
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

// CHECK-IN: validate by ID and mark as checked in
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

// CHECK-IN: optional QR image decoding (if qr-scanner is loaded)
if (document.getElementById("qr-file")) {
  const fileInput = document.getElementById("qr-file");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (window.QrScanner) {
        const result = await window.QrScanner.scanImage(file);
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
