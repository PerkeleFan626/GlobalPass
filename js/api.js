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

// ---------- Sprint 3: auction detail + bidding ----------

// One auction by id
export async function getAuction(id) {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, country_name, starting_price, current_highest_bid, highest_bidder_id, end_time, status, created_by')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Bid history for an auction, highest first.
// NOTE: the column is spelt "acution_id" in the database — keep it until Sebastian renames it.
export async function getBids(auctionId) {
  const { data, error } = await supabase
    .from('bids')
    .select('id, bidder_id, amount, created_at')
    .eq('acution_id', auctionId)
    .order('amount', { ascending: false });
  if (error) throw error;
  return data;
}

// Lowest bid the user is allowed to place
export function minNextBid(auction) {
  const current = Number(auction.current_highest_bid) || 0;
  return current > 0 ? current + 1 : Number(auction.starting_price);
}

// ---- BID CONTRACT — confirm the parameter names with Sebastian ----
// Calls the database function process_bid, which validates and saves the bid
// (auction still open, amount higher than current bid) in one safe step.
// If Sebastian's parameter names differ, change ONLY the object below.
export async function placeBid(auctionId, amount) {
  const { data, error } = await supabase.rpc('process_bid', {
    p_auction_id: auctionId,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}
