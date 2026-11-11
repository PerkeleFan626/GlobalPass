// auth and navigation
import { supabase } from './supabase.js';

// page for each role after login
export const HOME_BY_ROLE = {
  bidder: 'auctions.html',
  government: 'create-auction.html',
  admin: 'admin.html',
};

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// get logged in user's profile
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('profileid, email, name, role')
    .eq('profileid', user.id)
    .single();
  if (error) {
    console.error('Profile not found', error);
    return null;
  }
  return data;
}

// only allow certain roles on a page
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

// redirect if already logged in
export async function redirectIfLoggedIn() {
  const profile = await getProfile();
  if (profile) window.location.replace(HOME_BY_ROLE[profile.role] || 'index.html');
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// build nav links
export async function renderNav() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  const current = location.pathname.split('/').pop() || 'index.html';
  const link = ([href, label]) => `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`;

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
