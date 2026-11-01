# GlobalPass

Citizenship auction web app — HTML, CSS, JavaScript + Supabase.

## Run locally
ES modules need a local server (opening the file directly won't work):

- VS Code: install **Live Server**, right-click `index.html` → **Open with Live Server**
- or: `npx serve .`

## Structure
```
index.html        Homepage (hero, ending-soon auctions, how it works)
auctions.html     Auction catalog (search, filter, sort)
css/style.css     Shared responsive styles (mobile → tablet 640px → desktop 960px)
js/supabase.js    Shared Supabase client
js/api.js         Data helpers (getActiveAuctions, getAuctions)
js/ui.js          Card rendering, countdowns, NZD formatting, nav toggle
```

## Team
- Ayush — Frontend
- Sebastian — Backend / Scrum Master
