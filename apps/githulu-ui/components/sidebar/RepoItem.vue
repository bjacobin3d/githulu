<script setup lang="ts">
import { GitBranch, Circle, ArrowUp, ArrowDown, AlertTriangle, Trash2 } from 'lucide-vue-next';
import type { Repo } from '~/types/githulu';

const props = defineProps<{
  repo: Repo;
}>();

const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();

const isSelected = computed(() => reposStore.selectedRepoId === props.repo.id);
const status = computed(() => gitStore.getStatus(props.repo.id));
const isLoading = computed(() => gitStore.isLoading(props.repo.id));

// Fetch status when mounted
onMounted(() => {
  gitStore.fetchStatus(props.repo.id);
});

function handleSelect() {
  reposStore.selectRepo(props.repo.id);
  uiStore.clearSelectedFile();
}

async function handleRemove(event: Event) {
  event.stopPropagation();
  
  if (!confirm(`Remove "${props.repo.displayName}" from githulu?\n\nThis will not delete the repository from your disk.`)) {
    return;
  }

  try {
    await reposStore.removeRepo(props.repo.id);
    uiStore.showToast('Repository removed', 'success');
  } catch (err) {
    uiStore.showToast(
      err instanceof Error ? err.message : 'Failed to remove repository',
      'error'
    );
  }
}
</script>

<template>
  <div
    class="sidebar-item group"
    :class="{ 'sidebar-item-selected': isSelected }"
    @click="handleSelect"
  >
    <!-- Repo icon -->
    <div class="flex-shrink-0">
      <GitBranch class="w-4 h-4 text-primary-400" />
    </div>

    <!-- Repo info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="text-sm truncate" :class="isSelected ? 'text-slate-100' : 'text-slate-300'">
          {{ repo.displayName }}
        </span>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="w-3 h-3">
          <Circle class="w-3 h-3 text-primary-400 animate-pulse" />
        </div>
      </div>

      <!-- Status indicators -->
      <div v-if="status" class="flex items-center gap-2 mt-0.5">
        <!-- Branch name -->
        <span class="text-2xs text-slate-500 truncate max-w-[100px]">
          {{ status.branch || 'detached' }}
        </span>

        <!-- Ahead/behind badges -->
        <div class="flex items-center gap-1">
          <span
            v-if="status.ahead > 0"
            class="status-badge status-badge-ahead"
            title="Commits ahead of upstream"
          >
            <ArrowUp class="w-2.5 h-2.5" />
            {{ status.ahead }}
          </span>
          <span
            v-if="status.behind > 0"
            class="status-badge status-badge-behind"
            title="Commits behind upstream"
          >
            <ArrowDown class="w-2.5 h-2.5" />
            {{ status.behind }}
          </span>
        </div>

        <!-- Dirty indicator -->
        <span
          v-if="status.isDirty"
          class="status-badge status-badge-dirty"
          title="Uncommitted changes"
        >
          <Circle class="w-2 h-2 fill-current" />
        </span>

        <!-- Rebase indicator -->
        <span
          v-if="status.rebase.inProgress"
          class="status-badge status-badge-conflict"
          title="Rebase in progress"
        >
          <AlertTriangle class="w-2.5 h-2.5" />
        </span>
      </div>
    </div>

    <!-- Remove button -->
    <button
      class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error/20 transition-opacity"
      title="Remove repository"
      @click="handleRemove"
    >
      <Trash2 class="w-3 h-3 text-error" />
    </button>
  </div>
</template>
