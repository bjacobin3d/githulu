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
      class="flex items-center gap-3 px-4 py-2 border-b border-bg-hover bg-bg-surface/50"
    >
      <div class="text-xs text-slate-500">
        {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }}
      </div>
    </div>

    <!-- File list -->
    <div class="divide-y divide-bg-hover">
      <div
        v-for="file in files"
        :key="file.path"
        class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-bg-hover group"
        :class="{ 'bg-primary-900/30': selectedPath === file.path }"
        @click="handleSelect(file)"
      >
        <!-- Staging Checkbox with three states -->
        <button
          class="flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center"
          :class="getCheckboxClasses(file.checkState)"
          :title="file.checkState === 'checked' ? 'Staged - click to unstage' : file.checkState === 'indeterminate' ? 'Partially staged - click to unstage' : 'Click to stage'"
          @click="handleToggleStaging(file, $event)"
        >
          <!-- Checked state: checkmark -->
          <Check v-if="file.checkState === 'checked'" class="w-3 h-3 text-white" />
          <!-- Indeterminate state: minus/dash -->
          <Minus v-else-if="file.checkState === 'indeterminate'" class="w-3 h-3 text-white" />
          <!-- Unchecked: empty -->
        </button>

        <!-- Status icon -->
        <div
          class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded"
          :class="getStatusIcon(file.status).color"
        >
          <component :is="getStatusIcon(file.status).icon" class="w-3.5 h-3.5" />
        </div>

        <!-- File path -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-200 truncate font-mono">
              {{ file.path }}
            </span>
            <span
              v-if="file.oldPath"
              class="text-xs text-slate-500"
            >
              (from {{ file.oldPath }})
            </span>
          </div>
        </div>

        <!-- Status badge -->
        <span class="text-2xs px-1.5 py-0.5 rounded bg-bg-elevated text-slate-400">
          {{ getStatusLabel(file.status) }}
        </span>

        <!-- Actions on hover -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- Open in editor -->
          <button
            class="p-1 rounded hover:bg-bg-elevated"
            title="Open in Cursor"
            @click.stop="handleOpenInEditor(file)"
          >
            <ExternalLink class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="files.length === 0"
      class="flex items-center justify-center py-8 text-slate-500 text-sm"
    >
      No changed files
    </div>
  </div>
</template>
