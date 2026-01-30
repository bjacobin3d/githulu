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
  Check,
} from 'lucide-vue-next';
import type { CommitFileChange, DiffResult } from '~/types/githulu';
import { parseDiffText } from '~/composables/useDiffParser';

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
watch(
  selectedCommit,
  async (commit) => {
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
  },
  { immediate: true }
);

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
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <!-- Header -->
    <div class="panel-header flex-shrink-0">
      <div class="flex items-center gap-2">
        <GitCommit class="text-primary-400 h-4 w-4" />
        <span class="text-sm font-medium text-slate-200"> Commit Details </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1">
      <!-- Empty state -->
      <div
        v-if="!selectedCommit"
        class="flex h-full flex-col items-center justify-center text-slate-500"
      >
        <GitCommit class="mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">Select a commit to view details</p>
      </div>

      <!-- Loading state -->
      <div v-else-if="isLoading" class="flex h-full items-center justify-center">
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <div
            class="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          />
          <span class="text-sm">Loading commit details...</span>
        </div>
      </div>

      <!-- Commit details -->
      <div v-else class="divide-bg-hover divide-y">
        <!-- Commit info header -->
        <div class="space-y-3 p-4">
          <!-- Subject -->
          <h3 class="text-sm font-medium text-slate-200">
            {{ selectedCommit.subject }}
          </h3>

          <!-- Body (if present) -->
          <p v-if="selectedCommit.body" class="whitespace-pre-wrap text-sm text-slate-400">
            {{ selectedCommit.body }}
          </p>

          <!-- Meta info -->
          <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <!-- Hash with copy button -->
            <div class="flex items-center gap-1.5">
              <Hash class="h-3.5 w-3.5" />
              <code class="text-primary-400 font-mono">{{ selectedCommit.shortHash }}</code>
              <button
                class="hover:bg-bg-hover rounded p-0.5 transition-colors"
                title="Copy full hash"
                @click="copyHash"
              >
                <Check v-if="copiedHash" class="text-success h-3.5 w-3.5" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Author -->
            <div class="flex items-center gap-1.5">
              <User class="h-3.5 w-3.5" />
              <span>{{ selectedCommit.author }}</span>
            </div>

            <!-- Date -->
            <div class="flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              <span>{{ selectedCommit.relativeDate }}</span>
            </div>
          </div>
        </div>

        <!-- Changed files section -->
        <div class="py-2">
          <div class="px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Changed Files ({{ files.length }})
          </div>

          <!-- File list -->
          <div class="divide-bg-hover/50 divide-y">
            <div v-for="file in files" :key="file.path">
              <!-- File header -->
              <button
                class="hover:bg-bg-hover flex w-full items-center gap-2 px-4 py-2 transition-colors"
                @click="toggleFileExpand(file)"
              >
                <!-- Expand/collapse icon -->
                <component
                  :is="expandedFiles.has(file.path) ? ChevronDown : ChevronRight"
                  class="h-4 w-4 text-slate-500"
                />

                <!-- Status icon -->
                <div
                  class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
                  :class="getStatusIcon(file.status).color"
                >
                  <component :is="getStatusIcon(file.status).icon" class="h-3.5 w-3.5" />
                </div>

                <!-- File path -->
                <div class="min-w-0 flex-1 text-left">
                  <span class="truncate font-mono text-sm text-slate-200">
                    {{ file.path }}
                  </span>
                  <span v-if="file.oldPath" class="ml-2 text-xs text-slate-500">
                    (from {{ file.oldPath }})
                  </span>
                </div>

                <!-- Status badge -->
                <span class="text-2xs bg-bg-elevated rounded px-1.5 py-0.5 text-slate-400">
                  {{ getStatusIcon(file.status).label }}
                </span>
              </button>

              <!-- Expanded diff content -->
              <div
                v-if="expandedFiles.has(file.path)"
                class="border-bg-hover bg-bg-elevated/30 border-t"
              >
                <!-- Loading diff -->
                <div
                  v-if="loadingDiffs.has(file.path)"
                  class="flex items-center justify-center py-4"
                >
                  <div
                    class="border-primary-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                  />
                </div>

                <!-- Diff content -->
                <DiffHunks
                  v-else-if="fileDiffs.get(file.path)"
                  :hunks="parseDiffText(fileDiffs.get(file.path)?.diffText || '')"
                />

                <!-- No diff available -->
                <div v-else class="py-4 text-center text-xs text-slate-500">
                  No diff available for this file
                </div>
              </div>
            </div>
          </div>

          <!-- Empty files state -->
          <div v-if="files.length === 0" class="py-8 text-center text-sm text-slate-500">
            No files changed in this commit
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
