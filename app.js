// Store and load events from localStorage
function loadEvents() {
  let events = JSON.parse(localStorage.getItem("events")) || [];
  if (events.length === 0) {
    events = [{
      id: Date.now(),
      title: "University Concert",
      description: "Live music night at the campus!",
      date: "2025-09-30",
      venue: "Main Auditorium",
      rows: 5, cols: 6, price: 100,
      seats: {}
    }];
    localStorage.setItem("events", JSON.stringify(events));
  }
  return events;
}

function saveEvents(events) {
  localStorage.setItem("events", JSON.stringify(events));
}

// Display events on index.html
if (document.getElementById("event-list")) {
  const events = loadEvents();
  const list = document.getElementById("event-list");
  events.forEach(e => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${e.title}</h3>
      <p>${e.description}</p>
      <p>${e.date} | ${e.venue}</p>
      <p>Price: $${e.price}</p>
      <a href="event.html?id=${e.id}">View Event</a>
    `;
    list.appendChild(div);
  });
}

// Admin create event
if (document.getElementById("create-event-form")) {
  document.getElementById("create-event-form").onsubmit = e => {
    e.preventDefault();
    const events = loadEvents();
    const newEvent = {
      id: Date.now(),
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      date: document.getElementById("date").value,
      venue: document.getElementById("venue").value,
      rows: parseInt(document.getElementById("rows").value),
      cols: parseInt(document.getElementById("cols").value),
      price: parseFloat(document.getElementById("price").value),
      seats: {}
    };
    events.push(newEvent);
    saveEvents(events);
    alert("Event created!");
    location.reload();
  };
}

// Event details + seat selection
if (document.getElementById("seat-map")) {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  let events = loadEvents();
  let event = events.find(e => e.id == eventId);

  document.getElementById("event-title").textContent = event.title;
  document.getElementById("event-description").textContent = event.description;
  document.getElementById("event-date").textContent = event.date;
  document.getElementById("event-venue").textContent = event.venue;

  const seatMap = document.getElementById("seat-map");
  let selectedSeats = [];
  for (let r = 0; r < event.rows; r++) {
    for (let c = 0; c < event.cols; c++) {
      const seatId = `${r}-${c}`;
      const seat = document.createElement("div");
      seat.className = "seat " + (event.seats[seatId] ? "reserved" : "");
      seat.textContent = "•";
      seat.onclick = () => {
        if (seat.classList.contains("reserved")) return;
        seat.classList.toggle("selected");
        if (selectedSeats.includes(seatId)) {
          selectedSeats = selectedSeats.filter(s => s !== seatId);
        } else {
          selectedSeats.push(seatId);
        }
        document.getElementById("summary").textContent =
          `${selectedSeats.length} seats selected | Total: $${selectedSeats.length * event.price}`;
      };
      seatMap.appendChild(seat);
    }
  }

  // Checkout
  document.getElementById("checkout-form").onsubmit = e => {
    e.preventDefault();
    const buyer = {
      name: document.getElementById("buyer-name").value,
      email: document.getElementById("buyer-email").value
    };
    const ticket = {
      id: Date.now(),
      eventId: event.id,
      buyer,
      seats: selectedSeats,
    };
    // Reserve seats
    selectedSeats.forEach(s => event.seats[s] = true);
    saveEvents(events);

    localStorage.setItem("ticket", JSON.stringify(ticket));
    alert("Payment simulated. Ticket generated!");
    window.location.href = "ticket.html";
  };
}

// Ticket generation
if (document.getElementById("ticket")) {
  const ticket = JSON.parse(localStorage.getItem("ticket"));
  const events = loadEvents();
  const event = events.find(e => e.id == ticket.eventId);

  document.getElementById("ticket").innerHTML = `
    <h2>${event.title}</h2>
    <p>${event.date} | ${event.venue}</p>
    <p>Seats: ${ticket.seats.join(", ")}</p>
    <p>Buyer: ${ticket.buyer.name} (${ticket.buyer.email})</p>
    <p><strong>Ticket ID:</strong> ${ticket.id}</p>
  `;
  const qr = new QRious({
    element: document.getElementById("qrcode"),
    value: ticket.id.toString(),
    size: 200
  });
}

// Check-in
function checkIn() {
  const id = document.getElementById("ticket-id").value;
  const ticket = JSON.parse(localStorage.getItem("ticket"));
  if (ticket && ticket.id == id) {
    document.getElementById("checkin-result").textContent = "✅ Ticket valid. Checked in!";
  } else {
    document.getElementById("checkin-result").textContent = "❌ Ticket not found.";
  }
}
