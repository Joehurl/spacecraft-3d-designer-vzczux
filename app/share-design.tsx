import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoomPreview } from '@/components/RoomPreview';
import { exportProjectJSON } from '@/utils/shareUtils';

const STYLE_COLORS: Record<string, string> = {
  modern: '#4F8EF7',
  scandinavian: '#00D4AA',
  industrial: '#F59E0B',
  bohemian: '#A78BFA',
  minimalist: '#94A3B8',
  classic: '#F472B6',
};

const MAX_MESSAGE_LENGTH = 200;

export default function ShareDesignScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();

  const project = projects.find(p => p.id === projectId);

  const previewRef = useRef<View>(null);
  const [message, setMessage] = useState(
    'Check out my floor plan design in SpaceCraft 3D! 🏠'
  );
  const [savingImage, setSavingImage] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [exportingJSON, setExportingJSON] = useState(false);

  const roomCount = project?.rooms.length ?? 0;
  const furnitureCount = project?.rooms.reduce((acc, r) => acc + r.placedItems.length, 0) ?? 0;
  const styleLabel = project
    ? project.style.charAt(0).toUpperCase() + project.style.slice(1)
    : '';
  const styleColor = project ? (STYLE_COLORS[project.style] ?? COLORS.primary) : COLORS.primary;
  const messageLength = message.length;

  const capturePreview = useCallback(async (): Promise<string | null> => {
    if (!previewRef.current) {
      console.log('[ShareDesign] capturePreview — previewRef not ready');
      return null;
    }
    try {
      console.log('[ShareDesign] capturePreview — capturing view');
      const uri = await captureRef(previewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('[ShareDesign] capturePreview — captured uri:', uri);
      return uri;
    } catch (err) {
      console.error('[ShareDesign] capturePreview error:', err);
      return null;
    }
  }, []);

  const handleSaveImage = useCallback(async () => {
    console.log('[ShareDesign] Save as Image pressed — project:', projectId);
    setSavingImage(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log('[ShareDesign] Media library permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library to save images.');
        return;
      }
      const uri = await capturePreview();
      if (!uri) {
        Alert.alert('Capture failed', 'Could not capture the preview. Please try again.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      console.log('[ShareDesign] Image saved to camera roll');
      Alert.alert('Saved!', 'Your floor plan has been saved to your photo library.');
    } catch (err) {
      console.error('[ShareDesign] handleSaveImage error:', err);
      Alert.alert('Save failed', 'Could not save the image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  }, [projectId, capturePreview]);

  const handleShareImage = useCallback(async () => {
    console.log('[ShareDesign] Share Image pressed — project:', projectId);
    setSharingImage(true);
    try {
      const uri = await capturePreview();
      if (!uri) {
        // Fallback to text share
        console.log('[ShareDesign] handleShareImage — falling back to text share');
        await Share.share({ message, title: project?.name ?? 'SpaceCraft 3D Design' });
        return;
      }
      const result = await Share.share(
        { url: uri, message, title: project?.name ?? 'SpaceCraft 3D Design' },
        { dialogTitle: 'Share your floor plan' }
      );
      console.log('[ShareDesign] handleShareImage result:', result.action);
    } catch (err) {
      console.error('[ShareDesign] handleShareImage error:', err);
      Alert.alert('Share failed', 'Could not open the share sheet.');
    } finally {
      setSharingImage(false);
    }
  }, [projectId, capturePreview, message, project]);

  const handleCopyLink = useCallback(async () => {
    console.log('[ShareDesign] Copy Link pressed — project:', projectId);
    setCopyingLink(true);
    try {
      const link = `spacecraft3d://project/${projectId}`;
      await Clipboard.setStringAsync(link);
      console.log('[ShareDesign] handleCopyLink — copied:', link);
      Alert.alert('Copied!', 'The shareable link has been copied to your clipboard.');
    } catch (err) {
      console.error('[ShareDesign] handleCopyLink error:', err);
      Alert.alert('Copy failed', 'Could not copy the link to clipboard.');
    } finally {
      setCopyingLink(false);
    }
  }, [projectId]);

  const handleExportJSON = useCallback(async () => {
    console.log('[ShareDesign] Export JSON pressed — project:', projectId);
    if (!project) return;
    setExportingJSON(true);
    try {
      await exportProjectJSON(project);
    } finally {
      setExportingJSON(false);
    }
  }, [project, projectId]);

  const handleShareNow = useCallback(() => {
    console.log('[ShareDesign] Share Now pressed — project:', projectId);
    handleShareImage();
  }, [handleShareImage, projectId]);

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Design</Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[ShareDesign] Close pressed');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Card */}
        <View ref={previewRef} collapsable={false} style={styles.previewCard}>
          {/* Floor plan preview */}
          <View style={styles.previewSvgWrap}>
            <RoomPreview project={project} width={320} height={200} />
          </View>

          {/* Overlay info */}
          <View style={styles.previewOverlay}>
            {/* Style badge */}
            <View style={[styles.styleBadge, { backgroundColor: styleColor + '22', borderColor: styleColor + '55' }]}>
              <View style={[styles.styleDot, { backgroundColor: styleColor }]} />
              <Text style={[styles.styleBadgeText, { color: styleColor }]}>{styleLabel}</Text>
            </View>
          </View>

          {/* Project info */}
          <View style={styles.previewInfo}>
            <Text style={styles.previewName} numberOfLines={2}>{project.name}</Text>
            <View style={styles.previewStats}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{roomCount}</Text>
                <Text style={styles.statLabel}>{roomCount === 1 ? 'Room' : 'Rooms'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{furnitureCount}</Text>
                <Text style={styles.statLabel}>{furnitureCount === 1 ? 'Item' : 'Items'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{project.totalArea}</Text>
                <Text style={styles.statLabel}>m²</Text>
              </View>
            </View>
          </View>

          {/* Watermark */}
          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>SpaceCraft 3D</Text>
          </View>
        </View>

        {/* Export Options */}
        <Text style={styles.sectionTitle}>Export Options</Text>
        <View style={styles.optionsGrid}>
          <AnimatedPressable
            onPress={handleSaveImage}
            style={styles.optionCard}
            disabled={savingImage}
          >
            {savingImage ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.optionEmoji}>📸</Text>
            )}
            <Text style={styles.optionTitle}>Save as Image</Text>
            <Text style={styles.optionSub}>PNG · High quality</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleShareImage}
            style={styles.optionCard}
            disabled={sharingImage}
          >
            {sharingImage ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Text style={styles.optionEmoji}>📤</Text>
            )}
            <Text style={styles.optionTitle}>Share Image</Text>
            <Text style={styles.optionSub}>Send to apps</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleCopyLink}
            style={styles.optionCard}
            disabled={copyingLink}
          >
            {copyingLink ? (
              <ActivityIndicator size="small" color={COLORS.warning} />
            ) : (
              <Text style={styles.optionEmoji}>📋</Text>
            )}
            <Text style={styles.optionTitle}>Copy Link</Text>
            <Text style={styles.optionSub}>Shareable link</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleExportJSON}
            style={styles.optionCard}
            disabled={exportingJSON}
          >
            {exportingJSON ? (
              <ActivityIndicator size="small" color={COLORS.success} />
            ) : (
              <Text style={styles.optionEmoji}>📄</Text>
            )}
            <Text style={styles.optionTitle}>Export JSON</Text>
            <Text style={styles.optionSub}>Backup file</Text>
          </AnimatedPressable>
        </View>

        {/* Share Message */}
        <Text style={styles.sectionTitle}>Share Message</Text>
        <View style={styles.messageWrap}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={(text) => {
              if (text.length <= MAX_MESSAGE_LENGTH) {
                setMessage(text);
              }
            }}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.textTertiary}
            placeholder="Add a message..."
          />
          <Text style={styles.charCount}>
            {messageLength}
            <Text style={styles.charCountMax}>/{MAX_MESSAGE_LENGTH}</Text>
          </Text>
        </View>

        {/* Share Now CTA */}
        <AnimatedPressable onPress={handleShareNow} style={styles.ctaWrap} disabled={sharingImage}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {sharingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Share2 size={20} color="#fff" />
            )}
            <Text style={styles.ctaText}>Share Now</Text>
          </LinearGradient>
        </AnimatedPressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  // Preview card
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewSvgWrap: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  styleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  styleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  styleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewInfo: {
    padding: 16,
    gap: 10,
  },
  previewName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statChip: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.divider,
  },
  watermark: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  watermarkText: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Section
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  // Options grid
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 6,
    alignItems: 'flex-start',
  },
  optionEmoji: {
    fontSize: 26,
  },
  optionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  optionSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // Message
  messageWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  messageInput: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  charCountMax: {
    color: COLORS.textTertiary,
  },
  // CTA
  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
