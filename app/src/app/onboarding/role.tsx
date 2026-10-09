// Step 1 of 3: role and airline (mockup 02-role-picker).
import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/fields';
import { AirplaneTiltIcon, LockSimpleIcon, UserIcon } from '@/components/icons';
import { BackButton, Button, Chip, InfoNote, OptionCard, Screen, SectionLabel, StepHeader } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useOnboarding } from '@/state/onboarding';
import { colors, radius, space } from '@/theme';

export default function RoleStep() {
  const { draft, editing, setRole, setAirline, setDisplayName } = useOnboarding();
  const { user } = useAuth();

  // Prefill the name Apple or Google shared, once.
  const suggested = user?.suggestedName ?? '';
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || editing || !suggested) return;
    prefilled.current = true;
    if (!draft.displayName) setDisplayName(suggested);
  }, [editing, suggested, draft.displayName, setDisplayName]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <BackButton />
        <StepHeader
          step={1}
          total={3}
          title="What do you fly as?"
          subtitle="This sets your duty types and roster import. Friends see it as a small label only."
        />

        <View style={styles.group} accessibilityRole="radiogroup">
          <OptionCard
            title="Cabin crew"
            subtitle="Turnarounds, trips, standby"
            selected={draft.role === 'cabin_crew'}
            onPress={() => setRole('cabin_crew')}
            leading={
              <RoleIcon active={draft.role === 'cabin_crew'}>
                <UserIcon size={26} color={draft.role === 'cabin_crew' ? colors.onAmber : colors.cloud} />
              </RoleIcon>
            }
          />
          <OptionCard
            title="Pilot"
            subtitle="Adds sim, ground school, reserve, fleet"
            selected={draft.role === 'pilot'}
            onPress={() => setRole('pilot')}
            leading={
              <RoleIcon active={draft.role === 'pilot'}>
                <AirplaneTiltIcon size={26} color={draft.role === 'pilot' ? colors.onAmber : colors.cloud} />
              </RoleIcon>
            }
          />
        </View>

        <SectionLabel>Airline</SectionLabel>
        <View style={styles.row} accessibilityRole="radiogroup">
          <Chip label="Singapore Airlines" selected={draft.airline === 'SIA'} onPress={() => setAirline('SIA')} style={styles.wide} />
          <Chip label="Scoot" selected={draft.airline === 'Scoot'} onPress={() => setAirline('Scoot')} style={styles.flex} />
        </View>

        <TextField
          label="Your name (friends see this)"
          value={draft.displayName}
          onChangeText={setDisplayName}
          placeholder="First name is fine"
          autoCapitalize="words"
          maxLength={40}
        />

        <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
          Nobody can search for you. People connect only through an invite link or your contacts.
        </InfoNote>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" disabled={!draft.displayName.trim()} onPress={() => router.push('/onboarding/rank')} />
      </View>
    </Screen>
  );
}

function RoleIcon({ active, children }: { active: boolean; children: ReactNode }) {
  return <View style={[styles.roleIcon, { backgroundColor: active ? colors.amber : colors.cardRaised }]}>{children}</View>;
}

const styles = StyleSheet.create({
  body: { padding: space.xl + 4, paddingTop: space.md, gap: space.xl },
  group: { gap: space.md + 4 },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  wide: { flex: 1.35 },
  roleIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: space.xl + 4, paddingBottom: space.md, paddingTop: space.sm },
});
