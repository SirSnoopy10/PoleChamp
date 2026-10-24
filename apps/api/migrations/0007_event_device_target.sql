-- IMP-141 / IMP-156: zdarzenia do pokoju `device:{id}` (np. `session.revoked`) potrzebują adresata.
ALTER TABLE domain_event ADD COLUMN device_id uuid;
