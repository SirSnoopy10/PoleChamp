-- IMP-174: format pliku eksportu (FR-708, Could) – PDF lub CSV wyników.
CREATE TYPE export_format AS ENUM ('PDF', 'CSV');
ALTER TABLE export_job ADD COLUMN format export_format NOT NULL DEFAULT 'PDF';
