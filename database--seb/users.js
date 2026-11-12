import { supabase } from './database.js';
import { getActiveDummyUser } from './dummyUsers.js';

export async function getCurrentUser() {
    const dummyUser = getActiveDummyUser();
    if (dummyUser) {
        return dummyUser;
    }

    const {data: {user}, error: authError} = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to load profile for authenticated user:', profileError.message);
    return null;
  }

  return profile;

}