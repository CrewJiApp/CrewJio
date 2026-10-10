// Crew Match (mockup 17): pick friends, see the next 14 days, propose the best one.
import { addDays, bestDays, shortDate, todayInSingapore, type DayStatus, type Profile } from '@crewjio/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaretLeftIcon } from '@/components/icons';
import { Avatar, DayCard } from '@/components/people';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { explainDay, joinNames, useGroups, useRanking } from '@/state/social';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const CELL: Partial<Record<DayStatus, { bg: string; fg: string; border?: string }>> = {
  Great: { bg: colors.teal, fg: colors.onCloud },
  Tired: { bg: colors.teal, fg: colors.onCloud },
  Evening: { bg: '#2B6E68', fg: colors.cloud },
  Daytime: { bg: '#2B6E68', fg: colors.cloud },
  Morning: { bg: '#2B6E68', fg: colors.cloud },
  SameLayover: { bg: '#7FA6F5', fg: colors.onCloud },
  Almost: { bg: 'transparent', fg: colors.amber, border: colors.amber },
};

export default function CrewMatch() {
  const { profile } = useAuth();
  const { groups, partner, loading: groupsLoading } = useGroups();
  const friends = useMemo(() => {
    const seen = new Map<string, Profile>();
    if (partner) seen.set(partner.partner.id, partner.partner);
    for (const g of groups) for (const m of g.members) if (m.profile.id !== profile?.id) seen.set(m.profile.id, m.profile);
    return [...seen.values()];
  }, [groups, partner, profile]);
  const [picked, setPicked] = useState<string[] | null>(null);
  const selected = picked ?? friends.slice(0, 2).map((f) => f.id);
  const chosen = useMemo(() => friends.filter((f) => selected.includes(f.id)), [friends, selected]);

  const today = todayInSingapore();
  const end = addDays(today, 13);
  const ranking = useRanking(chosen, today, end);
  if (!profile) return null;

  const best = bestDays(ranking.days, 4);
  const people = [profile, ...chosen];
  const top = best[0];
  const toggle = (id: string) => setPicked((selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]));

  const propose = () => {
    if (!top) return;
    Share.share({ message: `How about ${shortDate(top.date)}? CrewJio says: ${top.summary}. (${joinNames(ranking.included, profile)})` }).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/crew'))} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <CaretLeftIcon size={22} color={colors.cloud} />
          </Pressable>
          <Text style={type.overline}>CREW MATCH</Text>
        </View>
        <Text style={type.title} accessibilityRole="header">
          When can we meet?
        </Text>

        {groupsLoading ? <ActivityIndicator color={colors.amber} /> : null}
        {!groupsLoading && friends.length === 0 ? (
          <View style={styles.empty}>
            <Text style={type.body}>Make a group or connect your partner first. Then pick who you want to meet.</Text>
            <Button label="New group" onPress={() => router.replace('/group/new')} />
          </View>
        ) : null}

        <View style={styles.chips}>
          {friends.map((f) => {
            const on = selected.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => toggle(f.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={f.displayName}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.85 }]}>
                <Avatar profile={f} size={30} color={on ? colors.night : undefined} textColor={on ? colors.teal : undefined} />
                <Text style={[styles.chipText, on && { color: colors.onCloud }]}>{f.displayName.split(/\s+/)[0]}</Text>
              </Pressable>
            );
          })}
        </View>

        {chosen.length > 0 ? (
          <View style={styles.gridCard}>
            <View style={styles.gridHead}>
              <Text style={type.small}>Next 14 days</Text>
              <Text style={type.small} numberOfLines={1}>
                {joinNames(people, profile)}
              </Text>
            </View>
            {[0, 7].map((rowStart) => (
              <View key={rowStart} style={styles.gridRow}>
                {ranking.days.slice(rowStart, rowStart + 7).map((d) => {
                  const c = CELL[d.status];
                  return (
                    <View
                      key={d.date}
                      style={[styles.cell, c ? { backgroundColor: c.bg, borderColor: c.border ?? c.bg } : null, d.date === today && styles.today]}
                      accessible
                      accessibilityLabel={`${shortDate(d.date)}: ${d.summary || 'no match'}`}>
                      <Text style={[styles.cellText, c && { color: c.fg, fontFamily: fonts.bold }]}>{Number(d.date.slice(8))}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={styles.legend}>
              {[
                [colors.teal, 'All off in SG'],
                ['#2B6E68', 'Part of the day'],
                ['#7FA6F5', 'Same layover'],
                ['transparent', 'All but one'],
              ].map(([c, l]) => (
                <View key={l} style={styles.legendItem}>
                  <View style={[styles.swatch, { backgroundColor: c }, c === 'transparent' && { borderWidth: 1.5, borderColor: colors.amber }]} />
                  <Text style={type.small}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {ranking.missing.length > 0 && chosen.length > 0 ? (
          <Text style={type.small}>{joinNames(ranking.missing, profile)} {ranking.missing.length === 1 ? 'hasn’t' : 'haven’t'} added these dates yet, so they’re left out.</Text>
        ) : null}

        {chosen.length > 0 ? <Text style={[type.overline, styles.section]}>BEST MATCHES</Text> : null}
        {chosen.length > 0 && !ranking.loading && best.length === 0 ? <Text style={type.small}>No day works for everyone in the next two weeks. Try fewer people.</Text> : null}
        {best.map((d, i) => (
          <DayCard key={d.date} date={d.date} status={d.status} title={d.summary} detail={explainDay(d, people, profile)} highlight={i === 0} />
        ))}
      </ScrollView>
      {top ? (
        <View style={styles.footer}>
          <Button label={`Propose ${shortDate(top.date)}`} onPress={propose} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, paddingTop: space.md, gap: space.md, paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: touch + 4, height: touch + 4, borderRadius: (touch + 4) / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingLeft: 8, paddingRight: 16, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontFamily: fonts.bold, fontSize: 16, color: colors.cloud },
  gridCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 8 },
  gridHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, marginBottom: 4 },
  gridRow: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, height: 44, borderRadius: 10, backgroundColor: colors.cardRaised, borderWidth: 1.5, borderColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
  today: { borderColor: colors.cloud },
  cellText: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  section: { marginTop: space.md },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
