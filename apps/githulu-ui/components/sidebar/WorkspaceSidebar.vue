<script setup lang="ts">
import {
  ArrowLeft,
  FileEdit,
  History,
  Archive,
  Settings,
  GitBranch,
  Tag,
  Globe,
} from 'lucide-vue-next';
import type { Repo, BranchInfo } from '~/types/githulu';

const props = defineProps<{
  repo: Repo;
}>();

const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();
const { transformBranches } = useBranchTree(props.repo.id);

// Get status for this repo
const status = computed(() => gitStore.getStatus(props.repo.id));

// Branches data - reads from store so it updates when any component calls fetchBranches
const branches = computed(() => gitStore.getBranches(props.repo.id) || { local: [], remote: [], defaultBranch: null });
const branchesLoading = ref(false);

// Resolve the default branch: prefer the value from origin/HEAD, fall back to common names
const defaultBranch = computed(() => {
  const db = branches.value.defaultBranch;
  if (db) return db;
  const fallbacks = ['main', 'master'];
  for (const name of fallbacks) {
    if (branches.value.local.some((b) => b.name === name)) return name;
  }
  return null;
});

// Transform branches into tree structure (default branch pinned first)
const localBranchTree = computed(() => transformBranches(branches.value.local, defaultBranch.value));

// Transform remote branches (strip 'origin/' prefix for display)
const remoteBranchTree = computed(() => {
  // Create branches with stripped names for tree building
  const strippedBranches = branches.value.remote.map((branch) => ({
    ...branch,
    displayName: branch.name.replace(/^origin\//, ''),
    originalName: branch.name,
  }));

  // Build tree using display names
  const treeBranches = strippedBranches.map((b) => ({
    ...b,
    name: b.displayName,
  }));

  return transformBranches(treeBranches, defaultBranch.value);
});

// Section open/closed state
const branchesOpen = ref(true);
const tagsOpen = ref(true);
const remotesOpen = ref(true);

// Workspace items
const workspaceItems = computed(() => [
  {
    id: 'workingCopy',
    label: 'Working Copy',
    icon: FileEdit,
    badge: status.value?.isDirty
      ? status.value.changes.staged.length +
        status.value.changes.unstaged.length +
        status.value.changes.untracked.length
      : null,
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    badge: null,
  },
  {
    id: 'stashes',
    label: 'Stashes',
    icon: Archive,
    badge: null,
  },
]);

// Load branches when repo changes - uses store so all components stay in sync
async function loadBranches(retryCount = 0): Promise<void> {
  console.log('[githulu] loadBranches called, repoId:', props.repo.id, 'retry:', retryCount);

  // Retry if window.githulu isn't available yet (can happen during initial load)
  if (!window.githulu) {
    console.log('[githulu] API not available, retrying...');
    if (retryCount < 5) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return loadBranches(retryCount + 1);
    }
    console.warn('[githulu] API not available after retries');
    branchesLoading.value = false;
    return;
  }

  branchesLoading.value = true;
  try {
    console.log('[githulu] Fetching branches via store for:', props.repo.id);
    const result = await gitStore.fetchBranches(props.repo.id);
    console.log('[githulu] Branches result:', result);
    console.log(
      '[githulu] Local branches:',
      result?.local.map((b) => ({ name: b.name, isCurrent: b.isCurrent }))
    );
  } catch (err) {
    console.error('[githulu] Failed to load branches:', err);
    // Retry once on error (use separate counter for error retries)
    if (retryCount === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      branchesLoading.value = false;
      return loadBranches(1);
    }
  } finally {
    branchesLoading.value = false;
  }
}

// Watch for repo changes and load branches
watch(
  () => props.repo.id,
  (newId) => {
    console.log('[githulu] Repo ID changed to:', newId);
    if (newId) {
      loadBranches();
    }
  },
  { immediate: true }
);

function handleBackToBookmarks() {
  reposStore.selectRepo(null);
  uiStore.exitToBookmarks();
}

function selectView(view: 'workingCopy' | 'history' | 'branches' | 'stashes') {
  uiStore.setSelectedView(view);
}

// Single click: View branch commits (doesn't switch)
function viewBranch(branch: BranchInfo, isRemote: boolean) {
  console.log('[githulu] viewBranch called with:', {
    name: branch.name,
    isRemote,
    isCurrent: branch.isCurrent,
  });
  uiStore.selectBranch({
    name: branch.name,
    isRemote,
    isCurrent: branch.isCurrent,
  });
}

// Double click: Switch to branch (local only)
async function switchToBranch(branch: BranchInfo) {
  if (!window.githulu) return;

  try {
    console.log('[githulu] Switching to branch:', branch.name, 'Full branch object:', branch);
    const result = await window.githulu.git.switchBranch(props.repo.id, branch.name);
    console.log('[githulu] Switch result:', result);

    if (!result?.success) {
      uiStore.showToast(result?.stderr || 'Failed to switch branch', 'error');
      return;
    }

    // Wait a bit for the file system to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Refresh status and branches
    await gitStore.fetchStatus(props.repo.id);
    await loadBranches();

    uiStore.showToast(`Switched to ${branch.name}`, 'success');
  } catch (err) {
    console.error('[githulu] Switch branch error:', err);
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to switch branch', 'error');
  }
}

// Right click: Show context menu
function showBranchContextMenu(event: MouseEvent, branch: BranchInfo, isRemote: boolean) {
  event.preventDefault();
  uiStore.openBranchContextMenu(event.clientX, event.clientY, branch, isRemote);
}

// Check if branch is selected for viewing
const selectedBranchName = computed(() => uiStore.selectedBranch?.name);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header with back button -->
    <div class="border-bg-hover flex items-center gap-2 border-b px-3 py-3">
      <button
        class="hover:bg-bg-hover rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-200"
        title="Back to Repositories"
        @click="handleBackToBookmarks"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium text-slate-200">
          {{ repo.displayName }}
        </span>
        <span class="block truncate text-xs text-slate-500">
          {{ status?.branch || 'Loading...' }}
        </span>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Workspace Section -->
      <div class="px-2 py-2">
        <div class="text-2xs mb-1 px-2 font-semibold uppercase text-slate-500">Workspace</div>
        <div class="space-y-0.5">
          <SidebarButton
            v-for="item in workspaceItems"
            :key="item.id"
            :icon="item.icon"
            :label="item.label"
            :badge="item.badge"
            :selected="uiStore.selectedView === item.id"
            @click="selectView(item.id as any)"
          />
        </div>
      </div>

      <!-- Branches Section -->
      <div class="border-bg-hover border-t px-2 py-2">
        <SidebarAccordion
          v-model="branchesOpen"
          :icon="GitBranch"
          label="Branches"
          :badge="branches.local.length"
        >
          <div class="mt-1 space-y-0.5 px-2">
            <div v-if="branchesLoading" class="px-2 py-2 text-xs text-slate-500">Loading...</div>
            <SharedBranchTreeNode
              v-for="node in localBranchTree"
              :key="node.type === 'folder' ? node.fullPath : node.branch.name"
              :node="node"
              :repo-id="repo.id"
              :is-remote="false"
              :on-branch-click="(branch) => viewBranch(branch, false)"
              :on-branch-double-click="(branch) => switchToBranch(branch)"
              :on-branch-context-menu="(event, branch) => showBranchContextMenu(event, branch, false)"
              :selected-branch-name="selectedBranchName"
              :current-branch-name="status?.branch"
            />
          </div>
        </SidebarAccordion>
      </div>

      <!-- Tags Section -->
      <div class="border-bg-hover border-t px-2 py-2">
        <SidebarAccordion v-model="tagsOpen" :icon="Tag" label="Tags">
          <div class="mt-1">
            <div class="px-4 py-2 text-xs text-slate-600">Tags coming soon</div>
          </div>
        </SidebarAccordion>
      </div>

      <!-- Remotes Section -->
      <div class="border-bg-hover border-t px-2 py-2">
        <SidebarAccordion
          v-model="remotesOpen"
          :icon="Globe"
          label="Remotes"
          :badge="branches.remote.length"
        >
          <div class="mt-1 space-y-0.5 px-2">
            <div class="px-2 py-1 text-xs text-slate-500">origin</div>
            <div class="pl-2">
              <SharedBranchTreeNode
                v-for="node in remoteBranchTree"
                :key="node.type === 'folder' ? node.fullPath : node.branch.name"
                :node="node"
                :repo-id="repo.id"
                :is-remote="true"
                :on-branch-click="
                  (branch) => viewBranch({ ...branch, name: 'origin/' + branch.name }, true)
                "
                :on-branch-context-menu="
                  (event, branch) =>
                    showBranchContextMenu(event, { ...branch, name: 'origin/' + branch.name }, true)
                "
                :selected-branch-name="selectedBranchName"
              />
            </div>
          </div>
        </SidebarAccordion>
      </div>
    </div>

    <!-- Settings at bottom -->
    <div class="border-bg-hover border-t px-2 py-2">
      <SidebarButton :icon="Settings" label="Settings" />
    </div>
  </div>
</template>
