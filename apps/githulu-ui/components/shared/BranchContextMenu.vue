<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  GitBranch,
  Link,
  Upload,
  RefreshCw,
  Copy,
  Pencil,
  Trash2,
} from 'lucide-vue-next';

const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();

const selectedRepo = computed(() => reposStore.selectedRepo);
const menuState = computed(() => uiStore.branchContextMenu);

const isVisible = computed(() => menuState.value.visible);
const x = computed(() => menuState.value.x);
const y = computed(() => menuState.value.y);
const branch = computed(() => menuState.value.branch);
const isRemote = computed(() => menuState.value.isRemote);

// Close menu
function closeMenu() {
  uiStore.closeBranchContextMenu();
}

// Fetch from remote
async function handleFetch() {
  if (!selectedRepo.value) return;
  closeMenu();

  const result = await gitStore.fetch(selectedRepo.value.id);
  if (result?.success) {
    uiStore.showToast('Fetched from remote', 'success');
    // Refresh branches and status to show updated ahead/behind counts
    await Promise.all([
      gitStore.fetchBranches(selectedRepo.value.id),
      gitStore.fetchStatus(selectedRepo.value.id),
    ]);
  } else {
    uiStore.showToast(result?.stderr || 'Failed to fetch', 'error');
  }
}

// Actions for local branches
async function handlePull() {
  if (!selectedRepo.value) return;
  closeMenu();

  // Check if working directory is dirty
  const status = gitStore.getStatus(selectedRepo.value.id);
  if (status?.isDirty) {
    // Working directory has uncommitted changes
    // Pull with rebase requires a clean working directory
    uiStore.showToast(
      'Cannot pull with rebase: Please commit or stash your changes first',
      'error'
    );
    // Optionally, offer to open stash modal
    // uiStore.openStashModal();
    return;
  }

  const result = await gitStore.pull(selectedRepo.value.id, { rebase: true });
  if (result?.success) {
    uiStore.showToast('Pulled changes successfully', 'success');
    // Refresh branches to update ahead/behind counts
    await gitStore.fetchBranches(selectedRepo.value.id);
  } else {
    // Parse error message for better UX
    const errorMsg = result?.stderr || 'Failed to pull';
    if (errorMsg.includes('cannot pull with rebase')) {
      uiStore.showToast('Please commit or stash your changes before pulling', 'error');
    } else {
      uiStore.showToast(errorMsg, 'error');
    }
  }
}

async function handlePush() {
  if (!selectedRepo.value || !branch.value) return;
  closeMenu();

  // Open push modal for advanced options
  uiStore.openPushModal(branch.value.name);
}

async function handlePublish() {
  if (!selectedRepo.value || !branch.value) return;
  closeMenu();

  const result = await gitStore.publish(selectedRepo.value.id, branch.value.name);
  if (result?.success) {
    uiStore.showToast(`Published ${branch.value.name} to origin`, 'success');
    await gitStore.fetchBranches(selectedRepo.value.id);
  } else {
    uiStore.showToast(result?.stderr || 'Failed to publish', 'error');
  }
}

function handleCreateBranchFrom() {
  if (!branch.value) return;
  closeMenu();
  uiStore.openCreateBranchModal(branch.value.name);
}

async function handleSwitchBranch() {
  if (!selectedRepo.value || !branch.value) return;
  closeMenu();

  const result = await gitStore.switchBranch(selectedRepo.value.id, branch.value.name);
  if (result?.success) {
    uiStore.showToast(`Switched to ${branch.value.name}`, 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to switch branch', 'error');
  }
}

function handleRebaseOnto() {
  closeMenu();
  uiStore.openRebaseModal();
}

function handleRenameBranch() {
  if (!branch.value) return;
  closeMenu();
  uiStore.openRenameBranchModal(branch.value.name);
}

function handleCopyBranchName() {
  if (!branch.value) return;
  closeMenu();

  navigator.clipboard.writeText(branch.value.name);
  uiStore.showToast('Copied branch name to clipboard', 'success');
}

// Actions for remote branches
async function handleTrack() {
  if (!selectedRepo.value || !branch.value) return;
  closeMenu();

  const result = await gitStore.trackBranch(selectedRepo.value.id, branch.value.name);
  if (result?.success) {
    uiStore.showToast(`Now tracking ${branch.value.name}`, 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to track branch', 'error');
  }
}

// Has upstream (for showing publish vs push)
// Check both branch data and repo status for more reliable upstream detection
const hasUpstream = computed(() => {
  if (branch.value?.upstream) return true;

  // Also check if this is the current branch with an upstream in repo status
  if (branch.value?.isCurrent && selectedRepo.value) {
    const status = gitStore.getStatus(selectedRepo.value.id);
    return !!status?.upstream;
  }

  return false;
});
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop to close menu -->
    <div
      v-if="isVisible"
      class="fixed inset-0 z-40"
      @click="closeMenu"
      @contextmenu.prevent="closeMenu"
    />

    <!-- Context Menu -->
    <Transition
      enter-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-75"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible && branch"
        class="bg-bg-elevated border-bg-hover fixed z-50 min-w-48 rounded-lg border py-1 shadow-xl"
        :style="{ left: `${x}px`, top: `${y}px` }"
      >
        <!-- Remote branch options -->
        <template v-if="isRemote">
          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleFetch"
          >
            <ArrowDown class="h-4 w-4 text-teal-400" />
            Fetch from Remote
          </button>

          <div class="border-bg-hover my-1 border-t" />

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleTrack"
          >
            <Link class="text-primary-400 h-4 w-4" />
            Track "{{ branch.name }}"
          </button>

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleCreateBranchFrom"
          >
            <GitBranch class="text-primary-400 h-4 w-4" />
            Create New Branch from "{{ branch.name }}"...
          </button>

          <div class="border-bg-hover my-1 border-t" />

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleRebaseOnto"
          >
            <RefreshCw class="text-warning h-4 w-4" />
            Rebase Current Branch onto "{{ branch.name }}"...
          </button>

          <div class="border-bg-hover my-1 border-t" />

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleCopyBranchName"
          >
            <Copy class="h-4 w-4 text-slate-400" />
            Copy Branch Name
          </button>
        </template>

        <!-- Local branch options -->
        <template v-else>
          <!-- Fetch option for any local branch -->
          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleFetch"
          >
            <ArrowDown class="h-4 w-4 text-teal-400" />
            Fetch
          </button>

          <!-- Pull/Push/Publish only available for current branch -->
          <template v-if="branch.isCurrent">
            <button
              v-if="hasUpstream"
              class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
              @click="handlePull"
            >
              <ArrowDown class="h-4 w-4 text-teal-400" />
              Pull (with Rebase)...
            </button>

            <button
              v-if="hasUpstream"
              class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
              @click="handlePush"
            >
              <ArrowUp class="text-accent-400 h-4 w-4" />
              Push...
            </button>

            <button
              v-if="!hasUpstream"
              class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
              @click="handlePublish"
            >
              <Upload class="text-primary-400 h-4 w-4" />
              Publish "{{ branch.name }}"...
            </button>

            <div v-if="hasUpstream || !hasUpstream" class="border-bg-hover my-1 border-t" />
          </template>

          <div v-else class="border-bg-hover my-1 border-t" />

          <button
            v-if="!branch.isCurrent"
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleSwitchBranch"
          >
            <GitBranch class="text-primary-400 h-4 w-4" />
            Switch to "{{ branch.name }}"
          </button>

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleCreateBranchFrom"
          >
            <GitBranch class="text-primary-400 h-4 w-4" />
            Create New Branch from "{{ branch.name }}"...
          </button>

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleRebaseOnto"
          >
            <RefreshCw class="text-warning h-4 w-4" />
            Rebase Onto "{{ branch.name }}"...
          </button>

          <div class="border-bg-hover my-1 border-t" />

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleRenameBranch"
          >
            <Pencil class="h-4 w-4 text-slate-400" />
            Rename "{{ branch.name }}"...
          </button>

          <button
            class="hover:bg-bg-hover flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-200 transition-colors"
            @click="handleCopyBranchName"
          >
            <Copy class="h-4 w-4 text-slate-400" />
            Copy Branch Name
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>
