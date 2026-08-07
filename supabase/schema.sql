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
    beds INT NOT NULL,
    baths DECIMAL(3,1) NOT NULL,
    sqft INT NOT NULL,
    lot_size TEXT,
    year_built INT,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'pending', 'sold')) DEFAULT 'active' NOT NULL,
    photo_urls TEXT[] NOT NULL,
    like_count INT DEFAULT 14 NOT NULL,
    save_count INT DEFAULT 8 NOT NULL,
    comment_count INT DEFAULT 3 NOT NULL
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

INSERT INTO listings (id, agent_id, price, address_serif, city, beds, baths, sqft, lot_size, year_built, description, status, photo_urls) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 875000.00, '1402 Willow Street', 'Austin', 3, 2.5, 2150, '0.25 Acres', 1936, 'An immaculately restored craftsman bungalow in the heart of East Austin. Features original longleaf pine floors and a storied past.', 'active', ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80']);

INSERT INTO referrals (poster_id, status, client_description, target_market, budget_range, terms) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Open', 'Tech executive relocating for a clean-energy VP role. Demanding architectural taste.', 'Denver, CO', '$1.5M - $2.0M', '25% Co-Broker Fee upon closing');

INSERT INTO messages (sender_id, receiver_id, message_text, attached_listing_id, is_read) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hi Sarah, I love the history of 1402 Willow St. Can we schedule a private walkthrough this Saturday?', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', false);
