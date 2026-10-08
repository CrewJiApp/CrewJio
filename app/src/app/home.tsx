// Placeholder landing after onboarding. My Roster replaces this in build step 2.
import { AIRLINE_LABELS, FLEETS, ranksForRole } from '@crewjio/shared';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '@/components/brand';
import { Button, Screen } from '@/components/ui';
import { hasSupabaseConfig } from '@/lib/config';
import { useOnboarding } from '@/state/onboarding';
import { colors, radius, space, type } from '@/theme';

export default function Home() {
  const { draft, reset } = useOnboarding();
  const rank = ranksForRole(draft.role).find((r) => r.id === draft.rank);
  const fleets = FLEETS.filter((f) => draft.fleets.includes(f)).join(', ');

  const rows: [string, string][] = [
    ['Role', draft.role === 'cabin_crew' ? 'Cabin crew' : 'Pilot'],
    ['Airline', AIRLINE_LABELS[draft.airline]],
    ['Rank', rank?.label ?? 'Not set'],
    ['Fleets', fleets || 'Not set'],
    ...(draft.role === 'cabin_crew' ? ([['JCL trained', draft.jclTrained ? 'Yes' : 'No']] as [string, string][]) : []),
    ['Open to swaps', draft.openToSwaps ? 'Yes' : 'No'],
  ];

  return (
    <Screen style={styles.screen}>
      <View style={styles.body}>
        <LogoMark size={56} />
        <Text style={type.title} accessibilityRole="header">
          You’re all set
        </Text>
        <Text style={type.body}>
          Your roster comes next. This is a preview: sign-in is not connected and nothing is saved yet.
        </Text>

        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={type.small}>{label}</Text>
              <Text style={[type.bodyStrong, styles.value]}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={[type.small, { color: hasSupabaseConfig ? colors.teal : colors.subtle }]}>
          {hasSupabaseConfig ? 'Supabase keys found.' : 'Supabase keys not set yet (app/.env.local).'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Start again"
          variant="outline"
          onPress={() => {
            reset();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  body: { padding: space.xl + 4, paddingTop: space.xxxl, gap: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg, minHeight: 28 },
  value: { flexShrink: 1, textAlign: 'right' },
  footer: { paddingHorizontal: space.xl + 4, paddingBottom: space.md },
});
