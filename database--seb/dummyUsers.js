import { supabase } from './database.js';

let activeDummyUser = null;

export function setActiveDummyUser(profile) {
  activeDummyUser = profile;
}

export function getActiveDummyUser() {
  return activeDummyUser;
}

export async function createDummyUser({ name, email, role, country }) {
  const countryF = role === 'government' && country
    ? country.trim()
    : null;

  if (role === 'government' && !countryF) {
    console.error('Government dummy users require a represented country.');
    return null;
  }

  const { data, error } = await supabase.rpc('create_dummy_user', {
    dummy_name: name.trim(),
    dummy_email: email.trim(),
    dummy_role: role,
    dummy_country: countryF
  });

  if (error) {
    console.error('Failed to create dummy user:', error.message);
    return null;
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function getTestProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error.message);
    return [];
  }

  return data;
}