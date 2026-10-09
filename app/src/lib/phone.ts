// Phone numbers for SMS sign-in, in the E.164 format Supabase expects.

/** "+65 9123 4567", "91234567" -> "+6591234567". Local 8-digit numbers get Singapore's +65. */
export function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^[689]\d{7}$/.test(digits)) return `+65${digits}`;
  return null;
}
