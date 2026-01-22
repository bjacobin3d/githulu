<script setup lang="ts">
import { 
  GitCommit, 
  User, 
  Clock, 
  Hash, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Minus,
  Pencil,
  ArrowRight,
  Copy,
  Check
} from 'lucide-vue-next';
import type { CommitFileChange, DiffResult } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const uiStore = useUIStore();

const selectedCommit = computed(() => uiStore.selectedCommit);
const isLoading = ref(false);
const files = ref<CommitFileChange[]>([]);
const expandedFiles = ref<Set<string>>(new Set());
const fileDiffs = ref<Map<string, DiffResult>>(new Map());
const loadingDiffs = ref<Set<string>>(new Set());
const copiedHash = ref(false);

// Load commit details when selected commit changes
watch(selectedCommit, async (commit) => {
  if (!commit || !window.githulu) {
    files.value = [];
    expandedFiles.value.clear();
    fileDiffs.value.clear();
    return;
  }

  isLoading.value = true;
  try {
    const details = await window.githulu.git.showCommit(props.repoId, commit.hash);
    files.value = details.files;
  } catch (err) {
    console.error('Failed to load commit details:', err);
    uiStore.showToast('Failed to load commit details', 'error');
  } finally {
    isLoading.value = false;
  }
}, { immediate: true });

async function toggleFileExpand(file: CommitFileChange) {
  const path = file.path;
  
  if (expandedFiles.value.has(path)) {
    expandedFiles.value.delete(path);
    expandedFiles.value = new Set(expandedFiles.value);
  } else {
    expandedFiles.value.add(path);
    expandedFiles.value = new Set(expandedFiles.value);
    
    // Load diff if not already loaded
    if (!fileDiffs.value.has(path) && !loadingDiffs.value.has(path) && selectedCommit.value) {
      loadingDiffs.value.add(path);
      loadingDiffs.value = new Set(loadingDiffs.value);
      
      try {
        const diff = await window.githulu?.git.diffCommitFile(
          props.repoId,
          selectedCommit.value.hash,
          path
        );
        if (diff) {
          fileDiffs.value.set(path, diff);
          fileDiffs.value = new Map(fileDiffs.value);
        }
      } catch (err) {
        console.error('Failed to load file diff:', err);
      } finally {
        loadingDiffs.value.delete(path);
        loadingDiffs.value = new Set(loadingDiffs.value);
      }
    }
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'A':
      return { icon: Plus, color: 'text-success', label: 'Added' };
    case 'D':
      return { icon: Minus, color: 'text-error', label: 'Deleted' };
    case 'M':
      return { icon: Pencil, color: 'text-warning', label: 'Modified' };
    case 'R':
      return { icon: ArrowRight, color: 'text-primary-400', label: 'Renamed' };
    default:
      return { icon: Pencil, color: 'text-slate-400', label: status };
  }
}

async function copyHash() {
  if (!selectedCommit.value) return;
  
  try {
    await navigator.clipboard.writeText(selectedCommit.value.hash);
    copiedHash.value = true;
    setTimeout(() => {
      copiedHash.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy hash:', err);
  }
}

// Parse diff into hunks for rendering
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
    if (line.startsWith('commit ') ||
        line.startsWith('Author:') ||
        line.startsWith('Date:') ||
        line.startsWith('diff --git') || 
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('\\') ||
        line.trim() === '') {
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
        <GitCommit class="w-4 h-4 text-primary-400" />
        <span class="text-sm font-medium text-slate-200">
          Commit Details
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <!-- Empty state -->
      <div
        v-if="!selectedCommit"
        class="flex flex-col items-center justify-center h-full text-slate-500"
      >
        <GitCommit class="w-12 h-12 mb-3 opacity-50" />
        <p class="text-sm">Select a commit to view details</p>
      </div>

      <!-- Loading state -->
      <div
        v-else-if="isLoading"
        class="flex items-center justify-center h-full"
      >
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span class="text-sm">Loading commit details...</span>
        </div>
      </div>

      <!-- Commit details -->
      <div v-else class="divide-y divide-bg-hover">
        <!-- Commit info header -->
        <div class="p-4 space-y-3">
          <!-- Subject -->
          <h3 class="text-sm font-medium text-slate-200">
            {{ selectedCommit.subject }}
          </h3>

          <!-- Body (if present) -->
          <p v-if="selectedCommit.body" class="text-sm text-slate-400 whitespace-pre-wrap">
            {{ selectedCommit.body }}
          </p>

          <!-- Meta info -->
          <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <!-- Hash with copy button -->
            <div class="flex items-center gap-1.5">
              <Hash class="w-3.5 h-3.5" />
              <code class="font-mono text-primary-400">{{ selectedCommit.shortHash }}</code>
              <button
                class="p-0.5 rounded hover:bg-bg-hover transition-colors"
                title="Copy full hash"
                @click="copyHash"
              >
                <Check v-if="copiedHash" class="w-3.5 h-3.5 text-success" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Author -->
            <div class="flex items-center gap-1.5">
              <User class="w-3.5 h-3.5" />
              <span>{{ selectedCommit.author }}</span>
            </div>

            <!-- Date -->
            <div class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5" />
              <span>{{ selectedCommit.relativeDate }}</span>
            </div>
          </div>
        </div>

        <!-- Changed files section -->
        <div class="py-2">
          <div class="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Changed Files ({{ files.length }})
          </div>

          <!-- File list -->
          <div class="divide-y divide-bg-hover/50">
            <div v-for="file in files" :key="file.path">
              <!-- File header -->
              <button
                class="w-full flex items-center gap-2 px-4 py-2 hover:bg-bg-hover transition-colors"
                @click="toggleFileExpand(file)"
              >
                <!-- Expand/collapse icon -->
                <component
                  :is="expandedFiles.has(file.path) ? ChevronDown : ChevronRight"
                  class="w-4 h-4 text-slate-500"
                />

                <!-- Status icon -->
                <div
                  class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded"
                  :class="getStatusIcon(file.status).color"
                >
                  <component :is="getStatusIcon(file.status).icon" class="w-3.5 h-3.5" />
                </div>

                <!-- File path -->
                <div class="flex-1 min-w-0 text-left">
                  <span class="text-sm text-slate-200 truncate font-mono">
                    {{ file.path }}
                  </span>
                  <span v-if="file.oldPath" class="text-xs text-slate-500 ml-2">
                    (from {{ file.oldPath }})
                  </span>
                </div>

                <!-- Status badge -->
                <span class="text-2xs px-1.5 py-0.5 rounded bg-bg-elevated text-slate-400">
                  {{ getStatusIcon(file.status).label }}
                </span>
              </button>

              <!-- Expanded diff content -->
              <div
                v-if="expandedFiles.has(file.path)"
                class="border-t border-bg-hover bg-bg-elevated/30"
              >
                <!-- Loading diff -->
                <div
                  v-if="loadingDiffs.has(file.path)"
                  class="flex items-center justify-center py-4"
                >
                  <div class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>

                <!-- Diff content -->
                <div
                  v-else-if="fileDiffs.get(file.path)"
                  class="font-mono text-xs overflow-x-auto"
                >
                  <template v-for="(hunk, hunkIndex) in parseDiffText(fileDiffs.get(file.path)?.diffText || '')" :key="hunkIndex">
                    <!-- Hunk header -->
                    <div class="diff-line-header px-4 py-1 sticky top-0 z-10 text-2xs">
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
                      <div class="flex-shrink-0 w-16 flex text-2xs text-slate-600 select-none">
                        <span class="w-8 px-1 text-right border-r border-bg-hover">
                          {{ line.oldLineNum ?? '' }}
                        </span>
                        <span class="w-8 px-1 text-right border-r border-bg-hover">
                          {{ line.newLineNum ?? '' }}
                        </span>
                      </div>

                      <!-- Line content -->
                      <div class="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                        <span
                          :class="[
                            line.type === 'addition' && 'text-green-400',
                            line.type === 'deletion' && 'text-red-400',
                            line.type === 'context' && 'text-slate-300',
                          ]"
                        >{{ line.content || ' ' }}</span>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- No diff available -->
                <div v-else class="py-4 text-center text-xs text-slate-500">
                  No diff available for this file
                </div>
              </div>
            </div>
          </div>

          <!-- Empty files state -->
          <div
            v-if="files.length === 0"
            class="py-8 text-center text-sm text-slate-500"
          >
            No files changed in this commit
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
