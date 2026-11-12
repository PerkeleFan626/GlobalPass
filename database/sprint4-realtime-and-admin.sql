-- realtime and admin role changes

-- realtime
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;

-- admin can change user roles
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
