import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PartnerView } from '@/components/partner-view';
import { useGroups } from '@/state/social';
import { colors, space } from '@/theme';

export default function PartnerScreen() {
  const { partner, loading } = useGroups();
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }}>
        <ActivityIndicator color={colors.amber} style={{ marginTop: space.xxxl }} />
      </SafeAreaView>
    );
  }
  if (!partner) return <Redirect href="/partner-connect" />;
  return <PartnerView link={partner} />;
}
