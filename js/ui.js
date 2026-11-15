// ui helpers: menu, money, time, cards
import { flagUrl } from './countries.js';
import { shownStatus } from './api.js';

// mobile menu
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
  // close menu on link click, outside click or esc
  links.addEventListener('click', (e) => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !e.target.closest('.nav')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

export function formatNZD(value) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

// time left until end
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

// escape text to prevent xss
export function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// text for the countdown line
export function countdownText(endTime) {
  const t = timeLeft(endTime);
  return t === 'Ended' ? 'Ended' : 'Ends in ' + t;
}

// auction card used on the homepage, the catalog and my listings
export function auctionCard(a) {
  const current = Number(a.current_highest_bid) > 0 ? a.current_highest_bid : a.starting_price;
  const status = shownStatus(a);
  return `
    <article class="card" data-id="${esc(a.id)}">
      <div class="card-img">
        <img src="${esc(flagUrl(a.country_name))}" alt="Flag of ${esc(a.country_name)}" loading="lazy" data-flag>
        <span class="badge badge-${esc(status)}">${esc(status)}</span>
      </div>
      <div class="card-body">
        <h3>${esc(a.country_name)}</h3>
        <div class="price-row">
          <div><small>Starting price</small><strong>${formatNZD(a.starting_price)}</strong></div>
          <div><small>Current bid</small><strong class="current-bid">${formatNZD(current)}</strong></div>
        </div>
        <p class="countdown" data-end="${esc(a.end_time)}">${countdownText(a.end_time)}</p>
        <a class="btn btn-primary" href="auction.html?id=${encodeURIComponent(a.id)}">${status === 'active' ? 'View &amp; bid' : 'View auction'}</a>
      </div>
    </article>`;
}

// update countdowns every second
export function startCountdowns() {
  setInterval(() => {
    document.querySelectorAll('.countdown[data-end]').forEach((el) => {
      el.textContent = countdownText(el.dataset.end);
    });
  }, 1000);
}
