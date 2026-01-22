import { ipcMain } from 'electron';
import { getUIState, updateUIState } from '../storage/index.js';
import type { UIPreferences } from '../../shared/types.js';

/**
 * Register UI preference IPC handlers
 */
export function registerUIHandlers(): void {
  // Save UI preferences
  ipcMain.handle(
    'githulu:ui:savePreferences',
    async (_event, prefs: UIPreferences): Promise<void> => {
      const updates: Partial<typeof prefs> = {};
      
      if (prefs.sidebarWidth !== undefined) {
        updates.sidebarWidth = Math.max(200, Math.min(400, prefs.sidebarWidth));
      }
      
      if (prefs.rightPaneWidth !== undefined) {
        updates.rightPaneWidth = Math.max(300, Math.min(600, prefs.rightPaneWidth));
      }
      
      await updateUIState(updates);
    }
  );

  // Load UI preferences
  ipcMain.handle(
    'githulu:ui:loadPreferences',
    async (): Promise<UIPreferences | null> => {
      const uiState = getUIState();
      return {
        sidebarWidth: uiState.sidebarWidth,
        rightPaneWidth: uiState.rightPaneWidth,
      };
    }
  );
}
