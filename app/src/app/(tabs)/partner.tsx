// Everyone gets a Partner tab (mockup 11): the connected partner's roster next to yours, or a
// prompt to connect one.
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/icons';
import { PartnerView } from '@/components/partner-view';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useGroups } from '@/state/social';
import { colors, space, type } from '@/theme';

export default function PartnerRoute() {
  const { profile } = useAuth();
  return <PartnerTab notCrew={profile?.role === 'partner'} />;
}

function PartnerTab({ notCrew }: { notCrew: boolean }) {
  const { partner, loading } = useGroups();
  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.amber} style={{ marginTop: space.xxxl }} />
      </SafeAreaView>
    );
  }
  if (partner) return <PartnerView link={partner} embedded />;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Text style={type.overline}>PARTNER</Text>
        <Text style={type.title}>Your partner</Text>
        <View style={styles.card}>
          <HeartIcon size={28} color={colors.pink} />
          <Text style={[type.body, { color: colors.cloud }]}>
            {notCrew
              ? 'Connect with your partner to see their roster next to your calendar, and the days you’re both free.'
              : 'Connect with your partner to share full rosters and see when you’re both home.'}
          </Text>
          <Button label="Connect your partner" onPress={() => router.push('/partner-connect')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, gap: space.md },
  card: { marginTop: space.lg, backgroundColor: colors.card, borderRadius: 22, padding: space.xl, gap: space.md, borderWidth: 1.5, borderColor: colors.pink },
});
