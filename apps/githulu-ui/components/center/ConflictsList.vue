<script setup lang="ts">
import { AlertTriangle, Check, ExternalLink, Play, X } from 'lucide-vue-next';

const props = defineProps<{
  repoId: string;
  conflicts: string[];
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();
const reposStore = useReposStore();

const status = computed(() => gitStore.getStatus(props.repoId));

// Track which files have been staged (resolved)
const stagedConflicts = computed(() => {
  const staged = status.value?.changes.staged ?? [];
  return new Set(staged.map((f) => f.path));
});

const allResolved = computed(() => {
  return props.conflicts.every((path) => stagedConflicts.value.has(path));
});

async function handleOpenInEditor(filePath: string) {
  if (!window.githulu) return;
  
  const repo = reposStore.getRepoById(props.repoId);
  if (!repo) return;

  const fullPath = `${repo.path}/${filePath}`;
  await window.githulu.utils.openInEditor(fullPath);
}

async function handleMarkResolved(filePath: string) {
  const result = await gitStore.stageFile(props.repoId, filePath);
  if (result?.success) {
    uiStore.showToast(`Marked ${filePath} as resolved`, 'success');
  }
}

async function handleContinueRebase() {
  const result = await gitStore.rebaseContinue(props.repoId);
  if (result?.success) {
    uiStore.showToast('Rebase continued', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to continue rebase', 'error');
  }
}

async function handleAbortRebase() {
  if (!confirm('Are you sure you want to abort the rebase? This will restore your branch to its previous state.')) {
    return;
  }

  const result = await gitStore.rebaseAbort(props.repoId);
  if (result?.success) {
    uiStore.showToast('Rebase aborted', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to abort rebase', 'error');
  }
}
</script>

<template>
  <div class="bg-accent-500/10 border-l-4 border-accent-500">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-5 h-5 text-accent-500" />
        <h3 class="text-sm font-semibold text-accent-400">
          Conflicts ({{ conflicts.length }})
        </h3>
        <span
          v-if="status?.rebase.step && status?.rebase.total"
          class="text-xs text-slate-400"
        >
          Step {{ status.rebase.step }} of {{ status.rebase.total }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Continue button -->
        <button
          :disabled="!allResolved"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
          :class="[
            allResolved
              ? 'bg-success hover:bg-success/90 text-white'
              : 'bg-bg-elevated text-slate-500 cursor-not-allowed'
          ]"
          @click="handleContinueRebase"
        >
          <Play class="w-4 h-4" />
          Continue Rebase
        </button>

        <!-- Abort button -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-error/20 text-slate-300 hover:text-error text-sm transition-colors"
          @click="handleAbortRebase"
        >
          <X class="w-4 h-4" />
          Abort
        </button>
      </div>
    </div>

    <!-- Conflict files -->
    <div class="border-t border-accent-500/30">
      <div
        v-for="filePath in conflicts"
        :key="filePath"
        class="flex items-center gap-3 px-4 py-2 hover:bg-accent-500/5 group"
      >
        <!-- Resolved indicator -->
        <div
          class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          :class="[
            stagedConflicts.has(filePath)
              ? 'bg-success text-white'
              : 'bg-bg-elevated text-slate-500'
          ]"
        >
          <Check v-if="stagedConflicts.has(filePath)" class="w-4 h-4" />
          <span v-else class="text-xs">!</span>
        </div>

        <!-- File path -->
        <span class="flex-1 text-sm text-slate-200 font-mono truncate">
          {{ filePath }}
        </span>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-bg-elevated hover:bg-bg-hover text-slate-300"
            @click="handleOpenInEditor(filePath)"
          >
            <ExternalLink class="w-3 h-3" />
            Open in Cursor
          </button>

          <button
            v-if="!stagedConflicts.has(filePath)"
            class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-success/20 hover:bg-success/30 text-success"
            title="Mark as resolved (stages the file)"
            @click="handleMarkResolved(filePath)"
          >
            <Check class="w-3 h-3" />
            Mark Resolved
          </button>
          <span
            v-else
            class="text-xs text-success"
          >
            Resolved
          </span>
        </div>
      </div>
    </div>

    <!-- Help text -->
    <div class="px-4 py-2 bg-bg-base/50 text-xs text-slate-500">
      Open each conflicted file in Cursor, resolve the conflicts, save, then click "Mark Resolved" to stage it.
      Once all conflicts are resolved, click "Continue Rebase".
    </div>
  </div>
</template>
