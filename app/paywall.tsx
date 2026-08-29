/**
 * SpaceCraft 3D — Premium Paywall
 *
 * Full-screen modal with dark navy design system.
 * Monthly ($9.99) and Annual ($99.99, pre-selected) plans.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/contexts/SubscriptionContext';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Premium features ────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '∞', label: 'Unlimited Projects', desc: 'Create and save as many floor plans as you need', color: '#4F8EF7' },
  { icon: '◈', label: '3D View & Export', desc: 'Visualize designs in stunning 3D and share them', color: '#00D4AA' },
  { icon: '⊞', label: 'Full Furniture Catalog', desc: 'Access 3000+ premium furniture items & materials', color: '#F59E0B' },
  { icon: '↑', label: 'Export & Share', desc: 'Export floor plans as PDF, PNG, or share links', color: '#A78BFA' },
  { icon: '★', label: 'Priority Support', desc: 'Get help from our design experts whenever you need', color: '#F472B6' },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0E1A',
  surface: '#131929',
  surfaceSecondary: '#1C2438',
  surfaceTertiary: '#242D42',
  primary: '#4F8EF7',
  primaryMuted: 'rgba(79,142,247,0.15)',
  accent: '#00D4AA',
  accentMuted: 'rgba(0,212,170,0.12)',
  text: '#F0F4FF',
  textSecondary: '#8B96B0',
  border: 'rgba(79,142,247,0.18)',
  gold: '#F59E0B',
};

export default function PaywallScreen() {
  const router = useRouter();
  const {
    packages,
    loading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
    mockNativePurchase,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<'idle' | 'processing'>('idle');
  const [webMockDialogState, setWebMockDialogState] = useState<'hidden' | 'selecting' | 'failed'>('hidden');

  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Pre-select the annual package (index 1 if available, else 0)
      const annual = packages.length > 1 ? packages[1] : packages[0];
      setSelectedPackage(annual);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log('[Paywall] Purchase pressed — package:', selectedPackage.identifier);
    try {
      setPurchasing(true);
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log('[Paywall] Purchase succeeded');
        Alert.alert('Welcome to Pro!', 'Your SpaceCraft 3D Pro subscription is now active.', [
          { text: 'Start Designing', onPress: () => router.replace('/(tabs)/(projects)') },
        ]);
      }
    } catch (error: any) {
      console.log('[Paywall] Purchase failed:', error?.message);
      Alert.alert('Purchase Failed', error.message || 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log('[Paywall] Restore purchases pressed');
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log('[Paywall] Restore succeeded');
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/(projects)') },
        ]);
      } else {
        Alert.alert('No Purchases Found', "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      console.log('[Paywall] Restore failed:', error?.message);
      Alert.alert('Restore Failed', error.message || 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log('[Paywall] Dismissed (Maybe Later)');
    router.replace('/(tabs)/(projects)');
  };

  const handleSimulatePurchase = async () => {
    console.log('[Paywall] DEV: Simulating subscription purchase');
    if (isWeb) {
      mockWebPurchase();
      console.log('[Paywall] DEV: Web mock purchase applied — isSubscribed = true');
    } else {
      await mockNativePurchase();
      console.log('[Paywall] DEV: Native mock purchase applied — isSubscribed = true');
    }
    router.replace('/(tabs)/(projects)');
  };

  const handleWebMockPurchase = async () => {
    if (!selectedPackage) return;
    console.log('[Paywall] Web mock purchase pressed');
    setWebMockState('processing');
    await new Promise((r) => setTimeout(r, 400));
    setWebMockState('idle');
    setWebMockDialogState('selecting');
  };

  const handleSelectPackage = (pkg: PurchasesPackage) => {
    console.log('[Paywall] Plan selected:', pkg.identifier);
    setSelectedPackage(pkg);
  };

  // ── Already subscribed ──────────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['#0A0E1A', '#0D1526', '#0A1A2E']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.subscribedContent}>
            <View style={styles.crownCircle}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO MEMBER</Text>
            </View>
            <Text style={styles.subscribedTitle}>You're All Set!</Text>
            <Text style={styles.subscribedSub}>Welcome to SpaceCraft 3D Pro</Text>
            <View style={styles.unlockedCard}>
              <Text style={styles.unlockedTitle}>Unlocked Features</Text>
              {FEATURES.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.unlockedRow}>
                  <View style={[styles.checkCircle, { backgroundColor: C.accentMuted }]}>
                    <Text style={[styles.checkMark, { color: C.accent }]}>✓</Text>
                  </View>
                  <Text style={styles.unlockedLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.exploreBtn} onPress={handleClose}>
              <LinearGradient
                colors={[C.primary, '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.exploreBtnGrad}
              >
                <Text style={styles.exploreBtnText}>Start Designing</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0A0E1A', '#0D1526']} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Helpers for plan cards ──────────────────────────────────────────────────
  const isAnnualPkg = (pkg: PurchasesPackage) =>
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('year') ||
    pkg.identifier.toLowerCase().includes('yearly');

  const ctaLabel = (() => {
    if (!selectedPackage) return 'Select a plan';
    const price = selectedPackage.product.priceString;
    return price ? `Start Free Trial` : 'Subscribe';
  })();

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0E1A', '#0D1526', '#0A1A2E']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative glow orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            {/* App icon / logo */}
            <View style={styles.logoWrap}>
              <LinearGradient
                colors={[C.primary, C.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGrad}
              >
                <Text style={styles.logoIcon}>◈</Text>
              </LinearGradient>
              <View style={styles.logoGlow} />
            </View>

            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>SPACECRAFT PRO</Text>
            </View>

            <Text style={styles.heroTitle}>Design Without Limits</Text>
            <Text style={styles.heroSub}>
              Unlock the full power of SpaceCraft 3D and bring your dream spaces to life.
            </Text>
          </View>

          {/* ── Features ─────────────────────────────────────────────────── */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresCardTitle}>Everything in Pro</Text>
            {FEATURES.map((f, i) => (
              <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}>
                <View style={[styles.featureIconWrap, { backgroundColor: f.color + '22' }]}>
                  <Text style={[styles.featureIconText, { color: f.color }]}>{f.icon}</Text>
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <View style={[styles.checkCircle, { backgroundColor: C.accentMuted }]}>
                  <Text style={[styles.checkMark, { color: C.accent }]}>✓</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Plan cards ───────────────────────────────────────────────── */}
          {packages.length > 0 ? (
            <View style={styles.plansContainer}>
              <Text style={styles.plansTitle}>Choose Your Plan</Text>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isAnnual = isAnnualPkg(pkg);
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => handleSelectPackage(pkg)}
                    activeOpacity={0.85}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[C.primary + '22', C.accent + '11']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {isAnnual && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE · SAVE 17%</Text>
                      </View>
                    )}
                    <View style={styles.planCardInner}>
                      <View style={styles.planLeft}>
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={styles.planName}>
                            {isAnnual ? 'Annual' : 'Monthly'}
                          </Text>
                          {isAnnual && (
                            <Text style={styles.planSavings}>~$8.33 / month</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.planRight}>
                        <Text style={styles.planPrice}>
                          {pkg.product.priceString || (isAnnual ? '$99.99' : '$9.99')}
                        </Text>
                        <Text style={styles.planPeriod}>
                          {isAnnual ? '/ year' : '/ month'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* No packages — Expo Go notice */
            <View style={styles.noPackagesBox}>
              <Text style={styles.noPackagesText}>
                Purchases are not available in standard Expo Go.
              </Text>
              <Text style={[styles.noPackagesText, { marginTop: 6, opacity: 0.65 }]}>
                Use a development or production build to test purchases.
              </Text>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.devMockBtn}
                  onPress={async () => {
                    console.log('[Paywall] Dev simulate purchase');
                    await mockNativePurchase();
                    router.replace('/(tabs)/(projects)');
                  }}
                >
                  <Text style={styles.devMockText}>Dev: Simulate Purchase</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── Dev simulate banner ──────────────────────────────────────────── */}
        {__DEV__ && (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerLabel}>DEV MODE</Text>
            <TouchableOpacity style={styles.devSimulateBtn} onPress={handleSimulatePurchase}>
              <Text style={styles.devSimulateBtnText}>⚡ Simulate Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <View style={styles.bottomBar}>
          {isWeb ? (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, (!selectedPackage || webMockState === 'processing') && styles.ctaBtnDisabled]}
                onPress={handleWebMockPurchase}
                disabled={!selectedPackage || webMockState === 'processing'}
              >
                <LinearGradient
                  colors={webMockState === 'processing' ? [C.surfaceTertiary, C.surfaceTertiary] : [C.primary, '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtnGrad}
                >
                  {webMockState === 'processing' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={C.textSecondary} />
                ) : (
                  <Text style={styles.restoreBtnText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.legalLinkSep}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://spacecraftapp.com/privacy')}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.legalText}>Preview mode — purchases available in the mobile app</Text>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, (!selectedPackage || purchasing) && styles.ctaBtnDisabled]}
                onPress={handlePurchase}
                disabled={!selectedPackage || purchasing}
              >
                <LinearGradient
                  colors={purchasing ? [C.surfaceTertiary, C.surfaceTertiary] : [C.primary, '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtnGrad}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={C.textSecondary} />
                ) : (
                  <Text style={styles.restoreBtnText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>

              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.legalLinkSep}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://spacecraftapp.com/privacy')}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.legalText}>
                Payment charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
                Subscription renews automatically unless cancelled 24 hours before the end of the period.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ── Web mock dialog ───────────────────────────────────────────────── */}
      {isWeb && webMockDialogState !== 'hidden' && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            {webMockDialogState === 'selecting' && (
              <>
                <Text style={styles.dialogTitle}>Test Purchase</Text>
                <Text style={styles.dialogBody}>
                  {`⚠️ Development test only.\n\nPackage: ${selectedPackage?.identifier}\nPrice: ${selectedPackage?.product.priceString || 'N/A'}`}
                </Text>
                <View style={styles.dialogDivider} />
                <TouchableOpacity style={styles.dialogBtn} onPress={() => setWebMockDialogState('failed')}>
                  <Text style={[styles.dialogBtnText, { color: '#EF4444' }]}>Test Failed Purchase</Text>
                </TouchableOpacity>
                <View style={styles.dialogDivider} />
                <TouchableOpacity
                  style={styles.dialogBtn}
                  onPress={() => {
                    setWebMockDialogState('hidden');
                    mockWebPurchase();
                    router.replace('/(tabs)/(projects)');
                  }}
                >
                  <Text style={[styles.dialogBtnText, { color: C.primary }]}>Test Valid Purchase</Text>
                </TouchableOpacity>
                <View style={styles.dialogDivider} />
                <TouchableOpacity style={styles.dialogBtn} onPress={() => setWebMockDialogState('hidden')}>
                  <Text style={[styles.dialogBtnText, { color: C.primary }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {webMockDialogState === 'failed' && (
              <>
                <Text style={styles.dialogTitle}>Purchase Failed</Text>
                <Text style={styles.dialogBody}>Test failure — no real transaction occurred.</Text>
                <View style={styles.dialogDivider} />
                <TouchableOpacity style={styles.dialogBtn} onPress={() => setWebMockDialogState('hidden')}>
                  <Text style={[styles.dialogBtnText, { color: C.primary }]}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
  },
  // Glow orbs
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(79,142,247,0.06)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,212,170,0.05)',
    bottom: 120,
    left: -60,
  },
  // Close button
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: C.textSecondary,
    fontSize: 15,
  },
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  logoGrad: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(79,142,247,0.15)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  logoIcon: {
    fontSize: 36,
    color: '#fff',
  },
  proBadge: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary + '44',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  proBadgeText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSub: {
    color: C.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  // ── Features card ─────────────────────────────────────────────────────────
  featuresCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 24,
  },
  featuresCardTitle: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,244,255,0.05)',
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '800',
  },
  // ── Plans ─────────────────────────────────────────────────────────────────
  plansContainer: {
    gap: 12,
  },
  plansTitle: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: C.primary,
  },
  bestValueBadge: {
    backgroundColor: C.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 10,
  },
  bestValueText: {
    color: '#0A0E1A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: C.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  planName: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  planSavings: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },
  planPeriod: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  // ── No packages ───────────────────────────────────────────────────────────
  noPackagesBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
  },
  noPackagesText: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  devMockBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  devMockText: {
    color: C.textSecondary,
    fontSize: 13,
  },
  // ── Bottom bar ────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,244,255,0.05)',
    backgroundColor: C.bg,
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaBtnGrad: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ctaBtnDisabled: {
    opacity: 0.55,
  },
  restoreBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreBtnText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  legalText: {
    color: C.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    opacity: 0.7,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalLinkSep: {
    color: C.textSecondary,
    fontSize: 12,
  },
  // ── Dev simulate banner ───────────────────────────────────────────────────
  devBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245,158,11,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devBannerLabel: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  devSimulateBtn: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  devSimulateBtnText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Web mock dialog ───────────────────────────────────────────────────────
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialogBox: {
    backgroundColor: '#1C2438',
    borderRadius: 16,
    width: '85%',
    maxWidth: 380,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  dialogTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  dialogBody: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 19,
  },
  dialogDivider: {
    height: 1,
    backgroundColor: 'rgba(240,244,255,0.06)',
  },
  dialogBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  dialogBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // ── Subscribed state ──────────────────────────────────────────────────────
  subscribedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  crownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  crownEmoji: {
    fontSize: 48,
  },
  subscribedTitle: {
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subscribedSub: {
    color: C.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockedCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  unlockedTitle: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockedLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  exploreBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  exploreBtnGrad: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
