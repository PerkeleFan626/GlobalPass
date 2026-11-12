// realtime updates
import { supabase } from './supabase.js';

// live badge
function setLiveBadge(status) {
  const el = document.getElementById('live-badge');
  if (!el) return;
  const live = status === 'SUBSCRIBED';
  el.classList.toggle('on', live);
  el.textContent = live ? '● Live' : '○ Reconnecting...';
  el.title = live ? 'Prices update instantly' : 'Live updates paused';
}

function debounce(fn, ms = 400) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// listen to one auction and its bids
export function subscribeAuction(auctionId, onChange) {
  const cb = debounce(onChange);
  return supabase
    .channel('auction-' + auctionId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` }, cb)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `acution_id=eq.${auctionId}` }, cb)
    .subscribe(setLiveBadge);
}

// listen to all auctions
export function subscribeAuctions(onChange) {
  const cb = debounce(onChange);
  return supabase
    .channel('auctions-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, cb)
    .subscribe(setLiveBadge);
}

// flash when price changes
export function flash(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
