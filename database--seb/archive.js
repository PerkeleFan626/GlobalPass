import { supabase } from './database.js';

export async function getArchivedAuctions() {
  const {data, error} = await supabase
  .from('auctions_archive')
    .select(`
      id,
      auction_id,
      country_name,
      seller_id,
      winner_id,
      starting_price,
      final_price,
      total_bids,
      final_status,
      payment_status,
      bids,
      archived_at
    `)
    .order('archived_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived auctions ', error.message);
      return[];
    }
  return data;
}

export async function getActiveAuctionById(auctionId) {
  const {data, error} = await supabase
  .from('auctions_archive')
    .select('*')
    .or(`auction_id.eq.${auctionId},id.eq.${auctionId}`)
    .single();

    if(error) {
      console.error(`Error fetching archived auction ${auctionId}:`, error.message);
      return null;
    }
  return data;

}