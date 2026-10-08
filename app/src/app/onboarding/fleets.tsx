// Step 3 of 3: fleets, JCL (cabin crew only) and open to swaps. Follows the 02-role-picker pattern.
import { FLEETS } from '@crewjio/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackButton, Button, Chip, SectionLabel, Screen, StepHeader, ToggleRow } from '@/components/ui';
import { useOnboarding } from '@/state/onboarding';
import { space } from '@/theme';

export default function FleetsStep() {
  const { draft, toggleFleet, setJclTrained, setOpenToSwaps } = useOnboarding();
  const isCrew = draft.role === 'cabin_crew';

  const finish = () => {
    // Profile is done: the tour is a one-way door, so drop the onboarding steps from history.
    router.dismissAll();
    router.replace('/tour');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <BackButton />
        <StepHeader
          step={3}
          total={3}
          title="What do you fly?"
          subtitle="Pick every aircraft you're rated on. Swap ideas only match duties on these fleets."
        />

        <SectionLabel>Fleets</SectionLabel>
        <View style={styles.fleets}>
          {FLEETS.map((f) => (
            <Chip
              key={f}
              label={f}
              mono
              multi
              selected={draft.fleets.includes(f)}
              onPress={() => toggleFleet(f)}
              style={styles.fleet}
            />
          ))}
        </View>

        <View style={styles.toggles}>
          {isCrew ? (
            <ToggleRow
              title="JCL trained"
              subtitle="Business class qualified"
              value={draft.jclTrained}
              onChange={setJclTrained}
            />
          ) : null}
          <ToggleRow
            title="Open to swaps"
            subtitle="Friends can suggest a duty swap with you. You always decide, in the airline's own system."
            value={draft.openToSwaps}
            onChange={setOpenToSwaps}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" disabled={draft.fleets.length === 0} onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl + 4, paddingTop: space.md, gap: space.xl },
  fleets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  // Three per row on a typical phone; wraps naturally on narrow screens.
  fleet: { flexGrow: 1, flexBasis: '28%' },
  toggles: { gap: space.md },
  footer: { paddingHorizontal: space.xl + 4, paddingBottom: space.md, paddingTop: space.sm },
});
