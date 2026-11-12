import { supabase } from './database.js';

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email?.trim() || '', {
    redirectTo: `${window.location.origin}/reset-password.html`
  });

  if (error) {
    console.error('Reset request failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    console.error('Password update failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}