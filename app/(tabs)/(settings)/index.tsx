import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Animated,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  Ruler,
  Grid3X3,
  Save,
  Moon,
  Eye,
  Download,
  Upload,
  Trash2,
  Star,
  Shield,
  FileText,
  ChevronRight,
  Palette,
  ShoppingCart,
  Cloud,
  UserCircle,
  History,
  MessageCircle,
  Heart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/contexts/UserContext';

type Unit = 'metric' | 'imperial';
type GridSize = '10' | '20' | '50';
type ThemeMode = 'system' | 'light' | 'dark';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { projects } = useFloorPlan();
  const { isSubscribed } = useSubscription();
  const { user, isLoggedIn } = useUser();

  const [unit, setUnit] = useState<Unit>('metric');
  const [gridSize, setGridSize] = useState<GridSize>('20');
  const [autoSave, setAutoSave] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 120, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, contentOpacity]);

  const appVersion = Constants.expoConfig?.version ?? '1.0.3';

  const totalRooms = projects.reduce((sum, p) => sum + p.rooms.length, 0);
  const totalFurniture = projects.reduce((sum, p) =>
    sum + p.rooms.reduce((rs, r) => rs + r.placedItems.length, 0), 0
  );

  const displayName = isLoggedIn && user ? user.name : 'SpaceCraft Designer';
  const displaySub = isLoggedIn && user ? user.email : 'Sign in to sync your designs';
  const initials = isLoggedIn && user ? user.avatar : 'SC';
  const projectCount = String(projects.length);
  const roomCount = String(totalRooms);
  const furnitureCount = String(totalFurniture);

  function handleClearData() {
    console.log('[Settings] Clear all data pressed');
    Alert.alert(
      'Clear all data?',
      'This will permanently delete all your projects and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => console.log('[Settings] Confirmed clear data'),
        },
      ]
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </Animated.View>

      <Animated.View style={{ opacity: contentOpacity }}>

      {/* SpaceCraft Pro Banner — shown only when not subscribed */}
      {!isSubscribed && (
        <AnimatedPressable
          onPress={() => {
            console.log('[Settings] SpaceCraft Pro banner pressed');
            router.push('/paywall');
          }}
          style={styles.proBannerWrap}
        >
          <LinearGradient
            colors={['#1A2540', '#0F1E38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proBanner}
          >
            <View style={styles.proBannerLeft}>
              <View style={styles.proCrownWrap}>
                <Text style={styles.proCrown}>👑</Text>
              </View>
              <View>
                <Text style={styles.proBannerTitle}>SpaceCraft Pro</Text>
                <Text style={styles.proBannerSub}>Unlock 3D View, unlimited projects & more</Text>
              </View>
            </View>
            <View style={styles.proUpgradeBtn}>
              <Text style={styles.proUpgradeBtnText}>Upgrade</Text>
            </View>
          </LinearGradient>
        </AnimatedPressable>
      )}

      {/* Profile Card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Settings] Profile card pressed — navigating to account');
          router.push('/account');
        }}
        style={styles.profileCard}
      >
        <View style={styles.profileCardInner}>
          <LinearGradient
            colors={['#4F8EF7', '#00D4AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileSub}>{displaySub}</Text>
          </View>
          {!isLoggedIn && (
            <View style={styles.signInCta}>
              <Text style={styles.signInCtaText}>Sign in →</Text>
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{projectCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{roomCount}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{furnitureCount}</Text>
            <Text style={styles.statLabel}>Furniture</Text>
          </View>
        </View>
      </AnimatedPressable>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Ruler size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Default unit</Text>
                <Text style={styles.settingDesc}>Measurements display</Text>
              </View>
            </View>
            <View style={styles.segmented}>
              {(['metric', 'imperial'] as Unit[]).map(u => (
                <AnimatedPressable
                  key={u}
                  onPress={() => {
                    console.log('[Settings] Unit:', u);
                    setUnit(u);
                  }}
                  style={[styles.segBtn, unit === u && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, unit === u && styles.segBtnTextActive]}>
                    {u === 'metric' ? 'cm' : 'ft'}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <Grid3X3 size={18} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Grid size</Text>
                <Text style={styles.settingDesc}>Snap resolution</Text>
              </View>
            </View>
            <View style={styles.segmented}>
              {(['10', '20', '50'] as GridSize[]).map(g => (
                <AnimatedPressable
                  key={g}
                  onPress={() => {
                    console.log('[Settings] Grid size:', g);
                    setGridSize(g);
                  }}
                  style={[styles.segBtn, gridSize === g && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, gridSize === g && styles.segBtnTextActive]}>
                    {g}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.success + '22' }]}>
                <Save size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Auto-save</Text>
                <Text style={styles.settingDesc}>Save changes automatically</Text>
              </View>
            </View>
            <Switch
              value={autoSave}
              onValueChange={v => {
                console.log('[Settings] Auto-save:', v);
                setAutoSave(v);
              }}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.warning + '22' }]}>
                <Palette size={18} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Default wall color</Text>
                <Text style={styles.settingDesc}>New room default</Text>
              </View>
            </View>
            <View style={styles.colorSwatch} />
          </View>
        </View>
      </View>

      {/* Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Moon size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingDesc}>App appearance</Text>
              </View>
            </View>
            <View style={styles.segmented}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map(t => (
                <AnimatedPressable
                  key={t}
                  onPress={() => {
                    console.log('[Settings] Theme:', t);
                    setThemeMode(t);
                  }}
                  style={[styles.segBtn, themeMode === t && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, themeMode === t && styles.segBtnTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Show dimensions row pressed — navigating to measurements');
              const firstProject = projects[0];
              if (firstProject) {
                router.push({ pathname: '/measurements', params: { projectId: firstProject.id } });
              } else {
                Alert.alert('No projects', 'Create a project first to view measurements.');
              }
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <Eye size={18} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Show dimensions</Text>
                <Text style={styles.settingDesc}>View measurements & cost estimator</Text>
              </View>
            </View>
            <View style={styles.settingRowRight}>
              <Switch
                value={showDimensions}
                onValueChange={v => {
                  console.log('[Settings] Show dimensions toggle:', v);
                  setShowDimensions(v);
                }}
                trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
                thumbColor="#fff"
              />
              <ChevronRight size={16} color={COLORS.textTertiary} />
            </View>
          </AnimatedPressable>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Grid3X3 size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Show grid</Text>
            </View>
            <Switch
              value={showGrid}
              onValueChange={v => {
                console.log('[Settings] Show grid:', v);
                setShowGrid(v);
              }}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.success + '22' }]}>
                <Grid3X3 size={18} color={COLORS.success} />
              </View>
              <Text style={styles.settingLabel}>Snap to grid</Text>
            </View>
            <Switch
              value={snapToGrid}
              onValueChange={v => {
                console.log('[Settings] Snap to grid:', v);
                setSnapToGrid(v);
              }}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <View style={styles.card}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Cloud Sync pressed — navigating to account');
              router.push('/account');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Cloud size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Cloud Sync</Text>
                <Text style={styles.settingDesc}>{isLoggedIn ? 'Manage sync settings' : 'Sign in to enable'}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Shopping List pressed');
              router.push('/shopping-list');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <ShoppingCart size={18} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Shopping List</Text>
                <Text style={styles.settingDesc}>Generate buy list from designs</Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Wishlist pressed');
              router.push('/wishlist');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.danger + '22' }]}>
                <Heart size={18} color={COLORS.danger} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Wishlist</Text>
                <Text style={styles.settingDesc}>View your saved furniture items</Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Design History pressed');
              const firstProject = projects[0];
              if (firstProject) {
                router.push({ pathname: '/design-history', params: { projectId: firstProject.id } });
              } else {
                Alert.alert('No projects', 'Create a project first to view its history.');
              }
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <History size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Design History</Text>
                <Text style={styles.settingDesc}>Browse & restore past versions</Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => console.log('[Settings] Export projects')}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Download size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Export all projects</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => console.log('[Settings] Import projects')}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <Upload size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.settingLabel}>Import projects</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable onPress={handleClearData} style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.danger + '22' }]}>
                <Trash2 size={18} color={COLORS.danger} />
              </View>
              <Text style={[styles.settingLabel, { color: COLORS.danger }]}>Clear all data</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>App version</Text>
            </View>
            <Text style={styles.settingValue}>{appVersion}</Text>
          </View>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id6741960498'
                : 'https://play.google.com/store/apps/details?id=com.spacecraftdesigner.app';
              console.log('[Settings] Rate app pressed — opening:', url);
              Linking.openURL(url);
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.warning + '22' }]}>
                <Star size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.settingLabel}>Rate SpaceCraft 3D</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Contact support pressed');
              Linking.openURL('mailto:support@spacecraft3d.app');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.success + '22' }]}>
                <MessageCircle size={18} color={COLORS.success} />
              </View>
              <Text style={styles.settingLabel}>Contact Support</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Privacy policy pressed — opening URL');
              Linking.openURL('https://spacecraft3d.app/privacy');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.primary + '22' }]}>
                <Shield size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Terms of service pressed — opening URL');
              Linking.openURL('https://spacecraft3d.app/terms');
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <FileText size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>

          <View style={styles.divider} />

          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Manage subscription pressed');
              const url = Platform.OS === 'android'
                ? 'https://play.google.com/store/account/subscriptions'
                : 'https://apps.apple.com/account/subscriptions';
              Linking.openURL(url);
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: COLORS.accent + '22' }]}>
                <Text style={styles.settingIconEmoji}>👑</Text>
              </View>
              <Text style={styles.settingLabel}>Manage Subscription</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </AnimatedPressable>
        </View>
      </View>

      <Text style={styles.footer}>SpaceCraft 3D · Made with ❤️</Text>
      </Animated.View>
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
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  profileSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  signInCta: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signInCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 10,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  settingDesc: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  settingValue: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segBtnTextActive: {
    color: '#fff',
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingIconEmoji: {
    fontSize: 18,
  },
  footer: {
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Pro banner
  proBannerWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  proBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  proCrownWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(79,142,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCrown: {
    fontSize: 22,
  },
  proBannerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  proBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  proUpgradeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  proUpgradeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
