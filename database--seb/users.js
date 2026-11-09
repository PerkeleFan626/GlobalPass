import { supabase } from './database.js';

let activeDummyUser = null;

export function setActiveDummyUser(dummyUser) {
    activeDummyUser = dummyUser;
}

export async function getCurrentUser() {
    if (activeDummyUser) {
        return activeDummyUser;
    }

    const {data: {user}, error} = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    const{data: profile} = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

    return profile || user;
}

export async function getTestProfiles() {
    const{data, error} = await supabase
    .from('profiles')
    .select('id, name, email, role, represented_country')
    .order('name', { ascending: true });

    if(error) {
        console.error('Error fetching test profiles', error.message);
        return[];
    }
    return data;
}

export async function createDummyUser({name, email, role, country}) {
    if (!name || !email || !role || !country) {
        console.error('All fields need to be filled');
        return null;
    }

    const{data, error} = await supabase.rpc('create_dummy_user', {
        dummy_name: name,
        dummy_email: email,
        dummy_role: role,
        dummy_country: country
    });

    if(error) {
        console.error('Error creating dummy user:', error.message);
        return null;
    }
    return data;
}