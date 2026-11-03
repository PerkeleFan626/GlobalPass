-- ============================================================
-- GlobalPass — Sprint 4 backend needs (FOR SEBASTIAN TO REVIEW + RUN)
-- Run AFTER sprint2-auth-and-policies.sql (uses public.my_role()).
-- ============================================================

-- 1. Realtime: let the database push changes to the browser
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;

-- 2. Admin can change user roles (Admin → Users tab)
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
