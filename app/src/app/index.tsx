// Welcome / sign in (mockup 01-welcome). Signed-in users are sent on to onboarding or their roster.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightPathHero, LogoMark, Wordmark, brandStyles } from '@/components/brand';
import { Button } from '@/components/ui';
import { signInErrorMessage, useAuth } from '@/state/auth';
import { colors, fonts, radius, space, type } from '@/theme';

const PRIVACY_URL = 'https://crewjio.com/privacy';

export default function Welcome() {
  const auth = useAuth();
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Opened from an invite link, e.g. crewjio://?inviter=Jia%20Li&group=Batch%20girls
  const { inviter, group } = useLocalSearchParams<{ inviter?: string; group?: string }>();

  if (auth.status === 'loading') return null;
  if (auth.status === 'signed_in') return <Redirect href={auth.profile ? '/roster' : '/onboarding/role'} />;

  const run = async (which: 'apple' | 'google') => {
    setError(null);
    setBusy(which);
    try {
      await (which === 'apple' ? auth.signInWithApple() : auth.signInWithGoogle());
    } catch (e) {
      setError(signInErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  // Sign in with Apple is native on iOS only. In demo mode every button works everywhere.
  const showApple = auth.demo || Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <FlightPathHero height={300} />

        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(500).delay(250)} style={styles.content}>
          <View style={brandStyles.lockup}>
            <LogoMark size={48} />
            <Wordmark size={26} />
          </View>

          <Text style={type.display} accessibilityRole="header">
            Find the days you’re both home.
          </Text>
          <Text style={[type.body, styles.lede]}>
            Share rosters with your crew friends and partner. No more group-chat date juggling.
          </Text>

          <View style={styles.actions}>
            {inviter && group ? (
              <View style={styles.invite}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(inviter)}</Text>
                </View>
                <Text style={[type.small, styles.inviteText]}>
                  {inviter} invited you to <Text style={styles.inviteGroup}>{group}</Text>
                </Text>
              </View>
            ) : null}
            {showApple ? (
              <Button label={busy === 'apple' ? 'Signing in…' : 'Continue with Apple'} variant="light" disabled={!!busy} onPress={() => run('apple')} />
            ) : null}
            <Button
              label={busy === 'google' ? 'Signing in…' : 'Continue with Google'}
              variant={showApple ? 'outline' : 'light'}
              disabled={!!busy}
              onPress={() => run('google')}
            />
            <Button label="Use phone number" variant="text" disabled={!!busy} onPress={() => router.push('/sign-in')} />
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            {auth.demo ? (
              <Text style={[type.small, styles.demo]}>Preview mode: no Supabase keys yet, so everything stays on this phone.</Text>
            ) : null}
          </View>

          <Text style={[type.small, styles.legal]}>
            Not affiliated with any airline. By continuing you agree to the Terms and{' '}
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: space.xl + 4, paddingTop: space.lg, gap: space.lg },
  lede: { fontSize: 17, lineHeight: 25 },
  actions: { gap: space.md, marginTop: space.sm },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onCloud },
  inviteText: { flex: 1, color: colors.cloud, fontSize: 16 },
  inviteGroup: { fontFamily: fonts.bold },
  legal: { textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 'auto', paddingBottom: space.lg },
  link: { color: colors.amber, textDecorationLine: 'underline' },
  error: { fontFamily: fonts.medium, fontSize: 15, color: '#F07A7A', textAlign: 'center' },
  demo: { textAlign: 'center', color: colors.subtle },
});
