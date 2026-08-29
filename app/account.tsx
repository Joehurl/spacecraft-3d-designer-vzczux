import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Cloud, Smartphone, Plus, RefreshCw, LogOut, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

function formatSyncTime(isoString: string | null): string {
  if (!isoString) return 'Never synced';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

// ─── Sign-In Screen ───────────────────────────────────────────────────────────

function SignInScreen() {
  const router = useRouter();
  const { login } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  async function handleEmailLogin() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Missing info', 'Please enter your name and email.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    console.log('[Account] Continue with email pressed:', trimmedEmail);
    setLoading(true);
    try {
      await login(trimmedName, trimmedEmail);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function handleSocialPress(provider: string) {
    console.log('[Account] Social sign-in pressed:', provider);
    Alert.alert(`${provider} sign-in`, 'Social sign-in coming soon — use email for now.');
  }

  function handleSkip() {
    console.log('[Account] Skip for now pressed');
    router.back();
  }

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      contentContainerStyle={styles.signInContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Close button */}
      <AnimatedPressable onPress={() => { console.log('[Account] Close pressed'); router.back(); }} style={styles.closeBtn}>
        <X size={20} color={COLORS.textSecondary} />
      </AnimatedPressable>

      {/* Logo */}
      <View style={styles.logoWrap}>
        <LinearGradient colors={['#4F8EF7', '#00D4AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoGradient}>
          <Text style={styles.logoEmoji}>🏠</Text>
        </LinearGradient>
        <Text style={styles.logoTitle}>SpaceCraft 3D</Text>
        <Text style={styles.logoSub}>Sign in to sync your designs{'\n'}across all your devices</Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={COLORS.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={COLORS.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleEmailLogin}
        />
      </View>

      {/* Email CTA */}
      <AnimatedPressable onPress={handleEmailLogin} style={styles.emailBtnWrap}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emailBtn}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.emailBtnText}>Continue with Email</Text>
          )}
        </LinearGradient>
      </AnimatedPressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social buttons */}
      <AnimatedPressable onPress={() => handleSocialPress('Apple')} style={styles.socialBtn}>
        <Text style={styles.socialBtnIcon}>🍎</Text>
        <Text style={styles.socialBtnText}>Continue with Apple</Text>
      </AnimatedPressable>

      <AnimatedPressable onPress={() => handleSocialPress('Google')} style={[styles.socialBtn, styles.socialBtnLight]}>
        <Text style={styles.socialBtnIcon}>G</Text>
        <Text style={[styles.socialBtnText, { color: '#1A1A1A' }]}>Continue with Google</Text>
      </AnimatedPressable>

      {/* Skip */}
      <AnimatedPressable onPress={handleSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip for now</Text>
      </AnimatedPressable>
    </Animated.ScrollView>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, syncProjects, isSyncing, lastSyncAt } = useUser();
  const { projects } = useFloorPlan();
  const { isSubscribed } = useSubscription();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? '');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  if (!user) return null;

  const totalRooms = projects.reduce((sum, p) => sum + p.rooms.length, 0);
  const totalFurniture = projects.reduce((sum, p) =>
    sum + p.rooms.reduce((rs, r) => rs + r.placedItems.length, 0), 0
  );

  const projectCountStr = String(projects.length);
  const roomCountStr = String(totalRooms);
  const furnitureCountStr = String(totalFurniture);
  const syncPlatform = Platform.OS === 'ios' ? 'iCloud Drive' : 'Google Drive';
  const deviceName = Platform.OS === 'ios' ? 'iPhone 15 Pro' : 'Pixel 8';
  const syncTimeText = formatSyncTime(lastSyncAt);
  const planLabel = isSubscribed ? 'PRO ✨' : 'FREE';
  const joinYear = new Date(user.joinedAt).getFullYear();
  const memberSince = `Member since ${joinYear}`;

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    console.log('[Account] Save name:', trimmed);
    await updateProfile({ name: trimmed, avatar: trimmed.slice(0, 2).toUpperCase() });
    setEditingName(false);
  }

  async function handleSyncToggle(val: boolean) {
    console.log('[Account] Sync toggle:', val);
    await updateProfile({ syncEnabled: val });
  }

  async function handleSyncNow() {
    console.log('[Account] Sync Now pressed');
    await syncProjects();
  }

  function handleSignOut() {
    console.log('[Account] Sign Out pressed');
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Account] Confirmed sign out');
          await logout();
          router.back();
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    console.log('[Account] Delete Account pressed');
    Alert.alert(
      'Delete account?',
      'This will permanently remove your profile. Your local projects will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[Account] Confirmed delete account');
            await logout();
            router.back();
          },
        },
      ]
    );
  }

  function handleAddDevice() {
    console.log('[Account] Add another device pressed');
    Alert.alert('Add device', 'Sign in with the same email on your other device to sync automatically.');
  }

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      contentContainerStyle={[styles.profileContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.profileHeader, { paddingTop: 16 }]}>
        <AnimatedPressable onPress={() => { console.log('[Account] Close pressed'); router.back(); }} style={styles.closeBtn}>
          <X size={20} color={COLORS.textSecondary} />
        </AnimatedPressable>
        <Text style={styles.screenTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Avatar + Name */}
      <View style={styles.avatarSection}>
        <LinearGradient colors={['#4F8EF7', '#00D4AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{user.avatar}</Text>
        </LinearGradient>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              onBlur={handleSaveName}
            />
          </View>
        ) : (
          <AnimatedPressable onPress={() => { console.log('[Account] Edit name pressed'); setEditingName(true); }}>
            <Text style={styles.profileName}>{user.name}</Text>
          </AnimatedPressable>
        )}

        <Text style={styles.profileEmail}>{user.email}</Text>

        <View style={[styles.planBadge, isSubscribed && styles.planBadgePro]}>
          {isSubscribed ? (
            <LinearGradient colors={[COLORS.accent, '#00A88A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.planBadgeGradient}>
              <Text style={styles.planBadgeText}>{planLabel}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.planBadgeText}>{planLabel}</Text>
          )}
        </View>

        <Text style={styles.memberSince}>{memberSince}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{projectCountStr}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{roomCountStr}</Text>
          <Text style={styles.statLabel}>Rooms</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{furnitureCountStr}</Text>
          <Text style={styles.statLabel}>Furniture</Text>
        </View>
      </View>

      {/* Cloud Sync Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>
        <View style={styles.card}>
          {/* Toggle row */}
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.primary + '22' }]}>
                <Cloud size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.cardRowLabel}>{syncPlatform}</Text>
                <Text style={styles.cardRowSub}>{syncTimeText}</Text>
              </View>
            </View>
            <Switch
              value={user.syncEnabled}
              onValueChange={handleSyncToggle}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.rowDivider} />

          {/* Sync Now */}
          <AnimatedPressable onPress={handleSyncNow} style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.accent + '22' }]}>
                {isSyncing ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <RefreshCw size={18} color={COLORS.accent} />
                )}
              </View>
              <Text style={styles.cardRowLabel}>{isSyncing ? 'Syncing…' : 'Sync Now'}</Text>
            </View>
            {!isSyncing && <ChevronRight size={18} color={COLORS.textTertiary} />}
          </AnimatedPressable>

          <View style={styles.rowDivider} />

          {/* Storage */}
          <View style={styles.storageRow}>
            <View style={styles.storageHeader}>
              <Text style={styles.cardRowLabel}>Storage used</Text>
              <Text style={styles.storageAmount}>2.4 MB of 5 GB</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '0.05%' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Devices Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Devices</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.success + '22' }]}>
                <Smartphone size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.cardRowLabel}>{deviceName}</Text>
                <Text style={styles.cardRowSub}>This device · Active now</Text>
              </View>
            </View>
            <View style={styles.thisDeviceBadge}>
              <Text style={styles.thisDeviceText}>This device</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <AnimatedPressable onPress={handleAddDevice} style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.textTertiary + '22' }]}>
                <Plus size={18} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.cardRowLabel}>Add another device</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.card}>
          <AnimatedPressable onPress={handleSignOut} style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.danger + '22' }]}>
                <LogOut size={18} color={COLORS.danger} />
              </View>
              <Text style={[styles.cardRowLabel, { color: COLORS.danger }]}>Sign Out</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.rowDivider} />

          <AnimatedPressable onPress={handleDeleteAccount} style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: COLORS.danger + '11' }]}>
                <Trash2 size={18} color={COLORS.danger} />
              </View>
              <Text style={[styles.cardRowLabel, { color: COLORS.danger, fontSize: 13 }]}>Delete Account</Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { isLoggedIn } = useUser();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {isLoggedIn ? <ProfileScreen /> : <SignInScreen />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Sign-in
  signInContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 36,
    gap: 12,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoSub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailBtnWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  emailBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  emailBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialBtnLight: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  socialBtnIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  socialBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // Profile
  profileContent: {
    paddingHorizontal: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  nameEditRow: {
    width: '60%',
  },
  nameInput: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileEmail: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  planBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceTertiary,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  planBadgePro: {
    backgroundColor: 'transparent',
  },
  planBadgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  planBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberSince: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },

  // Shared card
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  cardRowSub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },
  storageRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageAmount: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    minWidth: 8,
  },
  thisDeviceBadge: {
    backgroundColor: COLORS.success + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  thisDeviceText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
  },
});
