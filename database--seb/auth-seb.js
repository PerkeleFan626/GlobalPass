import { supabase } from './database.js';

export async function signUp(name, email, password) {
const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  });

  if(error) {
    console.error('Sign-uo failed:', error.message);
    return {success: false, error: error.message};
  }

  return{success: true, user: data.user};
}