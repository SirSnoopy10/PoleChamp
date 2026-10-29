import { describe, expect, it } from 'vitest';
import { renderEmail } from '../../src/modules/email/email.templates.js';

describe('szablony e-maili', () => {
  it('UX-45: link resetu hasła w osobnej linii, bez kropki po adresie (tekst i HTML)', () => {
    const link = 'https://polechamp.app/reset?t=abc';
    const mail = renderEmail('password-reset', { name: 'Marta', link });
    const lines = mail.text.split('\n');
    expect(lines).toContain(link);
    expect(mail.text).not.toContain(`${link}.`);
    expect(mail.html).toContain(`<p>${link.replace('&', '&amp;')}</p>`);
  });
});
