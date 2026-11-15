import { supabase } from './database.js';
import { UN_COUNTRIES } from './unCountries.js';

const FLAGS_BUCKET = 'flags';

export function getFlagUrl(countryName) {
  if (!countryName || typeof countryName !== 'string') {
    return null;
  }

  const validCountry = countryName.trim().toLowerCase();
  const isoCode = UN_COUNTRIES[validCountry];

  if (!isoCode) {
    return null;
  }

  const { data } = supabase.storage
    .from(FLAGS_BUCKET)
    .getPublicUrl(`${isoCode}.svg`);

  return data?.publicUrl || null;
}