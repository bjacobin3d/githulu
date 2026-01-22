<script setup lang="ts">
import { File, FileQuestion } from 'lucide-vue-next';

const uiStore = useUIStore();

const selectedFile = computed(() => uiStore.selectedFile);
const diffContent = computed(() => uiStore.diffContent);
const isLoading = computed(() => uiStore.diffLoading);

// Parse diff into hunks for rendering
const parsedDiff = computed(() => {
  if (!diffContent.value?.diffText) return null;
  return parseDiffText(diffContent.value.diffText);
});

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function parseDiffText(text: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = text.split('\n');
  
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Skip diff metadata
    if (line.startsWith('diff --git') || 
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('\\')) {
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      currentHunk = {
        header: line,
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'addition',
        content: line.slice(1),
        newLineNum: newLine++,
      });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'deletion',
        content: line.slice(1),
        oldLineNum: oldLine++,
      });
    } else {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1) || '',
        oldLineNum: oldLine++,
        newLineNum: newLine++,
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}
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
      <div v-else class="font-mono text-sm">
        <div
          v-for="(hunk, hunkIndex) in parsedDiff"
          :key="hunkIndex"
          class="border-b border-bg-hover last:border-b-0"
        >
          <!-- Hunk header -->
          <div class="diff-line-header px-4 py-1 sticky top-0 z-10">
            {{ hunk.header }}
          </div>

          <!-- Diff lines -->
          <div
            v-for="(line, lineIndex) in hunk.lines"
            :key="`${hunkIndex}-${lineIndex}`"
            class="flex"
            :class="[
              line.type === 'addition' && 'diff-line-addition',
              line.type === 'deletion' && 'diff-line-deletion',
              line.type === 'context' && 'diff-line-context',
            ]"
          >
            <!-- Line numbers -->
            <div class="flex-shrink-0 w-20 flex text-xs text-slate-600 select-none">
              <span class="w-10 px-2 text-right border-r border-bg-hover">
                {{ line.oldLineNum ?? '' }}
              </span>
              <span class="w-10 px-2 text-right border-r border-bg-hover">
                {{ line.newLineNum ?? '' }}
              </span>
            </div>

            <!-- Line content -->
            <div class="flex-1 px-4 py-0.5 whitespace-pre overflow-x-auto">
              <span
                :class="[
                  line.type === 'addition' && 'text-green-400',
                  line.type === 'deletion' && 'text-red-400',
                  line.type === 'context' && 'text-slate-300',
                ]"
              >{{ line.content || ' ' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
