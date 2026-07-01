-- DedSpot database schema (PostgreSQL + PostGIS)
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid, digest

-- ---------------------------------------------------------------------------
-- WiFi spots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wifi_spots (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source         TEXT NOT NULL DEFAULT 'user'
                   CHECK (source IN ('user','osm','partner','seed')),
  osm_id         BIGINT UNIQUE,

  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  category       TEXT NOT NULL DEFAULT 'other'
                   CHECK (category IN ('cafe','restaurant','library','university',
                     'school','park','mall','government','mosque','hospital',
                     'transport','coworking','other')),

  -- Location (constrained to Bangladesh's bounding box for data integrity).
  lat            DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN 20.3 AND 26.8),
  lng            DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN 88.0 AND 92.8),
  geom           GEOGRAPHY(Point, 4326)
                   GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,

  address        TEXT,
  area           TEXT,     -- e.g. Dhanmondi
  city           TEXT,     -- e.g. Dhaka
  district       TEXT,     -- e.g. Dhaka

  -- Access.
  is_free            BOOLEAN NOT NULL DEFAULT TRUE,
  access_type        TEXT NOT NULL DEFAULT 'unknown'
                       CHECK (access_type IN ('open','password','login','voucher','unknown')),
  password_is_public BOOLEAN NOT NULL DEFAULT FALSE, -- owner/publicly posted only
  wifi_password      TEXT,                            -- shown ONLY if password_is_public
  speed_mbps         NUMERIC(6,1) CHECK (speed_mbps IS NULL OR speed_mbps >= 0),

  -- Who / why.
  owner_name     TEXT,
  owner_type     TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (owner_type IN ('business','public','educational','individual','ngo','unknown')),
  why_free       TEXT,

  -- Amenities (matter for students / remote workers).
  has_power      BOOLEAN NOT NULL DEFAULT FALSE,
  has_seating    BOOLEAN NOT NULL DEFAULT FALSE,
  is_quiet       BOOLEAN NOT NULL DEFAULT FALSE,
  hours          TEXT,

  -- Safety attributes (structured facts, NOT verdicts/accusations).
  lighting       TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (lighting IN ('good','moderate','poor','unknown')),
  crowd_level    TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (crowd_level IN ('busy','moderate','quiet','unknown')),
  has_cctv       BOOLEAN NOT NULL DEFAULT FALSE,
  staff_present  BOOLEAN NOT NULL DEFAULT FALSE,
  family_friendly BOOLEAN NOT NULL DEFAULT FALSE,

  -- Moderation & provenance.
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by   TEXT,             -- user id/email (phase 2 auth)
  submitter_ip_hash TEXT,          -- salted hash, for abuse control (no raw IPs)

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wifi_spots_geom_gix ON wifi_spots USING GIST (geom);
CREATE INDEX IF NOT EXISTS wifi_spots_status_idx ON wifi_spots (status);
CREATE INDEX IF NOT EXISTS wifi_spots_area_idx ON wifi_spots (city, area);
CREATE INDEX IF NOT EXISTS wifi_spots_created_idx ON wifi_spots (created_at DESC);

-- ---------------------------------------------------------------------------
-- Reviews (community ratings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spot_reviews (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spot_id     BIGINT NOT NULL REFERENCES wifi_spots(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  audience    TEXT NOT NULL DEFAULT 'other'
                CHECK (audience IN ('student','woman','family','traveler','remote_worker','other')),
  status      TEXT NOT NULL DEFAULT 'approved'
                CHECK (status IN ('pending','approved','rejected')),
  author_ip_hash TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spot_reviews_spot_idx ON spot_reviews (spot_id, status);

-- ---------------------------------------------------------------------------
-- Safety reports (sensitive; aggregated & moderated, NEVER shown as raw claims)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spot_reports (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spot_id      BIGINT NOT NULL REFERENCES wifi_spots(id) ON DELETE CASCADE,
  category     TEXT NOT NULL
                 CHECK (category IN ('harassment','theft','unsafe_area','scam','fake_listing','closed','other')),
  note         TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  reporter_ip_hash TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spot_reports_spot_idx ON spot_reports (spot_id, status);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wifi_spots_updated ON wifi_spots;
CREATE TRIGGER trg_wifi_spots_updated
  BEFORE UPDATE ON wifi_spots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Users (Google sign-in; sessions are JWT so no session table needed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  image         TEXT,
  provider      TEXT NOT NULL DEFAULT 'google',
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

-- ---------------------------------------------------------------------------
-- Ingest runs (audit log for the automated daily OSM update)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingest_runs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT 'osm',
  status      TEXT NOT NULL DEFAULT 'running'
                CHECK (status IN ('running','success','error')),
  fetched     INTEGER NOT NULL DEFAULT 0,   -- elements returned by Overpass
  valid       INTEGER NOT NULL DEFAULT 0,   -- rows that passed validation
  upserted    INTEGER NOT NULL DEFAULT 0,   -- rows inserted/updated
  error       TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ingest_runs_started_idx ON ingest_runs (started_at DESC);
