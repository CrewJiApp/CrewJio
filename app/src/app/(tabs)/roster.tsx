// My Roster (mockups 10 crew, 11 pilot): month calendar, the next duty, and a legend.
import { CREW_RANKS, PILOT_RANKS, monthName, nextDuty, todayInSingapore, type IsoDate } from '@crewjio/shared';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, CaretLeftIcon, CaretRightIcon, UsersIcon } from '@/components/icons';
import { Legend, RosterCalendar } from '@/components/roster-calendar';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { rosterRange, useRoster } from '@/state/roster';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const TAG_STYLE: Record<string, { bg: string; fg: string }> = {
  NEXT: { bg: colors.amber, fg: colors.onAmber },
  SIM: { bg: colors.lavender, fg: colors.onCloud },
  TRG: { bg: colors.lavender, fg: colors.onCloud },
  GND: { bg: colors.lavender, fg: colors.onCloud },
  SBY: { bg: '#5B6782', fg: colors.cloud },
  RSV: { bg: '#5B6782', fg: colors.cloud },
};

export default function RosterScreen() {
  const { profile } = useAuth();
  const today = todayInSingapore();
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const range = useMemo(() => rosterRange(ym.year, ym.month, today), [ym, today]);
  const { duties, holidays, loading, error, reload } = useRoster(range.from, range.to);

  const pilot = profile?.role === 'pilot';
  const next = nextDuty(today, duties, holidays);
  const monthPrefix = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
  const hasThisMonth = duties.some((d) => d.date.startsWith(monthPrefix)) || holidays.some((h) => h.startDate.slice(0, 7) <= monthPrefix && h.endDate.slice(0, 7) >= monthPrefix);
  const shift = (by: number) =>
    setYm(({ year, month }) => {
      const m = month + by;
      return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });

  // Pilots see their fleet and rank next to the title (mockup 11).
  const rankShort = profile?.rank ? [...CREW_RANKS, ...PILOT_RANKS].find((r) => r.id === profile.rank)?.short : null;
  const pilotChip = pilot && profile?.fleets[0] ? [profile.fleets[0], rankShort].filter(Boolean).join(' · ') : null;
  const openDay = (date: IsoDate) => router.push({ pathname: '/day/[date]', params: { date } });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.overRow}>
          <Text style={type.overline}>MY ROSTER</Text>
          {pilotChip ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{pilotChip}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <Text style={[type.title, styles.title]} accessibilityRole="header">
            {monthName(ym.month)} {ym.year}
          </Text>
          <View style={styles.arrows}>
            <IconButton label="Previous month" onPress={() => shift(-1)}>
              <CaretLeftIcon size={22} color={colors.cloud} />
            </IconButton>
            <IconButton label="Next month" onPress={() => shift(1)}>
              <CaretRightIcon size={22} color={colors.cloud} />
            </IconButton>
          </View>
        </View>

        {next ? (
          <Pressable onPress={() => openDay(next.date)} accessibilityRole="button" style={({ pressed }) => [styles.nextCard, pressed && { opacity: 0.85 }]}>
            <View style={[styles.tag, { backgroundColor: (TAG_STYLE[next.tag] ?? TAG_STYLE.NEXT)!.bg }]}>
              <Text style={[styles.tagText, { color: (TAG_STYLE[next.tag] ?? TAG_STYLE.NEXT)!.fg }]}>{next.tag}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={next.mono ? styles.nextMono : type.heading} numberOfLines={1}>
                {next.title}
              </Text>
              <Text style={type.small} numberOfLines={1}>
                {next.detail}
              </Text>
            </View>
          </Pressable>
        ) : !loading ? (
          <View style={styles.nextCard}>
            <Text style={[type.small, styles.flex]}>Nothing coming up yet. Tap + to add your next duty.</Text>
          </View>
        ) : null}

        <RosterCalendar year={ym.year} month={ym.month} today={today} duties={duties} holidays={holidays} onPressDay={openDay} />
        <Legend pilot={pilot} />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={[type.small, { color: '#F07A7A' }]}>{error}</Text>
            <Button label="Try again" variant="text" onPress={reload} />
          </View>
        ) : null}

        {!loading && !hasThisMonth ? (
          <Pressable onPress={() => router.push('/add-duty')} accessibilityRole="button" style={({ pressed }) => [styles.promptCard, pressed && { opacity: 0.85 }]}>
            <View style={styles.promptIcon}>
              <CameraIcon size={24} color={colors.amber} />
            </View>
            <View style={styles.flex}>
              <Text style={type.bodyStrong}>Add this month’s roster</Text>
              <Text style={type.small}>Add your duties one by one for now. Screenshot import is coming soon.</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.promptCard}>
            <View style={[styles.promptIcon, { backgroundColor: '#173B3E' }]}>
              <UsersIcon size={24} color={colors.teal} />
            </View>
            <View style={styles.flex}>
              <Text style={type.bodyStrong}>Crew match is next</Text>
              <Text style={type.small}>Soon you can add friends and see the days you’re all off.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { paddingHorizontal: 20, paddingTop: space.xl, paddingBottom: space.xxl, gap: space.lg },
  flex: { flex: 1 },
  overRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.cloud },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: -space.sm },
  title: { flex: 1, fontSize: 32, lineHeight: 40 },
  arrows: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: touch, height: touch, borderRadius: touch / 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg + 2, minHeight: 76 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  tagText: { fontFamily: fonts.monoBold, fontSize: 15 },
  nextMono: { fontFamily: fonts.monoBold, fontSize: 19, color: colors.cloud },
  errorCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  promptCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg + 2 },
  promptIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#2A2414', alignItems: 'center', justifyContent: 'center' },
});
