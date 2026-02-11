<script setup lang="ts">
import {
  GitBranch,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Upload,
  GitMerge,
  ChevronDown,
  Archive,
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
    // Refresh branches to update ahead/behind counts
    await gitStore.fetchBranches(props.repo.id);
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
  <div class="">
    <!-- Left side - repo info -->
    <div class="flex w-full items-center gap-3 p-3">
      <h2 class="text-lg font-semibold text-slate-100">
        {{ repo.displayName }}
      </h2>

      <!-- Branch name with dropdown -->
      <div class="bg-bg-elevated flex items-center gap-1 rounded-md px-2 py-1">
        <GitBranch class="text-primary-400 h-4 w-4" />
        <span class="text-sm text-slate-200">
          {{ status?.branch || 'detached' }}
        </span>
      </div>

      <!-- Ahead/behind -->
      <div v-if="status && hasUpstream" class="flex items-center gap-2">
        <span v-if="status.ahead > 0" class="text-accent-400 flex items-center gap-1 text-sm">
          <ArrowUp class="h-3.5 w-3.5" />
          {{ status.ahead }}
        </span>
        <span v-if="status.behind > 0" class="flex items-center gap-1 text-sm text-teal-400">
          <ArrowDown class="h-3.5 w-3.5" />
          {{ status.behind }}
        </span>
      </div>

      <!-- Refresh button -->
      <button
        class="hover:bg-bg-hover rounded-md p-3 text-slate-400 transition-colors hover:text-slate-200"
        :class="{ 'animate-spin': isLoading }"
        title="Refresh (Cmd+R)"
        @click="handleRefresh"
      >
        <RefreshCw class="h-4 w-4" />
      </button>

      <!-- Rebase in progress indicator -->
      <div
        v-if="hasRebaseInProgress"
        class="bg-accent-500/20 text-accent-400 flex items-center gap-1 rounded-md px-2 py-1 text-sm"
      >
        <GitMerge class="h-4 w-4" />
        Rebase in progress
        <span v-if="status?.rebase.step && status?.rebase.total">
          ({{ status.rebase.step }}/{{ status.rebase.total }})
        </span>
      </div>
    </div>

    <!-- Right side - actions -->
    <div class="flex items-center gap-2 px-3">
      <!-- Fetch button -->
      <button
        class="bg-bg-elevated hover:bg-bg-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-200 transition-colors"
        title="Fetch updates from remote (works with pending changes)"
        @click="handleFetch"
      >
        <ArrowDown class="h-4 w-4 text-teal-400" />
        Fetch
      </button>

      <!-- Push/Publish button -->
      <button
        v-if="hasUpstream"
        class="bg-primary-600 hover:bg-primary-500 glow-on-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white transition-colors"
        :disabled="!status?.ahead"
        :class="{ 'cursor-not-allowed opacity-50': !status?.ahead }"
        title="Push (Cmd+Shift+P)"
        @click="handlePush"
      >
        <ArrowUp class="h-4 w-4" />
        Push
        <span v-if="status?.ahead" class="rounded bg-white/20 px-1.5 py-0.5 text-xs">
          {{ status.ahead }}
        </span>
      </button>
      <button
        v-else
        class="bg-accent-600 hover:bg-accent-500 glow-orange-on-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white transition-colors"
        title="Publish branch"
        @click="handlePublish"
      >
        <Upload class="h-4 w-4" />
        Publish
      </button>

      <!-- Rebase button -->
      <button
        class="bg-bg-elevated hover:bg-bg-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-200 transition-colors"
        title="Start rebase"
        @click="handleRebase"
      >
        <GitMerge class="text-primary-400 h-4 w-4" />
        Rebase
      </button>

      <!-- Stash button -->
      <button
        class="bg-bg-elevated hover:bg-bg-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-200 transition-colors"
        :disabled="!status?.isDirty"
        :class="{ 'cursor-not-allowed opacity-50': !status?.isDirty }"
        title="Stash changes"
        @click="handleStash"
      >
        <Archive class="text-primary-400 h-4 w-4" />
        Stash
      </button>
    </div>
  </div>
</template>
