import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless unsubscribe tokens: base64url(email).hmac. Node-only (server routes and scripts).

function sign(email: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url");
}

export function createUnsubscribeToken(email: string, secret: string): string {
  return `${Buffer.from(email).toString("base64url")}.${sign(email, secret)}`;
}

/** Returns the email when the token is genuine, otherwise null. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}
