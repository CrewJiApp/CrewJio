// Group Plan (mockup 15): best days this month, who still needs to add their roster, and the
// group's settings: what it sees of you, invite code, members, leave or delete.
import {
  CREW_RANKS,
  PILOT_RANKS,
  bestDays,
  monthName,
  shortDate,
  todayInSingapore,
  type OverrideLevel,
  type Profile,
  type SharingLevel,
} from '@crewjio/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaretLeftIcon } from '@/components/icons';
import { Avatar, DayCard } from '@/components/people';
import { LEVEL_EXPLAIN, LevelPicker } from '@/components/sheets';
import { Button, Chip } from '@/components/ui';
import { social, socialErrorMessage } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { monthBounds } from '@/state/roster';
import { explainDay, joinNames, useGroups, useRanking } from '@/state/social';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const OVERRIDE_TEXT: Record<OverrideLevel, string> = { hidden: 'Hidden from them', off_days: 'Off days only', destinations: 'Up to destinations', full: 'Full roster' };

function nextMonths(today: string, count: number) {
  const out: { year: number; month: number }[] = [];
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  for (let i = 0; i < count; i++) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function rankLabel(p: Profile) {
  const rank = [...CREW_RANKS, ...PILOT_RANKS].find((r) => r.id === p.rank)?.short;
  return [p.role === 'pilot' ? 'Pilot' : 'Crew', rank].filter(Boolean).join(' · ');
}

export default function GroupPlan() {
  const params = useLocalSearchParams<{ id: string; created?: string }>();
  const { profile } = useAuth();
  const { groups, loading: groupsLoading, reload } = useGroups();
  const group = groups.find((g) => g.id === params.id);
  const today = todayInSingapore();
  const months = useMemo(() => nextMonths(today, 3), [today]);
  const [pick, setPick] = useState(0);
  const { year, month } = months[pick]!;
  const bounds = monthBounds(year, month);
  const start = pick === 0 ? today : bounds.first;

  const others = useMemo(() => (group && profile ? group.members.filter((m) => m.profile.id !== profile.id).map((m) => m.profile) : []), [group, profile]);
  const ranking = useRanking(others, start, bounds.last);
  const [overrides, setOverrides] = useState<Record<string, OverrideLevel>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    social.getOverrides().then(setOverrides).catch(() => undefined);
  }, []);

  if (!profile) return null;
  if (!group) {
    return (
      <SafeAreaView style={styles.screen}>
        {groupsLoading ? <ActivityIndicator color={colors.amber} style={{ marginTop: space.xxxl }} /> : <Text style={[type.body, styles.center]}>This group isn’t available any more.</Text>}
      </SafeAreaView>
    );
  }

  const name = monthName(month);
  const best = bestDays(ranking.days, 5);
  const people = [profile, ...others];
  const inviteText = `Join "${group.name}" on CrewJio so we can find days we’re all home. In the app: Crew → Join with a code → ${group.inviteCode}`;

  const share = (message: string) => Share.share({ message }).catch(() => undefined);
  const shareBest = () =>
    share(
      `${group.name}: best days in ${name}\n` +
        best.map((d) => `• ${shortDate(d.date)}: ${d.summary}`).join('\n') +
        '\nFound with CrewJio',
    );
  const nudge = () => {
    const names = joinNames(ranking.missing, profile);
    share(`Hi ${names}! Can you add your ${name} roster on CrewJio? Then we can see which days we’re all home.`);
  };

  const confirm = (title: string, message: string, label: string, run: () => Promise<void>) => {
    const go = async () => {
      setBusy(true);
      try {
        await run();
      } catch (e) {
        Alert.alert('Something went wrong', socialErrorMessage(e));
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: go },
    ]);
  };

  const setLevel = async (level: SharingLevel) => {
    try {
      await social.setSharingLevel(profile, group.id, level);
      await reload();
    } catch (e) {
      Alert.alert('Could not change it', socialErrorMessage(e));
    }
  };

  const memberOptions = (p: Profile) => {
    const apply = async (level: OverrideLevel | null) => {
      await social.setOverride(p.id, level);
      setOverrides(await social.getOverrides());
    };
    const first = p.displayName.split(/\s+/)[0];
    if (Platform.OS === 'web') return;
    Alert.alert(`What ${first} sees of you`, `By default ${first} sees the most you share with any group you’re both in. You can show ${first} less. They won’t be told.`, [
      { text: 'Same as my groups', onPress: () => apply(null) },
      { text: 'Off days only', onPress: () => apply('off_days') },
      { text: `Hide my roster from ${first}`, style: 'destructive', onPress: () => apply('hidden') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/crew'))} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <CaretLeftIcon size={22} color={colors.cloud} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={type.heading} accessibilityRole="header" numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={type.small}>
              {group.members.length} crew · {ranking.loading ? '…' : `${ranking.included.length} have ${name} in`}
            </Text>
          </View>
        </View>

        {params.created ? (
          <View style={styles.created}>
            <Text style={type.bodyStrong}>Group created. Now invite your crew.</Text>
            <Text style={type.small}>Send them this code. They tap Crew → Join with a code.</Text>
            <Text style={styles.code}>{group.inviteCode}</Text>
            <Button label="Send invite" onPress={() => share(inviteText)} />
          </View>
        ) : null}

        <View style={styles.avatars}>
          {ranking.included.map((p, i) => (
            <Avatar key={p.id} profile={p} size={44} label={p.id === profile.id ? 'You' : undefined} style={i > 0 ? styles.overlap : undefined} />
          ))}
          {ranking.missing.map((p, i) => (
            <Avatar key={p.id} profile={p} size={44} dashed style={ranking.included.length + i > 0 ? styles.overlap : undefined} />
          ))}
          {ranking.missing.length > 0 && !ranking.missing.some((p) => p.id === profile.id) ? (
            <Pressable onPress={nudge} accessibilityRole="button" style={styles.nudge} hitSlop={6}>
              <Text style={styles.nudgeText}>Nudge {ranking.missing[0]!.displayName.split(/\s+/)[0]}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chips}>
          {months.map((m, i) => (
            <Chip key={i} label={monthName(m.month).slice(0, 3)} selected={pick === i} onPress={() => setPick(i)} style={styles.monthChip} />
          ))}
        </View>

        <Text style={type.overline}>BEST DAYS IN {name.toUpperCase()}</Text>
        {ranking.loading ? <ActivityIndicator color={colors.amber} /> : null}
        {!ranking.loading && others.length === 0 ? <Text style={type.small}>Invite your crew to see the days you’re all home.</Text> : null}
        {!ranking.loading && others.length > 0 && ranking.included.length < 2 ? (
          <Text style={type.small}>Nobody else has added {name} yet. Give them a nudge.</Text>
        ) : null}
        {!ranking.loading && ranking.included.length >= 2 && best.length === 0 ? (
          <Text style={type.small}>No day works for everyone in {name} yet. As more rosters come in, this fills up.</Text>
        ) : null}
        {best.map((d, i) => (
          <DayCard key={d.date} date={d.date} status={d.status} title={d.summary} detail={explainDay(d, people, profile)} highlight={i === 0} />
        ))}
        {ranking.error ? <Text style={[type.small, { color: '#F07A7A' }]}>{ranking.error}</Text> : null}

        {best.length > 0 ? <Button label="Share best days" onPress={shareBest} /> : null}
        <Button label="Invite crew" variant="outline" onPress={() => share(inviteText)} />

        <Text style={[type.overline, styles.section]}>WHAT THIS GROUP SEES OF YOU</Text>
        <LevelPicker value={group.mySharingLevel} onChange={setLevel} />
        <Text style={type.small}>{LEVEL_EXPLAIN[group.mySharingLevel]}</Text>

        <Text style={[type.overline, styles.section]}>MEMBERS</Text>
        {group.members.map((m) => {
          const isMe = m.profile.id === profile.id;
          const ov = overrides[m.profile.id];
          return (
            <Pressable
              key={m.profile.id}
              disabled={isMe}
              onPress={() => memberOptions(m.profile)}
              accessibilityRole={isMe ? undefined : 'button'}
              accessibilityHint={isMe ? undefined : 'Choose what this person sees of you'}
              style={({ pressed }) => [styles.member, pressed && { opacity: 0.85 }]}>
              <Avatar profile={m.profile} size={40} />
              <View style={styles.flex}>
                <Text style={type.bodyStrong}>
                  {isMe ? `${m.profile.displayName} (you)` : m.profile.displayName}
                  {m.groupRole === 'owner' ? <Text style={styles.owner}>  · owner</Text> : null}
                </Text>
                <Text style={type.small}>{ov ? `${rankLabel(m.profile)} · you show them: ${OVERRIDE_TEXT[ov].toLowerCase()}` : rankLabel(m.profile)}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[type.overline, styles.section]}>INVITE CODE</Text>
        <Text style={styles.code} selectable>
          {group.inviteCode}
        </Text>

        <Button
          label={group.isOwner ? 'Delete group' : 'Leave group'}
          variant="text"
          disabled={busy}
          onPress={() =>
            group.isOwner
              ? confirm('Delete this group?', `Everyone leaves "${group.name}". Rosters are not deleted.`, 'Delete', async () => {
                  await social.deleteGroup(group.id);
                  router.replace('/crew');
                })
              : confirm('Leave this group?', `"${group.name}" stops seeing your roster.`, 'Leave', async () => {
                  await social.leaveGroup(profile, group.id);
                  router.replace('/crew');
                })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, paddingTop: space.md, gap: space.md, paddingBottom: space.xxxl },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center', marginTop: space.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: touch + 4, height: touch + 4, borderRadius: (touch + 4) / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  created: { borderWidth: 1.5, borderColor: colors.amber, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  code: { fontFamily: fonts.monoBold, fontSize: 24, letterSpacing: 2, color: colors.amber },
  avatars: { flexDirection: 'row', alignItems: 'center', marginVertical: space.xs },
  overlap: { marginLeft: -8, borderWidth: 2, borderColor: colors.night },
  nudge: { marginLeft: space.md, minHeight: touch, justifyContent: 'center' },
  nudgeText: { fontFamily: fonts.bold, fontSize: 16, color: colors.amber },
  chips: { flexDirection: 'row', gap: 8 },
  monthChip: { minHeight: 44, paddingHorizontal: space.lg },
  section: { marginTop: space.lg },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  owner: { fontFamily: fonts.regular, color: colors.muted },
});
