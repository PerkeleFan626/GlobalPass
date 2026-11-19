import { supabase } from './database.js';
import { getFlagUrl } from './flagStorage.js';
import { getActiveDummyUser } from './dummyUsers.js';

export {
  createDummyUser,
  switchDummyUser,
  setActiveDummyUser,
  getActiveDummyUser,
  clearActiveDummyUser
} from './dummyUsers.js';

function userWithFlag(user) {
  if (!user) return null;
  return {
    ...user,
    flag_url: getFlagUrl(user.represented_country)
  };
}

export async function getCurrentUser() {
  const dummyUser = getActiveDummyUser();
  if (dummyUser) {
    return dummyUser;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
    }
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