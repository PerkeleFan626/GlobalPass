import { supabase } from './database.js';
import { setActiveDummyUser } from './dummyUsers.js';

export async function loginUser({email, password}) {
    if (!email || !password) {
        const errorMsg = 'Email and password are required.';
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    const{data, error} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
    });

    if (error) {
    console.error('Login failed:', error.message);
    return { success: false, error: error.message };
    }

    setActiveDummyUser(null);

    return{success: true, user: data.user, session: data.session};
}

export async function logoutUser() {
  setActiveDummyUser(null);
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}