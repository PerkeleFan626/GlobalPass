// Auth helpers: session, profile/role, page guards, logout, dynamic nav.
import { supabase } from './supabase.js';

// Where each role lands after login
export const HOME_BY_ROLE = {
  bidder: 'auctions.html',
  government: 'create-auction.html',
  admin: 'admin.html',
};

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Logged-in user's profile row ({ profileid, email, name, role }) or null
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('profileid, email, name, role')
    .eq('profileid', user.id)
    .single();
  if (error) {
    console.error('Profile not found — is the sign-up trigger set up?', error);
    return null;
  }
  return data;
}

// Page guard: call at the top of a protected page.
// Redirects to login if logged out, or to the user's own home if wrong role.
export async function requireRole(allowedRoles) {
  const profile = await getProfile();
  if (!profile) {
    window.location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop()));
    return null;
  }
  if (!allowedRoles.includes(profile.role)) {
    window.location.replace(HOME_BY_ROLE[profile.role] || 'index.html');
    return null;
  }
  return profile;
}

// Logged-out-only pages (login/register): send logged-in users home
export async function redirectIfLoggedIn() {
  const profile = await getProfile();
  if (profile) window.location.replace(HOME_BY_ROLE[profile.role] || 'index.html');
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// Rebuild nav links based on who is logged in
export async function renderNav() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  const current = location.pathname.split('/').pop() || 'index.html';
  const link = ([href, label]) => `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`;

  // Show the basic links immediately so the header is never empty while loading
  const items = [['index.html', 'Home'], ['auctions.html', 'Auctions']];
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
