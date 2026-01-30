<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useGitStore } from '~/stores/git';
import { useUIStore } from '~/stores/ui';
import { useReposStore } from '~/stores/repos';

const gitStore = useGitStore();
const uiStore = useUIStore();
const reposStore = useReposStore();

const createMessage = ref('');
const includeUntracked = ref(false);
const isCreating = ref(false);

const isVisible = computed(() => uiStore.showStashModal);

function closeModal() {
  createMessage.value = '';
  includeUntracked.value = false;
  uiStore.closeStashModal();
}

async function handleCreateStash() {
  if (isCreating.value || !reposStore.selectedRepoId) return;

  isCreating.value = true;
  try {
    const result = await gitStore.createStash(
      reposStore.selectedRepoId,
      createMessage.value || undefined,
      includeUntracked.value
    );

    if (result?.success) {
      uiStore.showToast('Stash created successfully', 'success');
      closeModal();
    } else {
      uiStore.showToast(result?.stderr || 'Failed to create stash', 'error');
    }
  } catch (err) {
    console.error('[CreateStashModal] Create stash error:', err);
    uiStore.showToast('Failed to create stash', 'error');
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="closeModal"
  >
    <div class="bg-bg-primary mx-4 w-full max-w-md rounded-lg p-6 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-200">Create Stash</h3>
        <button
          class="hover:bg-bg-hover rounded p-1 text-slate-400 transition-colors hover:text-slate-200"
          @click="closeModal"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Message Input -->
        <div>
          <label class="mb-1 block text-xs text-slate-400"> Message (optional) </label>
          <input
            v-model="createMessage"
            type="text"
            placeholder="WIP: feature description"
            class="bg-bg-secondary border-bg-hover focus:border-primary-500 w-full rounded border px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
            :disabled="isCreating"
            @keydown.enter="handleCreateStash"
          />
        </div>

        <!-- Include Untracked Checkbox -->
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="includeUntracked"
            type="checkbox"
            class="border-bg-hover text-primary-500 focus:ring-primary-500 bg-bg-secondary h-4 w-4 rounded focus:ring-offset-0"
            :disabled="isCreating"
          />
          <span class="text-sm text-slate-300">Include untracked files</span>
        </label>
      </div>

      <!-- Modal Actions -->
      <div class="mt-6 flex items-center justify-end gap-2">
        <button
          class="px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
          :disabled="isCreating"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          class="bg-primary-600 hover:bg-primary-500 rounded px-3 py-1.5 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isCreating"
          @click="handleCreateStash"
        >
          {{ isCreating ? 'Creating...' : 'Create Stash' }}
        </button>
      </div>
    </div>
  </div>
</template>
