-- ============================================================
-- GlobalPass — Sprint 2 backend fixes (FOR SEBASTIAN TO REVIEW + RUN)
-- Drafted from the frontend side. Run in Supabase → SQL Editor.
-- Fixes: (1) no profile row on sign-up, (2) RLS on with 0 policies
--        (which blocks every read/write from the app).
-- ============================================================

-- 1. Auto-create a profiles row when someone signs up.
--    Name + role come from the register form (signUp metadata).
--    Users can only pick bidder or government; admin is set by hand.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (profileid, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'government'
         then 'government'::public.user_role
         else 'bidder'::public.user_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Helper: the logged-in user's role (security definer avoids RLS recursion)
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where profileid = auth.uid();
$$;

-- 3. Policies
-- profiles: users read their own row; admins read all
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (profileid = auth.uid() or public.my_role() = 'admin');

-- auctions: anyone can browse
create policy "auctions_select_public" on public.auctions
  for select to anon, authenticated
  using (true);

-- auctions: only government users create, and only as themselves
create policy "auctions_insert_government" on public.auctions
  for insert to authenticated
  with check (public.my_role() = 'government' and created_by = auth.uid());

-- auctions: only admins change auctions (e.g. cancel)
create policy "auctions_update_admin" on public.auctions
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- bids: anyone can see bid history (inserts go through process_bid in Sprint 3)
create policy "bids_select_public" on public.bids
  for select to anon, authenticated
  using (true);

-- archive: admins only
create policy "archive_select_admin" on public.auctions_archive
  for select to authenticated
  using (public.my_role() = 'admin');

-- ============================================================
-- CHECK BEFORE RUNNING
-- * archive_auction() is fired by the status trigger. If it is NOT
--   "security definer", the archive insert will be blocked by RLS
--   when an admin cancels. Make it security definer.
-- * auctions_archive.winner_id is NOT NULL → cancelling an auction
--   with no bids will fail. Run:
--     alter table public.auctions_archive alter column winner_id drop not null;
-- * Make the first admin by hand after they sign up:
--     update public.profiles set role = 'admin' where email = 'ADMIN_EMAIL_HERE';
-- ============================================================
