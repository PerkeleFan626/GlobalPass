// login state, page guards and the top menu
// the real login work is done by the backend functions
import { getCurrentUser } from '../database--seb/users.js';
import { logoutUser } from '../database--seb/login.js';

// first page for each role after login
export const HOME_BY_ROLE = {
  bidder: 'auctions.html',
  government: 'create-auction.html',
  admin: 'admin.html',
};

// profile of the logged in user, or null
export async function getProfile() {
  return getCurrentUser();
}

// only let some roles open a page, send everyone else away
export async function requireRole(allowedRoles) {
  const profile = await getProfile();
  if (!profile) {
    const page = location.pathname.split('/').pop();
    window.location.replace('login.html?next=' + encodeURIComponent(page));
    return null;
  }
  if (!allowedRoles.includes(profile.role)) {
    window.location.replace(HOME_BY_ROLE[profile.role] || 'index.html');
    return null;
  }
  return profile;
}

// login and sign up pages are not for logged in users
export async function redirectIfLoggedIn() {
  const profile = await getProfile();
  if (profile) window.location.replace(HOME_BY_ROLE[profile.role] || 'index.html');
}

export async function logout() {
  await logoutUser();
  window.location.href = 'index.html';
}

// build the menu links for the current user
export async function renderNav() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  const current = location.pathname.split('/').pop() || 'index.html';
  const link = ([href, label]) =>
    `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`;

  // show the public links first so the menu is not empty while loading
  const items = [['index.html', 'Home'], ['auctions.html', 'Auctions'], ['about.html', 'About']];
  links.innerHTML = items.map(link).join('');

  const profile = await getProfile();
  if (profile?.role === 'government') items.push(['create-auction.html', 'My listings']);
  if (profile?.role === 'admin') items.push(['admin.html', 'Admin']);

  let html = items.map(link).join('');

  if (profile) {
    const name = document.createElement('span');
    name.textContent = profile.name;
    html += `<span class="nav-user">${name.innerHTML} · ${profile.role}</span>
             <button type="button" class="btn btn-ghost" id="logout-btn">Log out</button>`;
  } else {
    html += `${link(['login.html', 'Log in'])}
             <a href="register.html" class="btn btn-primary nav-cta">Sign up</a>`;
  }
  links.innerHTML = html;
  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

renderNav();
