import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

const TABS: TabBarItem[] = [
  { name: '(projects)', route: '/(tabs)/(projects)', icon: 'folder-open', label: 'Projects' },
  { name: '(catalog)', route: '/(tabs)/(catalog)', icon: 'category', label: 'Catalog' },
  { name: '(explore)', route: '/(tabs)/(explore)', icon: 'explore', label: 'Explore' },
  { name: '(settings)', route: '/(tabs)/(settings)', icon: 'settings', label: 'Settings' },
];

export default function TabLayout() {
  useSubscriptionGuard();

  return (
    <Tabs
      tabBar={() => (
        <FloatingTabBar
          tabs={TABS}
          containerWidth={320}
          borderRadius={35}
          bottomMargin={20}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Tabs.Screen name="(projects)" />
      <Tabs.Screen name="(catalog)" />
      <Tabs.Screen name="(explore)" />
      <Tabs.Screen name="(settings)" />
    </Tabs>
  );
}
