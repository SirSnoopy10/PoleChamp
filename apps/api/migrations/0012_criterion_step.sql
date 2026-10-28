-- IMP-700: krok noty kryterium 0,1 / 0,5 / 1 – nota w dziesiątych nie musi być wielokrotnością 0,5.
-- Zgodność noty z krokiem kryterium sprawdza silnik punktacji (`validateSheet`) przed zapisem.
ALTER TABLE score_value DROP CONSTRAINT score_value_value_tenths_check;
ALTER TABLE score_value ADD CONSTRAINT score_value_value_tenths_check CHECK (value_tenths >= 0);

ALTER TABLE criterion ADD CONSTRAINT criterion_step_check CHECK (step IN (0.1, 0.5, 1));
