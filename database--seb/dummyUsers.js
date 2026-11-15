import { supabase } from './database.js';
import { validateCountry } from './countryValidator.js';

let activeDummyUser = null;

export async function createDummyUser({ name, email, role = 'bidder', represented_country = null }) {
  if (!name || !email) {
    const errorMsg = 'Name and email are required to create a dummy user.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  let validatedCountry = null;

  if (role === 'government') {
    const countryResult = validateCountry(represented_country);
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
    console.error('Failed to create dummy user:', error.message);
    return { success: false, error: error.message };
  }

  activeDummyUser = data;
  return { success: true, user: data };
}

export async function switchDummyUser(userId) {
  if (!userId) {
    const errorMsg = 'A user ID is required to switch dummy users.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to switch dummy user:', error.message);
    return { success: false, error: error.message };
  }

  activeDummyUser = data;
  return { success: true, user: data };
}

export function getActiveDummyUser() {
  return activeDummyUser;
}

export function clearActiveDummyUser() {
  activeDummyUser = null;
}