// Step 2 of 3: rank. No mockup; follows the 02-role-picker pattern.
// Cabin crew pick their name-tag colour, pilots their stripes.
import { CREW_RANKS, PILOT_RANKS } from '@crewjio/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NameTag, PilotStripes } from '@/components/brand';
import { BackButton, Button, OptionCard, Screen, StepHeader } from '@/components/ui';
import { useOnboarding } from '@/state/onboarding';
import { space } from '@/theme';

export default function RankStep() {
  const { draft, setRank } = useOnboarding();
  const isCrew = draft.role === 'cabin_crew';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <BackButton />
        <StepHeader
          step={2}
          total={3}
          title="What's your rank?"
          subtitle={
            isCrew
              ? 'Pick your name tag colour. We use it to suggest swaps with crew of a matching rank.'
              : 'Pick your stripes. We use it to suggest swaps with pilots of a matching rank.'
          }
        />

        <View style={styles.group} accessibilityRole="radiogroup">
          {isCrew
            ? CREW_RANKS.map((r) => (
                <OptionCard
                  key={r.id}
                  title={r.label}
                  selected={draft.rank === r.id}
                  onPress={() => setRank(r.id)}
                  leading={<NameTag color={r.color} />}
                />
              ))
            : PILOT_RANKS.map((r) => (
                <OptionCard
                  key={r.id}
                  title={r.label}
                  subtitle={`${r.stripes} stripes`}
                  selected={draft.rank === r.id}
                  onPress={() => setRank(r.id)}
                  leading={<PilotStripes stripes={r.stripes} />}
                />
              ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" disabled={!draft.rank} onPress={() => router.push('/onboarding/fleets')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl + 4, paddingTop: space.md, gap: space.xl },
  group: { gap: space.md },
  footer: { paddingHorizontal: space.xl + 4, paddingBottom: space.md, paddingTop: space.sm },
});
