-- IMP-128 krok 2: wyszukiwanie zawodniczek bez polskich znaków („zuzanna krol” → „Zuzanna Król”).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() nie jest IMMUTABLE, więc indeks funkcyjny wymaga opakowania ze stałym słownikiem.
CREATE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX athlete_name_search_idx ON athlete USING gin (f_unaccent(lower(full_name)) gin_trgm_ops);
