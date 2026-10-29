import { pl } from '@polechamp/i18n';

export type EmailTemplate = 'verify-code' | 'account-exists' | 'password-reset' | 'account-deletion';

export interface EmailParams {
  name: string;
  code?: string;
  link?: string;
  date?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const t = pl.email;

const fill = (template: string, params: Record<string, string | undefined>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole);

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );

const CONTENT: Record<EmailTemplate, { subject: string; body: string }> = {
  'verify-code': { subject: t.verifySubject, body: t.verifyBody },
  'account-exists': { subject: t.accountExistsSubject, body: t.accountExistsBody },
  'password-reset': { subject: t.resetSubject, body: t.resetBody },
  'account-deletion': { subject: t.deletionSubject, body: t.deletionBody },
};

/** Treść e-maila PL w wersji tekstowej i HTML z przestrzeni `email` (IMP-119). */
export function renderEmail(template: EmailTemplate, params: EmailParams): RenderedEmail {
  const values = { ...params };
  const { subject, body } = CONTENT[template];
  // Treść może mieć kilka linii – np. link resetu w osobnej linii, bez kropki po URL (UX-45).
  const lines = [fill(t.greeting, values), ...fill(body, values).split('\n'), t.signature];
  const html = `<!doctype html><html lang="pl"><body style="font-family:Inter,Arial,sans-serif">${lines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')}</body></html>`;
  return { subject: fill(subject, values), text: lines.join('\n\n'), html };
}
