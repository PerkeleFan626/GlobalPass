import { supabase } from './database.js';
import { getCurrentUser } from './users.js';
import { validateCountry } from './countryValidator.js';
import { getFlagUrl } from './flagStorage.js';

export async function createAuction({ country_name, starting_price, end_time }) {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    const errorMsg = 'No active user found. Select dummy user or log in first';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (user.role !== 'government') {
    const errorMsg = 'Only government accounts can create auctions.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const countryResult = validateCountry(country_name || user.represented_country);
  if (!countryResult.success) {
    return countryResult;
  }

  const price = Number(starting_price);
  if (isNaN(price) || price <= 0) {
    const errorMsg = 'Starting price must be greater than 0';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!end_time) {
    const errorMsg = 'An end_time is required';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const formattedEndTime = new Date(end_time).toISOString();

  const { data, error } = await supabase
    .from('auctions')
    .insert([
      {
        country_name: countryResult.country,
        created_by: user.id,
        starting_price: price,
        status: 'active',
        end_time: formattedEndTime
      }
    ])
    .select(`*, government:profiles!created_by(name, email, represented_country)`)
    .single();

  if (error) {
    console.error('Failed to create auction:', error.message);
    return { success: false, error: error.message };
  }

  const enrichedAuction = {
    ...data,
    flag_url: getFlagUrl(data.country_name),
    government: data.government
      ? {
          ...data.government,
          flag_url: getFlagUrl(data.government.represented_country)
        }
      : null
  };

  return { success: true, auction: enrichedAuction };
}

export async function getActiveAuctions() {
  const { data, error } = await supabase
    .from('auctions')
    .select(`*, government:profiles!created_by(name, email, represented_country)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching auctions:', error.message);
    return [];
  }

  return data.map((auction) => ({
    ...auction,
    flag_url: getFlagUrl(auction.country_name),
    government: auction.government
      ? {
          ...auction.government,
          flag_url: getFlagUrl(auction.government.represented_country)
        }
      : null
  }));
}
  export async function cancelAuction(auctionId) {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    const errorMsg = 'No active user found. Log in first.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (user.role !== 'government') {
    const errorMsg = 'Only government accounts can cancel auctions.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!auctionId) {
    const errorMsg = 'An auction ID is required.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const { error } = await supabase
    .from('auctions')
    .update({ status: 'cancelled' })
    .eq('id', auctionId)
    .eq('created_by', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Failed to cancel auction:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}