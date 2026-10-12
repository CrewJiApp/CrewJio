// Pure helpers for the Send Email auth hook: which template, the subject, and the final HTML and
// text. No Deno or network code here, so the database test suite (node) can test it.
import { loginCodeHtml } from './templates/crewjio-login-code-supabase.ts';
import { signupCodeHtml } from './templates/crewjio-signup-code-supabase.ts';

export const TOKEN_PLACEHOLDER = '{{ .Token }}';

export type EmailActionType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' | 'reauthentication' | string;

/** Signup gets the welcome template; every other type (login, recovery, reauthentication...) the login one. */
export function templateFor(type: EmailActionType): string {
  return type === 'signup' ? signupCodeHtml : loginCodeHtml;
}

/** The codes Supabase sends are 6 to 10 digits. Anything else is refused, so nothing odd lands in the HTML. */
export function assertCode(code: unknown): string {
  if (typeof code !== 'string' || !/^[0-9]{4,12}$/.test(code)) throw new Error('The hook payload has no valid code');
  return code;
}

export function subjectFor(code: string): string {
  return `${code} is your CrewJio code`;
}

export function textFor(code: string): string {
  return `Your CrewJio code: ${code}. Never share this code.`;
}

/** The branded HTML with the real code in place of every {{ .Token }}. Nothing else changes. */
export function renderHtml(type: EmailActionType, code: string): string {
  return templateFor(type).split(TOKEN_PLACEHOLDER).join(assertCode(code));
}

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Everything to send for one code. */
export function buildMessage(type: EmailActionType, to: string, code: string): Message {
  const clean = assertCode(code);
  return { to, subject: subjectFor(clean), html: renderHtml(type, clean), text: textFor(clean) };
}

interface HookPayload {
  user: { email?: string; new_email?: string };
  email_data: { token?: string; token_new?: string; email_action_type: string };
}

/**
 * Messages for a hook payload. Normally one. A secure email change sends a code to the current
 * address (token) and another to the new one (token_new).
 */
export function messagesFor(payload: HookPayload): Message[] {
  const { user, email_data: data } = payload;
  const messages: Message[] = [];
  if (data.token) {
    if (!user.email) throw new Error('The hook payload has no email address');
    messages.push(buildMessage(data.email_action_type, user.email, data.token));
  }
  if (data.token_new) {
    if (!user.new_email) throw new Error('The hook payload has a new-email code but no new address');
    messages.push(buildMessage(data.email_action_type, user.new_email, data.token_new));
  }
  if (messages.length === 0) throw new Error('The hook payload has no code');
  return messages;
}
