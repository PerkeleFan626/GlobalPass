import { supabase } from './database.js';
import { validateCountry } from './countryValidator.js';
import { getFlagUrl } from './flagStorage.js';

let activeDummyUser = null;

function userWithFlag(user) {
  if (!user) return null;
  return {
    ...user,
    flag_url: getFlagUrl(user.represented_country)
  };
}

export function setActiveDummyUser(dummyUser) {
  activeDummyUser = userWithFlag(dummyUser);
}

export async function getCurrentUser() {
  if (activeDummyUser) {
    return activeDummyUser;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return userWithFlag(profile || user);
}

export async function getTestProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, represented_country')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching test profiles', error.message);
    return [];
  }

  return data.map(userWithFlag);
}

export async function createDummyUser({ name, email, role = 'bidder', country = null }) {
  if (!name || !email || !role) {
    const errorMsg = 'Name, email, and role are required.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  let validatedCountry = null;

  if (role === 'government') {
    const countryResult = validateCountry(country);
    if (!countryResult.success) {
      return countryResult;
    }
    validatedCountry = countryResult.country;
  }

  const { data, error } = await supabase.rpc('create_dummy_user', {
    dummy_name: name.trim(),
    dummy_email: email.trim(),
    dummy_role: role,
    dummy_country: validatedCountry
  });

  if (error) {
    console.error('Error creating dummy user:', error.message);
    return { success: false, error: error.message };
  }

  const enrichedUser = userWithFlag(data);
  return { success: true, user: enrichedUser };
}