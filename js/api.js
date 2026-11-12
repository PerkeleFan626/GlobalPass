// data functions
import { supabase } from './supabase.js';

const AUCTION_FIELDS = 'id, country_name, starting_price, current_highest_bid, end_time, status';

// active auctions, ending soonest first
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

// auctions for the catalog (search, filter, sort)
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

// get one auction
export async function getAuction(id) {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, country_name, starting_price, current_highest_bid, highest_bidder_id, end_time, status, created_by')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// bids for an auction, highest first
export async function getBids(auctionId) {
  const { data, error } = await supabase
    .from('bids')
    .select('id, bidder_id, amount, created_at')
    .eq('acution_id', auctionId)
    .order('amount', { ascending: false });
  if (error) throw error;
  return data;
}

// lowest allowed bid
export function minNextBid(auction) {
  const current = Number(auction.current_highest_bid) || 0;
  return current > 0 ? current + 1 : Number(auction.starting_price);
}

// place a bid using the process_bid function in the database
export async function placeBid(auctionId, amount) {
  const { data, error } = await supabase.rpc('process_bid', {
    p_auction_id: auctionId,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}
