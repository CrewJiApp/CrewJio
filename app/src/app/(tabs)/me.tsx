// Me: the saved profile, edit it, sign out.
import { AIRLINE_LABELS, FLEETS, ranksForRole } from '@crewjio/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PencilSimpleIcon, SignOutIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useOnboarding } from '@/state/onboarding';
import { colors, fonts, radius, space, type } from '@/theme';

export default function MeTab() {
  const { profile, demo, signOut } = useAuth();
  const { edit, start } = useOnboarding();
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  const rank = ranksForRole(profile.role).find((r) => r.id === profile.rank);
  const rows: [string, string][] = [
    ['Role', profile.role === 'cabin_crew' ? 'Cabin crew' : 'Pilot'],
    ['Airline', AIRLINE_LABELS[profile.airline]],
    ['Rank', rank?.label ?? 'Not set'],
    ['Fleets', FLEETS.filter((f) => profile.fleets.includes(f)).join(', ') || 'Not set'],
    ...(profile.role === 'cabin_crew' ? ([['JCL trained', profile.jclTrained ? 'Yes' : 'No']] as [string, string][]) : []),
    ['Open to swaps', profile.openToSwaps ? 'Yes' : 'No'],
  ];

  const doSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      start('');
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };
  const confirmSignOut = () => {
    const message = demo ? 'Preview mode keeps everything on this phone, so signing out clears your duties.' : 'Your roster stays saved to your account.';
    if (Platform.OS === 'web') return void doSignOut();
    Alert.alert('Sign out?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={type.overline}>ME</Text>
        <View style={styles.nameRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.displayName)}</Text>
          </View>
          <Text style={[type.title, styles.flex]} numberOfLines={1} accessibilityRole="header">
            {profile.displayName}
          </Text>
        </View>

        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={type.small}>{label}</Text>
              <Text style={[type.bodyStrong, styles.value]}>{value}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Edit profile"
          variant="outline"
          icon={<PencilSimpleIcon size={20} color={colors.cloud} />}
          onPress={() => {
            edit(profile);
            router.push('/onboarding/role');
          }}
        />

        {demo ? (
          <Text style={[type.small, styles.note]}>Preview mode: no Supabase keys are set, so your profile and duties are saved on this phone only.</Text>
        ) : null}

        <Button label={busy ? 'Signing out…' : 'Sign out'} variant="text" disabled={busy} icon={<SignOutIcon size={20} color={colors.amber} />} onPress={confirmSignOut} />
        <Text style={[type.small, styles.note]}>Not affiliated with any airline.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, gap: space.lg },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: -space.xs },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.onCloud },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg, minHeight: 28 },
  value: { flexShrink: 1, textAlign: 'right' },
  note: { color: colors.subtle, textAlign: 'center' },
});
