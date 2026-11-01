// Read-only data helpers for the frontend.
// Sebastian can replace these with his Sprint 2 helper methods later — pages only call these names.
import { supabase } from './supabase.js';

const AUCTION_FIELDS = 'id, country_name, starting_price, current_highest_bid, end_time, status';

// Active auctions ending soonest first
export async function getActiveAuctions(limit = null) {
  let query = supabase
    .from('auctions')
    .select(AUCTION_FIELDS)
    .eq('status', 'active')
    .order('end_time', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// All auctions with optional search + status filter (catalog page)
export async function getAuctions({ search = '', status = 'all', sort = 'ending' } = {}) {
  let query = supabase.from('auctions').select(AUCTION_FIELDS);
  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.ilike('country_name', `%${search}%`);

  const sorts = {
    ending: ['end_time', true],
    newest: ['created_at', false],
    price_high: ['current_highest_bid', false],
    price_low: ['current_highest_bid', true],
  };
  const [col, asc] = sorts[sort] || sorts.ending;
  const { data, error } = await query.order(col, { ascending: asc });
  if (error) throw error;
  return data;
}
