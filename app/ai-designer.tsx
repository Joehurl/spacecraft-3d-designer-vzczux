import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { generateRoomFromPrompt } from '@/utils/aiRoomGenerator';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { FloorPlan } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');

type ScreenState = 'prompt' | 'generating' | 'result';

const QUICK_PROMPTS = [
  'Modern living room with sectional sofa',
  'Minimalist home office with standing desk',
  'Cozy bedroom with reading nook',
  'Open-plan kitchen and dining area',
];

const STYLES: { id: FloorPlan['style']; label: string; color: string }[] = [
  { id: 'modern', label: 'Modern', color: '#4F8EF7' },
  { id: 'scandinavian', label: 'Scandinavian', color: '#00D4AA' },
  { id: 'industrial', label: 'Industrial', color: '#F59E0B' },
  { id: 'bohemian', label: 'Bohemian', color: '#A78BFA' },
  { id: 'minimalist', label: 'Minimalist', color: '#94A3B8' },
  { id: 'classic', label: 'Classic', color: '#F472B6' },
];

const STATUS_MESSAGES = [
  'Analyzing your description...',
  'Planning room dimensions...',
  'Selecting furniture...',
  'Placing items optimally...',
  'Adding finishing touches...',
];

interface GenerationResult {
  projectId: string;
  projectName: string;
  summary: string;
  itemCount: number;
  roomName: string;
  style: FloorPlan['style'];
  furnitureItems: { id: string; name: string; emoji: string; category: string }[];
}

export default function AIDesignerScreen() {
  const router = useRouter();
  const { createProject, updateProject } = useFloorPlan();

  const [screen, setScreen] = useState<ScreenState>('prompt');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<FloorPlan['style']>('modern');
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statusFade = useRef(new Animated.Value(1)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Pulse animation for generating screen
  useEffect(() => {
    if (screen !== 'generating') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [screen, pulseAnim]);

  // Status message rotation
  useEffect(() => {
    if (screen !== 'generating') return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(statusFade, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(statusFade, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setStatusIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 600);
    return () => clearInterval(interval);
  }, [screen, statusFade]);

  const handleGenerate = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    console.log('[AIDesigner] Generate pressed — prompt:', trimmed, 'style:', selectedStyle);
    setScreen('generating');
    setStatusIndex(0);
    progressAnim.setValue(0);

    // Progress bar animation over 2.5s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Simulate AI delay then generate
    setTimeout(() => {
      console.log('[AIDesigner] Generation complete, building floor plan');
      const generated = generateRoomFromPrompt(trimmed, selectedStyle);

      // Create project and replace default room with generated one
      const project = createProject(generated.project.name, selectedStyle);
      updateProject(project.id, { rooms: generated.project.rooms });

      // Collect furniture items for display
      const room = generated.project.rooms[0];
      const furnitureItems: { id: string; name: string; emoji: string; category: string }[] = [];
      for (const pi of room.placedItems.slice(0, 8)) {
        const item = FURNITURE_CATALOG.find((f: { id: string }) => f.id === pi.furnitureId);
        if (item) {
          furnitureItems.push({ id: pi.furnitureId, name: item.name, emoji: item.emoji, category: item.category });
        }
      }

      console.log('[AIDesigner] Project created:', project.id, 'with', furnitureItems.length, 'items');

      setResult({
        projectId: project.id,
        projectName: generated.project.name,
        summary: generated.summary,
        itemCount: generated.itemCount,
        roomName: generated.roomName,
        style: selectedStyle,
        furnitureItems,
      });

      // Transition to result
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      setScreen('result');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 2600);
  }, [prompt, selectedStyle, createProject, updateProject, progressAnim, fadeAnim, slideAnim]);

  const handleOpenInEditor = useCallback(() => {
    if (!result) return;
    console.log('[AIDesigner] Open in editor — project:', result.projectId);
    router.replace(`/editor/${result.projectId}`);
  }, [result, router]);

  const handleSaveToProjects = useCallback(() => {
    if (!result) return;
    console.log('[AIDesigner] Save to projects — project:', result.projectId);
    router.replace('/(tabs)/(projects)');
  }, [result, router]);

  const handleRegenerate = useCallback(() => {
    console.log('[AIDesigner] Regenerate pressed');
    progressAnim.setValue(0);
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    setScreen('prompt');
    setResult(null);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [progressAnim, fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    console.log('[AIDesigner] Close pressed');
    router.back();
  }, [router]);

  const handleQuickPrompt = useCallback((qp: string) => {
    console.log('[AIDesigner] Quick prompt selected:', qp);
    setPrompt(qp);
  }, []);

  const handleStyleSelect = useCallback((styleId: FloorPlan['style']) => {
    console.log('[AIDesigner] Style selected:', styleId);
    setSelectedStyle(styleId);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const statusMessage = STATUS_MESSAGES[statusIndex];
  const selectedStyleLabel = STYLES.find(s => s.id === selectedStyle)?.label ?? 'Modern';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── PROMPT SCREEN ── */}
      {screen === 'prompt' && (
        <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.promptContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>✨ AI Room Designer</Text>
              <AnimatedPressable onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </AnimatedPressable>
            </View>

            {/* Hero */}
            <LinearGradient
              colors={['#1a2a4a', '#0d1a30']}
              style={styles.hero}
            >
              <View style={styles.heroIconWrap}>
                <LinearGradient
                  colors={[COLORS.primary + 'CC', COLORS.accent + 'CC']}
                  style={styles.heroIconGradient}
                >
                  <Text style={styles.heroIcon}>✨</Text>
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Describe your dream room</Text>
              <Text style={styles.heroSub}>
                AI will design it instantly with furniture placed perfectly
              </Text>
            </LinearGradient>

            {/* Text Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Your room description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. A cozy Scandinavian bedroom with a king bed, two nightstands, a wardrobe, and a reading corner with a chair and floor lamp..."
                placeholderTextColor={COLORS.textTertiary}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                returnKeyType="default"
              />
            </View>

            {/* Quick Prompts */}
            <View style={styles.quickSection}>
              <Text style={styles.inputLabel}>Quick start</Text>
              <View style={styles.quickGrid}>
                {QUICK_PROMPTS.map((qp) => (
                  <AnimatedPressable
                    key={qp}
                    onPress={() => handleQuickPrompt(qp)}
                    style={[
                      styles.quickChip,
                      prompt === qp && styles.quickChipActive,
                    ]}
                  >
                    <Text style={[styles.quickChipText, prompt === qp && styles.quickChipTextActive]}>
                      {qp}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            {/* Style Selector */}
            <View style={styles.styleSection}>
              <Text style={styles.inputLabel}>Room style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
                <View style={styles.styleRow}>
                  {STYLES.map(s => (
                    <AnimatedPressable
                      key={s.id}
                      onPress={() => handleStyleSelect(s.id)}
                      style={[
                        styles.styleChip,
                        selectedStyle === s.id && { borderColor: s.color, backgroundColor: s.color + '22' },
                      ]}
                    >
                      <View style={[styles.styleDot, { backgroundColor: s.color }]} />
                      <Text style={[styles.styleChipText, selectedStyle === s.id && { color: s.color }]}>
                        {s.label}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          {/* Generate Button */}
          <View style={styles.generateBtnWrap}>
            <AnimatedPressable
              onPress={handleGenerate}
              disabled={!prompt.trim()}
              style={[styles.generateBtnOuter, !prompt.trim() && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                <Text style={styles.generateBtnText}>Generate Room ✨</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </Animated.View>
      )}

      {/* ── GENERATING SCREEN ── */}
      {screen === 'generating' && (
        <View style={styles.generatingContainer}>
          {/* Pulsing logo */}
          <Animated.View style={[styles.generatingIconWrap, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[COLORS.primary + 'CC', COLORS.accent + 'CC']}
              style={styles.generatingIconGradient}
            >
              <Text style={styles.generatingIcon}>✨</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.generatingTitle}>AI is designing your room</Text>

          {/* Status message */}
          <Animated.Text style={[styles.generatingStatus, { opacity: statusFade }]}>
            {statusMessage}
          </Animated.Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth },
              ]}
            />
          </View>

          <Text style={styles.generatingHint}>This takes just a moment...</Text>
        </View>
      )}

      {/* ── RESULT SCREEN ── */}
      {screen === 'result' && result && (
        <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.resultContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your room is ready! 🎉</Text>
              <AnimatedPressable onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </AnimatedPressable>
            </View>

            {/* Preview Card */}
            <LinearGradient
              colors={['#1a2a4a', '#0d1a30']}
              style={styles.previewCard}
            >
              <View style={styles.previewCardInner}>
                <View style={styles.previewIconWrap}>
                  <Text style={styles.previewIcon}>🏠</Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName} numberOfLines={2}>
                    {result.projectName}
                  </Text>
                  <Text style={styles.previewSummary}>{result.summary}</Text>
                </View>
              </View>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>✦ AI Generated</Text>
              </View>
            </LinearGradient>

            {/* Furniture List */}
            <View style={styles.furnitureSection}>
              <Text style={styles.sectionTitle}>Furniture placed ({result.itemCount} items)</Text>
              <View style={styles.furnitureList}>
                {result.furnitureItems.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.furnitureItem}>
                    <View style={styles.furnitureIconWrap}>
                      <Text style={styles.furnitureEmoji}>{item.emoji}</Text>
                    </View>
                    <View style={styles.furnitureInfo}>
                      <Text style={styles.furnitureName}>{item.name}</Text>
                      <Text style={styles.furnitureCategory}>{item.category}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.resultActions}>
            <AnimatedPressable onPress={handleSaveToProjects} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save to Projects</Text>
            </AnimatedPressable>

            <View style={styles.resultBtnRow}>
              <AnimatedPressable onPress={handleRegenerate} style={styles.regenerateBtn}>
                <Text style={styles.regenerateBtnText}>Regenerate</Text>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleOpenInEditor} style={styles.openEditorBtnOuter}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.openEditorBtn}
                >
                  <Text style={styles.openEditorBtnText}>Open in Editor →</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },

  // ── Prompt Screen ──
  promptContent: {
    paddingBottom: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroIconWrap: {
    marginBottom: 4,
  },
  heroIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 36,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    paddingHorizontal: 16,
    gap: 8,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 120,
  },
  quickSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  quickChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  quickChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  styleSection: {
    gap: 10,
  },
  styleScroll: {
    marginHorizontal: 0,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  styleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  styleChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  generateBtnWrap: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  generateBtnOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ── Generating Screen ──
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  generatingIconWrap: {
    marginBottom: 8,
  },
  generatingIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingIcon: {
    fontSize: 48,
  },
  generatingTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  generatingStatus: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  generatingHint: {
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Result Screen ──
  resultContent: {
    paddingBottom: 20,
    gap: 20,
  },
  previewCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIcon: {
    fontSize: 28,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  previewSummary: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  previewBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  previewBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  furnitureSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  furnitureList: {
    gap: 8,
  },
  furnitureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  furnitureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  furnitureEmoji: {
    fontSize: 20,
  },
  furnitureInfo: {
    flex: 1,
    gap: 2,
  },
  furnitureName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  furnitureCategory: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  resultActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 10,
  },
  saveBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  saveBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  regenerateBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  regenerateBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  openEditorBtnOuter: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  openEditorBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openEditorBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
