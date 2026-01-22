<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  GitBranch,
  Link,
  Upload,
  RefreshCw,
  Copy,
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

// Actions for local branches
async function handlePull() {
  if (!selectedRepo.value) return;
  closeMenu();
  
  const result = await gitStore.pull(selectedRepo.value.id, { rebase: true });
  if (result?.success) {
    uiStore.showToast('Pulled changes successfully', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to pull', 'error');
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
const hasUpstream = computed(() => branch.value?.upstream !== null);
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
        class="fixed z-50 min-w-48 bg-bg-elevated border border-bg-hover rounded-lg shadow-xl py-1"
        :style="{ left: `${x}px`, top: `${y}px` }"
      >
        <!-- Remote branch options -->
        <template v-if="isRemote">
          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handlePull"
          >
            <ArrowDown class="w-4 h-4 text-teal-400" />
            Pull "{{ branch.name }}"...
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleTrack"
          >
            <Link class="w-4 h-4 text-primary-400" />
            Track "{{ branch.name }}"
          </button>

          <div class="border-t border-bg-hover my-1" />

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleCreateBranchFrom"
          >
            <GitBranch class="w-4 h-4 text-primary-400" />
            Create New Branch from "{{ branch.name }}"...
          </button>
        </template>

        <!-- Local branch options -->
        <template v-else>
          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handlePull"
          >
            <ArrowDown class="w-4 h-4 text-teal-400" />
            Pull...
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handlePush"
          >
            <ArrowUp class="w-4 h-4 text-accent-400" />
            Push...
          </button>

          <button
            v-if="!hasUpstream"
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handlePublish"
          >
            <Upload class="w-4 h-4 text-primary-400" />
            Publish "{{ branch.name }}"...
          </button>

          <div class="border-t border-bg-hover my-1" />

          <button
            v-if="!branch.isCurrent"
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleSwitchBranch"
          >
            <GitBranch class="w-4 h-4 text-primary-400" />
            Switch to "{{ branch.name }}"
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleCreateBranchFrom"
          >
            <GitBranch class="w-4 h-4 text-primary-400" />
            Create New Branch from "{{ branch.name }}"...
          </button>

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleRebaseOnto"
          >
            <RefreshCw class="w-4 h-4 text-warning" />
            Rebase Onto "{{ branch.name }}"...
          </button>

          <div class="border-t border-bg-hover my-1" />

          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-bg-hover transition-colors"
            @click="handleCopyBranchName"
          >
            <Copy class="w-4 h-4 text-slate-400" />
            Copy Branch Name
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>
