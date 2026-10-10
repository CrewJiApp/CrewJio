// Avatars, avatar stacks and day-status badges for groups, partner and crew match.
import { shortDate, type DayStatus, type IsoDate, type Profile } from '@crewjio/shared';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { initials } from '@/state/social';
import { colors, fonts, radius, space, type } from '@/theme';

const AVATAR_COLORS = [colors.teal, '#7FA6F5', colors.amber, colors.lavender, colors.cloud, '#F0A47A'];

export function avatarColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export function Avatar({ profile, size = 40, label, color, textColor, dashed, style }: { profile?: Profile; size?: number; label?: string; color?: string; textColor?: string; dashed?: boolean; style?: StyleProp<ViewStyle> }) {
  const text = label ?? (profile ? initials(profile.displayName) : '?');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: dashed ? colors.cardRaised : (color ?? (profile ? avatarColor(profile.id) : colors.border)) },
        dashed && styles.dashed,
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={[styles.avatarText, { fontSize: size * 0.34, color: textColor ?? (dashed ? colors.muted : colors.onCloud) }]}>{text}</Text>
    </View>
  );
}

/** Overlapping avatars, like mockups 13 and 15. */
export function AvatarStack({ people, size = 36, max = 3 }: { people: Profile[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <View style={styles.stack}>
      {shown.map((p, i) => (
        <Avatar key={p.id} profile={p} size={size} label="" style={{ marginLeft: i === 0 ? 0 : -size * 0.35, borderWidth: 2, borderColor: colors.card, borderRadius: size * 0.35 }} />
      ))}
      {people.length === 0 ? <Avatar size={size} label="" dashed /> : null}
    </View>
  );
}

export const STATUS_BADGE: Record<DayStatus, { label: string; bg: string; fg: string; outline?: boolean }> = {
  Great: { label: 'Great', bg: colors.teal, fg: colors.onCloud },
  Evening: { label: 'Evening', bg: '#5B6782', fg: colors.cloud },
  Daytime: { label: 'Daytime', bg: '#5B6782', fg: colors.cloud },
  Morning: { label: 'Morning', bg: '#5B6782', fg: colors.cloud },
  SameLayover: { label: 'Layover', bg: '#7FA6F5', fg: colors.onCloud },
  Tired: { label: 'Tired', bg: 'transparent', fg: colors.cloud, outline: true },
  Almost: { label: 'Almost', bg: 'transparent', fg: colors.amber, outline: true },
  Blocked: { label: 'Away', bg: 'transparent', fg: colors.muted, outline: true },
  NoMatch: { label: 'No match', bg: 'transparent', fg: colors.muted, outline: true },
};

export function StatusBadge({ status }: { status: DayStatus }) {
  const b = STATUS_BADGE[status];
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }, b.outline && { borderWidth: 1.5, borderColor: b.fg }]}>
      <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

/** A best-day card (mockup 15): date block, title, explanation, badge. */
export function DayCard({ date, title, detail, status, highlight }: { date: IsoDate; title: string; detail: string; status: DayStatus; highlight?: boolean }) {
  const [dow, day] = shortDate(date).split(' ');
  return (
    <View style={[styles.dayCard, highlight && styles.dayCardOn]} accessible accessibilityLabel={`${shortDate(date)}. ${title}. ${detail}. ${STATUS_BADGE[status].label}`}>
      <View style={styles.dayDate}>
        <Text style={styles.dow}>{dow!.toUpperCase()}</Text>
        <Text style={styles.dayNum}>{day}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={type.bodyStrong}>{title}</Text>
        {detail ? <Text style={type.small}>{detail}</Text> : null}
      </View>
      <StatusBadge status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted },
  avatarText: { fontFamily: fonts.bold },
  stack: { flexDirection: 'row' },
  badge: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 13 },
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg },
  dayCardOn: { borderWidth: 1.5, borderColor: colors.teal },
  dayDate: { width: 44, alignItems: 'center' },
  dow: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  dayNum: { fontFamily: fonts.bold, fontSize: 26, color: colors.cloud, lineHeight: 30 },
});
