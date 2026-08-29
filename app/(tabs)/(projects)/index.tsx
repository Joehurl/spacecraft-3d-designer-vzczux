import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, MoreHorizontal, Trash2, Copy, Pencil, Share2, ShoppingCart, Ruler, History, Palette } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useHistory } from '@/contexts/HistoryContext';
import { FloorPlan } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_W - 48) / 2;

const STYLES: { id: FloorPlan['style']; label: string; color: string }[] = [
  { id: 'modern', label: 'Modern', color: '#4F8EF7' },
  { id: 'scandinavian', label: 'Scandinavian', color: '#00D4AA' },
  { id: 'industrial', label: 'Industrial', color: '#F59E0B' },
  { id: 'bohemian', label: 'Bohemian', color: '#A78BFA' },
  { id: 'minimalist', label: 'Minimalist', color: '#94A3B8' },
  { id: 'classic', label: 'Classic', color: '#F472B6' },
];

const ROOM_TYPES = [
  { id: 'living', label: 'Living Room', emoji: '🛋️' },
  { id: 'bedroom', label: 'Bedroom', emoji: '🛏️' },
  { id: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { id: 'bathroom', label: 'Bathroom', emoji: '🛁' },
  { id: 'office', label: 'Home Office', emoji: '🖥️' },
  { id: 'dining', label: 'Dining Room', emoji: '🍽️' },
];

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { projects, createProject, deleteProject, duplicateProject, setActiveProject } = useFloorPlan();
  const { getSnapshotsForProject } = useHistory();
  const { user, isLoggedIn } = useUser();

  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<FloorPlan['style']>('modern');
  const [contextProject, setContextProject] = useState<FloorPlan | null>(null);
  const [showContext, setShowContext] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerTranslate]);

  function handleCreateProject() {
    const name = projectName.trim() || 'Untitled Project';
    console.log('[Projects] Create project:', name, selectedStyle);
    const project = createProject(name, selectedStyle);
    setShowCreate(false);
    setProjectName('');
    setActiveProject(project.id);
    router.push(`/editor/${project.id}`);
  }

  function handleOpenProject(project: FloorPlan) {
    console.log('[Projects] Open project:', project.id, project.name);
    setActiveProject(project.id);
    router.push(`/editor/${project.id}`);
  }

  function handleLongPress(project: FloorPlan) {
    console.log('[Projects] Long press project:', project.id);
    setContextProject(project);
    setShowContext(true);
  }

  function handleDelete() {
    if (!contextProject) return;
    console.log('[Projects] Delete project:', contextProject.id);
    deleteProject(contextProject.id);
    setShowContext(false);
    setContextProject(null);
  }

  function handleDuplicate() {
    if (!contextProject) return;
    console.log('[Projects] Duplicate project:', contextProject.id);
    duplicateProject(contextProject.id);
    setShowContext(false);
    setContextProject(null);
  }

  const renderProject = ({ item, index }: { item: FloorPlan; index: number }) => {
    const snaps = getSnapshotsForProject(item.id);
    const version = snaps.length > 0 ? Math.max(...snaps.map(s => s.version)) : 1;
    const versionBadge = 'v' + version;
    return (
      <View style={{ width: CARD_WIDTH }}>
        <ProjectCard
          project={item}
          onPress={() => handleOpenProject(item)}
          onLongPress={() => handleLongPress(item)}
          index={index}
        />
        <View style={styles.versionBadge} pointerEvents="none">
          <Text style={styles.versionBadgeText}>{versionBadge}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <View>
          <Text style={styles.headerTitle}>My Projects</Text>
          <Text style={styles.headerSub}>{projects.length} design{projects.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerRight}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Projects] Account avatar pressed — navigating to account');
              router.push('/account');
            }}
            style={styles.avatarBtn}
          >
            {isLoggedIn && user ? (
              <LinearGradient colors={['#4F8EF7', '#00D4AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarBtnGradient}>
                <Text style={styles.avatarBtnText}>{user.avatar}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.avatarBtnDefault}>
                <Text style={styles.avatarBtnText}>👤</Text>
              </View>
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Projects] Open create sheet');
              setShowCreate(true);
            }}
            style={styles.addBtn}
          >
            <Plus size={22} color="#fff" />
          </AnimatedPressable>
        </View>
      </Animated.View>

      {/* Feature banners row */}
      <View style={styles.bannerRow}>
        {/* AI Designer Banner */}
        <AnimatedPressable
          onPress={() => {
            console.log('[Projects] AI Designer banner pressed');
            router.push('/ai-designer');
          }}
          style={[styles.aiBannerOuter, styles.bannerHalf]}
        >
          <LinearGradient
            colors={['#1a2a4a', '#0d1a30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBanner}
          >
            <View style={styles.aiBannerIconWrap}>
              <Text style={styles.aiBannerIcon}>✨</Text>
            </View>
            <View style={styles.aiBannerInfo}>
              <Text style={styles.aiBannerTitle}>AI Designer</Text>
              <Text style={styles.aiBannerSub}>Describe it, AI builds it</Text>
            </View>
            <View style={styles.aiBannerBtn}>
              <Text style={styles.aiBannerBtnText}>Try →</Text>
            </View>
          </LinearGradient>
        </AnimatedPressable>

        {/* AR View Banner */}
        <AnimatedPressable
          onPress={() => {
            console.log('[Projects] AR View banner pressed');
            router.push('/ar-view');
          }}
          style={[styles.aiBannerOuter, styles.bannerHalf]}
        >
          <LinearGradient
            colors={['#0d2a1a', '#061a10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBanner}
          >
            <View style={[styles.aiBannerIconWrap, { backgroundColor: 'rgba(0,212,170,0.18)' }]}>
              <Text style={styles.aiBannerIcon}>📷</Text>
            </View>
            <View style={styles.aiBannerInfo}>
              <Text style={styles.aiBannerTitle}>AR View</Text>
              <Text style={styles.aiBannerSub}>Place furniture in your room</Text>
            </View>
            <View style={[styles.aiBannerBtn, { backgroundColor: '#00D4AA' }]}>
              <Text style={styles.aiBannerBtnText}>Try →</Text>
            </View>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* Templates Banner */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Projects] Templates banner pressed');
          router.push('/templates');
        }}
        style={styles.templatesBannerOuter}
      >
        <LinearGradient
          colors={['#1a1a3a', '#0d0d2a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.templatesBanner}
        >
          <View style={[styles.aiBannerIconWrap, { backgroundColor: 'rgba(163,139,250,0.2)' }]}>
            <Text style={styles.aiBannerIcon}>📐</Text>
          </View>
          <View style={styles.aiBannerInfo}>
            <Text style={styles.aiBannerTitle}>Room Templates</Text>
            <Text style={styles.aiBannerSub}>50+ pre-built layouts to start from</Text>
          </View>
          <View style={[styles.aiBannerBtn, { backgroundColor: '#A78BFA' }]}>
            <Text style={styles.aiBannerBtnText}>Browse →</Text>
          </View>
        </LinearGradient>
      </AnimatedPressable>

      {/* Content */}
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🏠</Text>
          </View>
          <Text style={styles.emptyTitle}>Design your dream space</Text>
          <Text style={styles.emptySub}>
            Create floor plans and decorate rooms with hundreds of furniture items
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Projects] Start new project from empty state');
              setShowCreate(true);
            }}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Start a new project</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {projects.length > 0 && (
        <AnimatedPressable
          onPress={() => {
            console.log('[Projects] FAB pressed');
            setShowCreate(true);
          }}
          style={[styles.fab, { bottom: insets.bottom + 100 }]}
        >
          <Plus size={26} color="#fff" />
        </AnimatedPressable>
      )}

      {/* Create Project Sheet */}
      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} maxHeight={560}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>New Project</Text>

          <Text style={styles.inputLabel}>Project name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Dream Apartment"
            placeholderTextColor={COLORS.textTertiary}
            value={projectName}
            onChangeText={setProjectName}
            autoFocus
            returnKeyType="done"
          />

          <Text style={styles.inputLabel}>Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
            <View style={styles.styleRow}>
              {STYLES.map(s => (
                <AnimatedPressable
                  key={s.id}
                  onPress={() => {
                    console.log('[Projects] Select style:', s.id);
                    setSelectedStyle(s.id);
                  }}
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

          <Text style={styles.inputLabel}>Start with a room</Text>
          <View style={styles.roomGrid}>
            {ROOM_TYPES.map(rt => (
              <AnimatedPressable
                key={rt.id}
                onPress={() => {
                  console.log('[Projects] Quick start room type:', rt.id);
                  handleCreateProject();
                }}
                style={styles.roomChip}
              >
                <Text style={styles.roomEmoji}>{rt.emoji}</Text>
                <Text style={styles.roomLabel}>{rt.label}</Text>
              </AnimatedPressable>
            ))}
          </View>

          <AnimatedPressable onPress={handleCreateProject} style={styles.createBtn}>
            <Text style={styles.createBtnText}>Create Project</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log('[Projects] Start from template pressed');
              setShowCreate(false);
              router.push('/templates');
            }}
            style={styles.templateBtn}
          >
            <Text style={styles.templateBtnText}>📐 Start from Template</Text>
          </AnimatedPressable>
        </ScrollView>
      </BottomSheet>

      {/* Context Menu */}
      <BottomSheet visible={showContext} onClose={() => setShowContext(false)} maxHeight={380}>
        <View style={styles.contextContent}>
          <Text style={styles.contextTitle} numberOfLines={1}>{contextProject?.name}</Text>

          <AnimatedPressable
            onPress={() => {
              console.log('[Projects] Context: rename');
              setShowContext(false);
            }}
            style={styles.contextItem}
          >
            <Pencil size={20} color={COLORS.text} />
            <Text style={styles.contextItemText}>Rename</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleDuplicate} style={styles.contextItem}>
            <Copy size={20} color={COLORS.text} />
            <Text style={styles.contextItemText}>Duplicate</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              if (!contextProject) return;
              console.log('[Projects] Context: design history for project:', contextProject.id);
              setShowContext(false);
              router.push({ pathname: '/design-history', params: { projectId: contextProject.id } });
            }}
            style={styles.contextItem}
          >
            <History size={20} color={COLORS.primary} />
            <Text style={styles.contextItemText}>Design History</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              if (!contextProject) return;
              console.log('[Projects] Context: measurements for project:', contextProject.id);
              setShowContext(false);
              router.push({ pathname: '/measurements', params: { projectId: contextProject.id } });
            }}
            style={styles.contextItem}
          >
            <Ruler size={20} color={COLORS.primary} />
            <Text style={styles.contextItemText}>Measurements</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              if (!contextProject) return;
              console.log('[Projects] Context: shopping list for project:', contextProject.id);
              setShowContext(false);
              router.push({ pathname: '/shopping-list', params: { projectId: contextProject.id } });
            }}
            style={styles.contextItem}
          >
            <ShoppingCart size={20} color={COLORS.accent} />
            <Text style={styles.contextItemText}>Shopping List</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              if (!contextProject) return;
              console.log('[Projects] Context: share project:', contextProject.id);
              setShowContext(false);
              router.push({ pathname: '/share-design', params: { projectId: contextProject.id } });
            }}
            style={styles.contextItem}
          >
            <Share2 size={20} color={COLORS.text} />
            <Text style={styles.contextItemText}>Share</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              if (!contextProject) return;
              console.log('[Projects] Context: mood board for project:', contextProject.id);
              setShowContext(false);
              router.push({ pathname: '/mood-board', params: { projectId: contextProject.id } });
            }}
            style={styles.contextItem}
          >
            <Palette size={20} color="#A855F7" />
            <Text style={styles.contextItemText}>Mood Board</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleDelete} style={styles.contextItem}>
            <Trash2 size={20} color={COLORS.danger} />
            <Text style={[styles.contextItemText, { color: COLORS.danger }]}>Delete project</Text>
          </AnimatedPressable>
        </View>
      </BottomSheet>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnDefault: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  templatesBannerOuter: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templatesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  bannerHalf: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  aiBannerOuter: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(79,142,247,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerIcon: {
    fontSize: 22,
  },
  aiBannerInfo: {
    flex: 1,
    gap: 2,
  },
  aiBannerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  aiBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  aiBannerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiBannerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 160,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(79,142,247,0.4)',
  },
  // Sheet
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  styleScroll: {
    marginHorizontal: -20,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomEmoji: {
    fontSize: 16,
  },
  roomLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  templateBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  versionBadge: {
    position: 'absolute',
    bottom: 20,
    left: 8,
    backgroundColor: 'rgba(10,14,26,0.82)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  versionBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Context
  contextContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 4,
  },
  contextTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  contextItemText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
});
