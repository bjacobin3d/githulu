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
watch(
  () => uiStore.showRebaseModal,
  async (visible) => {
    if (visible && selectedRepo.value) {
      targetBranch.value = 'origin/main';
      error.value = '';

      if (!branches.value) {
        await gitStore.fetchBranches(selectedRepo.value.id);
      }
    }
  }
);

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
        <div class="absolute inset-0 bg-black/60" @click="handleClose" />

        <!-- Dialog -->
        <div
          class="bg-bg-surface border-bg-hover animate-slide-in relative w-full max-w-md rounded-lg border shadow-xl"
        >
          <!-- Header -->
          <div class="border-bg-hover flex items-center gap-3 border-b px-4 py-3">
            <div class="bg-accent-500/20 flex h-8 w-8 items-center justify-center rounded-full">
              <GitMerge class="text-accent-400 h-4 w-4" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Rebase Branch</h3>
            <button
              class="hover:bg-bg-hover rounded-md p-1.5 text-slate-400 transition-colors"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit">
            <div class="space-y-4 px-4 py-4">
              <!-- Info banner -->
              <div
                class="bg-primary-500/10 border-primary-500/30 flex items-start gap-3 rounded-md border p-3"
              >
                <AlertTriangle class="text-primary-400 mt-0.5 h-5 w-5 flex-shrink-0" />
                <div class="text-sm text-slate-300">
                  <p class="text-primary-300 mb-1 font-medium">
                    Rebase creates a clean git history
                  </p>
                  <p class="text-slate-400">
                    Your commits will be replayed on top of the target branch. If there are
                    conflicts, you'll resolve them one commit at a time.
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm text-slate-400"> Rebase onto </label>
                <select
                  v-model="targetBranch"
                  class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-slate-200 focus:ring-1"
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

              <p v-if="error" class="text-error text-sm">
                {{ error }}
              </p>
            </div>

            <!-- Footer -->
            <div class="border-bg-hover flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                class="bg-bg-elevated hover:bg-bg-hover rounded-md px-4 py-2 text-sm text-slate-200 transition-colors"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!targetBranch || isSubmitting"
                class="bg-accent-600 hover:bg-accent-500 disabled:bg-accent-600/50 glow-orange-on-hover rounded-md px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed"
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
