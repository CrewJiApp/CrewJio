// Welcome / login (mockup 01-welcome). Auth is a placeholder until Prompt 2.
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightPathHero, LogoMark, Wordmark, brandStyles } from '@/components/brand';
import { Button } from '@/components/ui';
import { useOnboarding, type AuthMethod } from '@/state/onboarding';
import { colors, fonts, radius, space, type } from '@/theme';

const PRIVACY_URL = 'https://crewjio.com/privacy';

export default function Welcome() {
  const { signInPlaceholder } = useOnboarding();
  const reduceMotion = useReducedMotion();
  // Opened from an invite link, e.g. crewjio://?inviter=Jia%20Li&group=Batch%20girls
  const { inviter, group } = useLocalSearchParams<{ inviter?: string; group?: string }>();

  const continueWith = (method: AuthMethod) => {
    signInPlaceholder(method);
    router.push('/onboarding/role');
  };

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
            <Button label="Continue with Apple" variant="light" onPress={() => continueWith('apple')} />
            <Button label="Continue with Google" variant="outline" onPress={() => continueWith('google')} />
            <Button label="Use phone number" variant="text" onPress={() => continueWith('phone')} />
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
});
