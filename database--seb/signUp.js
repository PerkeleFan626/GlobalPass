import { supabase } from './database.js';

export async function signUpUser({ email, password, name, represented_country, role = 'bidder' }) {
  if (!email || !password || !name) {
    const errorMsg = 'Email, password, and name are required.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (password.length < 6) {
    const errorMsg = 'Password must be at least 6 characters.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const country = role === 'government' && represented_country
    ? represented_country.trim()
    : null;

  if (role === 'government' && !country) {
    const errorMsg = 'Government accounts must specify a represented country.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        name: name.trim(),
        represented_country: country,
        role: role
      }
    }
  });

  if (error) {
    console.error('Sign-up failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}