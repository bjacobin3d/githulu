<script setup lang="ts">
import { X, GitMerge, AlertTriangle } from 'lucide-vue-next';

const uiStore = useUIStore();
const reposStore = useReposStore();
const gitStore = useGitStore();

const targetBranch = ref('origin/main');
const isSubmitting = ref(false);
const error = ref('');

const selectedRepo = computed(() => reposStore.selectedRepo);
const branches = computed(() => 
  selectedRepo.value ? gitStore.getBranches(selectedRepo.value.id) : null
);

// Fetch branches when modal opens
watch(() => uiStore.showRebaseModal, async (visible) => {
  if (visible && selectedRepo.value) {
    targetBranch.value = 'origin/main';
    error.value = '';
    
    if (!branches.value) {
      await gitStore.fetchBranches(selectedRepo.value.id);
    }
  }
});

async function handleSubmit() {
  if (!targetBranch.value || isSubmitting.value || !selectedRepo.value) return;

  isSubmitting.value = true;
  error.value = '';

  try {
    const result = await gitStore.rebaseStart(selectedRepo.value.id, targetBranch.value);

    if (result?.success) {
      uiStore.closeRebaseModal();
      uiStore.showToast('Rebase completed successfully', 'success');
    } else {
      // Check if it's a conflict situation
      const status = gitStore.getStatus(selectedRepo.value.id);
      if (status?.rebase.inProgress && status.rebase.conflicts.length > 0) {
        uiStore.closeRebaseModal();
        uiStore.showToast('Rebase paused - resolve conflicts to continue', 'info');
      } else {
        error.value = result?.stderr || 'Rebase failed';
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start rebase';
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  uiStore.closeRebaseModal();
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.showRebaseModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60"
          @click="handleClose"
        />

        <!-- Dialog -->
        <div class="relative w-full max-w-md bg-bg-surface border border-bg-hover rounded-lg shadow-xl animate-slide-in">
          <!-- Header -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-bg-hover">
            <div class="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
              <GitMerge class="w-4 h-4 text-accent-400" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Rebase Branch</h3>
            <button
              class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit">
            <div class="px-4 py-4 space-y-4">
              <!-- Info banner -->
              <div class="flex items-start gap-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-md">
                <AlertTriangle class="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <div class="text-sm text-slate-300">
                  <p class="font-medium text-primary-300 mb-1">Rebase creates a clean git history</p>
                  <p class="text-slate-400">
                    Your commits will be replayed on top of the target branch.
                    If there are conflicts, you'll resolve them one commit at a time.
                  </p>
                </div>
              </div>

              <div>
                <label class="block text-sm text-slate-400 mb-2">
                  Rebase onto
                </label>
                <select
                  v-model="targetBranch"
                  class="w-full px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200"
                >
                  <optgroup label="Common">
                    <option value="origin/main">origin/main</option>
                    <option value="origin/master">origin/master</option>
                    <option value="origin/develop">origin/develop</option>
                  </optgroup>
                  <optgroup v-if="branches?.remote.length" label="Remote Branches">
                    <option
                      v-for="branch in branches.remote"
                      :key="branch.name"
                      :value="branch.name"
                    >
                      {{ branch.name }}
                    </option>
                  </optgroup>
                  <optgroup v-if="branches?.local.length" label="Local Branches">
                    <option
                      v-for="branch in branches.local"
                      :key="branch.name"
                      :value="branch.name"
                    >
                      {{ branch.name }}
                    </option>
                  </optgroup>
                </select>
              </div>

              <p v-if="error" class="text-sm text-error">
                {{ error }}
              </p>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 px-4 py-3 border-t border-bg-hover">
              <button
                type="button"
                class="px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-sm text-slate-200 rounded-md transition-colors"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!targetBranch || isSubmitting"
                class="px-4 py-2 bg-accent-600 hover:bg-accent-500 disabled:bg-accent-600/50 disabled:cursor-not-allowed text-sm text-white rounded-md transition-colors glow-orange-on-hover"
              >
                {{ isSubmitting ? 'Rebasing...' : 'Start Rebase' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
