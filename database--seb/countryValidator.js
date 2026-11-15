import {UN_COUNTRIES} from './unCountries.js';

export function validateCountry(userCountry) {
  if (!userCountry || typeof userCountry !== 'string' || !userCountry.trim()) {
    const errorMsg = 'A valid UN-recognized country is required for government accounts.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
  

  const validatedCountry = userCountry.trim().toLowerCase();
  const isoCode = UN_COUNTRIES[validatedCountry];

  if (!isoCode) {
    const errorMsg = `"${userCountry.trim()}" is not a recognized UN member country.`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  return {
    success: true,
    country: validatedCountry,
    isoCode: isoCode
  };
}