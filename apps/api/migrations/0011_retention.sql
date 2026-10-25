-- IMP-176: operacje retencji wymagające praw właściciela (rola `pc_retention` ma tylko wąskie uprawnienia).

-- Usuwa miesięczne partycje audytu kończące się przed `cutoff` (36 mies. – NFR-503). Zwraca liczbę partycji.
CREATE FUNCTION drop_old_audit_partitions(cutoff date) RETURNS integer
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  part record;
  dropped integer := 0;
BEGIN
  FOR part IN
    SELECT c.relname
    FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'audit_log'::regclass AND c.relname ~ '^audit_log_\d{4}_\d{2}$'
  LOOP
    IF (to_date(substring(part.relname FROM 11), 'YYYY_MM') + interval '1 month')::date <= cutoff THEN
      EXECUTE format('DROP TABLE %I', part.relname);
      dropped := dropped + 1;
    END IF;
  END LOOP;
  RETURN dropped;
END;
$$;

-- Twarde usunięcie konta (FR-106, 30 dni po `deleted_at`): turnieje właściciela z ocenami i startami,
-- potem konto (tokeny kaskadowo). Zwraca liczbę usuniętych turniejów; konto z turniejem w toku – -1.
CREATE FUNCTION purge_account(target uuid) RETURNS integer
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  removed integer;
BEGIN
  IF EXISTS (SELECT FROM tournament WHERE owner_id = target AND status = 'IN_PROGRESS' AND deleted_at IS NULL) THEN
    RETURN -1;
  END IF;
  -- Kolejność jawna: `score_sheet` → `entry` mają ON DELETE RESTRICT.
  DELETE FROM score_sheet WHERE category_id IN (
    SELECT c.id FROM category c JOIN tournament t ON t.id = c.tournament_id WHERE t.owner_id = target);
  DELETE FROM rejected_submission WHERE tournament_id IN (SELECT id FROM tournament WHERE owner_id = target);
  DELETE FROM entry WHERE tournament_id IN (SELECT id FROM tournament WHERE owner_id = target);
  DELETE FROM tournament WHERE owner_id = target;
  GET DIAGNOSTICS removed = ROW_COUNT;
  UPDATE rejected_submission SET resolved_by = NULL WHERE resolved_by = target;
  UPDATE device SET paired_by = NULL WHERE paired_by = target;
  UPDATE export_job SET created_by = NULL WHERE created_by = target;
  DELETE FROM app_user WHERE id = target;
  RETURN removed;
END;
$$;

-- IMP-177 („Usuń dane osobowe”, FR-904): usuwa PII jednej zawodniczki z audytu (wpisy o niej i jej
-- startach) i z rewizji ocen jej startów. Aplikacja nie ma UPDATE na historii – wąska procedura.
CREATE FUNCTION scrub_athlete_pii(target uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pii text[] := ARRAY['fullName', 'full_name', 'club', 'comment', 'birthYear', 'birth_year'];
BEGIN
  UPDATE audit_log SET before = before - pii, after = after - pii
  WHERE (entity_id = target OR entity_id IN (SELECT id FROM entry WHERE athlete_id = target))
    AND (before ?| pii OR after ?| pii);
  UPDATE score_sheet_revision r SET snapshot = snapshot - pii
  FROM score_sheet s JOIN entry e ON e.id = s.entry_id
  WHERE r.score_sheet_id = s.id AND e.athlete_id = target AND r.snapshot ?| pii;
END;
$$;
