<script setup lang="ts">
import { 
  GitBranch, 
  RefreshCw, 
  ArrowDown, 
  ArrowUp, 
  Upload, 
  GitMerge,
  ChevronDown,
  Archive
} from 'lucide-vue-next';
import type { Repo } from '~/types/githulu';

const props = defineProps<{
  repo: Repo;
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();

const status = computed(() => gitStore.getStatus(props.repo.id));
const isLoading = computed(() => gitStore.isLoading(props.repo.id));
const hasUpstream = computed(() => !!status.value?.upstream);
const hasRebaseInProgress = computed(() => status.value?.rebase.inProgress ?? false);

async function handleRefresh() {
  await gitStore.refreshStatus(props.repo.id);
}

async function handleFetch() {
  const result = await gitStore.fetch(props.repo.id);
  if (result?.success) {
    uiStore.showToast('Fetched from remote', 'success');
  } else {
    // Provide more detailed error message
    const errorMsg = result?.stderr || result?.stdout || 'Fetch failed';
    console.error('[githulu:ui] Fetch failed:', { result });
    
    // Check if it's a timeout or queue issue
    if (errorMsg.includes('timeout') || errorMsg.includes('Operation timed out')) {
      uiStore.showToast('Fetch timed out - check console for details', 'error');
    } else if (errorMsg.includes('cancelled')) {
      uiStore.showToast('Fetch was cancelled', 'error');
    } else {
      uiStore.showToast(`Fetch failed: ${errorMsg}`, 'error');
    }
  }
}

async function handlePush() {
  if (!status.value?.branch) return;
  
  const result = await gitStore.push(props.repo.id, status.value.branch);
  if (result?.success) {
    uiStore.showToast('Pushed to remote', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Push failed', 'error');
  }
}

async function handlePublish() {
  if (!status.value?.branch) return;
  
  const result = await gitStore.publish(props.repo.id, status.value.branch);
  if (result?.success) {
    uiStore.showToast('Branch published', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Publish failed', 'error');
  }
}

function handleRebase() {
  uiStore.openRebaseModal();
}

function handleStash() {
  uiStore.openStashModal();
}
</script>

<template>
  <div class="panel-header">
    <!-- Left side - repo info -->
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-slate-100">
        {{ repo.displayName }}
      </h2>

      <!-- Branch name with dropdown -->
      <div class="flex items-center gap-1 px-2 py-1 bg-bg-elevated rounded-md">
        <GitBranch class="w-4 h-4 text-primary-400" />
        <span class="text-sm text-slate-200">
          {{ status?.branch || 'detached' }}
        </span>
        <ChevronDown class="w-3 h-3 text-slate-400" />
      </div>

      <!-- Ahead/behind -->
      <div v-if="status && hasUpstream" class="flex items-center gap-2">
        <span
          v-if="status.ahead > 0"
          class="flex items-center gap-1 text-sm text-accent-400"
        >
          <ArrowUp class="w-3.5 h-3.5" />
          {{ status.ahead }}
        </span>
        <span
          v-if="status.behind > 0"
          class="flex items-center gap-1 text-sm text-teal-400"
        >
          <ArrowDown class="w-3.5 h-3.5" />
          {{ status.behind }}
        </span>
      </div>

      <!-- Rebase in progress indicator -->
      <div
        v-if="hasRebaseInProgress"
        class="flex items-center gap-1 px-2 py-1 bg-accent-500/20 text-accent-400 rounded-md text-sm"
      >
        <GitMerge class="w-4 h-4" />
        Rebase in progress
        <span v-if="status?.rebase.step && status?.rebase.total">
          ({{ status.rebase.step }}/{{ status.rebase.total }})
        </span>
      </div>
    </div>

    <!-- Right side - actions -->
    <div class="flex items-center gap-2">
      <!-- Refresh button -->
      <button
        class="p-2 rounded-md hover:bg-bg-hover transition-colors text-slate-400 hover:text-slate-200"
        :class="{ 'animate-spin': isLoading }"
        title="Refresh (Cmd+R)"
        @click="handleRefresh"
      >
        <RefreshCw class="w-4 h-4" />
      </button>

      <!-- Fetch button -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-bg-hover transition-colors text-sm text-slate-200"
        title="Fetch updates from remote (works with pending changes)"
        @click="handleFetch"
      >
        <ArrowDown class="w-4 h-4 text-teal-400" />
        Fetch
      </button>

      <!-- Push/Publish button -->
      <button
        v-if="hasUpstream"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-500 transition-colors text-sm text-white glow-on-hover"
        :disabled="!status?.ahead"
        :class="{ 'opacity-50 cursor-not-allowed': !status?.ahead }"
        title="Push (Cmd+Shift+P)"
        @click="handlePush"
      >
        <ArrowUp class="w-4 h-4" />
        Push
        <span v-if="status?.ahead" class="px-1.5 py-0.5 bg-white/20 rounded text-xs">
          {{ status.ahead }}
        </span>
      </button>
      <button
        v-else
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-600 hover:bg-accent-500 transition-colors text-sm text-white glow-orange-on-hover"
        title="Publish branch"
        @click="handlePublish"
      >
        <Upload class="w-4 h-4" />
        Publish
      </button>

      <!-- Rebase button -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-bg-hover transition-colors text-sm text-slate-200"
        title="Start rebase"
        @click="handleRebase"
      >
        <GitMerge class="w-4 h-4 text-primary-400" />
        Rebase
      </button>

      <!-- Stash button -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-bg-hover transition-colors text-sm text-slate-200"
        :disabled="!status?.isDirty"
        :class="{ 'opacity-50 cursor-not-allowed': !status?.isDirty }"
        title="Stash changes"
        @click="handleStash"
      >
        <Archive class="w-4 h-4 text-primary-400" />
        Stash
      </button>
    </div>
  </div>
</template>
