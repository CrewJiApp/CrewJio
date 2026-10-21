// Me: the saved profile, edit it, legal links, sign out, and delete the account (required by Apple and Google).
import { AIRLINE_LABELS, FLEETS, ROLE_LABELS, ranksForRole } from '@crewjio/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaretRightIcon, PencilSimpleIcon, SignOutIcon, TrashIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { allowPreview } from '@/lib/config';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_URL, TERMS_URL } from '@/lib/links';
import { useAuth } from '@/state/auth';
import { useOnboarding } from '@/state/onboarding';
import { colors, fonts, radius, space, type } from '@/theme';

export default function MeTab() {
  const { profile, demo, signOut, deleteAccount } = useAuth();
  const { edit, start } = useOnboarding();
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  const rank = ranksForRole(profile.role).find((r) => r.id === profile.rank);
  const rows: [string, string][] = profile.role === 'partner' ? [['Role', 'Not crew (partner, family or friend)']] : [
    ['Role', ROLE_LABELS[profile.role]],
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
  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      start('');
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'We could not delete your account. Please try again.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Could not delete your account', message);
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = () => {
    const message =
      'This permanently deletes your profile, your roster, your connection with your partner and your place in every group. Groups you started stay with the other members. This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete your account?\n\n${message}`)) void doDelete();
      return;
    }
    Alert.alert('Delete your account?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete my account', style: 'destructive', onPress: doDelete },
    ]);
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

        {demo && allowPreview ? (
          <Text style={[type.small, styles.note]}>Preview mode: no Supabase keys are set, so your profile and duties are saved on this phone only.</Text>
        ) : null}

        <View style={styles.card}>
          <LinkRow label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
          <LinkRow label="Terms of use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
          <LinkRow label="Help and support" onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL).catch(() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`))} />
        </View>

        <Button label={busy ? 'Please wait…' : 'Sign out'} variant="text" disabled={busy} icon={<SignOutIcon size={20} color={colors.amber} />} onPress={confirmSignOut} />
        <Button label="Delete my account" variant="text" disabled={busy} icon={<TrashIcon size={20} color="#F07A7A" />} onPress={confirmDelete} />
        <Text style={[type.small, styles.note]}>Not affiliated with any airline.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
      <Text style={type.bodyStrong}>{label}</Text>
      <CaretRightIcon size={18} color={colors.muted} />
    </Pressable>
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
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
});
