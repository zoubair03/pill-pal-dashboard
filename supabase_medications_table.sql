-- =========================================================================
-- PILL PAL: Medications Catalog Table
-- =========================================================================
-- Run this in Supabase SQL Editor BEFORE running the seed API route.

CREATE TABLE IF NOT EXISTS public.medications (
  id          BIGSERIAL PRIMARY KEY,
  dci         TEXT,
  brand       TEXT,
  dose        TEXT,
  form        TEXT,
  presentation TEXT,
  classe      TEXT,
  sousclasse  TEXT,
  laboratoire TEXT,
  tableau     TEXT,
  indication  TEXT,
  label       TEXT,
  full        TEXT
);

-- Full-text search index for fast search across dci, brand, label
CREATE INDEX IF NOT EXISTS medications_search_idx
  ON public.medications
  USING GIN (to_tsvector('simple', coalesce(label, '') || ' ' || coalesce(dci, '') || ' ' || coalesce(brand, '')));

-- Simple index for ILIKE prefix searches
CREATE INDEX IF NOT EXISTS medications_label_idx ON public.medications (label);
CREATE INDEX IF NOT EXISTS medications_dci_idx   ON public.medications (dci);

-- No RLS needed — read-only public catalog
ALTER TABLE public.medications DISABLE ROW LEVEL SECURITY;
