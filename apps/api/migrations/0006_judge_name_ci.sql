-- TC-API-056: imię i nazwisko sędziego unikalne w turnieju bez rozróżniania wielkości liter.
ALTER TABLE judge DROP CONSTRAINT judge_name_uq;
CREATE UNIQUE INDEX judge_name_uq ON judge (tournament_id, lower(full_name));
