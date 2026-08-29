import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { onboardingQuestions } from '@/constants/OnboardingQuestions';
import { completeOnboarding } from '@/utils/onboardingStorage';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { COLORS } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = onboardingQuestions.length;

// ─── Walkthrough slide data ───────────────────────────────────────────────────

interface WalkthroughSlide {
  id: string;
  accent: string;
  headline: string;
  subtitle: string;
  illustration: React.ReactNode;
}

function Slide2DTo3D({ accent }: { accent: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <View style={illStyles.center}>
      <Animated.View style={[illStyles.floorPlan, { borderColor: accent, transform: [{ rotate }, { translateY }] }]}>
        <View style={[illStyles.room, { borderColor: accent }]} />
        <View style={[illStyles.roomSmall, { borderColor: accent }]} />
        <View style={[illStyles.furnitureDot, { backgroundColor: accent, top: 28, left: 28 }]} />
        <View style={[illStyles.furnitureDot, { backgroundColor: accent + '99', top: 28, left: 52 }]} />
        <View style={[illStyles.furnitureDot, { backgroundColor: accent + '66', top: 52, left: 28 }]} />
      </Animated.View>
      <View style={[illStyles.badge, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
        <Text style={[illStyles.badgeText, { color: accent }]}>2D → 3D</Text>
      </View>
    </View>
  );
}

function SlideFurnitureGrid({ accent }: { accent: string }) {
  const items = ['🛋️', '🛏️', '🪑', '🚿', '🪴', '💡', '🖼️', '🪞', '🚪'];
  const anims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.sequence([
        Animated.delay(i * 120),
        Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]),
    );
    Animated.stagger(80, animations).start();
  }, [anims]);

  return (
    <View style={illStyles.center}>
      <View style={illStyles.grid}>
        {items.map((emoji, i) => {
          const scale = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
          const opacity = anims[i];
          return (
            <Animated.View
              key={i}
              style={[illStyles.gridCell, { backgroundColor: accent + '18', borderColor: accent + '33', transform: [{ scale }], opacity }]}
            >
              <Text style={illStyles.gridEmoji}>{emoji}</Text>
            </Animated.View>
          );
        })}
      </View>
      <View style={[illStyles.badge, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
        <Text style={[illStyles.badgeText, { color: accent }]}>500+ items</Text>
      </View>
    </View>
  );
}

function SlideAI({ accent }: { accent: string }) {
  const sparkle = useRef(new Animated.Value(0)).current;
  const textWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(sparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
    Animated.timing(textWidth, { toValue: 1, duration: 1600, delay: 400, useNativeDriver: false }).start();
  }, [sparkle, textWidth]);

  const scale = sparkle.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const width = textWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  return (
    <View style={illStyles.center}>
      <Animated.View style={[illStyles.wandCircle, { backgroundColor: accent + '22', borderColor: accent + '55', transform: [{ scale }] }]}>
        <Text style={illStyles.wandEmoji}>✨</Text>
      </Animated.View>
      <View style={[illStyles.typingBox, { borderColor: accent + '44', backgroundColor: COLORS.surfaceSecondary }]}>
        <Animated.View style={[illStyles.typingBar, { width, backgroundColor: accent }]} />
        <View style={[illStyles.typingBarShort, { backgroundColor: accent + '55' }]} />
      </View>
      <View style={[illStyles.badge, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
        <Text style={[illStyles.badgeText, { color: accent }]}>AI-powered</Text>
      </View>
    </View>
  );
}

function SlideAR({ accent }: { accent: string }) {
  const float = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [float, appear]);

  return (
    <View style={illStyles.center}>
      <View style={[illStyles.phoneFrame, { borderColor: accent + '66' }]}>
        <View style={[illStyles.phoneCam, { backgroundColor: COLORS.surfaceTertiary }]}>
          <View style={[illStyles.camGrid, { borderColor: accent + '33' }]} />
          <Animated.View style={[illStyles.arFurniture, { transform: [{ translateY: float }], opacity: appear }]}>
            <Text style={illStyles.arEmoji}>🛋️</Text>
          </Animated.View>
          <View style={[illStyles.arCorner, { borderColor: accent, top: 8, left: 8 }]} />
          <View style={[illStyles.arCorner, { borderColor: accent, top: 8, right: 8, transform: [{ scaleX: -1 }] }]} />
          <View style={[illStyles.arCorner, { borderColor: accent, bottom: 8, left: 8, transform: [{ scaleY: -1 }] }]} />
          <View style={[illStyles.arCorner, { borderColor: accent, bottom: 8, right: 8, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]} />
        </View>
      </View>
      <View style={[illStyles.badge, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
        <Text style={[illStyles.badgeText, { color: accent }]}>AR Preview</Text>
      </View>
    </View>
  );
}

function SlideShare({ accent }: { accent: string }) {
  const cards = [
    { emoji: '🛋️', delay: 0, tx: -60, ty: -20 },
    { emoji: '🛏️', delay: 150, tx: 60, ty: -30 },
    { emoji: '🪑', delay: 300, tx: 0, ty: -60 },
  ];
  const anims = useRef(cards.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.stagger(
          150,
          anims.map((a) =>
            Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
          ),
        ),
        Animated.delay(800),
        Animated.stagger(
          100,
          anims.map((a) =>
            Animated.timing(a, { toValue: 0, duration: 400, useNativeDriver: true }),
          ),
        ),
        Animated.delay(400),
      ]),
    ).start();
  }, [anims]);

  return (
    <View style={illStyles.center}>
      <View style={illStyles.shareHub}>
        <View style={[illStyles.shareCenter, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
          <Text style={illStyles.shareIcon}>↑</Text>
        </View>
        {cards.map((c, i) => {
          const tx = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, c.tx] });
          const ty = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, c.ty] });
          const opacity = anims[i];
          return (
            <Animated.View
              key={i}
              style={[illStyles.shareCard, { backgroundColor: COLORS.surfaceSecondary, borderColor: accent + '44', transform: [{ translateX: tx }, { translateY: ty }], opacity }]}
            >
              <Text style={illStyles.shareCardEmoji}>{c.emoji}</Text>
            </Animated.View>
          );
        })}
      </View>
      <View style={[illStyles.badge, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
        <Text style={[illStyles.badgeText, { color: accent }]}>Export & Share</Text>
      </View>
    </View>
  );
}

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDES: Omit<WalkthroughSlide, 'illustration'>[] = [
  {
    id: 'design',
    accent: '#00D4AA',
    headline: 'Design in 2D & 3D',
    subtitle: 'Draw rooms, place furniture, and see your space come to life in stunning 3D',
  },
  {
    id: 'furniture',
    accent: '#7C3AED',
    headline: '500+ Furniture Items',
    subtitle: 'Browse thousands of sofas, beds, tables, lighting and decor to furnish every room',
  },
  {
    id: 'ai',
    accent: '#F59E0B',
    headline: 'AI Room Designer ✨',
    subtitle: 'Describe your dream room and our AI will design it instantly — walls, furniture and all',
  },
  {
    id: 'ar',
    accent: '#3B82F6',
    headline: 'See It In Your Space',
    subtitle: 'Use AR to place furniture in your real room before you buy — no guessing required',
  },
  {
    id: 'share',
    accent: '#10B981',
    headline: 'Share & Export',
    subtitle: 'Export your floor plans as images, share with friends, or save a shopping list',
  },
];

function getIllustration(id: string, accent: string): React.ReactNode {
  switch (id) {
    case 'design': return <Slide2DTo3D accent={accent} />;
    case 'furniture': return <SlideFurnitureGrid accent={accent} />;
    case 'ai': return <SlideAI accent={accent} />;
    case 'ar': return <SlideAR accent={accent} />;
    case 'share': return <SlideShare accent={accent} />;
    default: return null;
  }
}

// ─── Walkthrough component ────────────────────────────────────────────────────

interface WalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

function Walkthrough({ onComplete, onSkip }: WalkthroughProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const goToSlide = useCallback(
    (next: number) => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      console.log('[Onboarding] Walkthrough slide change', { from: slideIndex, to: next });

      Animated.parallel([
        Animated.timing(translateX, { toValue: -SCREEN_WIDTH, duration: 0, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setSlideIndex(next);
        translateX.setValue(SCREEN_WIDTH);
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
          Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          isAnimating.current = false;
        });
      });
    },
    [slideIndex, translateX, contentOpacity],
  );

  const handleNext = useCallback(() => {
    const isLast = slideIndex === SLIDES.length - 1;
    console.log('[Onboarding] Walkthrough next pressed', { slideIndex, isLast });
    if (isLast) {
      onComplete();
    } else {
      goToSlide(slideIndex + 1);
    }
  }, [slideIndex, goToSlide, onComplete]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 40,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          // swipe left → next
          setSlideIndex((prev) => {
            const next = prev + 1;
            if (next >= SLIDES.length) {
              onComplete();
              return prev;
            }
            console.log('[Onboarding] Walkthrough swipe left', { from: prev, to: next });
            return next;
          });
        } else if (g.dx > 40) {
          // swipe right → prev
          setSlideIndex((prev) => {
            const next = Math.max(0, prev - 1);
            console.log('[Onboarding] Walkthrough swipe right', { from: prev, to: next });
            return next;
          });
        }
      },
    }),
  ).current;

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;
  const nextLabel = isLast ? 'Get Started →' : 'Next →';

  return (
    <View style={wStyles.container} {...panResponder.panHandlers}>
      {/* Skip button */}
      <SafeAreaView style={wStyles.skipArea} edges={['top']}>
        <Pressable
          onPress={() => {
            console.log('[Onboarding] Walkthrough skip pressed');
            onSkip();
          }}
          style={wStyles.skipBtn}
          hitSlop={12}
        >
          <Text style={wStyles.skipText}>Skip</Text>
        </Pressable>
      </SafeAreaView>

      {/* Illustration */}
      <Animated.View style={[wStyles.illustrationArea, { transform: [{ translateX }], opacity: contentOpacity }]}>
        <LinearGradient
          colors={[slide.accent + '18', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        {getIllustration(slide.id, slide.accent)}
      </Animated.View>

      {/* Content */}
      <Animated.View style={[wStyles.contentArea, { opacity: contentOpacity }]}>
        {/* Dots */}
        <View style={wStyles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                wStyles.dot,
                {
                  backgroundColor: i === slideIndex ? slide.accent : COLORS.textTertiary,
                  width: i === slideIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Text style={[wStyles.headline, { color: COLORS.text }]}>{slide.headline}</Text>
        <Text style={[wStyles.subtitle, { color: COLORS.textSecondary }]}>{slide.subtitle}</Text>

        <Pressable
          onPress={handleNext}
          style={[wStyles.nextBtn, { backgroundColor: slide.accent }]}
        >
          <Text style={wStyles.nextText}>{nextLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Questions phase ──────────────────────────────────────────────────────────

type QuestionsPhase = 'welcome' | 'questions' | 'completing';

function QuestionsFlow({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<QuestionsPhase>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [completingText, setCompletingText] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  // Welcome fade-in then auto-advance
  useEffect(() => {
    if (phase === 'welcome') {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setPhase('questions');
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, fadeAnim]);

  const question = onboardingQuestions[currentStep];
  const selectedOption = answers[currentStep];
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isFirstStep = currentStep === 0;

  const goBack = useCallback(() => {
    if (!isFirstStep && !isAnimating.current) {
      console.log('[Onboarding] Questions back pressed', { currentStep });
      isAnimating.current = true;
      Animated.timing(stepOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
        Animated.timing(stepOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
          isAnimating.current = false;
        });
      });
    }
  }, [isFirstStep, stepOpacity, currentStep]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFirstStep) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isFirstStep, goBack]);

  const handleSelect = (optionId: string) => {
    console.log('[Onboarding] Option selected', { step: currentStep, questionId: question?.id, optionId });
    setAnswers((prev) => ({ ...prev, [currentStep]: optionId }));
  };

  const handleContinue = async () => {
    if (!selectedOption) return;
    console.log('[Onboarding] Continue pressed', { step: currentStep, isLastStep, selectedOption });

    if (isLastStep) {
      // Celebration animation
      setCompletingText(true);
      Animated.sequence([
        Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true, speed: 30, bounciness: 0 }),
        Animated.spring(btnScale, { toValue: 1.04, useNativeDriver: true, speed: 20, bounciness: 6 }),
        Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
      ]).start();

      setTimeout(async () => {
        console.log('[Onboarding] Completing onboarding, navigating to paywall');
        await completeOnboarding();
        onDone();
      }, 800);
    } else {
      if (isAnimating.current) return;
      isAnimating.current = true;
      Animated.timing(stepOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrentStep((prev) => prev + 1);
        Animated.timing(stepOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
          isAnimating.current = false;
        });
      });
    }
  };

  if (phase === 'welcome') {
    return (
      <View style={[qStyles.container, { backgroundColor: COLORS.background }]}>
        <Animated.View style={[qStyles.welcomeCenter, { opacity: fadeAnim }]}>
          <Text style={qStyles.welcomeEmoji}>🏠</Text>
          <Text style={qStyles.welcomeTitle}>Welcome to SpaceCraft 3D</Text>
          <Text style={qStyles.welcomeSub}>Let's personalize your experience</Text>
        </Animated.View>
      </View>
    );
  }

  if (!question) return null;

  const optionCards = question.options.map((option) => (
    <OptionCard
      key={option.id}
      emoji={option.emoji}
      label={option.label}
      selected={selectedOption === option.id}
      onPress={() => handleSelect(option.id)}
    />
  ));

  const continueLabel = completingText ? 'Setting up your workspace...' : isLastStep ? 'Get Started' : 'Continue';

  return (
    <SafeAreaView style={[qStyles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={qStyles.header}>
        {!isFirstStep ? (
          <Pressable onPress={goBack} style={qStyles.backButton} hitSlop={12}>
            <Text style={qStyles.backArrow}>‹</Text>
          </Pressable>
        ) : (
          <View style={qStyles.backButton} />
        )}
        <View style={qStyles.progressWrapper}>
          <ProgressBar totalSteps={TOTAL_STEPS} currentStep={currentStep} />
        </View>
        <View style={qStyles.backButton} />
      </View>

      {/* Content */}
      <Animated.View style={[qStyles.content, { opacity: stepOpacity }]}>
        <View style={qStyles.questionSection}>
          <Text style={[qStyles.title, { color: COLORS.text }]}>{question.title}</Text>
          <Text style={[qStyles.subtitle, { color: COLORS.textSecondary }]}>{question.subtitle}</Text>
        </View>
        <View style={qStyles.optionsSection}>{optionCards}</View>
      </Animated.View>

      {/* Footer */}
      <View style={qStyles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedOption || completingText}
            style={[
              qStyles.continueButton,
              {
                backgroundColor: COLORS.accent,
                opacity: selectedOption && !completingText ? 1 : 0.4,
              },
            ]}
          >
            <Text style={qStyles.continueText}>{continueLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

type Phase = 'walkthrough' | 'questions';

export default function OnboardingScreen() {
  const [phase, setPhase] = useState<Phase>('walkthrough');

  const handleWalkthroughComplete = useCallback(() => {
    console.log('[Onboarding] Walkthrough complete, entering questions phase');
    setPhase('questions');
  }, []);

  const handleSkip = useCallback(() => {
    console.log('[Onboarding] Walkthrough skipped, entering questions phase');
    setPhase('questions');
  }, []);

  const handleDone = useCallback(() => {
    console.log('[Onboarding] All done, navigating to /paywall');
    router.replace('/paywall');
  }, []);

  if (phase === 'walkthrough') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <Walkthrough onComplete={handleWalkthroughComplete} onSkip={handleSkip} />
      </View>
    );
  }

  return <QuestionsFlow onDone={handleDone} />;
}

// ─── Illustration styles ──────────────────────────────────────────────────────

const illStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  floorPlan: {
    width: 160,
    height: 140,
    borderWidth: 2,
    borderRadius: 8,
    position: 'relative',
  },
  room: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 80,
    height: 70,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  roomSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 52,
    height: 40,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  furnitureDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 180,
    gap: 10,
    justifyContent: 'center',
  },
  gridCell: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmoji: {
    fontSize: 24,
  },
  wandCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wandEmoji: {
    fontSize: 44,
  },
  typingBox: {
    width: 200,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  typingBar: {
    height: 10,
    borderRadius: 5,
  },
  typingBarShort: {
    height: 10,
    width: 120,
    borderRadius: 5,
  },
  phoneFrame: {
    width: 130,
    height: 200,
    borderRadius: 20,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCam: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  camGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 0.5,
    opacity: 0.3,
  },
  arFurniture: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arEmoji: {
    fontSize: 44,
  },
  arCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  shareHub: {
    width: 160,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shareCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  shareCard: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardEmoji: {
    fontSize: 22,
  },
});

// ─── Walkthrough styles ───────────────────────────────────────────────────────

const wStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  illustrationArea: {
    height: '55%',
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    marginTop: 10,
  },
  nextBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  nextText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

// ─── Questions styles ─────────────────────────────────────────────────────────

const qStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: COLORS.text,
    lineHeight: 36,
    marginTop: -2,
  },
  progressWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionSection: {
    marginTop: 24,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  optionsSection: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  continueButton: {
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
});
