// Pilots get a Partner tab (mockup 11); cabin crew get Track (live flights, build step 7)
// and reach their partner from the Crew tab.
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/coming-soon';
import { AirplaneTiltIcon, HeartIcon } from '@/components/icons';
import { PartnerView } from '@/components/partner-view';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useGroups } from '@/state/social';
import { colors, space, type } from '@/theme';

export default function PartnerTab() {
  const { profile } = useAuth();
  if (profile?.role === 'pilot') return <PilotPartner />;
  return (
    <ComingSoon
      overline="TRACK"
      title="Live flights"
      body="Follow your flights and your partner’s, with landing alerts and a share link for family."
      icon={<AirplaneTiltIcon size={28} color={colors.amber} />}
    />
  );
}

function PilotPartner() {
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
          <Text style={[type.body, { color: colors.cloud }]}>Connect with your partner to share full rosters and see when you’re both home.</Text>
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
