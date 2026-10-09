// Placeholder for tabs that arrive in later build steps.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space, type } from '@/theme';

export function ComingSoon({ overline, title, body, icon }: { overline: string; title: string; body: string; icon: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Text style={type.overline}>{overline}</Text>
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.card}>
          <View style={styles.icon}>{icon}</View>
          <Text style={[type.body, styles.text]}>{body}</Text>
          <Text style={type.eyebrow}>COMING SOON</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, paddingTop: space.xl, gap: space.md },
  card: { marginTop: space.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.xl, gap: space.md, alignItems: 'flex-start' },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.cloud },
});
