import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oilpmlqumzdonmnxjuvv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RdrVK3LLZunh_lBP7shc5w_INu7PXyt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


async function testConnection() {
  const {count, error} = await supabase
    .from('auctions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Database connection failed:', error.message);
  } else {
    console.log(`connected to Supabase: Total auctions in table: ${count}`);
  }
}

testConnection();