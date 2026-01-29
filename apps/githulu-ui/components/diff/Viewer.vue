<script setup lang="ts">
import { File, FileQuestion } from 'lucide-vue-next';
import { parseDiffText } from '~/composables/useDiffParser';

const uiStore = useUIStore();

const selectedFile = computed(() => uiStore.selectedFile);
const diffContent = computed(() => uiStore.diffContent);
const isLoading = computed(() => uiStore.diffLoading);

// Parse diff into hunks for rendering
const parsedDiff = computed(() => {
  if (!diffContent.value?.diffText) return null;
  return parseDiffText(diffContent.value.diffText);
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="panel-header flex-shrink-0">
      <div class="flex items-center gap-2">
        <File class="w-4 h-4 text-primary-400" />
        <span class="text-sm font-medium text-slate-200">
          {{ selectedFile?.path || 'Diff' }}
        </span>
        <span
          v-if="selectedFile"
          class="text-xs px-1.5 py-0.5 rounded"
          :class="{
            'bg-success/20 text-success': selectedFile.kind === 'staged',
            'bg-warning/20 text-warning': selectedFile.kind === 'unstaged',
            'bg-teal-500/20 text-teal-400': selectedFile.kind === 'untracked',
            'bg-error/20 text-error': selectedFile.kind === 'conflict',
          }"
        >
          {{ selectedFile.kind === 'staged' ? 'Staged' : selectedFile.kind === 'unstaged' ? 'Unstaged' : selectedFile.kind === 'untracked' ? 'Untracked' : 'Conflict' }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <!-- Loading state -->
      <div
        v-if="isLoading"
        class="flex items-center justify-center h-full"
      >
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span class="text-sm">Loading diff...</span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!selectedFile"
        class="flex flex-col items-center justify-center h-full text-slate-500"
      >
        <FileQuestion class="w-12 h-12 mb-3 opacity-50" />
        <p class="text-sm">Select a file to view diff</p>
      </div>

      <!-- Untracked file -->
      <div
        v-else-if="selectedFile.kind === 'untracked'"
        class="flex flex-col items-center justify-center h-full text-slate-500"
      >
        <File class="w-12 h-12 mb-3 text-teal-400/50" />
        <p class="text-sm">Untracked file</p>
        <p class="text-xs text-slate-600 mt-1">Stage the file to see its contents in the diff</p>
      </div>

      <!-- No diff (empty) -->
      <div
        v-else-if="!parsedDiff || parsedDiff.length === 0"
        class="flex flex-col items-center justify-center h-full text-slate-500"
      >
        <File class="w-12 h-12 mb-3 opacity-50" />
        <p class="text-sm">No changes to display</p>
      </div>

      <!-- Diff content -->
      <DiffHunks v-else :hunks="parsedDiff" />
    </div>
  </div>
</template>
