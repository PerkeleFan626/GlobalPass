// Shared UI helpers used by every page.

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  const setMenu = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.textContent = open ? '✕' : '☰';
  };
  toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  // Close after choosing a link, tapping outside, or pressing Escape
  links.addEventListener('click', (e) => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !e.target.closest('.nav')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

export function formatNZD(value) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

// "2d 4h 10m 5s" until endTime, or "Ended"
export function timeLeft(endTime) {
  const ms = new Date(endTime) - Date.now();
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${sec}s`;
}

// Escape text before inserting into HTML (stops XSS from database values)
export function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// One auction card — used on homepage and catalog
export function auctionCard(a) {
  const current = Number(a.current_highest_bid) > 0 ? a.current_highest_bid : a.starting_price;
  return `
    <article class="card" data-id="${esc(a.id)}">
      <div class="card-top">
        <h3>${esc(a.country_name)}</h3>
        <span class="badge badge-${esc(a.status)}">${esc(a.status)}</span>
      </div>
      <div class="price-row">
        <div><small>Starting price</small><strong>${formatNZD(a.starting_price)}</strong></div>
        <div><small>Current bid</small><strong class="current-bid">${formatNZD(current)}</strong></div>
      </div>
      <p class="countdown" data-end="${esc(a.end_time)}">⏱ ${timeLeft(a.end_time)}</p>
      <a class="btn btn-primary" href="auction.html?id=${encodeURIComponent(a.id)}">View &amp; bid</a>
    </article>`;
}

// Tick every countdown on the page once per second
export function startCountdowns() {
  setInterval(() => {
    document.querySelectorAll('.countdown[data-end]').forEach((el) => {
      el.textContent = '⏱ ' + timeLeft(el.dataset.end);
    });
  }, 1000);
}
