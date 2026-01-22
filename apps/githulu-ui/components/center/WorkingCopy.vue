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
  const stagedPaths = new Set(stagedFiles.value.map(f => f.path));
  const unstagedPaths = new Set(unstagedFiles.value.map(f => f.path));
  
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
    uiStore.showToast(
      err instanceof Error ? err.message : 'Failed to stage files',
      'error'
    );
  } finally {
    isStaging.value = false;
  }
}

// Create commit
async function handleCommit() {
  if (!window.githulu || !canCommit.value || isCommitting.value) return;
  
  isCommitting.value = true;
  try {
    const message = showDescription.value && commitDescription.value.trim()
      ? `${commitSubject.value.trim()}\n\n${commitDescription.value.trim()}`
      : commitSubject.value.trim();
    
    await window.githulu.git.commit(props.repoId, message);
    await gitStore.fetchStatus(props.repoId);
    
    // Clear form
    commitSubject.value = '';
    commitDescription.value = '';
    showDescription.value = false;
    
    uiStore.showToast('Commit created', 'success');
  } catch (err) {
    uiStore.showToast(
      err instanceof Error ? err.message : 'Failed to create commit',
      'error'
    );
  } finally {
    isCommitting.value = false;
  }
}

// Auto-switch to conflicts if in rebase
watch(hasRebase, (inRebase) => {
  if (inRebase && conflicts.value.length > 0) {
    // Show conflicts section prominently
  }
}, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Commit Form -->
    <div class="flex-shrink-0 border-b border-bg-hover p-3 space-y-3">
      <!-- Commit Subject -->
      <input
        v-model="commitSubject"
        type="text"
        placeholder="Commit Subject"
        class="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 placeholder-slate-500"
        @keydown.enter.prevent="handleCommit"
      />
      
      <!-- Description toggle & field -->
      <div>
        <button
          class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          @click="showDescription = !showDescription"
        >
          <component :is="showDescription ? ChevronUp : ChevronDown" class="w-3 h-3" />
          {{ showDescription ? 'Hide' : 'Add' }} description
        </button>
        
        <textarea
          v-if="showDescription"
          v-model="commitDescription"
          placeholder="Extended description (optional)"
          rows="3"
          class="mt-2 w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 placeholder-slate-500 resize-none"
        />
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          :disabled="!canStageAll || isStaging"
          class="px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="canStageAll ? 'bg-bg-hover text-slate-300 hover:bg-bg-elevated' : 'bg-bg-hover text-slate-500'"
          @click="handleStageAll"
        >
          {{ isStaging ? 'Staging...' : 'Stage All' }}
        </button>
        
        <button
          :disabled="!canCommit || isCommitting"
          class="flex-1 px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="canCommit ? 'bg-primary-600 text-white hover:bg-primary-500 glow-on-hover' : 'bg-bg-hover text-slate-500'"
          @click="handleCommit"
        >
          {{ isCommitting ? 'Committing...' : 'Commit' }}
        </button>
      </div>
    </div>

    <!-- Conflicts section (shown during rebase) -->
    <div v-if="hasRebase && conflicts.length > 0" class="border-b border-bg-hover">
      <CenterConflictsList :repo-id="repoId" :conflicts="conflicts" />
    </div>

    <!-- Unified File List -->
    <div class="flex-1 overflow-y-auto">
      <template v-if="totalChanges === 0 && !hasRebase">
        <div class="flex flex-col items-center justify-center h-full text-slate-500">
          <FileCheck class="w-12 h-12 mb-3 text-success/50" />
          <p class="text-sm">Working directory clean</p>
        </div>
      </template>

      <template v-else>
        <CenterFileList
          :repo-id="repoId"
          :files="allFiles"
        />
      </template>
    </div>
  </div>
</template>
