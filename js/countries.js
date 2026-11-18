// country helpers for the pages
// the country list, the check and the flag pictures all come from the
// backend folder (database--seb), so the pages and the backend agree
import { UN_COUNTRIES } from '../database--seb/unCountries.js';
import { validateCountry } from '../database--seb/countryValidator.js';
import { getFlagUrl } from '../database--seb/flagStorage.js';

// picture shown when there is no flag for the country, or it does not load
export const PLACEHOLDER_IMAGE = 'images/placeholder.svg';

// flag picture for a country name (from Supabase storage), or the placeholder
export function flagUrl(countryName) {
  return getFlagUrl(countryName) || PLACEHOLDER_IMAGE;
}

// the backend saves country names in small letters ("new zealand"),
// so we show them with capital letters ("New Zealand")
export function countryLabel(countryName) {
  return String(countryName || '')
    .trim()
    .split(' ')
    .map((word) => (word === 'and' || word === 'the' || word === 'of' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

// every UN country name with capital letters, A to Z (for the country list in forms)
export const COUNTRY_NAMES = Object.keys(UN_COUNTRIES).map(countryLabel).sort();

// check a country name with the backend check. returns { success, country, error }
export function checkCountry(countryName) {
  return validateCountry(countryName);
}

// fill a <datalist> with every country so the user can pick one while typing
export function fillCountryList(datalistId) {
  const list = document.getElementById(datalistId);
  if (!list) return;
  list.innerHTML = COUNTRY_NAMES.map((name) => `<option value="${name}"></option>`).join('');
}

// if a flag picture fails to load, swap it for the placeholder
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img.tagName === 'IMG' && img.dataset.flag !== undefined && !img.src.endsWith(PLACEHOLDER_IMAGE)) {
    img.src = PLACEHOLDER_IMAGE;
  }
}, true);
