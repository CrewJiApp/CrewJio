// Join a group with the invite code a friend sent.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/fields';
import { LockSimpleIcon } from '@/components/icons';
import { SheetHeader } from '@/components/sheets';
import { Button, InfoNote, StepHeader } from '@/components/ui';
import { social, socialErrorMessage } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { colors, space } from '@/theme';

export default function JoinGroup() {
  const { profile, demo } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!profile) return;
    const clean = code.replace(/[^0-9a-f]/gi, '');
    if (!demo && clean.length !== 12) return setError('Group codes have 12 letters and numbers.');
    setBusy(true);
    setError(null);
    try {
      const id = await social.joinGroup(profile, clean);
      router.replace({ pathname: '/group/[id]', params: { id } });
    } catch (e) {
      setError(socialErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <SheetHeader title="Join a group" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <StepHeader title="Got a code?" subtitle="Paste the code your friend sent you." />
          <TextField label="Group code" value={code} onChangeText={setCode} placeholder="3f9a1c27b04e" mono maxLength={20} error={error} autoFocus />
          <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
            You start by sharing your off days only. You can show this group more once you’re in.
          </InfoNote>
        </ScrollView>
        <View style={styles.footer}>
          <Button label={busy ? 'Joining…' : 'Join group'} disabled={busy || !code.trim()} onPress={join} />
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
