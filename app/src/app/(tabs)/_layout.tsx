// Main tabs (mockups 10, 11): Roster, Crew, add duty (+), Track or Partner, Me.
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AirplaneTiltIcon, CalendarBlankIcon, HeartIcon, PlusIcon, UserIcon, UsersIcon } from '@/components/icons';
import { useAuth } from '@/state/auth';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  const { status, profile } = useAuth();
  if (status === 'loading') return null;
  if (status !== 'signed_in') return <Redirect href="/" />;
  if (!profile) return <Redirect href="/onboarding/role" />;

  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="roster" />
      <Tabs.Screen name="crew" />
      <Tabs.Screen name="partner" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  // Crew track their own flights; pilots get the partner view (mockups 10 and 11).
  const pilot = profile?.role === 'pilot';
  const items = [
    { name: 'roster', label: 'Roster', Icon: CalendarBlankIcon },
    { name: 'crew', label: 'Crew', Icon: UsersIcon },
    { name: 'add', label: 'Add duty', Icon: PlusIcon },
    { name: 'partner', label: pilot ? 'Partner' : 'Track', Icon: pilot ? HeartIcon : AirplaneTiltIcon },
    { name: 'me', label: 'Me', Icon: UserIcon },
  ];
  const current = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map(({ name, label, Icon }) => {
        if (name === 'add') {
          return (
            <View key={name} style={styles.slot}>
              <Pressable
                onPress={() => router.push('/add-duty')}
                accessibilityRole="button"
                accessibilityLabel="Add duty"
                style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}>
                <PlusIcon size={30} color={colors.onAmber} weight="bold" />
              </Pressable>
            </View>
          );
        }
        const focused = current === name;
        const tint = focused ? colors.amber : colors.muted;
        return (
          <Pressable
            key={name}
            onPress={() => {
              const route = state.routes.find((r) => r.name === name);
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.slot}>
            <Icon size={26} color={tint} weight={focused ? 'bold' : 'regular'} />
            <Text style={[styles.label, { color: tint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.night,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 3 },
  label: { fontFamily: fonts.medium, fontSize: 12 },
  add: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
