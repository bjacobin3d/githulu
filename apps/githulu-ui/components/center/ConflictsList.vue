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
  if (
    !confirm(
      'Are you sure you want to abort the rebase? This will restore your branch to its previous state.'
    )
  ) {
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
  <div class="bg-accent-500/10 border-accent-500 border-l-4">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <AlertTriangle class="text-accent-500 h-5 w-5" />
        <h3 class="text-accent-400 text-sm font-semibold">Conflicts ({{ conflicts.length }})</h3>
        <span v-if="status?.rebase.step && status?.rebase.total" class="text-xs text-slate-400">
          Step {{ status.rebase.step }} of {{ status.rebase.total }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Continue button -->
        <button
          :disabled="!allResolved"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
          :class="[
            allResolved
              ? 'bg-success hover:bg-success/90 text-white'
              : 'bg-bg-elevated cursor-not-allowed text-slate-500',
          ]"
          @click="handleContinueRebase"
        >
          <Play class="h-4 w-4" />
          Continue Rebase
        </button>

        <!-- Abort button -->
        <button
          class="bg-bg-elevated hover:bg-error/20 hover:text-error flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-300 transition-colors"
          @click="handleAbortRebase"
        >
          <X class="h-4 w-4" />
          Abort
        </button>
      </div>
    </div>

    <!-- Conflict files -->
    <div class="border-accent-500/30 border-t">
      <div
        v-for="filePath in conflicts"
        :key="filePath"
        class="hover:bg-accent-500/5 group flex items-center gap-3 px-4 py-2"
      >
        <!-- Resolved indicator -->
        <div
          class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors"
          :class="[
            stagedConflicts.has(filePath)
              ? 'bg-success text-white'
              : 'bg-bg-elevated text-slate-500',
          ]"
        >
          <Check v-if="stagedConflicts.has(filePath)" class="h-4 w-4" />
          <span v-else class="text-xs">!</span>
        </div>

        <!-- File path -->
        <span class="flex-1 truncate font-mono text-sm text-slate-200">
          {{ filePath }}
        </span>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            class="bg-bg-elevated hover:bg-bg-hover flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-300"
            @click="handleOpenInEditor(filePath)"
          >
            <ExternalLink class="h-3 w-3" />
            Open in Cursor
          </button>

          <button
            v-if="!stagedConflicts.has(filePath)"
            class="bg-success/20 hover:bg-success/30 text-success flex items-center gap-1 rounded px-2 py-1 text-xs"
            title="Mark as resolved (stages the file)"
            @click="handleMarkResolved(filePath)"
          >
            <Check class="h-3 w-3" />
            Mark Resolved
          </button>
          <span v-else class="text-success text-xs"> Resolved </span>
        </div>
      </div>
    </div>

    <!-- Help text -->
    <div class="bg-bg-base/50 px-4 py-2 text-xs text-slate-500">
      Open each conflicted file in Cursor, resolve the conflicts, save, then click "Mark Resolved"
      to stage it. Once all conflicts are resolved, click "Continue Rebase".
    </div>
  </div>
</template>
