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
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-bg-primary rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-slate-200">Create Stash</h3>
        <button
          class="p-1 rounded hover:bg-bg-hover transition-colors text-slate-400 hover:text-slate-200"
          @click="closeModal"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Message Input -->
        <div>
          <label class="block text-xs text-slate-400 mb-1">
            Message (optional)
          </label>
          <input
            v-model="createMessage"
            type="text"
            placeholder="WIP: feature description"
            class="w-full px-3 py-2 bg-bg-secondary border border-bg-hover rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500"
            :disabled="isCreating"
            @keydown.enter="handleCreateStash"
          />
        </div>

        <!-- Include Untracked Checkbox -->
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="includeUntracked"
            type="checkbox"
            class="w-4 h-4 rounded border-bg-hover text-primary-500 focus:ring-primary-500 focus:ring-offset-0 bg-bg-secondary"
            :disabled="isCreating"
          />
          <span class="text-sm text-slate-300">Include untracked files</span>
        </label>
      </div>

      <!-- Modal Actions -->
      <div class="flex items-center justify-end gap-2 mt-6">
        <button
          class="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          :disabled="isCreating"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isCreating"
          @click="handleCreateStash"
        >
          {{ isCreating ? 'Creating...' : 'Create Stash' }}
        </button>
      </div>
    </div>
  </div>
</template>
