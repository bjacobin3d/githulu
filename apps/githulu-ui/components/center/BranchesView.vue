<script setup lang="ts">
import {
  GitBranch,
  Cloud,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-vue-next';
import type { BranchInfo } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();
const { transformBranches } = useBranchTree(props.repoId);

const branches = ref<{ local: BranchInfo[]; remote: BranchInfo[] } | null>(null);
const isLoading = ref(false);
const localCollapsed = ref(false);
const remoteCollapsed = ref(false);

// Transform branches into tree structure
const localBranchTree = computed(() =>
  branches.value?.local ? transformBranches(branches.value.local) : []
);

// Transform remote branches (strip 'origin/' prefix for tree display)
const remoteBranchTree = computed(() => {
  if (!branches.value?.remote) return [];

  // Create branches with stripped names for tree building
  const treeBranches = branches.value.remote.map((branch) => ({
    ...branch,
    name: branch.name.replace(/^origin\//, ''),
  }));

  return transformBranches(treeBranches);
});

// Fetch branches on mount
onMounted(async () => {
  await loadBranches();
});

async function loadBranches() {
  isLoading.value = true;
  try {
    branches.value = await gitStore.fetchBranches(props.repoId);
  } finally {
    isLoading.value = false;
  }
}

async function handleSwitchBranch(branchName: string) {
  const result = await gitStore.switchBranch(props.repoId, branchName);
  if (result?.success) {
    uiStore.showToast(`Switched to ${branchName}`, 'success');
    await loadBranches();
  } else {
    uiStore.showToast(result?.stderr || 'Failed to switch branch', 'error');
  }
}

async function handleTrackBranch(remoteBranch: string) {
  const localName = remoteBranch.replace(/^origin\//, '');
  const result = await gitStore.trackBranch(props.repoId, remoteBranch, localName);
  if (result?.success) {
    uiStore.showToast(`Now tracking ${remoteBranch}`, 'success');
    await loadBranches();
  } else {
    uiStore.showToast(result?.stderr || 'Failed to track branch', 'error');
  }
}

function handleCreateBranch() {
  uiStore.openCreateBranchModal();
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="panel-header flex-shrink-0">
      <h3 class="text-sm font-semibold text-slate-200">Branches</h3>
      <button
        class="bg-primary-600 hover:bg-primary-500 flex items-center gap-1 rounded px-2 py-1 text-xs text-white"
        @click="handleCreateBranch"
      >
        <Plus class="h-3 w-3" />
        New Branch
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div
          class="border-primary-500 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        />
      </div>

      <template v-else-if="branches">
        <!-- Local branches -->
        <div class="border-bg-hover border-b">
          <button
            class="hover:bg-bg-hover flex w-full items-center gap-2 px-4 py-2"
            @click="localCollapsed = !localCollapsed"
          >
            <component
              :is="localCollapsed ? ChevronRight : ChevronDown"
              class="h-4 w-4 text-slate-500"
            />
            <GitBranch class="text-primary-400 h-4 w-4" />
            <span class="text-sm font-medium text-slate-200">Local</span>
            <span class="text-xs text-slate-500">({{ branches.local.length }})</span>
          </button>

          <div v-show="!localCollapsed" class="px-4 pb-2">
            <SharedBranchTreeNode
              v-for="node in localBranchTree"
              :key="node.type === 'folder' ? node.fullPath : node.branch.name"
              :node="node"
              :repo-id="props.repoId"
              :is-remote="false"
              :on-branch-click="(branch) => handleSwitchBranch(branch.name)"
            />
          </div>
        </div>

        <!-- Remote branches -->
        <div>
          <button
            class="hover:bg-bg-hover flex w-full items-center gap-2 px-4 py-2"
            @click="remoteCollapsed = !remoteCollapsed"
          >
            <component
              :is="remoteCollapsed ? ChevronRight : ChevronDown"
              class="h-4 w-4 text-slate-500"
            />
            <Cloud class="h-4 w-4 text-teal-400" />
            <span class="text-sm font-medium text-slate-200">Remote</span>
            <span class="text-xs text-slate-500">({{ branches.remote.length }})</span>
          </button>

          <div v-show="!remoteCollapsed" class="px-4 pb-2">
            <SharedBranchTreeNode
              v-for="node in remoteBranchTree"
              :key="node.type === 'folder' ? node.fullPath : node.branch.name"
              :node="node"
              :repo-id="props.repoId"
              :is-remote="true"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
