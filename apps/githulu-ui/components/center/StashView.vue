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
  if (
    !confirm(
      `Are you sure you want to delete stash@{${stash.index}}?\n\n"${stash.message}"\n\nThis action cannot be undone.`
    )
  ) {
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
  <div class="flex h-full flex-col p-4">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Archive class="text-primary-400 h-5 w-5" />
        <h3 class="text-sm font-semibold text-slate-200">Stashes</h3>
        <span v-if="!isLoading" class="text-2xs text-slate-500">
          {{ stashes.length }}
        </span>
      </div>
      <button
        class="bg-primary-600 hover:bg-primary-500 flex items-center gap-1 rounded px-2 py-1 text-xs text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="isLoading"
        @click="openStashModal"
      >
        <Plus class="h-3 w-3" />
        New Stash
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-8 text-center text-slate-500">
      <Archive class="mx-auto mb-3 h-12 w-12 animate-pulse opacity-50" />
      <p class="text-sm">Loading stashes...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="stashes.length === 0" class="py-8 text-center text-slate-500">
      <Archive class="mx-auto mb-3 h-12 w-12 opacity-50" />
      <p class="text-sm">No stashes yet</p>
      <p class="mt-1 text-xs text-slate-600">Save your uncommitted changes for later</p>
    </div>

    <!-- Stash List -->
    <div v-else class="flex-1 space-y-2 overflow-y-auto">
      <div
        v-for="stash in stashes"
        :key="stash.index"
        class="bg-bg-secondary hover:bg-bg-hover rounded-md p-3 transition-colors"
      >
        <div class="mb-2 flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span
                class="text-2xs text-primary-400 bg-primary-900/30 rounded px-1.5 py-0.5 font-mono"
              >
                stash@{{ '{' + stash.index + '}' }}
              </span>
              <span class="text-2xs text-slate-500">{{ stash.relativeDate }}</span>
            </div>
            <p class="mb-1 truncate text-sm text-slate-200">
              {{ stash.message || 'WIP' }}
            </p>
            <div class="text-2xs flex items-center gap-1 text-slate-500">
              <GitBranch class="h-3 w-3" />
              <span>{{ stash.branch }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <button
            class="text-2xs bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 flex items-center gap-1 rounded px-2 py-1 transition-colors"
            @click="handlePopStash(stash)"
            title="Pop (apply and remove)"
          >
            <Check class="h-3 w-3" />
            Pop
          </button>
          <button
            class="text-2xs flex items-center gap-1 rounded bg-slate-600/20 px-2 py-1 text-slate-300 transition-colors hover:bg-slate-600/30"
            @click="handleApplyStash(stash)"
            title="Apply (keep stash)"
          >
            <Plus class="h-3 w-3" />
            Apply
          </button>
          <button
            class="text-2xs flex items-center gap-1 rounded bg-red-600/20 px-2 py-1 text-red-300 transition-colors hover:bg-red-600/30"
            @click="handleDropStash(stash)"
            title="Delete stash"
          >
            <X class="h-3 w-3" />
            Drop
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
