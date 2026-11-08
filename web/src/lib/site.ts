/** Public site URL. Safe for the browser. Set NEXT_PUBLIC_SITE_URL for previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crewjio.com").replace(/\/$/, "");

/**
 * The public TestFlight invite for the iPhone beta, from App Store Connect > TestFlight > the
 * external group > Public Link. Set NEXT_PUBLIC_TESTFLIGHT_URL in Vercel, then redeploy. Until it
 * is set (or if it is not a real TestFlight link) the beta guide shows the waitlist instead.
 */
const testflight = (process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "").trim();
export const TESTFLIGHT_URL = /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(testflight) ? testflight : null;

/** Apple's TestFlight app in the App Store. */
export const TESTFLIGHT_APP_URL = "https://apps.apple.com/app/testflight/id899247664";

export const CONTACT_EMAIL = "hello@crewjio.com";
