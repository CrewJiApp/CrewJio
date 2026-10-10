// Connect with your partner. Nobody can search for anyone, so one of you sends a code and the
// other enters it. Entering the code is the acceptance.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/fields';
import { HeartIcon, LockSimpleIcon } from '@/components/icons';
import { SheetHeader } from '@/components/sheets';
import { Button, InfoNote } from '@/components/ui';
import { social, socialErrorMessage } from '@/lib/social';
import { useAuth } from '@/state/auth';
import { colors, fonts, radius, space, type } from '@/theme';

export default function PartnerConnect() {
  const { profile } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [entered, setEntered] = useState('');
  const [busy, setBusy] = useState<'invite' | 'accept' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const invite = async () => {
    setBusy('invite');
    setError(null);
    try {
      setCode(await social.createPartnerInvite());
    } catch (e) {
      setError(socialErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    if (!profile) return;
    setBusy('accept');
    setAcceptError(null);
    try {
      await social.acceptPartnerInvite(profile, entered);
      router.replace('/partner-view');
    } catch (e) {
      setAcceptError(socialErrorMessage(e));
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <SheetHeader title="Your partner" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heart}>
              <HeartIcon size={30} color={colors.pink} weight="fill" />
            </View>
            <Text style={type.title}>Share everything with one person</Text>
            <Text style={type.body}>Your partner sees your full roster, and you see theirs, so you always know when you’re both home.</Text>
          </View>

          <Text style={type.overline}>INVITE YOUR PARTNER</Text>
          {code ? (
            <View style={styles.codeCard}>
              <Text style={type.small}>Send this code to your partner. It works once, for 7 days.</Text>
              <Text style={styles.code} selectable>
                {code}
              </Text>
              <Button
                label="Send to my partner"
                onPress={() => Share.share({ message: `Let’s connect on CrewJio. In the app: Crew → Add your partner → enter ${code}` }).catch(() => undefined)}
              />
            </View>
          ) : (
            <Button label={busy === 'invite' ? 'Making a code…' : 'Get a code to send'} variant="outline" disabled={!!busy} onPress={invite} />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={[type.overline, styles.section]}>GOT A CODE FROM YOUR PARTNER?</Text>
          <TextField label="Partner code" value={entered} onChangeText={setEntered} placeholder="A1B2C3D4E5" autoCapitalize="characters" mono maxLength={12} error={acceptError} />
          <Button label={busy === 'accept' ? 'Connecting…' : 'Connect'} disabled={!!busy || entered.trim().length < 6} onPress={accept} />

          <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
            You can have one partner at a time, and either of you can disconnect whenever you like. Private days still show only as Unavailable.
          </InfoNote>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  body: { padding: space.xl, paddingTop: space.sm, gap: space.md, paddingBottom: space.xxxl },
  hero: { gap: space.sm, marginBottom: space.md },
  heart: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#3A2230', alignItems: 'center', justifyContent: 'center' },
  codeCard: { borderWidth: 1.5, borderColor: colors.pink, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  code: { fontFamily: fonts.monoBold, fontSize: 28, letterSpacing: 3, color: colors.pink },
  section: { marginTop: space.lg },
  error: { fontFamily: fonts.medium, fontSize: 15, color: '#F07A7A' },
});
