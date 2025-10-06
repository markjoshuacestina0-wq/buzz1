// Supabase-only app.js
// Enforces Supabase auth, uses server for events/tickets/profiles and tidies client behavior.

;(async function () {
  // Helpers
  function generateId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
  function formatDate(dt) { try { const d = new Date(dt); return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return dt; } }
  function seatIdToCode(seatId) { const [r, c] = String(seatId).split('-').map(Number); const row = isNaN(r) ? 0 : r; const col = isNaN(c) ? 0 : c; return String.fromCharCode(65 + row) + (col + 1); }

  // UI helpers: loading overlay and toast notifications
  function ensureLoadingOverlay() {
    let ov = document.getElementById('loading-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'loading-overlay';
      ov.style.display = 'none';
      ov.innerHTML = '<div class="loader">Loading...</div>';
      document.body.insertBefore(ov, document.body.firstChild);
    }
    return ov;
  }
  function showLoading(msg = 'Loading...') {
    const ov = ensureLoadingOverlay();
    let loader = ov.querySelector('.loader');
    if (!loader) {
      // normalize overlay content so we always have a .loader element
      loader = document.createElement('div');
      loader.className = 'loader';
      loader.textContent = 'Loading...';
      ov.innerHTML = '';
      ov.appendChild(loader);
    }
    loader.textContent = msg;
    ov.style.display = 'flex';
  }
  function hideLoading() { const ov = document.getElementById('loading-overlay'); if (ov) ov.style.display = 'none'; }

  function ensureToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    return c;
  }
  function showToast(type, message, timeout = 4000) {
    const container = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); }, timeout - 300);
    setTimeout(() => { t.remove(); }, timeout);
  }
  // expose helpers globally for other scripts/pages
  window.showToast = showToast;
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;

  // Require supabase client
  if (!window.supabaseReady) {
    console.error('Supabase is not initialized. Make sure supabase.js is included before app.js');
    // Show a visible error on the page
    document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fee2e2;color:#7f1d1d;padding:12px;text-align:center;">Configuration error: Supabase not loaded. See console.</div>');
    return;
  }

  let supabaseClient;
  try {
    supabaseClient = await window.supabaseReady;
  } catch (err) {
    console.error('supabaseReady rejected', err);
    document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fee2e2;color:#7f1d1d;padding:12px;text-align:center;">Supabase initialization failed. Check console.</div>');
    return;
  }

  
  // Page path (auth disabled)
  const path = window.location.pathname.split('/').pop() || 'index.html';

  // Load minimal data based on page to avoid masking events with other table errors
  window.DB = window.DB || { events: [], tickets: [], profiles: [], lastTicketId: null, currentProfile: null, ready: false };
  try {
    if (path === 'index.html') {
      showLoading('Loading events...');
      const { data, error } = await supabaseClient.from('events').select('*').order('date', { ascending: true });
      if (error) {
        console.warn('Events load error', error);
        showToast('error', 'Failed to load events: ' + (error.message || error));
        window.DB.events = [];
      } else {
        window.DB.events = data || [];
      }
      hideLoading();
    } else {
      // For other pages, rely on their specific mount functions to fetch what they need
    }
  } catch (e) {
    hideLoading();
    console.warn('Error loading initial data from Supabase', e);
    showToast('error', 'Failed to load data from server. Check console.');
  }
  window.DB.ready = true;

  
  // Minimal account banner with Logout (shown only when logged in)
  async function renderAccountBanner() {
    if (path === 'auth.html') return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      // Remove existing banner first
      const existing = document.getElementById('account-banner');
      if (existing) existing.remove();
      if (!session || !session.user) return;
      const email = session.user.email || 'Signed in';
      const banner = document.createElement('div');
      banner.id = 'account-banner';
      banner.style.cssText = 'padding:8px;background:#f1f1f1;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;font-size:14px;z-index:9999;';
      banner.innerHTML = `<div>Logged in as: ${email}</div><div><button id="logout-btn" class="btn light">Logout</button></div>`;
      document.body.insertBefore(banner, document.body.firstChild);
      banner.querySelector('#logout-btn').addEventListener('click', async () => {
        try {
          showLoading('Signing out...');
          await supabaseClient.auth.signOut();
          hideLoading();
          showToast('success', 'Logged out');
          // Remove banner and optionally redirect
          const b = document.getElementById('account-banner');
          if (b) b.remove();
          // Stay on the page; user can keep browsing public content
        } catch (e) {
          hideLoading();
          console.error(e);
          showToast('error', e?.message || 'Logout failed');
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // Update banner on auth state changes
  try { supabaseClient.auth.onAuthStateChange(() => { renderAccountBanner(); }); } catch (_) {}
  // Initial render
  renderAccountBanner();

  // --- Page mounts ---

  // Auth page handlers (login/register only; no global auth enforcement)
  function mountAuth() {
    if (path !== 'auth.html') return;
    const userRegister = document.getElementById('user-register');
    const userLogin = document.getElementById('user-login');
    if (userRegister) {
      userRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('user-reg-name').value.trim();
        const email = document.getElementById('user-reg-email').value.trim();
        const pass = document.getElementById('user-reg-pass').value;
        try {
          showLoading('Creating account...');
          const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
          hideLoading();
          if (error) throw error;
          const hasSession = !!(data && data.session);
          if (!hasSession) {
            // Email confirmation likely required: keep user on auth page
            showToast('success', 'Registered. Check your email to confirm, then sign in.');
            // Switch to Login tab if present
            const loginTab = document.getElementById('user-login-tab');
            if (loginTab && typeof loginTab.click === 'function') loginTab.click();
            return;
          }
          showToast('success', 'Registered and signed in.');
          window.location.href = 'index.html';
        } catch (err) {
          hideLoading();
          console.error('Registration failed', err);
          showToast('error', err?.message || 'Registration failed');
        }
      });
    }
    if (userLogin) {
      userLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('user-login-email').value.trim();
        const pass = document.getElementById('user-login-pass').value;
        try {
          showLoading('Signing in...');
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
          hideLoading();
          if (error) throw error;
          window.location.href = 'index.html';
        } catch (err) {
          hideLoading();
          console.error('Login failed', err);
          showToast('error', err?.message || 'Login failed');
        }
      });
    }
  }

  // Index
  function mountIndex() {
    if (!document.getElementById('event-list')) return;
    const listEl = document.getElementById('event-list'); const searchEl = document.getElementById('search'); let sortAsc = true;
    function renderList(items) { listEl.innerHTML = ''; if (!items || items.length === 0) { listEl.innerHTML = '<p>No events found.</p>'; return; } items.forEach(e => { const card = document.createElement('a'); card.className = 'card event-card'; card.href = `event.html?id=${e.id}`; card.innerHTML = `\n          <div class="card-body">\n            <div class="card-header">\n              <h3 class="card-title">${e.title}</h3>\n              <span class="price">\u20b1${e.price}</span>\n            </div>\n            <p class="muted">${formatDate(e.date)} \u00b7 ${e.venue}</p>\n            <p class="desc">${e.description}</p>\n          </div>\n        `; listEl.appendChild(card); }); }
    function getFilteredSorted() { const q = (searchEl?.value || '').trim().toLowerCase(); let evts = (window.DB.events || []).slice(); if (q) evts = evts.filter(e => (e.title||'').toLowerCase().includes(q) || (e.description||'').toLowerCase().includes(q) || (e.venue||'').toLowerCase().includes(q)); evts.sort((a,b) => (new Date(a.date) - new Date(b.date)) * (sortAsc ? 1 : -1)); return evts; }
    function refresh() { renderList(getFilteredSorted()); }
    window.sortEvents = function () { sortAsc = !sortAsc; refresh(); };
    searchEl?.addEventListener('input', refresh);
    refresh();
  }

  
  // Admin page
  function mountAdmin() {
    if (!document.getElementById('create-event-form')) return;
    const form = document.getElementById('create-event-form'); const listEl = document.getElementById('admin-event-list');
    async function renderAdminList() {
      try {
        showLoading('Loading events...');
        const events = (await supabaseClient.from('events').select('*').order('date', { ascending: true })).data || [];
        listEl.innerHTML = '';
        events.forEach(e => {
        const row = document.createElement('div'); row.className = 'admin-row card'; row.innerHTML = `\n          <div class="card-body">\n            <div class="card-header">\n              <strong>${e.title}</strong>\n              <span class="muted">${formatDate(e.date)}</span>\n            </div>\n            <div class="muted">${e.venue} \u00b7 $${e.price} \u00b7 ${e.rows}x${e.cols}</div>\n            <div class="actions">\n              <button data-id="${e.id}" class="btn light edit">Edit</button>\n              <button data-id="${e.id}" class="btn danger delete">Delete</button>\n            </div>\n          </div>\n        `; listEl.appendChild(row);
        });
        hideLoading();
      } catch (err) { hideLoading(); showToast('error', 'Could not load admin events'); console.error(err); }
      // delete handlers
      listEl.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id'); if (!confirm('Delete this event?')) return; try { showLoading('Deleting...'); await deleteEvent(id); await renderAdminList(); hideLoading(); showToast('success', 'Event deleted'); } catch (err) { hideLoading(); showToast('error', 'Delete failed'); console.error(err); }
      }));
      // edit handlers
  listEl.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', async () => { const id = btn.getAttribute('data-id'); try { showLoading('Loading event...'); const { data: ev } = await supabaseClient.from('events').select('*').eq('id', id).single(); hideLoading(); if (!ev) return; form.dataset.editing = id; document.getElementById('title').value = ev.title; document.getElementById('description').value = ev.description; document.getElementById('date').value = ev.date; document.getElementById('venue').value = ev.venue; document.getElementById('rows').value = ev.rows; document.getElementById('cols').value = ev.cols; document.getElementById('price').value = ev.price; } catch (err) { hideLoading(); showToast('error', 'Failed to load event'); console.error(err); } }));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const editingId = form.dataset.editing; const payload = { id: editingId || generateId('evt'), title: document.getElementById('title').value.trim(), description: document.getElementById('description').value.trim(), date: document.getElementById('date').value, venue: document.getElementById('venue').value.trim(), rows: parseInt(document.getElementById('rows').value, 10) || 1, cols: parseInt(document.getElementById('cols').value, 10) || 1, price: parseFloat(document.getElementById('price').value) || 0, seats: {} };
      try {
          showLoading('Saving event...');
          if (editingId) { await updateEvent(payload); delete form.dataset.editing; showToast('success', 'Event updated'); } else { await addEvent(payload); showToast('success', 'Event created'); }
          form.reset(); await renderAdminList(); hideLoading();
        } catch (err) { hideLoading(); showToast('error', 'Save failed'); console.error(err); }
    });

    renderAdminList();
  }

  // Secured Admin page (requires logged-in user with role 'admin')
  function mountAdminSecured() {
    const form = document.getElementById('create-event-form');
    const listEl = document.getElementById('admin-event-list');
    if (!form || !listEl) return;

    (async () => {
      try {
        showLoading('Checking access...');
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user) {
          hideLoading();
          const main = document.querySelector('main') || document.body;
          main.innerHTML = '<div class="card"><div class="card-body"><h2>Access denied</h2><p class="error">Login required. Admin access only.</p></div></div>';
          showToast('error', 'Admin access required. Please log in.');
          return;
        }
        const userId = session.user.id;
        let profile = null;
        try {
          const res = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
          profile = res.data || null;
        } catch (e) {
          profile = null;
        }
        if (!profile || profile.role !== 'admin') {
          hideLoading();
          const main = document.querySelector('main') || document.body;
          main.innerHTML = '<div class="card"><div class="card-body"><h2>Access denied</h2><p class="error">You do not have admin permissions.</p></div></div>';
          showToast('error', 'You do not have admin permissions.');
          return;
        }

        // Access granted — proceed with admin logic
        async function renderAdminList() {
          try {
            showLoading('Loading events...');
            const events = (await supabaseClient.from('events').select('*').order('date', { ascending: true })).data || [];
            listEl.innerHTML = '';
            events.forEach(e => {
              const row = document.createElement('div');
              row.className = 'admin-row card';
              row.innerHTML = `
          <div class="card-body">
            <div class="card-header">
              <strong>${e.title}</strong>
              <span class="muted">${formatDate(e.date)}</span>
            </div>
            <div class="muted">${e.venue} · ${e.price} · ${e.rows}x${e.cols}</div>
            <div class="actions">
              <button data-id="${e.id}" class="btn light edit">Edit</button>
              <button data-id="${e.id}" class="btn danger delete">Delete</button>
            </div>
          </div>`;
              listEl.appendChild(row);
            });
            hideLoading();
          } catch (err) {
            hideLoading();
            showToast('error', 'Could not load admin events');
            console.error(err);
          }
          // delete handlers
          listEl.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('Delete this event?')) return;
            try { showLoading('Deleting...'); await deleteEvent(id); await renderAdminList(); hideLoading(); showToast('success', 'Event deleted'); } catch (err) { hideLoading(); showToast('error', 'Delete failed'); console.error(err); }
          }));
          // edit handlers
          listEl.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            try {
              showLoading('Loading event...');
              const { data: ev } = await supabaseClient.from('events').select('*').eq('id', id).single();
              hideLoading();
              if (!ev) return;
              form.dataset.editing = id;
              document.getElementById('title').value = ev.title;
              document.getElementById('description').value = ev.description;
              document.getElementById('date').value = ev.date;
              document.getElementById('venue').value = ev.venue;
              document.getElementById('rows').value = ev.rows;
              document.getElementById('cols').value = ev.cols;
              document.getElementById('price').value = ev.price;
            } catch (err) { hideLoading(); showToast('error', 'Failed to load event'); console.error(err); }
          }));
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const editingId = form.dataset.editing;
          const payload = {
            id: editingId || generateId('evt'),
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            date: document.getElementById('date').value,
            venue: document.getElementById('venue').value.trim(),
            rows: parseInt(document.getElementById('rows').value, 10) || 1,
            cols: parseInt(document.getElementById('cols').value, 10) || 1,
            price: parseFloat(document.getElementById('price').value) || 0,
            seats: {}
          };
          try {
            showLoading('Saving event...');
            if (editingId) { await updateEvent(payload); delete form.dataset.editing; showToast('success', 'Event updated'); }
            else { await addEvent(payload); showToast('success', 'Event created'); }
            form.reset();
            await renderAdminList();
            hideLoading();
          } catch (err) { hideLoading(); showToast('error', 'Save failed'); console.error(err); }
        });

        await renderAdminList();
      } catch (err) {
        hideLoading();
        console.error(err);
        const main = document.querySelector('main') || document.body;
        main.innerHTML = '<div class="card"><div class="card-body"><h2>Error</h2><p class="error">Failed to verify access. See console.</p></div></div>';
        showToast('error', 'Failed to verify access.');
      }
    })();
  }

  // Event page
  function mountEvent() {
    if (!document.getElementById('seat-map')) return;
    const params = new URLSearchParams(window.location.search); const eventId = params.get('id');
    if (!eventId) { window.location.href = 'index.html'; return; }
    (async () => {
  const { data: event, error: evtErr } = await supabaseClient.from('events').select('*').eq('id', eventId).single();
  if (evtErr || !event) { showToast('error', 'Event not found'); window.location.href = 'index.html'; return; }
      if (!event) { window.location.href = 'index.html'; return; }
      document.getElementById('event-title').textContent = event.title; document.getElementById('event-description').textContent = event.description; document.getElementById('event-date').textContent = formatDate(event.date); document.getElementById('event-venue').textContent = event.venue;
      const seatMap = document.getElementById('seat-map'); seatMap.style.gridTemplateColumns = `repeat(${event.cols}, 36px)`; let selectedSeats = [];
      for (let r = 0; r < event.rows; r++) for (let c = 0; c < event.cols; c++) { const seatId = `${r}-${c}`; const seat = document.createElement('button'); seat.type = 'button'; seat.className = 'seat ' + (event.seats?.[seatId] ? 'reserved' : ''); seat.setAttribute('aria-label', `Seat ${seatId}`); seat.textContent = seatIdToCode(seatId); seat.onclick = () => { if (seat.classList.contains('reserved')) return; seat.classList.toggle('selected'); if (selectedSeats.includes(seatId)) selectedSeats = selectedSeats.filter(s => s !== seatId); else selectedSeats.push(seatId); document.getElementById('summary').textContent = `${selectedSeats.length} seats selected | Total: \u20b1${(selectedSeats.length * event.price).toFixed(2)}`; }; seatMap.appendChild(seat); }

      document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault(); if (selectedSeats.length === 0) { showToast('error','Please select at least one seat.'); return; }
        const buyer = { name: document.getElementById('buyer-name').value.trim(), email: document.getElementById('buyer-email').value.trim() };
        const ticket = { id: generateId('tkt'), eventid: event.id, buyer, seats: [...selectedSeats], checkedin: false, created_at: new Date().toISOString() };
        try {
          showLoading('Processing payment...');
          // reserve seats on server
          selectedSeats.forEach(s => event.seats[s] = true);
          await updateEvent(event);
          await addTicket(ticket);
          // set lastTicketId for this session
          window.DB.lastTicketId = ticket.id;
          hideLoading(); showToast('success', 'Ticket purchased');
          window.location.href = 'ticket.html';
        } catch (err) { hideLoading(); showToast('error', 'Ticket purchase failed'); console.error(err); }
      });
    })();
  }

  // Ticket page
  function mountTicket() {
    if (!document.getElementById('ticket')) return;
    (async () => {
      // determine ticket ID from DB or session
      const lastId = window.DB.lastTicketId || (await supabaseClient.from('tickets').select('id').order('created_at', { ascending: false }).limit(1)).data?.[0]?.id;
  const { data: ticketData } = await supabaseClient.from('tickets').select('*').eq('id', lastId).limit(1);
  const ticket = ticketData?.[0] || null;
      if (!ticket) { document.getElementById('ticket').innerHTML = '<p>No ticket found.</p>'; return; }
      const { data: ev } = await supabaseClient.from('events').select('*').eq('id', ticket.eventid).single(); const event = ev || { title: 'Unknown', date: ticket.created_at, venue: '' };
      document.getElementById('ticket').innerHTML = `\n      <div class="card ticket-card">\n        <div class="card-body">\n          <h2>${event.title}</h2>\n          <p class="muted">${formatDate(event.date)} \u00b7 ${event.venue}</p>\n          <p><strong>Seats:</strong> ${ticket.seats.map(seatIdToCode).join(', ')}</p>\n          <p><strong>Buyer:</strong> ${ticket.buyer.name} (${ticket.buyer.email})</p>\n          <p class="muted">Ticket ID: ${ticket.id}</p>\n        </div>\n      </div>\n    `;
      // QR
      const generateQRCode = () => {
        if (typeof QRious !== 'undefined') {
          const ticketHtml = `<!doctype html><html><body><h2>${event.title}</h2><div>Ticket ID: ${ticket.id}</div></body></html>`;
          const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(ticketHtml)}`;
          const qrElement = document.getElementById('qrcode'); if (qrElement) { try { new QRious({ element: qrElement, value: dataUrl, size: 300 }); } catch (e) { console.warn('QRious error', e); showToast('error','QR generation failed'); } }
        } else setTimeout(generateQRCode, 200);
      };
      generateQRCode();
      const emailBtn = document.getElementById('email-receipt'); if (emailBtn) { const subject = encodeURIComponent(`Your EventBuzz Ticket: ${event.title}`); const body = encodeURIComponent(`Hi ${ticket.buyer.name},\n\nEvent: ${event.title}\nDate: ${formatDate(event.date)}\nVenue: ${event.venue}\nSeats: ${ticket.seats.map(seatIdToCode).join(', ')}\nTicket ID: ${ticket.id}`); emailBtn.addEventListener('click', () => { window.location.href = `mailto:${ticket.buyer.email}?subject=${subject}&body=${body}`; }); }
    })();
  }

  // Check-in
  window.checkIn = async function () {
    const id = (document.getElementById('ticket-id')?.value || '').trim(); if (!id) { showToast('error','Please enter a ticket ID'); return; } const resultEl = document.getElementById('checkin-result'); if (!resultEl) return; try { showLoading('Validating ticket...'); const { data: tickets } = await supabaseClient.from('tickets').select('*').eq('id', id).limit(1); const ticket = tickets?.[0]; if (!ticket) { hideLoading(); resultEl.textContent = '\u274c Ticket not found.'; resultEl.className = 'error'; return; } if (ticket.checkedin) { hideLoading(); resultEl.textContent = '\u26a0\ufe0f Ticket already checked in.'; resultEl.className = 'warn'; return; } ticket.checkedin = true; ticket.checkedin_at = new Date().toISOString(); await updateTicket(ticket); hideLoading(); resultEl.textContent = '\u2705 Ticket valid. Checked in!'; resultEl.className = 'success'; showToast('success','Checked in'); } catch (err) { hideLoading(); resultEl.textContent = 'Error checking in: ' + (err.message || JSON.stringify(err)); resultEl.className = 'error'; showToast('error','Check-in failed'); }
  };

  // QR file upload for check-in (requires qr-scanner to be included on that page)
  function mountCheckinQr() {
    const fileInput = document.getElementById('qr-file');
    if (!fileInput) return;
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        if (window.QrScanner) {
          const result = await window.QrScanner.scanImage(file);
          if (result.startsWith('data:text/html')) {
            const html = decodeURIComponent(result.replace(/^data:text\/html(;charset=[^,]+)?,/, ''));
            const m = html.match(/Ticket ID:\s*([a-z0-9_\-]+)/i);
            if (m) { document.getElementById('ticket-id').value = m[1]; checkIn(); return; }
          }
          if (result.startsWith('tkt_')) { document.getElementById('ticket-id').value = result; checkIn(); return; }
          document.getElementById('ticket-id').value = result; checkIn();
        } else {
          showToast('error', 'QR decoder not loaded.');
        }
      } catch (err) {
        console.error(err);
        showToast('error', 'Failed to decode QR image.');
      } finally {
        fileInput.value = '';
      }
    });
  }

  // Mount pages
  mountAuth(); mountIndex(); mountAdminSecured(); mountEvent(); mountTicket(); mountCheckinQr();

})();
