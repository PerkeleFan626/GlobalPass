import { supabase } from './database.js';

export async function getAuctionById(auctionId) {
    const { data, error } = await supabase
    .from('auctions')
    .select(`
      id,
      country_name,
      starting_price,
      current_highest_bid,
      highest_bidder_id,
      status,
      payment_status,
      created_by,
      created_at,
      end_time
    `)
    .eq('id', auctionId)
    .single();

    if (error) {
        console.error(`Error fetching auction ${auctionId}:`, error.message);
        return null;
    }
    return data;
}

export async function getAuctionBids(auctionId) {
    const { data, error } = await supabase
    .from('bids')
    .select(`
      id,
      auction_id,
      bidder_id,
      amount,
      created_at
    `)
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false });

    if (error) {
        console.error(`Error fetching bids from auction: ${auctionId}`, error.message);
        return [];
    }
    return data;
}