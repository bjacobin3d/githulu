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

  if (
    !confirm(
      `Remove "${props.repo.displayName}" from githulu?\n\nThis will not delete the repository from your disk.`
    )
  ) {
    return;
  }

  try {
    await reposStore.removeRepo(props.repo.id);
    uiStore.showToast('Repository removed', 'success');
  } catch (err) {
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to remove repository', 'error');
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
      <GitBranch class="text-primary-400 h-4 w-4" />
    </div>

    <!-- Repo info -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5">
        <span class="truncate text-sm" :class="isSelected ? 'text-slate-100' : 'text-slate-300'">
          {{ repo.displayName }}
        </span>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="h-3 w-3">
          <Circle class="text-primary-400 h-3 w-3 animate-pulse" />
        </div>
      </div>

      <!-- Status indicators -->
      <div v-if="status" class="mt-0.5 flex items-center gap-2">
        <!-- Branch name -->
        <span class="text-2xs max-w-[100px] truncate text-slate-500">
          {{ status.branch || 'detached' }}
        </span>

        <!-- Ahead/behind badges -->
        <div class="flex items-center gap-1">
          <span
            v-if="status.ahead > 0"
            class="status-badge status-badge-ahead"
            title="Commits ahead of upstream"
          >
            <ArrowUp class="h-2.5 w-2.5" />
            {{ status.ahead }}
          </span>
          <span
            v-if="status.behind > 0"
            class="status-badge status-badge-behind"
            title="Commits behind upstream"
          >
            <ArrowDown class="h-2.5 w-2.5" />
            {{ status.behind }}
          </span>
        </div>

        <!-- Dirty indicator -->
        <span
          v-if="status.isDirty"
          class="status-badge status-badge-dirty"
          title="Uncommitted changes"
        >
          <Circle class="h-2 w-2 fill-current" />
        </span>

        <!-- Rebase indicator -->
        <span
          v-if="status.rebase.inProgress"
          class="status-badge status-badge-conflict"
          title="Rebase in progress"
        >
          <AlertTriangle class="h-2.5 w-2.5" />
        </span>
      </div>
    </div>

    <!-- Remove button -->
    <button
      class="hover:bg-error/20 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
      title="Remove repository"
      @click="handleRemove"
    >
      <Trash2 class="text-error h-3 w-3" />
    </button>
  </div>
</template>
