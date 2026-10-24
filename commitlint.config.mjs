// Conventional Commits (00-konwencje §6). Temat może zaczynać się od ID zadania, np. „feat: IMP-121 lista turniejów”.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: { 'subject-case': [0] },
};
