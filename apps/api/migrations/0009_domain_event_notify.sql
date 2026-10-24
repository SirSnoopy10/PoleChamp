-- IMP-155: publikator outboxu nasłuchuje `LISTEN domain_event`; powiadomienie dociera po COMMIT,
-- więc zdarzenia z wycofanych transakcji nigdy nie budzą publikatora (odpytywanie co 200 ms zostaje).
CREATE FUNCTION trg_domain_event_notify() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('domain_event', '');
  RETURN NULL;
END;
$$;

CREATE TRIGGER domain_event_notify AFTER INSERT ON domain_event
  FOR EACH STATEMENT EXECUTE FUNCTION trg_domain_event_notify();
