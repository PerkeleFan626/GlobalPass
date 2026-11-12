// supabase client used by all pages
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://oilpmlqumzdonmnxjuvv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RdrVK3LLZunh_lBP7shc5w_INu7PXyt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
