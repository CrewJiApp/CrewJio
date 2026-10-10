// Fonts are imported weight by weight so only these files ship in the app.
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { AuthProvider } from '@/state/auth';
import { OnboardingProvider } from '@/state/onboarding';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.night, card: colors.night, primary: colors.amber, text: colors.cloud },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const reduceMotion = useReducedMotion();
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <OnboardingProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.night },
              animation: reduceMotion ? 'none' : 'default',
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="auth-callback" />
            <Stack.Screen name="onboarding/role" />
            <Stack.Screen name="onboarding/rank" />
            <Stack.Screen name="onboarding/fleets" />
            {/* One-way doors: once the profile is done there is no swiping back into it. */}
            <Stack.Screen name="tour" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="add-duty" options={{ presentation: 'modal' }} />
            <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="group/join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="group/[id]" />
            <Stack.Screen name="match" />
            <Stack.Screen name="partner-view" />
            <Stack.Screen name="partner-connect" options={{ presentation: 'modal' }} />
          </Stack>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
