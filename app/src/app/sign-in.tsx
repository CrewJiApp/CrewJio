// Sign in with a one-time code by SMS (phone) or email. Two stages: where to send it, then the code.
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/fields';
import { toE164 } from '@/lib/phone';
import { BackButton, Button, Screen, StepHeader } from '@/components/ui';
import { signInErrorMessage, useAuth, type OtpChannel } from '@/state/auth';
import { colors, fonts, space, type } from '@/theme';

type Mode = 'phone' | 'email';

export default function SignIn() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('phone');
  const [address, setAddress] = useState('');
  const [sentTo, setSentTo] = useState<OtpChannel | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'signed_in') return <Redirect href={auth.profile ? '/roster' : '/onboarding/role'} />;

  const send = async () => {
    setError(null);
    let to: OtpChannel;
    if (mode === 'phone') {
      const phone = toE164(address);
      if (!phone) return setError('Enter your mobile number, like 9123 4567 or +44 7700 900123.');
      to = { phone };
    } else {
      const email = address.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
      to = { email };
    }
    setBusy(true);
    try {
      await auth.sendCode(to);
      setSentTo(to);
      setCode('');
    } catch (e) {
      setError(signInErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!sentTo) return;
    setError(null);
    // Supabase sends 6 digits by default; projects can set up to 10.
    if (!/^\d{6,10}$/.test(code.trim()) && !auth.demo) return setError('Enter the code from the message, numbers only.');
    setBusy(true);
    try {
      await auth.verifyCode(sentTo, code.trim());
    } catch (e) {
      setError(signInErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const where = sentTo ? ('phone' in sentTo ? sentTo.phone : sentTo.email) : '';

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <BackButton />
          {!sentTo ? (
            <>
              <StepHeader
                title={mode === 'phone' ? 'Your mobile number' : 'Your email'}
                subtitle={mode === 'phone' ? 'We’ll text you a code. Nobody can find you by your number.' : 'We’ll email you a code.'}
              />
              <TextField
                key={mode}
                label={mode === 'phone' ? 'Mobile number' : 'Email'}
                value={address}
                onChangeText={setAddress}
                placeholder={mode === 'phone' ? '9123 4567' : 'you@example.com'}
                keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'}
                mono={mode === 'phone'}
                error={error}
                autoFocus
              />
              <Button
                label={mode === 'phone' ? 'Use email instead' : 'Use phone number instead'}
                variant="text"
                onPress={() => {
                  setMode(mode === 'phone' ? 'email' : 'phone');
                  setAddress('');
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <StepHeader title="Enter the code" subtitle={`Sent to ${where}. It can take a minute to arrive.`} />
              <TextField label="Code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} placeholder="123456" keyboardType="number-pad" maxLength={10} mono error={error} autoFocus />
              <Button label="Send a new code" variant="text" disabled={busy} onPress={send} />
              <Button
                label={mode === 'phone' ? 'Change number' : 'Change email'}
                variant="text"
                onPress={() => {
                  setSentTo(null);
                  setError(null);
                }}
              />
            </>
          )}
          {auth.demo ? <Text style={[type.small, styles.demo]}>Preview mode: no code is sent. Tap Continue to go on.</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label={busy ? 'One moment…' : sentTo ? 'Continue' : 'Send code'}
            disabled={busy || (!sentTo && !address.trim())}
            onPress={sentTo ? verify : send}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: space.xl + 4, paddingTop: space.md, gap: space.lg },
  footer: { paddingHorizontal: space.xl + 4, paddingBottom: space.md, paddingTop: space.sm },
  demo: { color: colors.subtle, fontFamily: fonts.regular },
});
