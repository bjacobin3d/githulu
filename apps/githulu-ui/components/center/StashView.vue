<script setup lang="ts">
import { Archive, Plus, GitBranch, X, Check } from 'lucide-vue-next';
import { useGitStore } from '~/stores/git';
import { useUIStore } from '~/stores/ui';
import type { StashInfo } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const gitStore = useGitStore();
const uiStore = useUIStore();

const isLoading = ref(false);

// Get stashes from store
const stashes = computed(() => {
  return gitStore.getStashes(props.repoId)?.stashes || [];
});

// Load stashes when mounted or repoId changes
watch(
  () => props.repoId,
  async (newId) => {
    if (newId) {
      await loadStashes();
    }
  },
  { immediate: true }
);

async function loadStashes() {
  isLoading.value = true;
  try {
    await gitStore.fetchStashes(props.repoId);
  } catch (err) {
    console.error('[StashView] Failed to load stashes:', err);
  } finally {
    isLoading.value = false;
  }
}

function openStashModal() {
  uiStore.openStashModal();
}

async function handlePopStash(stash: StashInfo) {
  const result = await gitStore.popStash(props.repoId, stash.index);
  
  if (result?.success) {
    uiStore.showToast(`Stash popped: ${stash.message}`, 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to pop stash', 'error');
  }
}

async function handleApplyStash(stash: StashInfo) {
  const result = await gitStore.applyStash(props.repoId, stash.index);
  
  if (result?.success) {
    uiStore.showToast(`Stash applied: ${stash.message}`, 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to apply stash', 'error');
  }
}

async function handleDropStash(stash: StashInfo) {
  if (!confirm(`Are you sure you want to delete stash@{${stash.index}}?\n\n"${stash.message}"\n\nThis action cannot be undone.`)) {
    return;
  }

  const result = await gitStore.dropStash(props.repoId, stash.index);
  
  if (result?.success) {
    uiStore.showToast('Stash deleted', 'success');
  } else {
    uiStore.showToast(result?.stderr || 'Failed to delete stash', 'error');
  }
}
</script>

<template>
  <div class="p-4 h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Archive class="w-5 h-5 text-primary-400" />
        <h3 class="text-sm font-semibold text-slate-200">Stashes</h3>
        <span v-if="!isLoading" class="text-2xs text-slate-500">
          {{ stashes.length }}
        </span>
      </div>
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading"
        @click="openStashModal"
      >
        <Plus class="w-3 h-3" />
        New Stash
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8 text-slate-500">
      <Archive class="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
      <p class="text-sm">Loading stashes...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="stashes.length === 0" class="text-center py-8 text-slate-500">
      <Archive class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">No stashes yet</p>
      <p class="text-xs text-slate-600 mt-1">Save your uncommitted changes for later</p>
    </div>

    <!-- Stash List -->
    <div v-else class="flex-1 overflow-y-auto space-y-2">
      <div
        v-for="stash in stashes"
        :key="stash.index"
        class="bg-bg-secondary rounded-md p-3 hover:bg-bg-hover transition-colors"
      >
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xs font-mono text-primary-400 bg-primary-900/30 px-1.5 py-0.5 rounded">
                stash@{{ '{' + stash.index + '}' }}
              </span>
              <span class="text-2xs text-slate-500">{{ stash.relativeDate }}</span>
            </div>
            <p class="text-sm text-slate-200 mb-1 truncate">
              {{ stash.message || 'WIP' }}
            </p>
            <div class="flex items-center gap-1 text-2xs text-slate-500">
              <GitBranch class="w-3 h-3" />
              <span>{{ stash.branch }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 px-2 py-1 text-2xs bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 rounded transition-colors"
            @click="handlePopStash(stash)"
            title="Pop (apply and remove)"
          >
            <Check class="w-3 h-3" />
            Pop
          </button>
          <button
            class="flex items-center gap-1 px-2 py-1 text-2xs bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 rounded transition-colors"
            @click="handleApplyStash(stash)"
            title="Apply (keep stash)"
          >
            <Plus class="w-3 h-3" />
            Apply
          </button>
          <button
            class="flex items-center gap-1 px-2 py-1 text-2xs bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors"
            @click="handleDropStash(stash)"
            title="Delete stash"
          >
            <X class="w-3 h-3" />
            Drop
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
