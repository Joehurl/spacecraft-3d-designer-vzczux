import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COLORS } from "@/constants/Colors";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

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
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={CustomDarkTheme}>
        <SafeAreaProvider>
          <WidgetProvider>
            <FloorPlanProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: COLORS.background },
                  }}
                >
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
                </Stack>
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </FloorPlanProvider>
          </WidgetProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
