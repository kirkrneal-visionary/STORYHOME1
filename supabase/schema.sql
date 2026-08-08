-- Story Home — Master Production Schema
-- Run this block inside the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_consumer BOOLEAN DEFAULT TRUE NOT NULL,
    is_professional BOOLEAN DEFAULT FALSE NOT NULL,
    active_role TEXT CHECK (active_role IN ('consumer', 'professional')) DEFAULT 'consumer' NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    phone_number TEXT,
    professional_role TEXT CHECK (professional_role IN ('agent', 'broker', 'lender', 'inspector', 'appraiser')),
    primary_market_city TEXT,
    license_info TEXT,
    reputation_score INT DEFAULT 94 CHECK (reputation_score BETWEEN 0 AND 100),
    star_rating DECIMAL(3,2) DEFAULT 4.90 CHECK (star_rating BETWEEN 0.00 AND 5.00),
    review_count INT DEFAULT 42 NOT NULL,
    cover_image_url TEXT
);

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    price NUMERIC(12,2) NOT NULL,
    address_serif TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'TX',
    county_fips TEXT NOT NULL,
    county_name TEXT NOT NULL,
    beds INT NOT NULL,
    baths DECIMAL(3,1) NOT NULL,
    sqft INT NOT NULL,
    lot_size TEXT,
    year_built INT,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'pending', 'sold', 'withdrawn')) DEFAULT 'active' NOT NULL,
    photo_urls TEXT[] NOT NULL,
    like_count INT DEFAULT 14 NOT NULL,
    save_count INT DEFAULT 8 NOT NULL,
    comment_count INT DEFAULT 3 NOT NULL,
    -- Auto-generated when listing is published; expires when status leaves active/pending
    seller_access_code TEXT UNIQUE NOT NULL
);

CREATE TABLE saved_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

CREATE TABLE followed_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, agent_id)
);

CREATE TABLE listing_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poster_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    claimer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK (status IN ('Open', 'Claimed', 'Closed')) DEFAULT 'Open' NOT NULL,
    client_description TEXT NOT NULL,
    target_market TEXT NOT NULL,
    budget_range TEXT NOT NULL,
    terms TEXT NOT NULL,
    poster_rating_of_collaboration INT CHECK (poster_rating_of_collaboration BETWEEN 1 AND 5),
    claimer_rating_of_collaboration INT CHECK (claimer_rating_of_collaboration BETWEEN 1 AND 5),
    review_text TEXT
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message_text TEXT NOT NULL,
    attached_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INITIAL VERIFICATION SEED DATA
INSERT INTO profiles (id, email, full_name, is_consumer, is_professional, active_role, professional_role, primary_market_city, license_info, reputation_score, star_rating, review_count, bio) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sarah.jenkins@storyhome.com', 'Sarah Jenkins', true, true, 'consumer', 'agent', 'Austin, TX', 'TX-LIC-772910', 94, 4.90, 42, 'Austin native helping families discover homes with historical character and unique stories.'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'michael.chang@gmail.com', 'Michael Chang', true, false, 'consumer', null, null, null, null, null, 0, 'Looking for a mid-century modern home with a view.');

INSERT INTO listings (id, agent_id, price, address_serif, city, state, county_fips, county_name, beds, baths, sqft, lot_size, year_built, description, status, photo_urls, seller_access_code) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 875000.00, '1402 Willow Street', 'Austin', 'TX', '48453', 'Travis County', 3, 2.5, 2150, '0.25 Acres', 1936, 'An immaculately restored craftsman bungalow in the heart of East Austin. Features original longleaf pine floors and a storied past.', 'active', ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80'], 'WILLOW-875');

INSERT INTO referrals (poster_id, status, client_description, target_market, budget_range, terms) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Open', 'Tech executive relocating for a clean-energy VP role. Demanding architectural taste.', 'Denver, CO', '$1.5M - $2.0M', '25% Co-Broker Fee upon closing');

INSERT INTO messages (sender_id, receiver_id, message_text, attached_listing_id, is_read) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hi Sarah, I love the history of 1402 Willow St. Can we schedule a private walkthrough this Saturday?', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', false);

-- =========================================================
-- SELLER CLIENT PORTAL + COUNTY-CAPPED BOOSTS
-- =========================================================

-- Event-level analytics (MLS-era: populated by app tracking / pipeline)
CREATE TABLE listing_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT CHECK (event_type IN ('view', 'click', 'save', 'unsave')) NOT NULL,
    session_id TEXT,
    viewer_fingerprint TEXT,
    duration_seconds INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX listing_analytics_listing_idx ON listing_analytics_events (listing_id, event_type, created_at DESC);

-- Boost tier catalog (admin-tunable)
CREATE TABLE boost_tiers (
    id TEXT PRIMARY KEY CHECK (id IN ('starter', 'growth', 'max')),
    name TEXT NOT NULL,
    price_monthly_cents INT NOT NULL,
    slots_per_county INT NOT NULL,
    reach_label TEXT NOT NULL,
    description TEXT NOT NULL
);

INSERT INTO boost_tiers (id, name, price_monthly_cents, slots_per_county, reach_label, description) VALUES
('starter', 'Starter', 2500, 3, '+30% local reach', 'Extra visibility in your county marketplace feed.'),
('growth', 'Growth', 5000, 3, '+75% reach · Featured badge', 'Stronger placement and a Featured badge on your card.'),
('max', 'Max', 10000, 1, '+150% reach · Top placement', 'Top county placement — only one Max boost per county.');

-- Optional per-county overrides once MLS markets are mapped
CREATE TABLE boost_county_slot_overrides (
    county_fips TEXT NOT NULL,
    tier_id TEXT REFERENCES boost_tiers(id) ON DELETE CASCADE NOT NULL,
    slots_per_county INT NOT NULL CHECK (slots_per_county >= 0),
    PRIMARY KEY (county_fips, tier_id)
);

CREATE TABLE listing_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    county_fips TEXT NOT NULL,
    tier_id TEXT REFERENCES boost_tiers(id) NOT NULL,
    status TEXT CHECK (status IN ('active', 'canceled', 'expired')) DEFAULT 'active' NOT NULL,
    stripe_subscription_id TEXT,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX listing_boosts_county_tier_active_idx
  ON listing_boosts (county_fips, tier_id)
  WHERE status = 'active';

-- Server-side slot enforcement helper (call inside a transaction before insert)
CREATE OR REPLACE FUNCTION assert_boost_slot_available(
  p_county_fips TEXT,
  p_tier_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_capacity INT;
  v_used INT;
BEGIN
  SELECT COALESCE(o.slots_per_county, t.slots_per_county)
    INTO v_capacity
  FROM boost_tiers t
  LEFT JOIN boost_county_slot_overrides o
    ON o.tier_id = t.id AND o.county_fips = p_county_fips
  WHERE t.id = p_tier_id;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Unknown boost tier %', p_tier_id;
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM listing_boosts
  WHERE county_fips = p_county_fips
    AND tier_id = p_tier_id
    AND status = 'active';

  IF v_used >= v_capacity THEN
    RAISE EXCEPTION 'No % boost slots remaining in county %', p_tier_id, p_county_fips;
  END IF;
END;
$$ LANGUAGE plpgsql;
