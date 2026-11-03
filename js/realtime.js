// Sprint 4: Supabase Realtime — the database pushes changes to the browser
// over a WebSocket, so prices update instantly without refreshing.
// Requires Realtime to be enabled for the auctions + bids tables (Sebastian).
import { supabase } from './supabase.js';

// Small "● Live" indicator — shows whether the WebSocket is connected
function setLiveBadge(status) {
  const el = document.getElementById('live-badge');
  if (!el) return;
  const live = status === 'SUBSCRIBED';
  el.classList.toggle('on', live);
  el.textContent = live ? '● Live' : '○ Reconnecting…';
  el.title = live ? 'Prices update instantly' : 'Live updates paused — refreshing periodically';
}

// Run fn at most once per `ms` (bursts of bids → one reload)
function debounce(fn, ms = 400) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Listen to ONE auction and its bids (auction detail page)
export function subscribeAuction(auctionId, onChange) {
  const cb = debounce(onChange);
  return supabase
    .channel('auction-' + auctionId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` }, cb)
    // column is spelt "acution_id" in the database
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `acution_id=eq.${auctionId}` }, cb)
    .subscribe(setLiveBadge);
}

// Listen to ALL auctions (homepage, catalog, admin)
export function subscribeAuctions(onChange) {
  const cb = debounce(onChange);
  return supabase
    .channel('auctions-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, cb)
    .subscribe(setLiveBadge);
}

// Brief green flash on an element whose value just changed
export function flash(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // restart animation
  el.classList.add('flash');
}
