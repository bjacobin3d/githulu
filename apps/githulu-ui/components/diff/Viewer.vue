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
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="panel-header flex-shrink-0">
      <div class="flex items-center gap-2">
        <File class="text-primary-400 h-4 w-4" />
        <span class="text-sm font-medium text-slate-200">
          {{ selectedFile?.path || 'Diff' }}
        </span>
        <span
          v-if="selectedFile"
          class="rounded px-1.5 py-0.5 text-xs"
          :class="{
            'bg-success/20 text-success': selectedFile.kind === 'staged',
            'bg-warning/20 text-warning': selectedFile.kind === 'unstaged',
            'bg-teal-500/20 text-teal-400': selectedFile.kind === 'untracked',
            'bg-error/20 text-error': selectedFile.kind === 'conflict',
          }"
        >
          {{
            selectedFile.kind === 'staged'
              ? 'Staged'
              : selectedFile.kind === 'unstaged'
                ? 'Unstaged'
                : selectedFile.kind === 'untracked'
                  ? 'Untracked'
                  : 'Conflict'
          }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex h-full items-center justify-center">
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <div
            class="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          />
          <span class="text-sm">Loading diff...</span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!selectedFile"
        class="flex h-full flex-col items-center justify-center text-slate-500"
      >
        <FileQuestion class="mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">Select a file to view diff</p>
      </div>

      <!-- Untracked file -->
      <div
        v-else-if="selectedFile.kind === 'untracked'"
        class="flex h-full flex-col items-center justify-center text-slate-500"
      >
        <File class="mb-3 h-12 w-12 text-teal-400/50" />
        <p class="text-sm">Untracked file</p>
        <p class="mt-1 text-xs text-slate-600">Stage the file to see its contents in the diff</p>
      </div>

      <!-- No diff (empty) -->
      <div
        v-else-if="!parsedDiff || parsedDiff.length === 0"
        class="flex h-full flex-col items-center justify-center text-slate-500"
      >
        <File class="mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">No changes to display</p>
      </div>

      <!-- Diff content -->
      <DiffHunks v-else :hunks="parsedDiff" />
    </div>
  </div>
</template>
