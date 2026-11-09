import { supabase } from './database.js';
import { getCurrentUser, getTestProfiles } from './users.js';

export async function createAuction({country_name, starting_price, end_time}) {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        const errorMsg = 'No active user found. Select dummy user or log in first';
        console.error(errorMsg);
        return{success: false, error: errorMsg};
    
    }

    const representedCountry = (country_name || user.represented_country || '').trim();
    if (!representedCountry) {
        const errorMsg = 'country_name is missing. Please enter a country or select a profile with a represented_country';
        console.error(errorMsg);
        return {success: false, error: errorMsg};
    }

    const price = Number(starting_price);
    if (isNaN(price) || price<0) {
        const errorMsg = 'Starting price must be <0';
        console.error(errorMsg);
        return{success: false, error: errorMsg};
    }

    if (!end_time) {
        const errorMsg = 'A end_time is requierd';
        console.error(errorMsg);
        return{success: false, errorMsg};
    }

    const formattedEndTime = new Date(end_time).toISOString();

    const { data, error } = await supabase
    .from('auctions')
    .insert([
      {
        country_name: representedCountry,
        created_by: user.id,
        starting_price: price,
        status: 'active',
        end_time: formattedEndTime
      }
    ])
    .select(`*,government:profiles!created_by(name, email, represented_country)`)
    .single();

    if(error) {
        console.error('Failed to create auction:', error.message);
        return{success: false, error: error.message};
    }

    return{success: true, auction: data};
}

export async function getActiveAuctions() {
    const {data, error} = await supabase
    .from('auctions')
    .select(`*, government:profiles!created_by(name, email, represented_country)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

    if(error) {
        console.error('Error fetching auctions:', error.message);
        return[];
    }
    return data;
}