import { Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { FloorPlan } from '@/types';

export async function shareProjectAsText(project: FloorPlan): Promise<void> {
  const roomCount = project.rooms.length;
  const furnitureCount = project.rooms.reduce((acc, r) => acc + r.placedItems.length, 0);
  const styleLabel = project.style.charAt(0).toUpperCase() + project.style.slice(1);
  const message =
    `Check out my floor plan design in SpaceCraft 3D! 🏠\n\n` +
    `📐 ${project.name}\n` +
    `🏠 ${roomCount} room${roomCount !== 1 ? 's' : ''} · ${furnitureCount} furniture item${furnitureCount !== 1 ? 's' : ''}\n` +
    `✨ Style: ${styleLabel}\n` +
    `📏 Total area: ${project.totalArea} m²\n\n` +
    `spacecraft3d://project/${project.id}`;

  console.log('[ShareUtils] shareProjectAsText — project:', project.id, project.name);
  try {
    const result = await Share.share({ message, title: project.name });
    console.log('[ShareUtils] shareProjectAsText result:', result.action);
  } catch (err) {
    console.error('[ShareUtils] shareProjectAsText error:', err);
    Alert.alert('Share failed', 'Could not open the share sheet.');
  }
}

export async function copyProjectLink(projectId: string): Promise<void> {
  const link = `spacecraft3d://project/${projectId}`;
  console.log('[ShareUtils] copyProjectLink — projectId:', projectId, 'link:', link);
  try {
    await Clipboard.setStringAsync(link);
    console.log('[ShareUtils] copyProjectLink — copied to clipboard');
  } catch (err) {
    console.error('[ShareUtils] copyProjectLink error:', err);
    Alert.alert('Copy failed', 'Could not copy the link to clipboard.');
  }
}

export async function exportProjectJSON(project: FloorPlan): Promise<void> {
  console.log('[ShareUtils] exportProjectJSON — project:', project.id, project.name);
  try {
    const json = JSON.stringify(project, null, 2);
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_spacecraft3d.json`;
    const result = await Share.share(
      {
        message: json,
        title: fileName,
      },
      { dialogTitle: `Export ${project.name}` }
    );
    console.log('[ShareUtils] exportProjectJSON result:', result.action);
  } catch (err) {
    console.error('[ShareUtils] exportProjectJSON error:', err);
    Alert.alert('Export failed', 'Could not export the project JSON.');
  }
}
