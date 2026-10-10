// Partner (mockup 16): their next flight, this week side by side, and the days you're both home.
// Live flight progress and landing alerts come with flight tracking (build step 7).
import { addDays, bestDays, dayBadge, displayTime, shortDate, todayInSingapore, type IsoDate, type PersonRoster } from '@crewjio/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaretLeftIcon } from '@/components/icons';
import { Avatar, DayCard } from '@/components/people';
import { TONE_STYLE } from '@/components/roster-calendar';
import { Button } from '@/components/ui';
import { social, socialErrorMessage, type PartnerLink } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { explainDay, useRanking } from '@/state/social';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toneOf(roster: PersonRoster | undefined, date: IsoDate) {
  if (!roster) return TONE_STYLE.empty;
  const day = roster.duties.filter((d) => d.date === date);
  if (day.some((d) => d.category === 'leave' || d.category === 'national_service' || d.category === 'private')) return TONE_STYLE.leave;
  return TONE_STYLE[dayBadge(date, roster.duties, roster.holidays).tone];
}

function NextFlight({ roster, today, name }: { roster: PersonRoster; today: IsoDate; name: string }) {
  const next = roster.duties
    .filter((d) => d.kind === 'flight' && (d.arriveDate ?? d.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.departTime ?? '').localeCompare(b.departTime ?? ''))[0];
  if (!next?.sector) return null;
  const [from, to] = next.sector.split('-');
  const home = to === 'SIN';
  const when = next.date === today ? 'Today' : shortDate(next.date);
  return (
    <View style={styles.flight} accessible accessibilityLabel={`${name}'s next flight: ${next.flightNumber ?? ''} ${from} to ${to}, ${when}`}>
      <View style={styles.flightTop}>
        <Text style={[type.eyebrow, { fontSize: 13 }]}>{home ? 'FLYING HOME' : 'NEXT FLIGHT'}</Text>
        <Text style={styles.flightNo}>{next.flightNumber ?? ''}</Text>
      </View>
      <View style={styles.flightRow}>
        <Text style={styles.airport}>{from}</Text>
        <View style={styles.track} />
        <Text style={styles.airport}>{to}</Text>
      </View>
      <View style={styles.flightTop}>
        <Text style={type.small}>
          {when}
          {next.departTime ? ` · departs ${displayTime(next.departTime)}` : ''}
        </Text>
        <Text style={type.small}>{next.arriveTime ? `lands ${displayTime(next.arriveTime)}${next.arriveDate && next.arriveDate !== next.date ? ' +1' : ''}` : ''}</Text>
      </View>
    </View>
  );
}

export function PartnerView({ link, embedded }: { link: PartnerLink; embedded?: boolean }) {
  const { profile } = useAuth();
  const today = todayInSingapore();
  const ranking = useRanking([link.partner], today, addDays(today, 29));
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  const partner = link.partner;
  const first = partner.displayName.split(/\s+/)[0]!;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const together = new Set(ranking.days.filter((d) => ['Great', 'Evening', 'Daytime', 'Tired', 'Morning'].includes(d.status)).map((d) => d.date));
  const best = bestDays(ranking.days, 3);
  const theirs = ranking.rosters[partner.id];

  const disconnect = () => {
    const go = async () => {
      setBusy(true);
      try {
        await social.removePartner(link);
        router.replace('/crew');
      } catch (e) {
        Alert.alert('Could not disconnect', socialErrorMessage(e));
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert(`Disconnect from ${first}?`, `${first} stops seeing your full roster, and you stop seeing theirs.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          {!embedded ? (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/crew'))} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <CaretLeftIcon size={22} color={colors.cloud} />
            </Pressable>
          ) : null}
          <Avatar profile={partner} size={56} color={colors.pink} />
          <View style={styles.flex}>
            <Text style={type.title} accessibilityRole="header" numberOfLines={1}>
              {partner.displayName}
            </Text>
            <Text style={type.small}>Partner · {partner.role === 'pilot' ? 'Pilot' : 'Cabin crew'}</Text>
          </View>
        </View>

        {theirs ? <NextFlight roster={theirs} today={today} name={first} /> : null}

        <View style={styles.weekHead}>
          <Text style={type.overline}>THIS WEEK</Text>
          <Text style={type.small}>Home together</Text>
        </View>
        <View style={styles.week}>
          <View style={styles.weekRow}>
            <Text style={styles.weekName} />
            {week.map((d) => (
              <Text key={d} style={styles.weekDay}>
                {DOW[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7]}
                {Number(d.slice(8))}
              </Text>
            ))}
          </View>
          {[
            { label: 'You', roster: ranking.rosters[profile.id] },
            { label: first, roster: theirs },
          ].map((row) => (
            <View key={row.label} style={styles.weekRow}>
              <Text style={styles.weekName} numberOfLines={1}>
                {row.label}
              </Text>
              {week.map((d) => {
                const t = toneOf(row.roster, d);
                return <View key={d} style={[styles.cell, { backgroundColor: t.bg, borderColor: t.border }]} />;
              })}
            </View>
          ))}
          <View style={styles.weekRow}>
            <Text style={styles.weekName} />
            {week.map((d) => (
              <View key={d} style={[styles.bar, together.has(d) && { backgroundColor: colors.pink }]} />
            ))}
          </View>
        </View>

        {best.map((d, i) => (
          <DayCard key={d.date} date={d.date} status={d.status} title={d.summary.replace('Both off', 'Both home')} detail={explainDay(d, [profile, partner], profile)} highlight={i === 0} />
        ))}
        {!ranking.loading && best.length === 0 ? <Text style={type.small}>No days you’re both home in the next month yet. Add more of your roster to see them.</Text> : null}

        <View style={styles.soon}>
          <Text style={type.bodyStrong}>Landing alerts</Text>
          <Text style={type.small}>Live flight status and a ping when {first} lands are coming with flight tracking.</Text>
        </View>

        <Button label={`Disconnect from ${first}`} variant="text" disabled={busy} onPress={disconnect} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, paddingTop: space.md, gap: space.md, paddingBottom: space.xxxl },
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  back: { width: touch + 4, height: touch + 4, borderRadius: (touch + 4) / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  flight: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  flightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flightNo: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.cloud },
  flightRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  airport: { fontFamily: fonts.monoBold, fontSize: 26, color: colors.cloud },
  track: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.sm },
  week: { gap: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  weekName: { width: 52, fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  weekDay: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  cell: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1.5 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  soon: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: 4 },
});
