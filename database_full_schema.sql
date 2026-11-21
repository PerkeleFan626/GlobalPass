--
-- PostgreSQL database dump
--

\restrict tJArU6zx6g4fubk5hJNYazX444Znk2DdNSnRF9XXIIMF3cSh9ThZ0NxIJbhJSFY

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'bidder',
    'government',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: archive_auction(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.archive_auction(p_auction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.auctions_archive (
        auction_id,
        country_name,
        seller_id,
        winner_id,
        starting_price,
        final_price,
        total_bids,
        final_status,
        payment_status,
        bids,
        archived_at
    )
    SELECT 
        a.id,
        a.country_name,
        a.created_by,
        CASE 
            WHEN a.status = 'cancelled' THEN NULL
            ELSE a.highest_bidder_id
        END,
        a.starting_price,
        a.current_highest_bid,
        (SELECT COUNT(*) FROM public.bids WHERE auction_id = a.id),
        a.status,
        a.payment_status,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'bid_id', b.id,
                        'bidder_id', b.bidder_id,
                        'bidder_name', p.name,
                        'amount', b.amount,
                        'created_at', b.created_at
                    ) ORDER BY b.created_at ASC
                )
                FROM public.bids b
                LEFT JOIN public.profiles p ON b.bidder_id = p.id
                WHERE b.auction_id = a.id
            ),
            '[]'::jsonb
        ),
        now()
    FROM public.auctions a
    WHERE a.id = p_auction_id;

    -- Safety check: fail loudly if no auction matched
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction % not found in active auctions.', p_auction_id;
    END IF;
END;
$$;


ALTER FUNCTION public.archive_auction(p_auction_id uuid) OWNER TO postgres;

--
-- Name: auction_ended_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auction_ended_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF OLD.status = 'active' AND NEW.status IN ('ended', 'cancelled') THEN
        
        PERFORM public.archive_auction(NEW.id);

        DELETE FROM public.bids 
        WHERE auction_id = NEW.id;

        DELETE FROM public.auctions 
        WHERE id = NEW.id;

    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.auction_ended_trigger() OWNER TO postgres;

--
-- Name: cancel_auction(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cancel_auction(p_auction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.auctions
  set status = 'cancelled'
  where id = p_auction_id
    and created_by = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'Auction could not be cancelled (not found, not yours, or already closed).';
  end if;
end;
$$;


ALTER FUNCTION public.cancel_auction(p_auction_id uuid) OWNER TO postgres;

--
-- Name: country_trim(public.user_role, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.country_trim(p_role public.user_role, p_country text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when p_role = 'government' then nullif(lower(trim(p_country)), '')
    else null
  end;
$$;


ALTER FUNCTION public.country_trim(p_role public.user_role, p_country text) OWNER TO postgres;

--
-- Name: delete_auction(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_auction(p_auction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.auctions_archive WHERE auction_id = p_auction_id) THEN
        RAISE EXCEPTION 'Safety check failed: Auction % is not archived.', p_auction_id;
    END IF;

    DELETE FROM public.bids WHERE auction_id = p_auction_id;
    DELETE FROM public.auctions WHERE id = p_auction_id;
END;
$$;


ALTER FUNCTION public.delete_auction(p_auction_id uuid) OWNER TO postgres;

--
-- Name: expire_overdue_auctions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.expire_overdue_auctions() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.auctions
  SET status = 'ended'
  WHERE status = 'active'
    AND end_time <= now();
$$;


ALTER FUNCTION public.expire_overdue_auctions() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  assigned_role public.user_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'bidder'::public.user_role
  );
begin
  insert into public.profiles (
    id,
    email,
    name,
    role,
    represented_country
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Anonymous'),
    assigned_role,
    public.country_trim(assigned_role, new.raw_user_meta_data ->> 'represented_country')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: process_bid(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_bid() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE public.auctions
    SET 
        current_highest_bid = NEW.amount,
        highest_bidder_id = NEW.bidder_id
    WHERE id = NEW.auction_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.process_bid() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: validate_bid(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_bid() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_auction RECORD;
BEGIN
    SELECT * INTO v_auction
    FROM public.auctions
    WHERE id = NEW.auction_id
    FOR UPDATE;

    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Auction does not exist';
    ELSIF v_auction.status <> 'active' OR now() >= v_auction.end_time THEN 
        RAISE EXCEPTION 'This auction is closed';
    ELSIF NEW.amount <= GREATEST(v_auction.starting_price, v_auction.current_highest_bid) THEN 
        RAISE EXCEPTION 'Bid must be greater than %',
            GREATEST(v_auction.starting_price, v_auction.current_highest_bid);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_bid() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auctions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auctions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_name text NOT NULL,
    created_by uuid NOT NULL,
    highest_bidder_id uuid,
    starting_price numeric NOT NULL,
    current_highest_bid numeric DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT auctions_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text]))),
    CONSTRAINT auctions_starting_price_check CHECK ((starting_price >= (0)::numeric)),
    CONSTRAINT auctions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text])))
);


ALTER TABLE public.auctions OWNER TO postgres;

--
-- Name: auctions_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auctions_archive (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auction_id uuid NOT NULL,
    country_name text NOT NULL,
    seller_id uuid,
    winner_id uuid,
    starting_price numeric NOT NULL,
    final_price numeric NOT NULL,
    total_bids integer DEFAULT 0 NOT NULL,
    final_status text NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    bids jsonb DEFAULT '[]'::jsonb NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auctions_archive OWNER TO postgres;

--
-- Name: bids; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auction_id uuid NOT NULL,
    bidder_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bids_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.bids OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role public.user_role DEFAULT 'bidder'::public.user_role NOT NULL,
    represented_country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: auctions_archive auctions_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions_archive
    ADD CONSTRAINT auctions_archive_pkey PRIMARY KEY (id);


--
-- Name: auctions auctions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT auctions_pkey PRIMARY KEY (id);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: auctions trg_auto_archive; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_archive AFTER UPDATE OF status ON public.auctions FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.auction_ended_trigger();


--
-- Name: bids trg_process_bid; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_process_bid AFTER INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.process_bid();


--
-- Name: bids trg_validate_bid; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_bid BEFORE INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.validate_bid();


--
-- Name: auctions_archive auctions_archive_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions_archive
    ADD CONSTRAINT auctions_archive_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: auctions_archive auctions_archive_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions_archive
    ADD CONSTRAINT auctions_archive_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: auctions auctions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT auctions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: auctions auctions_highest_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT auctions_highest_bidder_id_fkey FOREIGN KEY (highest_bidder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bids bids_auction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.auctions(id) ON DELETE CASCADE;


--
-- Name: bids bids_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: auctions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

--
-- Name: auctions_archive; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.auctions_archive ENABLE ROW LEVEL SECURITY;

--
-- Name: auctions auctions_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auctions_insert ON public.auctions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'government'::public.user_role) AND (profiles.represented_country = auctions.country_name))))));


--
-- Name: auctions auctions_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auctions_read ON public.auctions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: auctions auctions_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auctions_update ON public.auctions FOR UPDATE TO authenticated USING (((auth.uid() = created_by) AND (status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'government'::public.user_role)))))) WITH CHECK ((auth.uid() = created_by));


--
-- Name: bids; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

--
-- Name: bids bids_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bids_insert ON public.bids FOR INSERT TO authenticated WITH CHECK (((auth.uid() = bidder_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'bidder'::public.user_role)))) AND (EXISTS ( SELECT 1
   FROM public.auctions
  WHERE ((auctions.id = bids.auction_id) AND (auctions.status = 'active'::text) AND (auctions.end_time > now()))))));


--
-- Name: bids bids_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bids_read ON public.bids FOR SELECT TO authenticated, anon USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION archive_auction(p_auction_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.archive_auction(p_auction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.archive_auction(p_auction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.archive_auction(p_auction_id uuid) TO service_role;


--
-- Name: FUNCTION auction_ended_trigger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auction_ended_trigger() TO anon;
GRANT ALL ON FUNCTION public.auction_ended_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.auction_ended_trigger() TO service_role;


--
-- Name: FUNCTION cancel_auction(p_auction_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cancel_auction(p_auction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cancel_auction(p_auction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancel_auction(p_auction_id uuid) TO service_role;


--
-- Name: FUNCTION country_trim(p_role public.user_role, p_country text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.country_trim(p_role public.user_role, p_country text) TO anon;
GRANT ALL ON FUNCTION public.country_trim(p_role public.user_role, p_country text) TO authenticated;
GRANT ALL ON FUNCTION public.country_trim(p_role public.user_role, p_country text) TO service_role;


--
-- Name: FUNCTION delete_auction(p_auction_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_auction(p_auction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_auction(p_auction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_auction(p_auction_id uuid) TO service_role;


--
-- Name: FUNCTION expire_overdue_auctions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.expire_overdue_auctions() TO anon;
GRANT ALL ON FUNCTION public.expire_overdue_auctions() TO authenticated;
GRANT ALL ON FUNCTION public.expire_overdue_auctions() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION process_bid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_bid() TO anon;
GRANT ALL ON FUNCTION public.process_bid() TO authenticated;
GRANT ALL ON FUNCTION public.process_bid() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION validate_bid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_bid() TO anon;
GRANT ALL ON FUNCTION public.validate_bid() TO authenticated;
GRANT ALL ON FUNCTION public.validate_bid() TO service_role;


--
-- Name: TABLE auctions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auctions TO anon;
GRANT ALL ON TABLE public.auctions TO authenticated;
GRANT ALL ON TABLE public.auctions TO service_role;


--
-- Name: TABLE auctions_archive; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auctions_archive TO anon;
GRANT ALL ON TABLE public.auctions_archive TO authenticated;
GRANT ALL ON TABLE public.auctions_archive TO service_role;


--
-- Name: TABLE bids; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bids TO anon;
GRANT ALL ON TABLE public.bids TO authenticated;
GRANT ALL ON TABLE public.bids TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict tJArU6zx6g4fubk5hJNYazX444Znk2DdNSnRF9XXIIMF3cSh9ThZ0NxIJbhJSFY

