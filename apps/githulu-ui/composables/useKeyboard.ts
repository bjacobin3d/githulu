/**
 * Composable for keyboard shortcuts
 */

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboard() {
  const shortcuts: ShortcutConfig[] = [];

  function registerShortcut(config: ShortcutConfig) {
    shortcuts.push(config);
  }

  function handleKeydown(event: KeyboardEvent) {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return {
    registerShortcut,
    shortcuts,
  };
}

/**
 * Common keyboard shortcuts for the app
 */
export function useAppKeyboardShortcuts() {
  const reposStore = useReposStore();
  const gitStore = useGitStore();
  const uiStore = useUIStore();
  const keyboard = useKeyboard();
  const { registerShortcut } = keyboard;

  // Cmd+R - Refresh status
  registerShortcut({
    key: 'r',
    meta: true,
    handler: () => {
      const selectedRepo = reposStore.selectedRepo;
      if (selectedRepo) {
        gitStore.refreshStatus(selectedRepo.id);
      }
    },
    description: 'Refresh status',
  });

  // Cmd+Shift+F - Fetch
  registerShortcut({
    key: 'f',
    meta: true,
    shift: true,
    handler: () => {
      const selectedRepo = reposStore.selectedRepo;
      if (selectedRepo) {
        gitStore.fetch(selectedRepo.id);
      }
    },
    description: 'Fetch from remote',
  });

  // Cmd+Shift+P - Push
  registerShortcut({
    key: 'p',
    meta: true,
    shift: true,
    handler: () => {
      const selectedRepo = reposStore.selectedRepo;
      const status = selectedRepo ? gitStore.getStatus(selectedRepo.id) : null;
      if (selectedRepo && status?.branch) {
        gitStore.push(selectedRepo.id, status.branch);
      }
    },
    description: 'Push to remote',
  });

  // Cmd+N - New branch
  registerShortcut({
    key: 'n',
    meta: true,
    handler: () => {
      if (reposStore.selectedRepo) {
        uiStore.openCreateBranchModal();
      }
    },
    description: 'Create new branch',
  });

  // Escape - Clear selection
  registerShortcut({
    key: 'Escape',
    handler: () => {
      uiStore.clearSelectedFile();
    },
    description: 'Clear selection',
  });
}
