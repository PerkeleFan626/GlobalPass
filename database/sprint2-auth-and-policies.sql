-- auth trigger and rls policies

-- 1. create a profile row on sign up (admin can't be chosen)
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

-- 2. current user's role
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where profileid = auth.uid();
$$;

-- 3. policies
-- profiles: own row, admin sees all
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (profileid = auth.uid() or public.my_role() = 'admin');

-- auctions: public read
create policy "auctions_select_public" on public.auctions
  for select to anon, authenticated
  using (true);

-- auctions: government can create
create policy "auctions_insert_government" on public.auctions
  for insert to authenticated
  with check (public.my_role() = 'government' and created_by = auth.uid());

-- auctions: admin can update
create policy "auctions_update_admin" on public.auctions
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- bids: public read
create policy "bids_select_public" on public.bids
  for select to anon, authenticated
  using (true);

-- archive: admin only
create policy "archive_select_admin" on public.auctions_archive
  for select to authenticated
  using (public.my_role() = 'admin');

-- notes:
-- archive_auction() should be security definer so cancelling works with rls
-- auctions_archive.winner_id should allow null (cancelled auctions with no bids)
-- first admin is set manually:
-- update public.profiles set role = 'admin' where email = 'ADMIN_EMAIL_HERE';
