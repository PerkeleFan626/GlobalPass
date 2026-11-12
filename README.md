# GlobalPass

A real-time citizenship auction web app. **Government officials** list citizenship allocations, **bidders** compete with live bids, and **admins** moderate the platform. The highest bid when the timer reaches zero wins.

Built with **HTML, CSS and vanilla JavaScript** on the frontend and **Supabase** (PostgreSQL, Auth, Row-Level Security, Realtime) on the backend.

---

## Features

| Area | What it does |
|---|---|
| **Browse** | Homepage with "ending soon" auctions; catalog with search, status filter and sort |
| **Accounts** | Register as a Bidder or Government official; log in; role-based redirects |
| **Listings** | Government officials create auctions (country, starting price, end time) and see their own listings |
| **Bidding** | Auction page with bid history, bid popup, minimum-bid validation and quick-add buttons |
| **Live updates** | Supabase Realtime pushes new bids and status changes to every open browser - no refresh |
| **Admin** | Dashboard with auction stats, cancel auctions, view users and change roles |
| **Responsive** | Mobile-first layout for phone, tablet (640px+) and desktop (960px+) |
| **Security** | Role-protected pages, database permission rules (RLS), output escaping against XSS |

## User roles

| Role | Can |
|---|---|
| **Bidder** | Browse auctions, place bids, see their own bid status |
| **Government** | Create auctions, view their own listings |
| **Admin** | View all auctions and users, cancel auctions, change user roles |

Admin cannot be chosen at sign-up - it is granted manually in the database to prevent privilege escalation.

## Pages

```
index.html            Homepage - hero, ending-soon auctions, how it works
auctions.html         Auction catalog - search, filter, sort, live countdowns
auction.html          Auction detail - bid panel, bid popup, bid history
register.html         Sign up (Bidder or Government)
login.html            Log in, redirects by role
create-auction.html   Government only - create and view listings
admin.html            Admin only - auctions tab and users tab
```

## Code structure

```
css/style.css         All styles, mobile-first with breakpoints at 640px and 960px
js/supabase.js        Shared Supabase client (project URL + publishable key)
js/api.js             Data functions: getAuctions, getAuction, getBids, placeBid
js/auth.js            Session, profile/role, page guards, logout, dynamic navigation
js/ui.js              Auction cards, countdowns, NZD formatting, XSS escaping, mobile menu
js/realtime.js        Supabase Realtime subscriptions and the "Live" indicator
database/             SQL scripts for the Supabase backend
```

## Run locally

The JavaScript uses ES modules, so the site must be served (opening the file directly will not work).

1. Clone the repo: `git clone https://github.com/PerkeleFan626/GlobalPass.git`
2. Open the folder in **VS Code**
3. Install the **Live Server** extension
4. Right-click `index.html` → **Open with Live Server**

## Tech stack

| Tool | Why |
|---|---|
| HTML / CSS / JavaScript | No framework needed - fast to load, simple to learn and maintain |
| Supabase | Hosted PostgreSQL with built-in Auth, Row-Level Security and Realtime on the free tier |
| GitHub | Version control, branches and pull requests for team collaboration |

**Note:** the key in `js/supabase.js` is Supabase's *publishable* key, which is designed to be public. Access is controlled by Row-Level Security rules in the database. The secret key is never used in frontend code.

## Team

| Member | Role | Responsibilities |
|---|---|---|
| **Ayush** | Frontend Engineer | All pages, styling, responsive design, auth flow, bidding UI, Realtime UI |
| **Sebastian** | Backend Engineer / Scrum Master | Database schema, RLS policies, bid stored procedure, triggers, Realtime setup |

## Development

Built in four sprints, each on its own branch and merged through a pull request:

1. **Sprint 1** - Homepage and auction catalog
2. **Sprint 2** - Register, login, government listings, admin dashboard
3. **Sprint 3** - Auction detail page and bidding
4. **Sprint 4** - Realtime live updates and admin user management

---

© 2026 GlobalPass · All rights reserved A & S
