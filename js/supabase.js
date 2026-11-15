// one supabase client for the whole site
// we use the client from the backend folder so the pages and the
// backend functions share the same login session
export { supabase } from '../database--seb/database.js';
