import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, Redirect, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { FloorPlanProvider } from "@/contexts/FloorPlanContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COLORS } from "@/constants/Colors";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};


function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    }).catch(() => {
      if (cancelled) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    });
    return () => { cancelled = true; };
  }, [isSubscribed, loading, pathname]);

  return null;
}

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (onboardingComplete === null) {
    return null;
  }

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.danger,
    },
  };

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.danger,
    },
  };

  return (
    <SubscriptionProvider>
          <SubscriptionRedirect />
  <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={CustomDarkTheme}>
        <SafeAreaProvider>
          <WidgetProvider>
            <FloorPlanProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                {onboardingComplete === false && pathname !== "/auth" && pathname !== "/paywall" && pathname !== "/auth-popup" && pathname !== "/auth-callback" && <Redirect href="/onboarding" />}

                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: COLORS.background },
                  }}
                >
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />

                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="editor/[id]"
                    options={{ headerShown: false, presentation: 'fullScreenModal' }}
                  />
                  <Stack.Screen
                    name="view3d/[id]"
                    options={{ headerShown: false, presentation: 'fullScreenModal' }}
                  />
                  <Stack.Screen
                    name="furniture-picker"
                    options={{ headerShown: false, presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="paywall"
                    options={{ headerShown: false, presentation: 'fullScreenModal' }}
                  />
                  <Stack.Screen
                    name="ai-designer"
                    options={{ headerShown: false, presentation: 'fullScreenModal' }}
                  />
                </Stack>
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </FloorPlanProvider>
          </WidgetProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
    </SubscriptionProvider>
  );
}
