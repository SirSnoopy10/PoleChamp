/** Panel sędziego (06-ekrany-sedziego) – teksty z liczbą mnogą (TC-I18N-008). Formy: `_one`, `_few`, `_many`. */
export const judge = {
  rejectedBanner_one: '{count} ocena nie została przyjęta – kategoria zablokowana',
  rejectedBanner_few: '{count} oceny nie zostały przyjęte – kategoria zablokowana',
  rejectedBanner_many: '{count} ocen nie zostało przyjętych – kategoria zablokowana',
  logoutUnsent_one:
    'Masz {count} niewysłaną ocenę. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.',
  logoutUnsent_few:
    'Masz {count} niewysłane oceny. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.',
  logoutUnsent_many:
    'Masz {count} niewysłanych ocen. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.',
  offlineQueue: 'Offline · {count} w kolejce',
  queueCount: 'Oceny w kolejce: {count}',
  exportUnsent: 'Eksportuj niewysłane oceny',
  sheetRejected: 'Ta ocena nie została przyjęta: {reason}.',
  deviceRevoked: 'To urządzenie zostało odłączone od turnieju.',
  categoryLockedPreview: 'Kategoria zablokowana — podgląd bez możliwości edycji.',
  submitButton: 'Zatwierdź i przejdź dalej',
  commentLabel: 'Komentarz (opcjonalnie)',
} as const;
