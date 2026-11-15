// data functions used by the pages
// reads go through the shared supabase client
// creating auctions, reading bids and the archive use the backend functions
import { supabase } from './supabase.js';
import { getAuctionBids } from '../database--seb/read_auction.js';
import { createAuction as backendCreateAuction } from '../database--seb/auctions.js';
import { getArchivedAuctions } from '../database--seb/archive.js';

const AUCTION_FIELDS = 'id, country_name, starting_price, current_highest_bid, highest_bidder_id, end_time, status, created_by, created_at';

// an auction is open when it is active and the end time is not passed
export function isOpen(auction) {
  return auction.status === 'active' && new Date(auction.end_time) > new Date();
}

// status to show on screen
// the database keeps "active" until someone changes it, so if the
// time is over we show "ended"
export function shownStatus(auction) {
  if (auction.status === 'active' && !isOpen(auction)) return 'ended';
  return auction.status;
}

// open auctions, ending soonest first (homepage)
export async function getActiveAuctions(limit = null) {
  let query = supabase
    .from('auctions')
    .select(AUCTION_FIELDS)
    .eq('status', 'active')
    .gt('end_time', new Date().toISOString())
    .order('end_time', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// auctions for the catalog page (search, filter, sort)
export async function getAuctions({ search = '', status = 'all', sort = 'ending' } = {}) {
  const now = new Date().toISOString();
  let query = supabase.from('auctions').select(AUCTION_FIELDS);

  if (status === 'active') query = query.eq('status', 'active').gt('end_time', now);
  if (status === 'ended') query = query.or(`status.eq.ended,and(status.eq.active,end_time.lte."${now}")`);
  if (status === 'cancelled') query = query.eq('status', 'cancelled');
  if (search) query = query.ilike('country_name', `%${search}%`);

  const sorts = {
    ending: ['end_time', true],
    newest: ['created_at', false],
    price_high: ['current_highest_bid', false],
    price_low: ['current_highest_bid', true],
  };
  const [column, ascending] = sorts[sort] || sorts.ending;
  const { data, error } = await query.order(column, { ascending });
  if (error) throw error;
  return data;
}

// one auction by id
export async function getAuction(id) {
  const { data, error } = await supabase
    .from('auctions')
    .select(AUCTION_FIELDS)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// auctions made by one government user
export async function getMyAuctions(userId) {
  const { data, error } = await supabase
    .from('auctions')
    .select(AUCTION_FIELDS)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// bids for an auction, highest first (backend function)
export async function getBids(auctionId) {
  return getAuctionBids(auctionId);
}

// highest price right now: the auction row or the top bid, whichever is bigger
export function currentPrice(auction, bids = []) {
  const topBid = bids.length ? Number(bids[0].amount) : 0;
  return Math.max(Number(auction.current_highest_bid) || 0, topBid);
}

// lowest bid that is allowed next
export function minNextBid(auction, bids = []) {
  const current = currentPrice(auction, bids);
  return current > 0 ? current + 1 : Number(auction.starting_price);
}

// save a bid. the database checks the bid again before it is saved
export async function placeBid(auctionId, bidderId, amount) {
  const { error } = await supabase
    .from('bids')
    .insert([{ auction_id: auctionId, bidder_id: bidderId, amount }]);
  if (error) throw error;
}

// create an auction (backend function checks the role and the values)
export async function createAuction({ country_name, starting_price, end_time }) {
  return backendCreateAuction({ country_name, starting_price, end_time });
}

// ended and cancelled auctions (backend function)
export async function getArchive() {
  return getArchivedAuctions();
}
