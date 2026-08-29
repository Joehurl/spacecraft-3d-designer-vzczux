import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { X, Link2, UserPlus, Mail, Send, Users } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CollaboratorAvatar } from '@/components/CollaboratorAvatar';
import { ActivityFeed, ActivityEntry } from '@/components/ActivityFeed';

// ─── Simulated data ───────────────────────────────────────────────────────────

interface Collaborator {
  id: string;
  name: string;
  color: string;
  status: 'online' | 'away' | 'editing' | 'offline';
  permission: 'edit' | 'view';
}

const MOCK_COLLABORATORS: Collaborator[] = [
  { id: '1', name: 'Alex Chen', color: '#4F8EF7', status: 'editing', permission: 'edit' },
  { id: '2', name: 'Sarah Kim', color: '#00D4AA', status: 'online', permission: 'edit' },
  { id: '3', name: 'Marcus Lee', color: '#A78BFA', status: 'away', permission: 'view' },
];

const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: 'a1', userName: 'Alex Chen', userColor: '#4F8EF7', action: 'Alex added a sofa to Living Room', timestamp: '2m ago' },
  { id: 'a2', userName: 'Sarah Kim', userColor: '#00D4AA', action: 'Sarah moved the dining table', timestamp: '5m ago' },
  { id: 'a3', userName: 'Alex Chen', userColor: '#4F8EF7', action: 'Alex changed the wall color', timestamp: '12m ago' },
  { id: 'a4', userName: 'Marcus Lee', userColor: '#A78BFA', action: 'Marcus joined the project', timestamp: '18m ago' },
  { id: 'a5', userName: 'You', userColor: COLORS.accent, action: 'You created this project', timestamp: '1h ago' },
];

const MOCK_PENDING = [
  { id: 'p1', email: 'jordan@example.com', sentAt: '10m ago' },
];

const MOCK_SHARE_LINK = 'https://spacecraft3d.app/join/abc123xyz';

// ─── Cursor dot component ─────────────────────────────────────────────────────

interface CursorDotProps {
  color: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
}

function CursorDot({ color, name, startX, startY, endX, endY, duration, delay }: CursorDotProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, delay]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [startX, endX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY, endY] });

  return (
    <Animated.View
      style={[
        styles.cursorDot,
        { backgroundColor: color, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Text style={styles.cursorLabel}>{name.split(' ')[0]}</Text>
    </Animated.View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  online: 'Online',
  away: 'Away',
  editing: 'Editing',
  offline: 'Offline',
};

const STATUS_BG: Record<string, string> = {
  online: COLORS.success + '22',
  away: COLORS.warning + '22',
  editing: COLORS.primary + '22',
  offline: COLORS.textTertiary + '22',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  online: COLORS.success,
  away: COLORS.warning,
  editing: COLORS.primary,
  offline: COLORS.textTertiary,
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const bg = STATUS_BG[status] ?? COLORS.textTertiary + '22';
  const textColor = STATUS_TEXT_COLOR[status] ?? COLORS.textTertiary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CollaborateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  const [inviteEmail, setInviteEmail] = useState('');
  const [onlyICanEdit, setOnlyICanEdit] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [pendingInvites, setPendingInvites] = useState(MOCK_PENDING);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCopyLink() {
    console.log('[Collaborate] Copy link pressed — projectId:', projectId);
    await Clipboard.setStringAsync(MOCK_SHARE_LINK);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleSendInvite() {
    const email = inviteEmail.trim();
    console.log('[Collaborate] Send invite pressed — email:', email, 'projectId:', projectId);
    if (!email) return;
    const newPending = { id: Date.now().toString(), email, sentAt: 'just now' };
    setPendingInvites(prev => [newPending, ...prev]);
    setInviteEmail('');
    Alert.alert('Invite sent!', `An invite was sent to ${email}`);
  }

  function handleTogglePermission(id: string) {
    console.log('[Collaborate] Toggle permission for collaborator:', id);
    setCollaborators(prev =>
      prev.map(c =>
        c.id === id ? { ...c, permission: c.permission === 'edit' ? 'view' : 'edit' } : c
      )
    );
  }

  function handleOnlyICanEditToggle(value: boolean) {
    console.log('[Collaborate] Only I can edit toggle:', value);
    setOnlyICanEdit(value);
  }

  function handleInviteMore() {
    console.log('[Collaborate] Invite more pressed');
  }

  function handleShareLink() {
    console.log('[Collaborate] Share link header button pressed — projectId:', projectId);
    handleCopyLink();
  }

  const onlineCount = collaborators.filter(c => c.status !== 'offline').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Collaborate] Close pressed');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>

        <Text style={styles.headerTitle}>👥 Collaborate</Text>

        <AnimatedPressable onPress={handleShareLink} style={styles.shareLinkBtn}>
          <Link2 size={15} color={COLORS.primary} />
          <Text style={styles.shareLinkText}>{linkCopied ? 'Copied!' : 'Share Link'}</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live cursor preview card */}
        <LinearGradient
          colors={['#131929', '#0d1a30']}
          style={styles.previewCard}
        >
          <View style={styles.previewFloorPlan}>
            {/* Floor plan grid lines */}
            <View style={styles.fpGrid} />
            {/* Animated cursors */}
            <CursorDot color="#4F8EF7" name="Alex Chen" startX={20} startY={30} endX={80} endY={60} duration={2800} delay={0} />
            <CursorDot color="#00D4AA" name="Sarah Kim" startX={100} startY={20} endX={50} endY={80} duration={3200} delay={600} />
            <CursorDot color="#A78BFA" name="Marcus Lee" startX={60} startY={70} endX={120} endY={30} duration={2500} delay={1200} />
          </View>
          <View style={styles.previewFooter}>
            <View style={styles.previewDot} />
            <Text style={styles.previewLabel}>Live preview — {onlineCount} people editing</Text>
          </View>
        </LinearGradient>

        {/* Active collaborators */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Active Collaborators" icon={<Users size={15} color={COLORS.textSecondary} />} />
            <AnimatedPressable onPress={handleInviteMore} style={styles.inviteMoreBtn}>
              <UserPlus size={14} color={COLORS.primary} />
              <Text style={styles.inviteMoreText}>Invite more</Text>
            </AnimatedPressable>
          </View>

          {collaborators.map(c => (
            <View key={c.id} style={styles.collaboratorRow}>
              <CollaboratorAvatar name={c.name} color={c.color} size={40} status={c.status} showStatus />
              <View style={styles.collaboratorInfo}>
                <Text style={styles.collaboratorName}>{c.name}</Text>
                <StatusBadge status={c.status} />
              </View>
              <AnimatedPressable
                onPress={() => handleTogglePermission(c.id)}
                style={[
                  styles.permissionBtn,
                  c.permission === 'edit' ? styles.permissionEdit : styles.permissionView,
                ]}
              >
                <Text
                  style={[
                    styles.permissionText,
                    { color: c.permission === 'edit' ? COLORS.primary : COLORS.textSecondary },
                  ]}
                >
                  {c.permission === 'edit' ? 'Can Edit' : 'Can View'}
                </Text>
              </AnimatedPressable>
            </View>
          ))}
        </View>

        {/* Permissions master toggle */}
        <View style={styles.section}>
          <SectionHeader title="Permissions" />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Only I can edit</Text>
              <Text style={styles.toggleSub}>Collaborators can view but not make changes</Text>
            </View>
            <Switch
              value={onlyICanEdit}
              onValueChange={handleOnlyICanEditToggle}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Invite section */}
        <View style={styles.section}>
          <SectionHeader title="Invite People" icon={<Mail size={15} color={COLORS.textSecondary} />} />

          <View style={styles.inviteRow}>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textTertiary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="send"
              onSubmitEditing={handleSendInvite}
            />
            <AnimatedPressable onPress={handleSendInvite} style={styles.sendBtn}>
              <Send size={16} color="#fff" />
            </AnimatedPressable>
          </View>

          <AnimatedPressable onPress={handleCopyLink} style={styles.copyLinkBtn}>
            <Link2 size={16} color={COLORS.primary} />
            <Text style={styles.copyLinkText}>{linkCopied ? '✓ Link Copied!' : 'Copy Invite Link'}</Text>
          </AnimatedPressable>

          {pendingInvites.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingLabel}>Pending Invites</Text>
              {pendingInvites.map(p => (
                <View key={p.id} style={styles.pendingRow}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingEmail}>{p.email}</Text>
                  <Text style={styles.pendingTime}>{p.sentAt}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Activity feed */}
        <View style={styles.section}>
          <SectionHeader title="Live Activity" />
          <ActivityFeed entries={MOCK_ACTIVITY} maxHeight={260} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  shareLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  // Preview card
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewFloorPlan: {
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  fpGrid: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1,
    borderColor: COLORS.divider,
    margin: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceTertiary + '80',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  previewLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  // Cursor dots
  cursorDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  cursorLabel: {
    position: 'absolute',
    top: 12,
    left: 0,
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: COLORS.surface + 'CC',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Sections
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Collaborator row
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collaboratorInfo: {
    flex: 1,
    gap: 4,
  },
  collaboratorName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  permissionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  permissionEdit: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary + '40',
  },
  permissionView: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.border,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Invite more
  inviteMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  inviteMoreText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Permissions toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  toggleSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  // Invite
  inviteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Pending
  pendingSection: {
    gap: 8,
  },
  pendingLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  pendingEmail: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  pendingTime: {
    color: COLORS.textTertiary,
    fontSize: 11,
  },
});
