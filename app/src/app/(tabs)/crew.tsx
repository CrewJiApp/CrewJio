// Crew: my groups and partner (mockup 13), each with its next good day.
import { addDays, bestDays, shortDate, todayInSingapore, type Profile } from '@crewjio/shared';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeartIcon, PlusIcon, UsersIcon } from '@/components/icons';
import { Avatar, AvatarStack } from '@/components/people';
import { Button } from '@/components/ui';
import type { Group, PartnerLink } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { useGroups, useRanking } from '@/state/social';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const LEVEL_SHORT = { off_days: 'off days only', destinations: 'destinations visible', full: 'full roster' } as const;

/** Next good day (not just "almost") with these people in the coming 30 days. */
function useNextGoodDay(people: Profile[]) {
  const today = todayInSingapore();
  const { days, loading } = useRanking(people, today, addDays(today, 29));
  const best = bestDays(days, 10).filter((d) => d.status !== 'Almost').sort((a, b) => a.date.localeCompare(b.date))[0];
  return { label: loading ? '' : best ? shortDate(best.date).replace(/ \w+$/, '') : 'No match', found: !!best };
}

export default function CrewTab() {
  const { profile } = useAuth();
  const { groups, partner, loading, error, reload } = useGroups();
  if (!profile) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={type.overline}>CREW</Text>
        <View style={styles.titleRow}>
          <Text style={[type.title, styles.flex]} accessibilityRole="header">
            My groups
          </Text>
          <Pressable onPress={() => router.push('/group/new')} accessibilityRole="button" accessibilityLabel="New group" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
            <PlusIcon size={26} color={colors.onAmber} weight="bold" />
          </Pressable>
        </View>

        {partner ? <PartnerCard link={partner} /> : <AddPartnerCard />}

        {groups.map((g) => (
          <GroupCard key={g.id} group={g} me={profile} />
        ))}

        {!loading && groups.length === 0 ? (
          <View style={styles.empty}>
            <UsersIcon size={28} color={colors.teal} />
            <Text style={type.bodyStrong}>Make a group for each circle</Text>
            <Text style={type.small}>Your batch, your ex-Scoot gang, the London layover crew. Each group only sees its own members, and you choose what each one sees.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={[type.small, { color: '#F07A7A' }]}>{error}</Text>
            <Button label="Try again" variant="text" onPress={reload} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label="Join with a code" variant="outline" onPress={() => router.push('/group/join')} />
          <Button label="When can we meet?" variant="outline" onPress={() => router.push('/match')} />
        </View>

        <View style={styles.note}>
          <Text style={type.small}>Groups don’t see each other. A friend in one group can’t see anyone in another, even if you’re in both.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PartnerCard({ link }: { link: PartnerLink }) {
  const next = useNextGoodDay([link.partner]);
  return (
    <Pressable onPress={() => router.push('/partner-view')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.partnerCard, pressed && { opacity: 0.85 }]}>
      <Avatar profile={link.partner} size={48} color={colors.pink} />
      <View style={styles.flex}>
        <Text style={type.heading} numberOfLines={1}>
          Partner · {link.partner.displayName.split(/\s+/)[0]}
        </Text>
        <Text style={type.small}>Full roster · next together</Text>
      </View>
      <Text style={[styles.when, { color: colors.pink }]}>{next.label}</Text>
    </Pressable>
  );
}

function AddPartnerCard() {
  return (
    <Pressable onPress={() => router.push('/partner-connect')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.addPartner, pressed && { opacity: 0.85 }]}>
      <View style={[styles.iconCircle, { backgroundColor: '#3A2230' }]}>
        <HeartIcon size={24} color={colors.pink} />
      </View>
      <View style={styles.flex}>
        <Text style={type.heading}>Add your partner</Text>
        <Text style={type.small}>Share your full roster with one person, and see when you’re both home.</Text>
      </View>
    </Pressable>
  );
}

function GroupCard({ group, me }: { group: Group; me: Profile }) {
  const others = group.members.filter((m) => m.profile.id !== me.id).map((m) => m.profile);
  const next = useNextGoodDay(others);
  const count = group.members.length;
  return (
    <Pressable onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <AvatarStack people={others} />
      <View style={styles.flex}>
        <Text style={type.heading} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={type.small} numberOfLines={1}>
          {count} {count === 1 ? 'person' : 'crew'} · {LEVEL_SHORT[group.mySharingLevel]}
        </Text>
      </View>
      <Text style={[styles.when, { color: next.found ? colors.teal : colors.muted }]}>{others.length ? next.label : 'Invite crew'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  flex: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: -space.sm, marginBottom: space.sm },
  addBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, minHeight: 76 },
  partnerCard: { borderWidth: 1.5, borderColor: colors.pink },
  addPartner: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.pink },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  when: { fontFamily: fonts.bold, fontSize: 15 },
  empty: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  errorCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg },
  actions: { gap: space.md, marginTop: space.sm },
  note: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, minHeight: touch },
});
