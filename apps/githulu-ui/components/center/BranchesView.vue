<script setup lang="ts">
import { 
  GitBranch, 
  Cloud, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-vue-next';
import type { BranchInfo } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();

const branches = ref<{ local: BranchInfo[]; remote: BranchInfo[] } | null>(null);
const isLoading = ref(false);
const localCollapsed = ref(false);
const remoteCollapsed = ref(false);

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
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="panel-header flex-shrink-0">
      <h3 class="text-sm font-semibold text-slate-200">Branches</h3>
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary-600 hover:bg-primary-500 text-white"
        @click="handleCreateBranch"
      >
        <Plus class="w-3 h-3" />
        New Branch
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <template v-else-if="branches">
        <!-- Local branches -->
        <div class="border-b border-bg-hover">
          <button
            class="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-hover"
            @click="localCollapsed = !localCollapsed"
          >
            <component
              :is="localCollapsed ? ChevronRight : ChevronDown"
              class="w-4 h-4 text-slate-500"
            />
            <GitBranch class="w-4 h-4 text-primary-400" />
            <span class="text-sm font-medium text-slate-200">Local</span>
            <span class="text-xs text-slate-500">({{ branches.local.length }})</span>
          </button>

          <div v-show="!localCollapsed" class="pb-2">
            <div
              v-for="branch in branches.local"
              :key="branch.name"
              class="flex items-center gap-2 px-4 py-1.5 hover:bg-bg-hover cursor-pointer group"
              @click="handleSwitchBranch(branch.name)"
            >
              <!-- Current indicator -->
              <div class="w-4 flex-shrink-0">
                <Check
                  v-if="branch.isCurrent"
                  class="w-4 h-4 text-success"
                />
              </div>

              <!-- Branch name -->
              <span
                class="flex-1 text-sm truncate"
                :class="branch.isCurrent ? 'text-slate-100 font-medium' : 'text-slate-300'"
              >
                {{ branch.name }}
              </span>

              <!-- Tracking info -->
              <template v-if="branch.upstream">
                <span
                  v-if="branch.ahead"
                  class="flex items-center gap-0.5 text-xs text-accent-400"
                >
                  <ArrowUp class="w-3 h-3" />
                  {{ branch.ahead }}
                </span>
                <span
                  v-if="branch.behind"
                  class="flex items-center gap-0.5 text-xs text-teal-400"
                >
                  <ArrowDown class="w-3 h-3" />
                  {{ branch.behind }}
                </span>
              </template>
            </div>
          </div>
        </div>

        <!-- Remote branches -->
        <div>
          <button
            class="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-hover"
            @click="remoteCollapsed = !remoteCollapsed"
          >
            <component
              :is="remoteCollapsed ? ChevronRight : ChevronDown"
              class="w-4 h-4 text-slate-500"
            />
            <Cloud class="w-4 h-4 text-teal-400" />
            <span class="text-sm font-medium text-slate-200">Remote</span>
            <span class="text-xs text-slate-500">({{ branches.remote.length }})</span>
          </button>

          <div v-show="!remoteCollapsed" class="pb-2">
            <div
              v-for="branch in branches.remote"
              :key="branch.name"
              class="flex items-center gap-2 px-4 py-1.5 hover:bg-bg-hover group"
            >
              <div class="w-4" />

              <!-- Branch name -->
              <span class="flex-1 text-sm text-slate-400 truncate">
                {{ branch.name }}
              </span>

              <!-- Track button -->
              <button
                class="px-2 py-0.5 text-xs rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="handleTrackBranch(branch.name)"
              >
                Track
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
