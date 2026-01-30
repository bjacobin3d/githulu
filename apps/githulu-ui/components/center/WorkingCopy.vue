<script setup lang="ts">
import { FileCheck, ChevronDown, ChevronUp } from 'lucide-vue-next';
import type { FileChange } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();

const status = computed(() => gitStore.getStatus(props.repoId));

const stagedFiles = computed(() => status.value?.changes.staged ?? []);
const unstagedFiles = computed(() => status.value?.changes.unstaged ?? []);
const untrackedFiles = computed(() => status.value?.changes.untracked ?? []);
const hasRebase = computed(() => status.value?.rebase.inProgress ?? false);
const conflicts = computed(() => status.value?.rebase.conflicts ?? []);

// Extended file type with check state
export interface FileWithCheckState extends FileChange {
  checkState: 'checked' | 'indeterminate' | 'unchecked';
  isStaged: boolean;
}

// Merge all files into one unified list with computed check states
const allFiles = computed<FileWithCheckState[]>(() => {
  const stagedPaths = new Set(stagedFiles.value.map((f) => f.path));
  const unstagedPaths = new Set(unstagedFiles.value.map((f) => f.path));

  const files: FileWithCheckState[] = [];

  // Add staged files
  for (const file of stagedFiles.value) {
    // If same file exists in unstaged, it's partially staged (indeterminate)
    const hasUnstagedChanges = unstagedPaths.has(file.path);
    files.push({
      ...file,
      checkState: hasUnstagedChanges ? 'indeterminate' : 'checked',
      isStaged: true,
    });
  }

  // Add unstaged files (that aren't already added from staged)
  for (const file of unstagedFiles.value) {
    if (!stagedPaths.has(file.path)) {
      files.push({
        ...file,
        checkState: 'unchecked',
        isStaged: false,
      });
    }
  }

  // Add untracked files (treat as unstaged)
  for (const file of untrackedFiles.value) {
    files.push({
      ...file,
      checkState: 'unchecked',
      isStaged: false,
    });
  }

  // Sort: staged first, then by path
  return files.sort((a, b) => {
    if (a.isStaged !== b.isStaged) {
      return a.isStaged ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });
});

const totalChanges = computed(() => allFiles.value.length);

// Commit form state
const commitSubject = ref('');
const commitDescription = ref('');
const showDescription = ref(false);
const isCommitting = ref(false);
const isStaging = ref(false);

// Computed: can commit?
const canCommit = computed(() => {
  return stagedFiles.value.length > 0 && commitSubject.value.trim().length > 0;
});

// Computed: can stage all?
const canStageAll = computed(() => {
  return unstagedFiles.value.length > 0 || untrackedFiles.value.length > 0;
});

// Stage all files
async function handleStageAll() {
  if (!window.githulu || isStaging.value) return;

  isStaging.value = true;
  try {
    await window.githulu.git.stageAll(props.repoId);
    await gitStore.fetchStatus(props.repoId);
    uiStore.showToast('All files staged', 'success');
  } catch (err) {
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to stage files', 'error');
  } finally {
    isStaging.value = false;
  }
}

// Create commit
async function handleCommit() {
  if (!window.githulu || !canCommit.value || isCommitting.value) return;

  isCommitting.value = true;
  try {
    const message =
      showDescription.value && commitDescription.value.trim()
        ? `${commitSubject.value.trim()}\n\n${commitDescription.value.trim()}`
        : commitSubject.value.trim();

    await window.githulu.git.commit(props.repoId, message);
    // Refresh status and branches to update ahead/behind counts
    await Promise.all([gitStore.fetchStatus(props.repoId), gitStore.fetchBranches(props.repoId)]);

    // Clear form
    commitSubject.value = '';
    commitDescription.value = '';
    showDescription.value = false;

    uiStore.showToast('Commit created', 'success');
  } catch (err) {
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to create commit', 'error');
  } finally {
    isCommitting.value = false;
  }
}

// Auto-switch to conflicts if in rebase
watch(
  hasRebase,
  (inRebase) => {
    if (inRebase && conflicts.value.length > 0) {
      // Show conflicts section prominently
    }
  },
  { immediate: true }
);
</script>

<template>
  <!-- Commit Form -->
  <div class="border-bg-hover space-y-3 border-b p-3">
    <!-- Commit Subject -->
    <input
      v-model="commitSubject"
      type="text"
      placeholder="Commit Subject"
      class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1"
      @keydown.enter.prevent="handleCommit"
    />

    <!-- Description toggle & field -->
    <div>
      <button
        class="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-300"
        @click="showDescription = !showDescription"
      >
        <component :is="showDescription ? ChevronUp : ChevronDown" class="h-3 w-3" />
        {{ showDescription ? 'Hide' : 'Add' }} description
      </button>

      <textarea
        v-if="showDescription"
        v-model="commitDescription"
        placeholder="Extended description (optional)"
        rows="3"
        class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 mt-2 w-full resize-none rounded-md border px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        :disabled="!canStageAll || isStaging"
        class="rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          canStageAll
            ? 'bg-bg-hover hover:bg-bg-elevated text-slate-300'
            : 'bg-bg-hover text-slate-500'
        "
        @click="handleStageAll"
      >
        {{ isStaging ? 'Staging...' : 'Stage All' }}
      </button>

      <button
        :disabled="!canCommit || isCommitting"
        class="flex-1 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          canCommit
            ? 'bg-primary-600 hover:bg-primary-500 glow-on-hover text-white'
            : 'bg-bg-hover text-slate-500'
        "
        @click="handleCommit"
      >
        {{ isCommitting ? 'Committing...' : 'Commit' }}
      </button>
    </div>
  </div>

  <!-- Conflicts section (shown during rebase) -->
  <div v-if="hasRebase && conflicts.length > 0" class="border-bg-hover border-b">
    <CenterConflictsList :repo-id="repoId" :conflicts="conflicts" />
  </div>

  <!-- Unified File List -->
  <div class="h-full flex-1 overflow-y-auto">
    <template v-if="totalChanges === 0 && !hasRebase">
      <div class="flex h-full flex-col items-center justify-center text-slate-500">
        <FileCheck class="text-success/50 mb-3 h-12 w-12" />
        <p class="text-sm">Working directory clean</p>
      </div>
    </template>

    <template v-else>
      <CenterFileList :repo-id="repoId" :files="allFiles" />
    </template>
  </div>
</template>
