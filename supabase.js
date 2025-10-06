// Minimal Supabase client initializer + DB helpers (no authentication usage)
const SUPABASE_URL = "https://aypvxxgkhatnszscuwwi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHZ4eGdraGF0bnN6c2N1d3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDE3ODQsImV4cCI6MjA3NTMxNzc4NH0.2kJ65eqbtjph1-IFQW2a72Od-WP6Z79tiM2jogXf3Ck";

window.supabaseReady = new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
  s.onload = async () => {
    try {
      window.supabase = window.supabase || {};
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      resolve(window.supabaseClient);
    } catch (err) {
      reject(err);
    }
  };
  s.onerror = reject;
  document.head.appendChild(s);
});

// DB helpers (no auth checks)
async function addEvent(event) {
  const { data, error } = await window.supabaseClient.from('events').insert([event]).select();
  if (error) throw error;
  return data[0];
}
async function updateEvent(event) {
  const { data, error } = await window.supabaseClient.from('events').update(event).eq('id', event.id).select();
  if (error) throw error;
  return data[0];
}
async function deleteEvent(id) {
  const { data, error } = await window.supabaseClient.from('events').delete().eq('id', id).select();
  if (error) throw error;
  return data;
}

async function addTicket(ticket) {
  const { data, error } = await window.supabaseClient.from('tickets').insert([ticket]).select();
  if (error) throw error;
  return data[0];
}
async function updateTicket(ticket) {
  const { data, error } = await window.supabaseClient.from('tickets').update(ticket).eq('id', ticket.id).select();
  if (error) throw error;
  return data[0];
}
async function deleteTicket(id) {
  const { data, error } = await window.supabaseClient.from('tickets').delete().eq('id', id).select();
  if (error) throw error;
  return data;
}
