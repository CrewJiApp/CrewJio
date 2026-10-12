// The Send Email auth hook's templates and message building (supabase/functions/send-email).
// Run from the repo root: npm run test:db
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loginCodeHtml } from '../functions/send-email/templates/crewjio-login-code-supabase.ts';
import { signupCodeHtml } from '../functions/send-email/templates/crewjio-signup-code-supabase.ts';
import { buildMessage, messagesFor, renderHtml, subjectFor, textFor } from '../functions/send-email/render.ts';

const dir = join(import.meta.dirname, '..', 'functions', 'send-email', 'templates');
const read = (f) => readFileSync(join(dir, f), 'utf8');

test('the string constants are the HTML files, byte for byte', () => {
  assert.equal(signupCodeHtml, read('crewjio-signup-code-supabase.html'));
  assert.equal(loginCodeHtml, read('crewjio-login-code-supabase.html'));
});

test('signup uses the welcome template, every other type the login one', () => {
  assert.match(renderHtml('signup', '123456'), /Welcome to CrewJio/);
  for (const type of ['magiclink', 'login', 'reauthentication', 'email_change', 'recovery', 'invite', 'email']) {
    const html = renderHtml(type, '123456');
    assert.match(html, /Your CrewJio code/, type);
    assert.doesNotMatch(html, /Welcome to CrewJio/, type);
  }
});

test('the code replaces {{ .Token }} everywhere and nothing else changes', () => {
  for (const [type, template] of [['signup', signupCodeHtml], ['magiclink', loginCodeHtml]]) {
    const html = renderHtml(type, '482916');
    assert.ok(!html.includes('{{ .Token }}'));
    assert.equal(html.split('482916').length - 1, template.split('{{ .Token }}').length - 1);
    assert.equal(html, template.replaceAll('{{ .Token }}', '482916'));
  }
});

test('subject and plain text', () => {
  assert.equal(subjectFor('123456'), '123456 is your CrewJio code');
  assert.equal(textFor('123456'), 'Your CrewJio code: 123456. Never share this code.');
  const m = buildMessage('signup', 'a@b.co', '123456');
  assert.deepEqual([m.to, m.subject, m.text], ['a@b.co', '123456 is your CrewJio code', 'Your CrewJio code: 123456. Never share this code.']);
  assert.match(m.html, /123456/);
});

test('anything that is not a numeric code is refused, so nothing odd reaches the HTML', () => {
  for (const bad of ['', '12', '<b>1</b>', '123 456', '1234567890123', undefined, null, 123456]) {
    assert.throws(() => buildMessage('signup', 'a@b.co', bad));
  }
});

test('hook payloads: one message, or two for a secure email change', () => {
  const one = messagesFor({ user: { email: 'a@b.co' }, email_data: { token: '111111', email_action_type: 'magiclink' } });
  assert.deepEqual(one.map((m) => [m.to, m.subject]), [['a@b.co', '111111 is your CrewJio code']]);
  const two = messagesFor({
    user: { email: 'old@b.co', new_email: 'new@b.co' },
    email_data: { token: '111111', token_new: '222222', email_action_type: 'email_change' },
  });
  assert.deepEqual(two.map((m) => [m.to, m.subject]), [['old@b.co', '111111 is your CrewJio code'], ['new@b.co', '222222 is your CrewJio code']]);
  assert.throws(() => messagesFor({ user: { email: 'a@b.co' }, email_data: { email_action_type: 'signup' } }));
  assert.throws(() => messagesFor({ user: {}, email_data: { token: '111111', email_action_type: 'signup' } }));
});
