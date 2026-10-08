// CrewJio theme: colours and fonts from CLAUDE.md "Design". Dark navy only for now.
import { CREW_RANKS } from '@crewjio/shared';

export const colors = {
  night: '#0E1726', // app background
  card: '#17233A',
  cardRaised: '#1E2C47',
  border: '#2A3956',
  amber: '#F5B642',
  teal: '#4FD1C5',
  lavender: '#C9B6FF', // training
  pink: '#F59BB8', // partner
  cloud: '#EEF1F6', // primary text and light buttons
  muted: '#9AA6BC', // secondary text
  subtle: '#6B7894', // hints, inactive dots
  onAmber: '#1A1405', // text on amber
  onCloud: '#0E1726', // text on cloud
} as const;

/** Name-tag colours by cabin crew rank. */
export const rankColors = Object.fromEntries(CREW_RANKS.map((r) => [r.id, r.color])) as Record<
  (typeof CREW_RANKS)[number]['id'],
  string
>;

/** Font family names, registered in app/_layout.tsx. */
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

/** Minimum touch target (CLAUDE.md: 44px). */
export const touch = 44;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 44, color: colors.cloud, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.cloud, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.cloud },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.cloud },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  overline: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted, letterSpacing: 1.2 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.amber, letterSpacing: 1.4 },
  mono: { fontFamily: fonts.mono, fontSize: 15, color: colors.cloud },
} as const;
