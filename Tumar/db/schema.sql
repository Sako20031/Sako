-- TUMAR Heritage — database schema (PostgreSQL).
--
-- You do not need to run this by hand: the site creates these tables itself
-- on the first request (lib/tumar.js) and fills the catalog from
-- public/tumar-files/content.json. The file documents the structure and can
-- be used to set up a database manually.

-- Catalog. `data` is JSON: name, type, metal, weight, desc, badge (+ _kz/_en
-- translations), price, badgeStyle, edition, cats, design, engraving, image,
-- hidden.
CREATE TABLE IF NOT EXISTS tumar_products (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  ord  INTEGER NOT NULL DEFAULT 0
);

-- Product photos uploaded in the admin panel (base64).
CREATE TABLE IF NOT EXISTS tumar_images (
  id   TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data TEXT NOT NULL
);

-- Orders. `items` is JSON: [{ id, name, metal, price, qty }]; prices are
-- taken from tumar_products on the server. status: new | work | done | cancel.
CREATE TABLE IF NOT EXISTS tumar_orders (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  phone      TEXT,
  city       TEXT,
  comment    TEXT,
  items      TEXT,
  total      BIGINT,
  status     TEXT,
  lang       TEXT,   -- kz | ru | en: site language when the order was placed
  created_at BIGINT
);

-- E-mails from the "club" form.
CREATE TABLE IF NOT EXISTS tumar_subscribers (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE,
  created_at BIGINT
);

-- Settings: pin (admin PIN, default 0000), texts (JSON of edited site texts
-- per language), seeded (catalog copied from content.json).
CREATE TABLE IF NOT EXISTS tumar_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Admin sessions (cookie tumar_admin, 30 days) and failed PIN attempts.
CREATE TABLE IF NOT EXISTS tumar_sessions (
  token      TEXT PRIMARY KEY,
  created_at BIGINT
);
CREATE TABLE IF NOT EXISTS tumar_login_fails (
  ip TEXT,
  at BIGINT
);

INSERT INTO tumar_settings (key, value) VALUES ('pin', '0000') ON CONFLICT (key) DO NOTHING;
