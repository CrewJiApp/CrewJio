// New group (mockup 14). Friends join with the group's invite code; nobody can be added directly.
import type { SharingLevel } from '@crewjio/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/fields';
import { LockSimpleIcon } from '@/components/icons';
import { LEVEL_EXPLAIN, LevelPicker, SheetHeader } from '@/components/sheets';
import { Button, InfoNote } from '@/components/ui';
import { social, socialErrorMessage } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { colors, space, type } from '@/theme';

export default function NewGroup() {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SharingLevel>('off_days');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!profile) return;
    if (!name.trim()) return setError('Give the group a name.');
    setBusy(true);
    setError(null);
    try {
      const id = await social.createGroup(profile, name, level);
      router.replace({ pathname: '/group/[id]', params: { id, created: '1' } });
    } catch (e) {
      setError(socialErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <SheetHeader title="New group" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TextField label="Group name" value={name} onChangeText={setName} placeholder="Batch girls" autoCapitalize="words" maxLength={40} error={error} autoFocus />
          <Text style={type.overline}>THIS GROUP SEES</Text>
          <LevelPicker value={level} onChange={setLevel} />
          <Text style={type.small}>{LEVEL_EXPLAIN[level]} You can change this any time, and each friend chooses what they share too.</Text>
          <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
            After you create the group you get an invite code to send your crew. Nobody can add you to a group, or see it, without one.
          </InfoNote>
        </ScrollView>
        <View style={styles.footer}>
          <Button label={busy ? 'Creating…' : 'Create group'} disabled={busy || !name.trim()} onPress={create} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  body: { padding: space.xl, paddingTop: space.sm, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
