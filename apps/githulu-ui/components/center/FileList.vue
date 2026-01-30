<script setup lang="ts">
import { File, Plus, Minus, Pencil, ArrowRight, ExternalLink, Check } from 'lucide-vue-next';
import type { FileChange } from '~/types/githulu';

// Extended file type with check state
interface FileWithCheckState extends FileChange {
  checkState: 'checked' | 'indeterminate' | 'unchecked';
  isStaged: boolean;
}

const props = defineProps<{
  repoId: string;
  files: FileWithCheckState[];
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();

const selectedPath = computed(() => uiStore.selectedFile?.path);

function getStatusIcon(status: string) {
  switch (status) {
    case 'A':
      return { icon: Plus, color: 'text-success' };
    case 'D':
      return { icon: Minus, color: 'text-error' };
    case 'M':
      return { icon: Pencil, color: 'text-warning' };
    case 'R':
      return { icon: ArrowRight, color: 'text-primary-400' };
    case '?':
      return { icon: Plus, color: 'text-teal-400' };
    default:
      return { icon: File, color: 'text-slate-400' };
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'A':
      return 'Added';
    case 'D':
      return 'Deleted';
    case 'M':
      return 'Modified';
    case 'R':
      return 'Renamed';
    case '?':
      return 'New';
    default:
      return status;
  }
}

function handleSelect(file: FileWithCheckState) {
  uiStore.selectFile(props.repoId, {
    path: file.path,
    staged: file.isStaged,
    kind: file.kind,
  });
}

// Toggle staging state when checkbox is clicked
async function handleToggleStaging(file: FileWithCheckState, event: Event) {
  event.stopPropagation();

  if (file.checkState === 'checked' || file.checkState === 'indeterminate') {
    // Currently staged (fully or partially) - unstage it
    await gitStore.unstageFile(props.repoId, file.path);
  } else {
    // Not staged - stage it
    await gitStore.stageFile(props.repoId, file.path);
  }
}

async function handleOpenInEditor(file: FileWithCheckState) {
  if (!window.githulu) return;

  const reposStore = useReposStore();
  const repo = reposStore.getRepoById(props.repoId);
  if (!repo) return;

  const fullPath = `${repo.path}/${file.path}`;
  await window.githulu.utils.openInEditor(fullPath);
}

// Get checkbox classes based on check state
function getCheckboxClasses(checkState: 'checked' | 'indeterminate' | 'unchecked') {
  switch (checkState) {
    case 'checked':
      return 'bg-success border-success';
    case 'indeterminate':
      return 'bg-warning border-warning';
    case 'unchecked':
    default:
      return 'border-slate-500 hover:border-slate-400';
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div
      v-if="files.length > 0"
      class="border-bg-hover bg-bg-surface/50 flex items-center gap-3 border-b px-4 py-2"
    >
      <div class="text-xs text-slate-500">
        {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }}
      </div>
    </div>

    <!-- File list -->
    <div class="divide-bg-hover divide-y">
      <div
        v-for="file in files"
        :key="file.path"
        class="hover:bg-bg-hover group flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors"
        :class="{ 'bg-primary-900/30': selectedPath === file.path }"
        @click="handleSelect(file)"
      >
        <!-- Staging Checkbox with three states -->
        <button
          class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors"
          :class="getCheckboxClasses(file.checkState)"
          :title="
            file.checkState === 'checked'
              ? 'Staged - click to unstage'
              : file.checkState === 'indeterminate'
                ? 'Partially staged - click to unstage'
                : 'Click to stage'
          "
          @click="handleToggleStaging(file, $event)"
        >
          <!-- Checked state: checkmark -->
          <Check v-if="file.checkState === 'checked'" class="h-3 w-3 text-white" />
          <!-- Indeterminate state: minus/dash -->
          <Minus v-else-if="file.checkState === 'indeterminate'" class="h-3 w-3 text-white" />
          <!-- Unchecked: empty -->
        </button>

        <!-- Status icon -->
        <div
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
          :class="getStatusIcon(file.status).color"
        >
          <component :is="getStatusIcon(file.status).icon" class="h-3.5 w-3.5" />
        </div>

        <!-- File path -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-mono text-sm text-slate-200">
              {{ file.path }}
            </span>
            <span v-if="file.oldPath" class="text-xs text-slate-500">
              (from {{ file.oldPath }})
            </span>
          </div>
        </div>

        <!-- Status badge -->
        <span class="text-2xs bg-bg-elevated rounded px-1.5 py-0.5 text-slate-400">
          {{ getStatusLabel(file.status) }}
        </span>

        <!-- Actions on hover -->
        <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <!-- Open in editor -->
          <button
            class="hover:bg-bg-elevated rounded p-1"
            title="Open in Cursor"
            @click.stop="handleOpenInEditor(file)"
          >
            <ExternalLink class="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="files.length === 0"
      class="flex items-center justify-center py-8 text-sm text-slate-500"
    >
      No changed files
    </div>
  </div>
</template>
