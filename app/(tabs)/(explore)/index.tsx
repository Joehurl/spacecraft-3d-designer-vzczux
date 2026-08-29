import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { DesignCard } from '@/components/DesignCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: SCREEN_W } = Dimensions.get('window');

const TRENDING_STYLES = [
  { id: 'modern', name: 'Modern', count: 142, gradient: ['#1a2a4a', '#2563EB'], emojis: '🛋️🪴🖼️' },
  { id: 'scandinavian', name: 'Scandinavian', count: 98, gradient: ['#1a3a2a', '#059669'], emojis: '🛏️🕯️🌿' },
  { id: 'industrial', name: 'Industrial', count: 76, gradient: ['#2a1a0a', '#92400E'], emojis: '💡🪑🔩' },
  { id: 'bohemian', name: 'Bohemian', count: 115, gradient: ['#2a1a3a', '#7C3AED'], emojis: '🪴🏺🧶' },
  { id: 'minimalist', name: 'Minimalist', count: 89, gradient: ['#1a1a2a', '#374151'], emojis: '⬜🪞💡' },
];

const ROOM_TYPES = [
  { id: 'living', name: 'Living Rooms', emoji: '🛋️', gradient: '#1a2a4a' },
  { id: 'bedroom', name: 'Bedrooms', emoji: '🛏️', gradient: '#1a3a2a' },
  { id: 'kitchen', name: 'Kitchens', emoji: '🍳', gradient: '#2a1a0a' },
  { id: 'bathroom', name: 'Bathrooms', emoji: '🛁', gradient: '#1a2a3a' },
  { id: 'office', name: 'Home Offices', emoji: '🖥️', gradient: '#1a1a2a' },
  { id: 'dining', name: 'Dining Rooms', emoji: '🍽️', gradient: '#2a1a1a' },
  { id: 'kids', name: 'Kids Rooms', emoji: '🧸', gradient: '#2a2a1a' },
  { id: 'outdoor', name: 'Outdoor', emoji: '🌿', gradient: '#1a2a1a' },
];

const POPULAR_DESIGNS = [
  {
    id: 'd1',
    title: 'Minimalist Living Room',
    designer: 'Sarah M.',
    roomType: 'Living Room',
    style: 'Minimalist',
    likes: 2847,
    gradient: ['#1a2a4a', '#2563EB'],
    emojis: '🛋️🪴🖼️',
    furnitureIds: ['sofa-001', 'coffee-001', 'tv-unit-001', 'plant-001', 'rug-001'],
  },
  {
    id: 'd2',
    title: 'Cozy Scandinavian Bedroom',
    designer: 'Alex K.',
    roomType: 'Bedroom',
    style: 'Scandinavian',
    likes: 1923,
    gradient: ['#1a3a2a', '#059669'],
    emojis: '🛏️🕯️🌿',
    furnitureIds: ['bed-002', 'nightstand-001', 'lamp-003', 'plant-002', 'rug-002'],
  },
  {
    id: 'd3',
    title: 'Industrial Home Office',
    designer: 'Marcus T.',
    roomType: 'Home Office',
    style: 'Industrial',
    likes: 1456,
    gradient: ['#2a1a0a', '#92400E'],
    emojis: '🖥️💡📚',
    furnitureIds: ['office-001', 'office-003', 'bookshelf-001', 'lamp-004', 'rug-003'],
  },
  {
    id: 'd4',
    title: 'Bohemian Living Space',
    designer: 'Priya S.',
    roomType: 'Living Room',
    style: 'Bohemian',
    likes: 3102,
    gradient: ['#2a1a3a', '#7C3AED'],
    emojis: '🪴🏺🧶',
    furnitureIds: ['sofa-006', 'ottoman-001', 'plant-004', 'rug-001', 'lamp-001'],
  },
  {
    id: 'd5',
    title: 'Modern Kitchen Design',
    designer: 'Chen W.',
    roomType: 'Kitchen',
    style: 'Modern',
    likes: 987,
    gradient: ['#1a2a1a', '#059669'],
    emojis: '🍳🧊☕',
    furnitureIds: ['kitchen-001', 'kitchen-002', 'kitchen-003', 'kitchen-011'],
  },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createProject, setActiveProject } = useFloorPlan();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerTranslate]);

  function handleUseLayout(design: typeof POPULAR_DESIGNS[0]) {
    console.log('[Explore] Use layout:', design.id, design.title);
    const project = createProject(design.title, design.style.toLowerCase() as 'modern');
    setActiveProject(project.id);
    router.push(`/editor/${project.id}`);
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <Text style={styles.headerTitle}>Explore Designs</Text>
        <Text style={styles.headerSub}>Get inspired by the community</Text>
      </Animated.View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGradient}>
          <View style={styles.heroOverlay} />
          <Text style={styles.heroEmojis}>🛋️🪴🖼️✨</Text>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✦ Room of the Week</Text>
            </View>
            <Text style={styles.heroTitle}>Nordic Serenity</Text>
            <Text style={styles.heroSub}>A masterclass in Scandinavian minimalism</Text>
          </View>
        </View>
      </View>

      {/* AI Designer Feature Card */}
      <View style={styles.section}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Explore] AI Designer card pressed');
            router.push('/ai-designer');
          }}
          style={styles.aiCardOuter}
        >
          <LinearGradient
            colors={['#0d1a30', '#1a2a4a', '#0d2a1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <View style={styles.aiCardOverlay} />
            <View style={styles.aiCardContent}>
              <View style={styles.aiCardBadge}>
                <Text style={styles.aiCardBadgeText}>✦ New Feature</Text>
              </View>
              <Text style={styles.aiCardTitle}>✨ AI Room Designer</Text>
              <Text style={styles.aiCardSub}>
                Describe your dream room in plain text and AI will generate a complete floor plan instantly
              </Text>
              <View style={styles.aiCardBtn}>
                <Text style={styles.aiCardBtnText}>Try AI Designer →</Text>
              </View>
            </View>
            <Text style={styles.aiCardEmojis}>🛋️🪴🖼️✨</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* Trending Styles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Styles</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          <View style={styles.trendingRow}>
            {TRENDING_STYLES.map(style => (
              <AnimatedPressable
                key={style.id}
                onPress={() => console.log('[Explore] Trending style:', style.id)}
                style={[styles.trendingCard, { backgroundColor: style.gradient[0] }]}
              >
                <Text style={styles.trendingEmojis}>{style.emojis}</Text>
                <Text style={styles.trendingName}>{style.name}</Text>
                <Text style={styles.trendingCount}>{style.count} designs</Text>
              </AnimatedPressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Room Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Room</Text>
        <View style={styles.roomGrid}>
          {ROOM_TYPES.map((rt, i) => (
            <AnimatedPressable
              key={rt.id}
              onPress={() => console.log('[Explore] Room type:', rt.id)}
              style={[styles.roomCard, { backgroundColor: rt.gradient }]}
            >
              <Text style={styles.roomEmoji}>{rt.emoji}</Text>
              <Text style={styles.roomName}>{rt.name}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Popular Designs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Designs</Text>
        <View style={styles.designsList}>
          {POPULAR_DESIGNS.map((design, i) => (
            <DesignCard
              key={design.id}
              title={design.title}
              designer={design.designer}
              roomType={design.roomType}
              style={design.style}
              likes={design.likes}
              gradient={design.gradient}
              emojis={design.emojis}
              onUseLayout={() => handleUseLayout(design)}
              index={i}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 160,
    gap: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 2,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  hero: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroGradient: {
    height: 200,
    backgroundColor: '#1a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.4)',
  },
  heroEmojis: {
    fontSize: 52,
    letterSpacing: 8,
    marginBottom: 16,
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 4,
  },
  heroBadge: {
    backgroundColor: COLORS.primary + '33',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  heroBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
    gap: 14,
  },
  aiCardOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiCard: {
    height: 180,
    padding: 20,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  aiCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.3)',
  },
  aiCardEmojis: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 36,
    letterSpacing: 4,
    opacity: 0.7,
  },
  aiCardContent: {
    gap: 6,
  },
  aiCardBadge: {
    backgroundColor: COLORS.accent + '33',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
    marginBottom: 2,
  },
  aiCardBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  aiCardTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  aiCardSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  aiCardBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  aiCardBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  trendingScroll: {
    marginHorizontal: -16,
  },
  trendingRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 160,
    height: 200,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendingEmojis: {
    fontSize: 28,
    letterSpacing: 2,
    marginBottom: 8,
  },
  trendingName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  trendingCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomCard: {
    width: (SCREEN_W - 42) / 2,
    height: 90,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-end',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomEmoji: {
    fontSize: 24,
  },
  roomName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  designsList: {
    gap: 14,
  },
});
