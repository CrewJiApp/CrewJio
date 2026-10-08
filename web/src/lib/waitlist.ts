import { z } from "zod";

// Shared by the form (client) and the route handler (server). No secrets here.

export const ROLES = [
  { value: "cabin_crew", label: "Cabin crew" },
  { value: "pilot", label: "Pilot" },
  { value: "partner_or_friend", label: "Partner or friend of crew" },
] as const;

export const AIRLINES = [
  { value: "SIA", label: "SIA" },
  { value: "Scoot", label: "Scoot" },
  { value: "other", label: "Other" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];
type AirlineValue = (typeof AIRLINES)[number]["value"];

const roleValues = ROLES.map((r) => r.value) as [RoleValue, ...RoleValue[]];
const airlineValues = AIRLINES.map((a) => a.value) as [AirlineValue, ...AirlineValue[]];

/** Accepts "@handle", "handle" or an instagram.com URL. Returns the bare lowercase handle. */
export function normaliseInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const waitlistSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us your first name").max(60, "That's a long name. Keep it under 60 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("That email doesn't look right")),
  instagram: z
    .string()
    .optional()
    .transform((v) => (v ? normaliseInstagram(v) : undefined))
    .refine((v) => v === undefined || /^[a-z0-9._]{1,30}$/.test(v), "Instagram handles use letters, numbers, dots and underscores"),
  role: z.enum(roleValues, { error: "Pick what you do" }),
  airline: z.enum(airlineValues, { error: "Pick an airline" }),
  painPoint: optionalText(1000),
  wantsBeta: z.boolean(),
  consent: z.literal(true, { error: "We need your OK to email you" }),
  /** Honeypot. Real people never see or fill this. */
  company: z.string().optional(),
});

export type WaitlistInput = z.input<typeof waitlistSchema>;
export type WaitlistData = z.output<typeof waitlistSchema>;

export type WaitlistResponse =
  | { status: "joined" }
  | { status: "already_joined" }
  | { status: "invalid"; fieldErrors: Partial<Record<keyof WaitlistInput, string>> }
  | { status: "rate_limited" }
  | { status: "error" };
