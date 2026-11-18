import { supabase } from './database.js';
import { validateCountry } from './countryValidator.js';

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

  let validatedCountry = null;

  if (role === 'government') {
    const countryResult = validateCountry(represented_country);
    if (!countryResult.success) {
      const errorMsg = countryResult.error;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    validatedCountry = countryResult.country;
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        name: name.trim(),
        represented_country: validatedCountry,
        role: role
      }
    }
  });

  if (error) {
    console.error('Sign-up failed:', error.message);
    return { success: false, error: error.message };
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    const errorMsg = 'An account with this email already exists.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  return { success: true, user: data.user, session: data.session };
}